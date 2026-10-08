import { before, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import sharp from "sharp";
import { app } from "../src/app.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import { Admin } from "../src/admin/admin.model.js";
import { Appointment, Doctor, Hospital, DoctorQueueCounter, QueueEntry, QueueCounter } from "../src/patient/booking/booking.models.js";
import { PaymentSlip } from "../src/patient/payments/payment.models.js";
import { AppointmentEmail, deliverNextAppointmentEmail } from "../src/patient/notifications/appointment-email.js";
import { mailDelivery } from "../src/patient/notifications/mail.service.js";
import { DoctorAccount } from "../src/doctor/doctor.model.js";

let db: MongoMemoryReplSet;
let token: string, otherToken: string, adminToken: string, doctorId: string, hospitalId: string, date: string;
let image: Buffer;
let paidId: string;
const root = "/api/patient";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const book = (time: string, extra: Record<string, unknown> = {}, patientToken = token) => request(app).post(`${root}/booking/appointments`).set(auth(patientToken))
  .send({ doctorId, hospitalId, department: "General Medicine", date, time, expectedFeeLkr: 1500, ...extra });
const upload = (patientToken = token, data?: Buffer) => request(app).post(`${root}/payments/slips/${doctorId}`).set(auth(patientToken)).attach("slip", data || image, "receipt.png");
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-payment-secret-at-least-thirty-two-characters";
  db = await MongoMemoryReplSet.create({ binary: { downloadDir: path.resolve("tests/.cache") }, replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([Patient.init(), Admin.init(), Appointment.init(), Doctor.init(), Hospital.init(), DoctorQueueCounter.init(), QueueEntry.init(), QueueCounter.init(), PaymentSlip.init(), AppointmentEmail.init()]);
  const tokens: string[] = [];
  for (let i = 0; i < 2; i++) {
    const patient = await Patient.create({ email: `payment${i}@example.com`, fullName: `Test Patient ${i}`, nic: `19901234567${i}`, phone: `+9477000000${i}`, username: `payment_${i}`, dateOfBirth: "1990-01-01", gender: "Other", address: "Test address", district: "Colombo", passwordHash: "test-unused", consentAt: new Date() });
    tokens.push(jwt.sign({ version: 0 }, process.env.JWT_SECRET, { subject: String(patient._id), issuer: "careplus", audience: "patient", expiresIn: "1h" }));
  }
  [token, otherToken] = tokens;
  const admin = await Admin.create({ adminId: "payment-test", passwordHash: "unused" });
  adminToken = jwt.sign({ version: 0, role: "admin" }, process.env.JWT_SECRET, { subject: String(admin._id), issuer: "careplus", audience: "admin", expiresIn: "1h" });
  hospitalId = String((await Hospital.create({ name: "Test Hospital", departments: ["General Medicine"] }))._id);
  doctorId = String((await Doctor.create({ name: "Dr Test", specialty: "General Medicine", hospitalId, weekdays: [0,1,2,3,4,5,6] }))._id);
  date = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0,10);
  image = await sharp({ create: { width: 20, height: 30, channels: 3, background: "white" } }).png().toBuffer();
});
after(async () => { mock.restoreAll(); await mongoose.disconnect(); await db?.stop(); });


test("government OPD books without payment even for previously priced doctors", async () => {
  await Doctor.updateOne({ _id: doctorId }, { $set: { feeLkr: 1500, paymentInstructions: "Previous bank details" } });
  const result = await request(app).post(root + "/booking/appointments").set(auth(token))
    .send({ doctorId, hospitalId, department: "General Medicine", date, time: "09:00" }).expect(201);
  assert.equal(result.body.payment.amountLkr, 0);
  assert.equal(result.body.payment.status, "not_required");
  assert.equal(result.body.payment.slipId, undefined);
  assert.equal(result.body.doctorQueueNumber, undefined);
  assert.equal(await QueueEntry.countDocuments({ appointmentId: result.body._id }), 0);
  const email = await AppointmentEmail.findById("booking:" + result.body._id);
  assert.match(email?.text || "", /appointment has been booked/);
  assert.doesNotMatch(email?.text || "", /payment|Amount:|LKR/i);
  assert.equal(await PaymentSlip.countDocuments(), 0);
  await request(app).patch(root + "/booking/appointments/" + result.body._id + "/cancel").set(auth(token)).expect(200);
});
test("payment endpoints and admin fee management are disabled", async () => {
  await request(app).post(root + "/payments/slips/" + doctorId).set(auth(token)).attach("slip", image, "receipt.png").expect(404);
  await request(app).get("/api/admin/doctor-fees").set(auth(adminToken)).expect(404);
  await request(app).get("/api/admin/payments").set(auth(adminToken)).expect(404);
  await request(app).patch("/api/admin/payments/" + doctorId + "/approve").set(auth(adminToken)).expect(404);
  await request(app).patch("/api/admin/payments/" + doctorId + "/reject").set(auth(adminToken)).send({ reason: "Not applicable" }).expect(404);
});

