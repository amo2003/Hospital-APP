import { before, after, test as paymentTest, mock } from "node:test";
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

// Government OPD: paid-flow tests preserved for re-enabling payments.
const test = paymentTest.skip;
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

test("only admins configure fees; paid fees require payment instructions and valid currency precision", async () => {
  const url = `/api/admin/doctor-fees/${doctorId}`;
  await request(app).patch(url).set(auth(token)).send({ feeLkr: 1500, paymentInstructions: "Test bank, test account" }).expect(401);
  for (const payload of [{ feeLkr: -1, paymentInstructions: "Test bank" }, { feeLkr: 1.001, paymentInstructions: "Test bank account" }, { feeLkr: 1500, paymentInstructions: "" }])
    await request(app).patch(url).set(auth(adminToken)).send(payload).expect(400);
  await request(app).patch(url).set(auth(adminToken)).send({ feeLkr: 1500, paymentInstructions: "Test bank - test account only" }).expect(200);
  const doctors = await request(app).get(`${root}/booking/doctors`).query({ hospitalId, department: "General Medicine" }).set(auth(token)).expect(200);
  assert.equal(doctors.body[0].feeLkr, 1500);
  assert.match(doctors.body[0].paymentInstructions, /Test bank/);
});

test("upload validates bytes and size, authenticates, and keeps receipts private", async () => {
  await request(app).post(`${root}/payments/slips/${doctorId}`).attach("slip", image, "receipt.png").expect(401);
  await upload(token, Buffer.from("<script>not a receipt</script>")).expect(400);
  await upload(token, Buffer.alloc(5 * 1024 * 1024 + 1)).expect(400);
  const result = await upload().expect(201);
  assert.equal(result.body.data, undefined);
  const slip = await PaymentSlip.findById(result.body.id);
  assert.equal(slip?.data, undefined);
  assert.ok(slip?.expiresAt);
  await request(app).get(`/api/admin/payments/${new mongoose.Types.ObjectId()}/slip`).set(auth(token)).expect(401);
});

test("paid booking validates fee and ownership; attaches slip, assigns queue and atomically queues email", async () => {
  await book("09:00", { expectedFeeLkr: 1 }).expect(409);
  await book("09:00").expect(400);
  const foreign = await upload(otherToken).expect(201);
  await book("09:00", { slipId: foreign.body.id }).expect(400);
  assert.equal(await Appointment.countDocuments(), 0);
  assert.equal(await AppointmentEmail.countDocuments(), 0);
  const slip = await upload().expect(201);
  const booked = await book("09:00", { slipId: slip.body.id }).expect(201);
  paidId = booked.body._id;
  assert.equal(booked.body.payment.status, "pending");
  assert.equal(booked.body.payment.amountLkr, 1500);
  assert.equal(booked.body.doctorQueueNumber, 1);
  const savedSlip = await PaymentSlip.findById(slip.body.id);
  assert.equal(String(savedSlip?.appointmentId), paidId);
  assert.equal(savedSlip?.expiresAt, undefined);
  const email = await AppointmentEmail.findById(`booking:${paidId}`);
  assert.equal(email?.recipient, "payment0@example.com");
  assert.match(email?.text || "", /Dr Test/);
  assert.match(email?.text || "", /Pending admin verification/);
  assert.match(email?.text || "", /30 minutes/);
  const repeated = await book("09:00", { slipId: slip.body.id }).expect(200);
  assert.equal(repeated.body._id, paidId);
  assert.equal(await AppointmentEmail.countDocuments(), 1);
  await book("09:15", { slipId: slip.body.id }).expect(400);
  assert.equal(await Appointment.countDocuments(), 1);
});

