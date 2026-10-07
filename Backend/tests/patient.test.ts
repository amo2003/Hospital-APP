import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import {
  Appointment,
  Doctor,
  Hospital,
  QueueCounter,
  QueueEntry,
} from "../src/patient/booking/booking.models.js";
import { Nurse } from "../src/nurse/auth/nurse.model.js";
import { validateBookingDate } from "../src/patient/booking/booking.service.js";
let db: MongoMemoryReplSet;
let token = "";
let otherToken = "";
let hospitalId = "";
let doctorId = "";
let appointmentId = "";
let nurseToken = "";
let nurseAccountId = "";
let patientPublicId = "";
const birthDate = "1998-05-10";
const future = new Date();
future.setDate(future.getDate() + 2);
const date = future.toISOString().slice(0, 10);
const person = {
  fullName: "Test Patient",
  nic: "199812345678",
  dateOfBirth: birthDate,
  gender: "Male",
  phone: "0771234567",
  email: "patient@example.com",
  address: "12 Test Street, Colombo",
  district: "Colombo",
  username: "patient_test",
  password: "Password123!",
  acceptedTerms: true,
};
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";
  db = await MongoMemoryReplSet.create({
    binary: { downloadDir: path.resolve("tests/.cache") },
    replSet: { count: 1 },
  });
  await mongoose.connect(db.getUri());
  await Promise.all([Patient.init(), Appointment.init(), Nurse.init(), QueueEntry.init(), QueueCounter.init()]);
  const hospital = await Hospital.create({
    name: "Test OPD",
    departments: ["General Medicine"],
  });
  hospitalId = String(hospital._id);
  const doctor = await Doctor.create({
    name: "Test Doctor",
    specialty: "General Medicine",
    hospitalId,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    slots: ["09:00", "10:00", "11:00"],
  });
  doctorId = String(doctor._id);
});
after(async () => {
  await mongoose.disconnect();
  await db?.stop();
});
test("registration validates identity, password and consent; stores only a password hash", async () => {
  await request(app)
    .post("/api/patient/auth/register")
    .send({ ...person, acceptedTerms: false })
    .expect(400);
  await request(app)
    .post("/api/patient/auth/register")
    .send({ ...person, password: "short" })
    .expect(400);
  await request(app)
    .post("/api/patient/auth/register")
    .send({ ...person, dateOfBirth: "2020-02-31" })
    .expect(400);
  const result = await request(app)
    .post("/api/patient/auth/register")
    .send(person)
    .expect(201);
  assert.match(result.body.patient.patientId, /^PT-/);
  assert.equal(result.body.patient.passwordHash, undefined);
  assert.equal(result.body.patient.phone, "+94771234567");
  patientPublicId = result.body.patient.patientId;
  const stored = await Patient.findOne({ email: person.email }).select(
    "+passwordHash",
  );
  assert.notEqual(stored!.passwordHash, person.password);
  await request(app)
    .post("/api/patient/auth/register")
    .send(person)
    .expect(409);
});
test("login works with normalized phone and email; unauthenticated access is rejected", async () => {
  await request(app).get("/api/patient/profile").expect(401);
  await request(app)
    .post("/api/patient/auth/login")
    .send({ identifier: person.email, password: "wrong" })
    .expect(401);
  const result = await request(app)
    .post("/api/patient/auth/login")
    .send({ identifier: "077 123 4567", password: person.password })
    .expect(200);
  token = result.body.token;
  await request(app)
    .post("/api/patient/auth/register")
    .send({
      ...person,
      nic: "199812345679",
      phone: "0771234568",
      email: "other@example.com",
      username: "other_test",
    })
    .expect(201);
  otherToken = (
    await request(app)
      .post("/api/patient/auth/login")
      .send({ identifier: "other@example.com", password: person.password })
      .expect(200)
  ).body.token;
});
test("profile edits persist and cannot change roles or password hashes", async () => {
  const result = await request(app)
    .patch("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .send({ fullName: "Updated Patient" })
    .expect(200);
  assert.equal(result.body.fullName, "Updated Patient");
  await request(app)
    .patch("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .send({ role: "staff" })
    .expect(400);
});
test("nurse registration and authentication are separate from patient JWTs", async () => {
  const additionalHospital = await Hospital.create({
    name: "ZZZ Additional Active Hospital",
    departments: ["General Medicine"],
    active: true,
  });
  const nurse = {
    fullName: "Nurse Test",
    nic: "199012345678",
    dateOfBirth: "1990-01-01",
    gender: "Female",
    phone: "0772233445",
    email: "nurse@example.com",
    address: "45 Hospital Road, Colombo",
    district: "Colombo",
    username: "nurse_test",
    department: "General Medicine",
    ward: "General Medicine",
    password: "NursePassword123!",
    confirmPassword: "NursePassword123!",
    acceptedTerms: true,
  };
  const created = await request(app).post("/api/nurse/auth/register").send(nurse).expect(201);
  assert.match(created.body.nurse.nurseId, /^NUR-/);
  assert.equal(created.body.nurse.hospitalId, hospitalId);
  assert.equal(created.body.nurse.passwordHash, undefined);
  nurseAccountId = created.body.nurse.id;
  const stored = await Nurse.findById(nurseAccountId).select("+passwordHash");
  assert.notEqual(stored!.passwordHash, nurse.password);
  await request(app).post("/api/nurse/auth/register").send(nurse).expect(409);
  await request(app).post("/api/nurse/auth/login").send({ identifier: nurse.email, password: "wrong" }).expect(401);
  const login = await request(app).post("/api/nurse/auth/login").send({ identifier: created.body.nurse.nurseId, password: nurse.password }).expect(200);
  nurseToken = login.body.token;
  await request(app).get("/api/nurse/profile").auth(token, { type: "bearer" }).expect(401);
  await request(app).get("/api/nurse/profile").auth(nurseToken, { type: "bearer" }).expect(200);
  await Hospital.deleteOne({ _id: additionalHospital._id });
});
test("nurse profile updates allow only editable fields and patient reads are limited", async () => {
  const edited = await request(app).patch("/api/nurse/profile")
    .auth(nurseToken, { type: "bearer" }).send({ fullName: "Nurse Updated" }).expect(200);
  assert.equal(edited.body.fullName, "Nurse Updated");
  assert.equal(edited.body.role, "nurse");
  await request(app).patch("/api/nurse/profile").auth(nurseToken, { type: "bearer" }).send({ role: "admin" }).expect(400);
});
test("catalogue, date validation and server-owned slot validation", async () => {
  await request(app)
    .get("/api/patient/booking/hospitals")
    .auth(token, { type: "bearer" })
    .expect(200);
  await request(app)
    .get(`/api/patient/booking/slots?doctorId=${doctorId}&date=${date}`)
    .auth(token, { type: "bearer" })
    .expect(200);
  assert.throws(() => validateBookingDate("2026-02-31"));
  await request(app)
    .post("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .send({
      hospitalId,
      doctorId,
      department: "Cardiology",
      date,
      time: "09:00",
    })
    .expect(400);
  await request(app)
    .post("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .send({
      hospitalId,
      doctorId,
      department: "General Medicine",
      date: "2000-01-01",
      time: "09:00",
    })
    .expect(400);
});
test("simultaneous booking creates one appointment; other patients cannot view or cancel it", async () => {
  const payload = {
    hospitalId,
    doctorId,
    department: "General Medicine",
    date,
    time: "09:00",
  };
  const results = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post("/api/patient/booking/appointments")
        .auth(token, { type: "bearer" })
        .send(payload),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  appointmentId = results.find((r) => r.status === 201)!.body._id;
  const others = await request(app)
    .get("/api/patient/booking/appointments")
    .auth(otherToken, { type: "bearer" })
    .expect(200);
  assert.equal(others.body.length, 0);
  await request(app)
    .patch(`/api/patient/booking/appointments/${appointmentId}/cancel`)
    .auth(otherToken, { type: "bearer" })
    .expect(404);
  const slots = await request(app)
    .get(`/api/patient/booking/slots?doctorId=${doctorId}&date=${date}`)
    .auth(token, { type: "bearer" })
    .expect(200);
  assert.equal(
    slots.body.find((s: any) => s.time === "09:00").available,
    false,
  );
});
test("nurse patient search and details are limited to assigned hospital and department", async () => {
  const patients = await request(app).get("/api/nurse/patients?q=Test").auth(nurseToken, { type: "bearer" }).expect(200);
  assert.ok(patients.body.some((item: any) => item.patientId === patientPublicId));
  assert.equal(patients.body[0].passwordHash, undefined);
  const details = await request(app).get(`/api/nurse/patients/${patientPublicId}`).auth(nurseToken, { type: "bearer" }).expect(200);
  assert.equal(details.body.patientId, patientPublicId);
  assert.equal(details.body.appointment.department, "General Medicine");
});
test("cancellation releases the slot and preserves history", async () => {
  await request(app)
    .patch(`/api/patient/booking/appointments/${appointmentId}/cancel`)
    .auth(token, { type: "bearer" })
    .expect(200);
  await request(app)
    .post("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .send({
      hospitalId,
      doctorId,
      department: "General Medicine",
      date,
      time: "09:00",
    })
    .expect(201);
  const list = await request(app)
    .get("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .expect(200);
  assert.equal(list.body.length, 2);
});
test("appointment booking assigns queue tokens automatically and nurse cancellation preserves records", async () => {
  const response = await request(app).get(`/api/nurse/queue?date=${date}`).auth(nurseToken, { type: "bearer" }).expect(200);
  assert.ok(response.body.entries.length >= 1);
  const entry = response.body.entries.find((item: any) => item.status === "waiting");
  assert.ok(entry);
  assert.match(entry.token, /^[A-Z]-\d{3,}$/);
  const storedQueueEntry = await QueueEntry.findById(entry.id);
  await request(app).patch(`/api/nurse/queue/${entry.id}/cancel`).auth(nurseToken, { type: "bearer" }).expect(200);
  assert.equal(await Patient.countDocuments({ patientId: patientPublicId }), 1);
  assert.equal((await Appointment.findById(storedQueueEntry!.appointmentId))?.status, "confirmed");
  const list = await request(app).get(`/api/nurse/queue?date=${date}`).auth(nurseToken, { type: "bearer" }).expect(200);
  assert.ok(!list.body.entries.some((item: any) => item.id === entry.id));
});
test("full end-to-end appointment -> auto token -> waiting -> digital queue -> call next -> serving -> complete -> completed flow", async () => {
  // 1. CREATE ONE NEW TEST APPOINTMENT
  const bookRes = await request(app)
    .post("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .send({
      hospitalId,
      doctorId,
      department: "General Medicine",
      date,
      time: "10:00",
    })
    .expect(201);

  const newApptId = bookRes.body._id;
  assert.ok(newApptId);
  assert.equal(bookRes.body.status, "confirmed");
  assert.equal(bookRes.body.department, "General Medicine");
  assert.equal(bookRes.body.date, date);
  assert.equal(bookRes.body.time, "10:00");

  // 2. VERIFY AUTO QUEUE CREATION IN DATABASE
  const savedAppt = await Appointment.findById(newApptId);
  assert.ok(savedAppt);
  assert.equal(savedAppt.status, "confirmed");

  const qEntries = await QueueEntry.find({ appointmentId: newApptId });
  assert.equal(qEntries.length, 1);
  const qEntry = qEntries[0];
  assert.equal(String(qEntry.appointmentId), String(newApptId));
  assert.equal(String(qEntry.hospitalId), String(hospitalId));
  assert.equal(qEntry.department, "General Medicine");
  assert.equal(qEntry.date, date);
  assert.equal(qEntry.status, "waiting");
  assert.match(qEntry.token, /^G-\d{3,}$/);

  const counter = await QueueCounter.findOne({
    hospitalId,
    date,
    department: "General Medicine",
  });
  assert.ok(counter);
  assert.equal(counter.sequence, qEntry.sequence);

  const testToken = qEntry.token;

  // 3. VERIFY QUEUE MANAGEMENT -> WAITING
  const qmResponse = await request(app)
    .get(`/api/nurse/queue?date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);

  const qmWaitingEntry = qmResponse.body.entries.find((e: any) => e.token === testToken);
  assert.ok(qmWaitingEntry);
  assert.equal(qmWaitingEntry.status, "waiting");
  assert.equal(qmWaitingEntry.department, "General Medicine");
  assert.equal(qmWaitingEntry.patient?.fullName, "Updated Patient");
  assert.ok(qmWaitingEntry.position >= 1);

  // 4. VERIFY DIGITAL QUEUE BEFORE CALL NEXT
  const dqResponse = await request(app)
    .get(`/api/nurse/queue?allDepartments=true&date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);

  const dqWaitingEntry = dqResponse.body.entries.find((e: any) => e.token === testToken);
  assert.ok(dqWaitingEntry);
  assert.equal(dqWaitingEntry.status, "waiting");
  assert.equal(qmWaitingEntry.token, dqWaitingEntry.token);

  // 5. TEST CALL NEXT
  const callNextRes = await request(app)
    .post(`/api/nurse/queue/call-next?date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);

  assert.equal(callNextRes.body.token, testToken);
  assert.equal(callNextRes.body.status, "serving");

  // Database verification: waiting -> serving
  const qEntryServing = await QueueEntry.findById(qEntry._id);
  assert.equal(qEntryServing?.status, "serving");

  // Queue Management: Now Serving updates
  const qmAfterCall = await request(app)
    .get(`/api/nurse/queue?date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);
  const qmServingEntry = qmAfterCall.body.entries.find((e: any) => e.token === testToken);
  assert.ok(qmServingEntry);
  assert.equal(qmServingEntry.status, "serving");

  // Digital Queue: Now Serving updates with SAME token
  const dqAfterCall = await request(app)
    .get(`/api/nurse/queue?allDepartments=true&date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);
  const dqServingEntry = dqAfterCall.body.entries.find((e: any) => e.token === testToken);
  assert.ok(dqServingEntry);
  assert.equal(dqServingEntry.status, "serving");
  assert.equal(qmServingEntry.token, dqServingEntry.token);

  // 7. TEST COMPLETE
  const completeRes = await request(app)
    .patch(`/api/nurse/queue/${qEntry._id}/complete`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);

  assert.equal(completeRes.body.status, "completed");
  assert.equal(completeRes.body.token, testToken);

  // Database verification: serving -> completed
  const qEntryCompleted = await QueueEntry.findById(qEntry._id);
  assert.equal(qEntryCompleted?.status, "completed");

  const apptCompleted = await Appointment.findById(newApptId);
  assert.equal(apptCompleted?.status, "completed");

  // Queue Management: Completed
  const qmAfterComplete = await request(app)
    .get(`/api/nurse/queue?date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);
  const qmCompletedEntry = qmAfterComplete.body.entries.find((e: any) => e.token === testToken);
  assert.ok(qmCompletedEntry);
  assert.equal(qmCompletedEntry.status, "completed");

  // Digital Queue removes that token from Now Serving
  const dqAfterComplete = await request(app)
    .get(`/api/nurse/queue?allDepartments=true&date=${date}`)
    .auth(nurseToken, { type: "bearer" })
    .expect(200);
  const dqServingList = dqAfterComplete.body.entries.filter((e: any) => e.status === "serving");
  assert.ok(!dqServingList.some((e: any) => e.token === testToken));

  // 8. SEQUENTIAL SECOND TOKEN CHECK
  const bookRes2 = await request(app)
    .post("/api/patient/booking/appointments")
    .auth(token, { type: "bearer" })
    .send({
      hospitalId,
      doctorId,
      department: "General Medicine",
      date,
      time: "11:00",
    })
    .expect(201);

  const newApptId2 = bookRes2.body._id;
  const qEntries2 = await QueueEntry.find({ appointmentId: newApptId2 });
  assert.equal(qEntries2.length, 1);
  const qEntry2 = qEntries2[0];
  assert.equal(qEntry2.status, "waiting");
  assert.equal(qEntry2.sequence, qEntry.sequence + 1);
  assert.notEqual(qEntry2.token, qEntry.token);
  const counter2 = await QueueCounter.findOne({
    hospitalId,
    date,
    department: "General Medicine",
  });
  assert.equal(counter2?.sequence, qEntry2.sequence);
});
test("reset codes are single-use and invalidate existing sessions", async () => {
  const code = "test-reset-code-which-is-long-enough";
  await Patient.updateOne(
    { email: person.email },
    {
      resetHash: createHash("sha256").update(code).digest("hex"),
      resetExpires: new Date(Date.now() + 60000),
    },
  );
  await request(app)
    .post("/api/patient/auth/reset-password")
    .send({ code, password: "ChangedPassword123!" })
    .expect(200);
  await request(app)
    .post("/api/patient/auth/reset-password")
    .send({ code, password: "ChangedPassword123!" })
    .expect(400);
  await request(app)
    .get("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .expect(401);
  token = (
    await request(app)
      .post("/api/patient/auth/login")
      .send({ identifier: person.email, password: "ChangedPassword123!" })
      .expect(200)
  ).body.token;
});
test("account deletion requires a password, removes appointments and revokes access", async () => {
  await request(app)
    .delete("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .send({ password: "wrong" })
    .expect(400);
  await request(app)
    .delete("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .send({ password: "ChangedPassword123!" })
    .expect(204);
  await request(app)
    .get("/api/patient/profile")
    .auth(token, { type: "bearer" })
    .expect(401);
  assert.equal(await Appointment.countDocuments(), 0);
  await request(app)
    .post("/api/patient/auth/login")
    .send({ identifier: person.email, password: "ChangedPassword123!" })
    .expect(401);
});
test("nurse deactivation revokes existing sessions and blocks future login", async () => {
  await request(app).delete("/api/nurse/profile").auth(nurseToken, { type: "bearer" }).expect(204);
  await request(app).get("/api/nurse/profile").auth(nurseToken, { type: "bearer" }).expect(401);
  const nurse = await Nurse.findById(nurseAccountId).select("+passwordHash");
  await request(app).post("/api/nurse/auth/login").send({ identifier: nurse!.email, password: "NursePassword123!" }).expect(403);
});