test("booking then doctor confirmation sends two distinct emails; repeated acceptance does not duplicate", async () => {
  const account = await DoctorAccount.create({ fullName: "Dr Test", nic: "198012345678", dob: "1980-01-01", gender: "Male", slmcNo: "EMAIL-TEST", specialty: "General Medicine", qualifications: "MBBS", experience: "5", hospital: "Test Hospital", phone: "0771111111", email: "doctor@example.com", passwordHash: "unused", status: "approved", doctorCatalogId: doctorId });
  const doctorToken = jwt.sign({ version: 0, role: "doctor" }, process.env.JWT_SECRET!, { subject: String(account._id), issuer: "careplus", audience: "doctor", expiresIn: "1h" });
  const booked = await book("09:15").expect(201);
  const id = booked.body._id;
  assert.equal(booked.body.doctorQueueNumber, undefined);
  assert.equal(await QueueEntry.countDocuments({ appointmentId: id }), 0);
  // Simulate a pending booking numbered by the old implementation.
  await Appointment.updateOne({ _id: id }, { $set: { doctorQueueNumber: 99 } });
  const queueUrl = root + "/booking/queue?appointmentId=" + id;
  const pendingQueue = await request(app).get(queueUrl).set(auth(token)).expect(200);
  assert.equal(pendingQueue.body.status, "pending");
  assert.equal(pendingQueue.body.queueNumber, null);
  assert.equal(pendingQueue.body.appointment.doctorQueueNumber, undefined);
  assert.equal(pendingQueue.body.startsAt, null);
  assert.deepEqual(pendingQueue.body.entries, []);
  const bookingEmail = await AppointmentEmail.findById(`booking:${id}`);
  assert.match(bookingEmail!.text!, /awaiting doctor confirmation/);
  assert.equal(await AppointmentEmail.countDocuments({ _id: `doctor-confirmed:${id}` }), 0);
  Object.assign(process.env, { SMTP_HOST: "smtp.test.invalid", SMTP_USER: "test", SMTP_PASSWORD: "test", SMTP_FROM: "careplus@test.invalid" });
  const delivered: { subject: string; text: string; to: string }[] = [];
  const sender = mock.method(mailDelivery, "send", async (message) => { delivered.push(message); });
  // Includes a cancelled booking left by the preceding test, which is skipped.
  for (let i = 0; i < 3; i++) await deliverNextAppointmentEmail();
  assert.equal(delivered.length, 1);
  assert.match(delivered[0].subject, /Appointment booked/);
  const decisionUrl = `/api/doctor/appointments/${id}/decision`;
  await request(app).patch(decisionUrl).set(auth(token)).send({ decision: "accepted" }).expect(401);
  const responses = await Promise.all([1, 2].map(() => request(app).patch(decisionUrl).set(auth(doctorToken)).send({ decision: "accepted" })));
  assert.deepEqual(responses.map((r) => r.status), [200, 200]);
  assert.equal(await AppointmentEmail.countDocuments({ _id: `doctor-confirmed:${id}` }), 1);
  const approvedQueue = await request(app).get(queueUrl).set(auth(token)).expect(200);
  assert.equal(approvedQueue.body.queueNumber, 1);
  assert.ok(approvedQueue.body.startsAt);
  assert.equal(approvedQueue.body.entries.length, 1);
  assert.equal(await QueueEntry.countDocuments({ appointmentId: id }), 1);
  const confirmation = await AppointmentEmail.findById(`doctor-confirmed:${id}`);
  for (const text of ["Dr Test", "Test Hospital", date, "09:15", booked.body.appointmentId, "arrive at the hospital on time"]) assert.ok(confirmation!.text!.includes(text));
  assert.doesNotMatch(confirmation!.text!, /payment|LKR|You can cancel/i);
  sender.mock.mockImplementation(async () => { throw Object.assign(new Error("mock SMTP failure"), { code: "ETIMEDOUT" }); });
  const now = new Date();
  await deliverNextAppointmentEmail(now);
  assert.equal((await AppointmentEmail.findById(`doctor-confirmed:${id}`))!.status, "pending");
  assert.equal((await Appointment.findById(id))!.doctorDecision, "accepted");
  sender.mock.mockImplementation(async (message) => { delivered.push(message); });
  await deliverNextAppointmentEmail(new Date(now.getTime() + 61_000));
  assert.equal(delivered.length, 2);
  assert.match(delivered[1].subject, /Appointment confirmed/);
  assert.equal(delivered[1].to, "payment0@example.com");
  await request(app).patch(decisionUrl).set(auth(doctorToken)).send({ decision: "accepted" }).expect(200);
  await deliverNextAppointmentEmail(new Date(now.getTime() + 62_000));
  assert.equal(delivered.length, 2);

  const cancelled = await book("09:30").expect(201);
  await request(app).patch(`/api/doctor/appointments/${cancelled.body._id}/decision`).set(auth(doctorToken)).send({ decision: "accepted" }).expect(200);
  await request(app).patch(`${root}/booking/appointments/${cancelled.body._id}/cancel`).set(auth(token)).expect(200);
  for (let i = 0; i < 3; i++) await deliverNextAppointmentEmail();
  assert.equal((await AppointmentEmail.findById(`doctor-confirmed:${cancelled.body._id}`))!.status, "skipped");
  assert.equal(delivered.length, 2);
  const rejected = await book("09:45").expect(201);
  await request(app).patch(`/api/doctor/appointments/${rejected.body._id}/decision`).set(auth(doctorToken)).send({ decision: "rejected" }).expect(200);
  assert.equal(await AppointmentEmail.countDocuments({ _id: `doctor-confirmed:${rejected.body._id}` }), 0);
  const rejectedQueue = await request(app).get(root + "/booking/queue?appointmentId=" + rejected.body._id).set(auth(token)).expect(200);
  assert.equal(rejectedQueue.body.queueNumber, null);
  assert.equal(rejectedQueue.body.startsAt, null);
  assert.equal(await QueueEntry.countDocuments({ appointmentId: rejected.body._id }), 0);
  sender.mock.restore();
});
