import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import { Appointment, Doctor, Hospital, DoctorQueueCounter, QueueEntry, QueueCounter } from "../src/patient/booking/booking.models.js";

let db: MongoMemoryReplSet;
let token: string, otherToken: string, hospitalId: string;
const person = { email: "queue-owner@example.com" };
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-only-queue-secret-over-thirty-two-characters";
  db = await MongoMemoryReplSet.create({ binary: { downloadDir: path.resolve("tests/.cache") }, replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([Patient.init(), Appointment.init(), DoctorQueueCounter.init(), QueueEntry.init(), QueueCounter.init()]);
  hospitalId = String((await Hospital.create({ name: "Queue test hospital", departments: ["General Medicine"] }))._id);
  const tokens: string[] = [];
  for (const [i, email] of [person.email, "other-queue-patient@example.com"].entries()) {
    const patient = await Patient.create({ email, fullName: i ? "Private Other Name" : "Queue Owner", nic: `19901234567${i}`, phone: `+9477000000${i}`, username: `queue_${i}`, dateOfBirth: "1990-01-01", gender: "Other", address: "Test address", district: "Colombo", passwordHash: "unused-test-hash", consentAt: new Date() });
    tokens.push(jwt.sign({ version: 0 }, process.env.JWT_SECRET!, { subject: String(patient._id), issuer: "careplus", audience: "patient", expiresIn: "1h" }));
  }
  [token, otherToken] = tokens;
});
after(async () => { await mongoose.disconnect(); await db?.stop(); });

test("doctor queues use booking order, protect names and isolate doctors/dates; appointments can be today-only", async () => {
  const doctor = await Doctor.create({ name: "Queue Test Doctor", specialty: "General Medicine", hospitalId, weekdays: [0,1,2,3,4,5,6] });
  const secondDoctor = await Doctor.create({ name: "Second Queue Doctor", specialty: "General Medicine", hospitalId, weekdays: [0,1,2,3,4,5,6] });
  const day = new Date(); day.setDate(day.getDate() + 5);
  const queueDate = day.toISOString().slice(0, 10);
  const payload = { doctorId: String(doctor._id), hospitalId, department: "General Medicine", date: queueDate };
  const book = (auth: string, time: string, extra = {}) => request(app).post("/api/patient/booking/appointments").auth(auth, { type: "bearer" }).send({ ...payload, time, ...extra });
  const first = await book(otherToken, "18:00").expect(201);
  const second = await book(token, "09:00").expect(201);
  assert.equal(first.body.doctorQueueNumber, 1);
  assert.equal(second.body.doctorQueueNumber, 2);
  const otherDoctor = await book(otherToken, "09:15", { doctorId: String(secondDoctor._id) }).expect(201);
  assert.equal(otherDoctor.body.doctorQueueNumber, 1);
  const concurrent = await Promise.all([book(token, "09:30"), book(otherToken, "09:45")]);
  assert.deepEqual(concurrent.map((r) => r.status), [201, 201]);
  assert.deepEqual(concurrent.map((r) => r.body.doctorQueueNumber).sort(), [3, 4]);
  const getQueue = () => request(app).get(`/api/patient/booking/queue?appointmentId=${second.body._id}`).auth(token, { type: "bearer" });
  const queue = await getQueue().expect(200);
  assert.equal(queue.body.queueNumber, 2);
  assert.equal(queue.body.patientsAhead, 1);
  assert.equal(queue.body.entries.length, 4);
  assert.equal(queue.body.entries[0].time, "18:00");
  assert.equal(queue.body.entries[0].name, undefined);
  assert.equal(queue.body.entries[0].patientId, undefined);
  assert.equal(queue.body.entries[0]._id, undefined);
  assert.equal(queue.body.entries[1].isYou, true);
  assert.ok(queue.body.entries[1].name);
  await request(app).get(`/api/patient/booking/queue?appointmentId=${first.body._id}`).auth(token, { type: "bearer" }).expect(404);
  await request(app).get("/api/patient/booking/queue").expect(401);
  await QueueEntry.updateOne({ appointmentId: first.body._id }, { $set: { status: "serving" } });
  assert.equal((await getQueue()).body.nowServing, 1);
  await request(app).patch(`/api/patient/booking/appointments/${first.body._id}/cancel`).auth(otherToken, { type: "bearer" }).expect(200);
  const afterCancel = await getQueue().expect(200);
  assert.equal(afterCancel.body.patientsAhead, 0);
  assert.equal(afterCancel.body.queueNumber, 2);
  assert.equal(afterCancel.body.entries.some((entry: any) => entry.queueNumber === 1), false);

  const me = await Patient.findOne({ email: person.email });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const legacy = await Appointment.create({ ...payload, patientId: me!._id, date: today, time: "00:01" });
  const todayResponse = await request(app).get("/api/patient/booking/appointments?scope=today").auth(token, { type: "bearer" }).expect(200);
  assert.ok(todayResponse.body.some((item: any) => item._id === String(legacy._id)));
  assert.ok(todayResponse.body.every((item: any) => item.date === today && item.patientId === String(me!._id)));
  const defaultQueue = await request(app).get("/api/patient/booking/queue").auth(token, { type: "bearer" }).expect(200);
  assert.equal(defaultQueue.body.appointment._id, String(legacy._id));
  assert.equal(defaultQueue.body.queueNumber, 1);
  assert.equal((await Appointment.findById(legacy._id))?.doctorQueueNumber, 1);
  const all = await request(app).get("/api/patient/booking/appointments?scope=all").auth(token, { type: "bearer" }).expect(200);
  assert.ok(all.body.some((item: any) => item._id === second.body._id));
  assert.equal(all.body.some((item: any) => item._id === first.body._id), false);
  const created = await Appointment.find({ doctorId: { $in: [doctor._id, secondDoctor._id] } });
  await QueueEntry.deleteMany({ appointmentId: { $in: created.map((a) => a._id) } });
  await Appointment.deleteMany({ doctorId: { $in: [doctor._id, secondDoctor._id] } });
  await Doctor.deleteMany({ _id: { $in: [doctor._id, secondDoctor._id] } });
});

