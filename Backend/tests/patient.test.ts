import { before, after, test, mock } from "node:test";
import {
  googleClient,
  googleProof,
} from "../src/patient/auth/google.service.js";
import jwt from "jsonwebtoken";
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
} from "../src/patient/booking/booking.models.js";
import { validateBookingDate } from "../src/patient/booking/booking.service.js";
let db: MongoMemoryReplSet;
let token = "";
let otherToken = "";
let hospitalId = "";
let doctorId = "";
let appointmentId = "";
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
  await Promise.all([Patient.init(), Appointment.init()]);
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
    slots: ["09:00", "10:00"],
  });
  doctorId = String(doctor._id);
});
after(async () => {
  await mongoose.disconnect();
  await db?.stop();
});
test("Google rejects missing configuration and invalid or unverified tokens", async () => {
  process.env.GOOGLE_CLIENT_IDS = "";
  await request(app)
    .post("/api/patient/auth/google")
    .send({ idToken: "invalid-token" })
    .expect(503);
  process.env.GOOGLE_CLIENT_IDS = "test-web.apps.googleusercontent.com";
  const verification = mock.method(googleClient, "verifyIdToken", async () => {
    throw new Error("Invalid signature/audience/expiry");
  });
  try {
    await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "invalid-token" })
      .expect(401);
    verification.mock.mockImplementation(
      async () =>
        ({
          getPayload: () => ({
            sub: "google-unverified",
            email: "unverified@example.com",
            email_verified: false,
          }),
        }) as any,
    );
    await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "unverified-token" })
      .expect(401);
  } finally {
    verification.mock.restore();
  }
});
test("Google signup requires patient details, binds verified email, and signs in by stable subject", async () => {
  const identity = {
    sub: "google-new-patient",
    email: "google.patient@example.com",
    name: "Google Patient",
    email_verified: true,
  };
  const verification = mock.method(
    googleClient,
    "verifyIdToken",
    async () => ({ getPayload: () => identity }) as any,
  );
  try {
    const result = await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "verified-google-token" })
      .expect(200);
    assert.equal(result.body.status, "registration-required");
    assert.equal(result.body.token, undefined);
    assert.deepEqual(
      (verification.mock.calls[0].arguments[0] as any).audience,
      ["test-web.apps.googleusercontent.com"],
    );
    await request(app)
      .get("/api/patient/profile")
      .auth(result.body.proofToken, { type: "bearer" })
      .expect(401);
    const details = {
      ...person,
      email: identity.email,
      phone: "0771234500",
      nic: "199812345600",
      username: "google_patient",
      googleRegistrationToken: result.body.proofToken,
    };
    await request(app)
      .post("/api/patient/auth/register")
      .send({ ...details, email: "tampered@example.com" })
      .expect(400);
    await request(app)
      .post("/api/patient/auth/register")
      .send({ ...details, acceptedTerms: false })
      .expect(400);
    const created = await request(app)
      .post("/api/patient/auth/register")
      .send(details)
      .expect(201);
    assert.ok(created.body.token);
    assert.equal(created.body.patient.googleSubject, undefined);
    await request(app)
      .post("/api/patient/auth/register")
      .send(details)
      .expect(409);
    // A profile email change must not break the Google subject binding.
    await request(app)
      .patch("/api/patient/profile")
      .auth(created.body.token, { type: "bearer" })
      .send({ email: "changed.google@example.com" })
      .expect(200);
    const login = await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "verified-google-token" })
      .expect(200);
    assert.equal(login.body.status, "signed-in");
    assert.equal(login.body.patient.id, created.body.patient.id);
    await request(app)
      .post("/api/patient/auth/logout")
      .auth(login.body.token, { type: "bearer" })
      .expect(204);
    await request(app)
      .get("/api/patient/profile")
      .auth(login.body.token, { type: "bearer" })
      .expect(401);
    await Patient.deleteOne({ _id: created.body.patient.id });
  } finally {
    verification.mock.restore();
  }
});
test("Google linking requires the existing password; proof purpose and expiration are enforced", async () => {
  const identity = {
    sub: "google-link-patient",
    email: "google.link@example.com",
    name: "Link Patient",
    email_verified: true,
  };
  const verification = mock.method(
    googleClient,
    "verifyIdToken",
    async () => ({ getPayload: () => identity }) as any,
  );
  try {
    const created = await request(app)
      .post("/api/patient/auth/register")
      .send({
        ...person,
        email: identity.email,
        phone: "0771234501",
        nic: "199812345601",
        username: "google_link",
      })
      .expect(201);
    const result = await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "verified-google-token" })
      .expect(200);
    assert.equal(result.body.status, "link-required");
    assert.equal(result.body.token, undefined);
    await request(app)
      .post("/api/patient/auth/google/link")
      .send({ proofToken: result.body.proofToken, password: "wrong" })
      .expect(401);
    await request(app)
      .post("/api/patient/auth/google/link")
      .send({
        proofToken: googleProof(identity, "register"),
        password: person.password,
      })
      .expect(401);
    const expired = jwt.sign(
      { ...identity, purpose: "link" },
      process.env.JWT_SECRET!,
      { issuer: "careplus", audience: "google-onboarding", expiresIn: -1 },
    );
    await request(app)
      .post("/api/patient/auth/google/link")
      .send({ proofToken: expired, password: person.password })
      .expect(401);
    const linked = await request(app)
      .post("/api/patient/auth/google/link")
      .send({ proofToken: result.body.proofToken, password: person.password })
      .expect(200);
    assert.equal(linked.body.patient.id, created.body.patient.id);
    const login = await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "verified-google-token" })
      .expect(200);
    assert.equal(login.body.status, "signed-in");
    verification.mock.mockImplementation(
      async () =>
        ({
          getPayload: () => ({ ...identity, sub: "different-google-subject" }),
        }) as any,
    );
    await request(app)
      .post("/api/patient/auth/google")
      .send({ idToken: "different-google-token" })
      .expect(409);
    await Patient.deleteOne({ _id: created.body.patient.id });
  } finally {
    verification.mock.restore();
  }
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