test("admin sees upload times and doctor; approving twice queues only one approval email", async () => {
  await request(app).patch(`/api/admin/payments/${paidId}/approve`).set(auth(token)).expect(401);
  const list = await request(app).get("/api/admin/payments").query({ doctorId, date }).set(auth(adminToken)).expect(200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].doctorId.name, "Dr Test");
  assert.ok(list.body.items[0].payment.slipId.uploadedAt);
  assert.equal(list.body.items[0].payment.slipId.data, undefined);
  const download = await request(app).get(`/api/admin/payments/${paidId}/slip`).set(auth(adminToken)).expect(200);
  assert.match(download.headers["content-type"], /image\/jpeg/);
  assert.match(download.headers["content-disposition"], /attachment/);
  assert.equal(download.headers["cache-control"], "no-store");
  for (let i = 0; i < 2; i++) {
    const approval = await request(app).patch(`/api/admin/payments/${paidId}/approve`).set(auth(adminToken)).expect(200);
    assert.equal(approval.body.payment.status, "approved");
    assert.ok(approval.body.payment.reviewedAt);
  }
  assert.equal(await AppointmentEmail.countDocuments({ kind: "payment-approved" }), 1);
  const email = await AppointmentEmail.findById(`payment-approved:${paidId}`);
  assert.match(email?.text || "", /arrive at the hospital on time/);
});

test("cancellation expires 30 minutes after creation; cannot cancel another patient's appointment", async () => {
  await request(app).patch(`${root}/booking/appointments/${paidId}/cancel`).set(auth(otherToken)).expect(404);
  const cutoff = new Date(Date.now() - 30 * 60_000);
  await Appointment.collection.updateOne({ _id: new mongoose.Types.ObjectId(paidId) }, { $set: { createdAt: cutoff } });
  await request(app).patch(`${root}/booking/appointments/${paidId}/cancel`).set(auth(token)).expect(400);
  assert.equal((await Appointment.findById(paidId))?.status, "confirmed");
  await Appointment.collection.updateOne({ _id: new mongoose.Types.ObjectId(paidId) }, { $set: { createdAt: new Date(Date.now() - 29 * 60_000) } });
  await request(app).patch(`${root}/booking/appointments/${paidId}/cancel`).set(auth(token)).expect(200);
  assert.equal((await QueueEntry.findOne({ appointmentId: paidId }))?.status, "cancelled");
});

test("fee changes do not modify existing bookings and cancelled pending payments cannot be approved", async () => {
  const slip = await upload().expect(201);
  const booked = await book("09:15", { slipId: slip.body.id }).expect(201);
  await request(app).patch(`/api/admin/doctor-fees/${doctorId}`).set(auth(adminToken)).send({ feeLkr: 2000, paymentInstructions: "New test bank details" }).expect(200);
  assert.equal((await Appointment.findById(booked.body._id))?.payment?.amountLkr, 1500);
  const another = await upload().expect(201);
  await book("09:30", { slipId: another.body.id }).expect(409);
  await request(app).patch(`${root}/booking/appointments/${booked.body._id}/cancel`).set(auth(token)).expect(200);
  await request(app).patch(`/api/admin/payments/${booked.body._id}/approve`).set(auth(adminToken)).expect(400);
  assert.equal(await AppointmentEmail.countDocuments({ _id: `payment-approved:${booked.body._id}` }), 0);
});

test("free bookings need no receipt; outbox retries SMTP failures without losing the appointment", async () => {
  await request(app).patch(`/api/admin/doctor-fees/${doctorId}`).set(auth(adminToken)).send({ feeLkr: 0, paymentInstructions: "" }).expect(200);
  const booked = await book("09:30", { expectedFeeLkr: 0 }).expect(201);
  assert.equal(booked.body.payment.status, "not_required");
  Object.assign(process.env, { SMTP_HOST: "smtp.test.invalid", SMTP_USER: "test", SMTP_PASSWORD: "test", SMTP_FROM: "careplus@test.invalid" });
  const sender = mock.method(mailDelivery, "send", async () => { throw Object.assign(new Error("test failure"), { code: "ETIMEDOUT" }); });
  // Cancelled bookings are skipped; no stale arrive-at-hospital email is sent.
  for (let i = 0; i < 3; i++) await deliverNextAppointmentEmail();
  assert.equal(sender.mock.callCount(), 0);
  assert.equal(await AppointmentEmail.countDocuments({ status: "skipped" }), 3);
  const now = new Date();
  await deliverNextAppointmentEmail(now);
  const pending = await AppointmentEmail.findById(`booking:${booked.body._id}`);
  assert.equal(pending?.status, "pending");
  assert.equal(pending?.attempts, 1);
  assert.equal((await Appointment.findById(booked.body._id))?.status, "confirmed");
  sender.mock.mockImplementation(async () => {});
  await deliverNextAppointmentEmail(new Date(now.getTime() + 61_000));
  assert.equal((await AppointmentEmail.findById(`booking:${booked.body._id}`))?.status, "sent");
  assert.equal(sender.mock.callCount(), 2);
});

test("expired slips and simultaneous attempts cannot reuse a receipt or leave partial bookings", async () => {
  await request(app).patch(`/api/admin/doctor-fees/${doctorId}`).set(auth(adminToken)).send({ feeLkr: 1500, paymentInstructions: "Test bank account details" }).expect(200);
  const expired = await upload().expect(201);
  await PaymentSlip.updateOne({ _id: expired.body.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const beforeCount = await Appointment.countDocuments();
  await book("17:00", { slipId: expired.body.id }).expect(400);
  assert.equal(await Appointment.countDocuments(), beforeCount);
  const slip = await upload().expect(201);
  const results = await Promise.all([book("17:00", { slipId: slip.body.id }), book("17:15", { slipId: slip.body.id })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal(await Appointment.countDocuments(), beforeCount + 1);
  const created = results.find((r) => r.status === 201)!.body;
  assert.equal(await QueueEntry.countDocuments({ appointmentId: created._id }), 1);
  assert.equal(await AppointmentEmail.countDocuments({ appointmentId: created._id }), 1);
  await Appointment.updateOne({ _id: created._id }, { $set: { doctorDecision: "rejected" } });
  await request(app).patch(`/api/admin/payments/${created._id}/approve`).set(auth(adminToken)).expect(400);
});

test("admin rejection requires a reason, is audited and visible to the patient, without cancelling the booking", async () => {
  const slip = await upload().expect(201);
  const booked = await book("18:00", { slipId: slip.body.id }).expect(201);
  const url = `/api/admin/payments/${booked.body._id}/reject`;
  const reason = "Receipt amount does not match the appointment fee.";
  await request(app).patch(url).set(auth(token)).send({ reason }).expect(401);
  for (const reason of ["", "no", "x".repeat(501)]) await request(app).patch(url).set(auth(adminToken)).send({ reason }).expect(400);
  for (let i = 0; i < 2; i++) {
    const result = await request(app).patch(url).set(auth(adminToken)).send({ reason }).expect(200);
    assert.equal(result.body.payment.status, "rejected");
    assert.equal(result.body.payment.rejectionReason, reason);
    assert.ok(result.body.payment.reviewedAt);
    assert.ok(result.body.payment.reviewedBy);
    assert.equal(result.body.status, "confirmed");
  }
  await request(app).patch(`/api/admin/payments/${booked.body._id}/approve`).set(auth(adminToken)).expect(409);
  const list = await request(app).get("/api/admin/payments").query({ status: "rejected", doctorId, date }).set(auth(adminToken)).expect(200);
  assert.equal(list.body.counts.rejected, 1);
  assert.equal(list.body.items[0]._id, booked.body._id);
  const patientList = await request(app).get(`${root}/booking/appointments`).set(auth(token)).expect(200);
  assert.equal(patientList.body.find((a: { _id: string }) => a._id === booked.body._id).payment.rejectionReason, reason);
  assert.equal((await QueueEntry.findOne({ appointmentId: booked.body._id }))?.status, "waiting");
  assert.equal(await AppointmentEmail.countDocuments({ _id: `payment-approved:${booked.body._id}` }), 0);
});

test("concurrent approval and rejection produce one final decision", async () => {
  const slip = await upload().expect(201);
  const booked = await book("18:15", { slipId: slip.body.id }).expect(201);
  const url = `/api/admin/payments/${booked.body._id}`;
  const results = await Promise.all([
    request(app).patch(`${url}/approve`).set(auth(adminToken)),
    request(app).patch(`${url}/reject`).set(auth(adminToken)).send({ reason: "The receipt is unreadable." }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const saved = await Appointment.findById(booked.body._id);
  assert.equal(saved?.payment?.status, results[0].status === 200 ? "approved" : "rejected");
  assert.equal(await AppointmentEmail.countDocuments({ _id: `payment-approved:${booked.body._id}` }), results[0].status === 200 ? 1 : 0);
});
