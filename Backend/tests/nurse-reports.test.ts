import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { Nurse } from "../src/nurse/auth/nurse.model.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import { Hospital, Doctor, Appointment, QueueEntry } from "../src/patient/booking/booking.models.js";
import { reportDocument } from "../../mobile/mobile/src/features/nurse/reports/reportDocument.js";

let db: MongoMemoryReplSet;
let token: string, servingId: string, servingAppointmentId: string;
let sequence = 0;
const department = "General Medicine";
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "nurse-reports-test-secret-at-least-thirty-two-characters";
  db = await MongoMemoryReplSet.create({ binary: { downloadDir: path.resolve("tests/.cache") }, replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([Nurse.init(), Patient.init(), Appointment.init(), QueueEntry.init()]);
  const hospital = await Hospital.create({ name: "Report Hospital", departments: [department] });
  const otherHospital = await Hospital.create({ name: "Other Hospital", departments: [department] });
  const nurse = await Nurse.create({ fullName: "Report Nurse", nic: "199012345678", dateOfBirth: "1990-01-01", gender: "Other", phone: "0771111111", email: "nurse@example.com", address: "Test", district: "Colombo", username: "report_nurse", passwordHash: "unused", hospitalId: hospital._id, department, accessDepartment: department, status: "active" });
  token = jwt.sign({ version: 0, role: "nurse" }, process.env.JWT_SECRET, { subject: String(nurse._id), issuer: "careplus", audience: "nurse", expiresIn: "1h" });
  const patient = await Patient.create({ fullName: "Patient <script>alert(1)</script>", email: "report@example.com", nic: "200012345678", phone: "+94770000001", username: "report_patient", dateOfBirth: "2000-01-01", gender: "Other", address: "Test", district: "Colombo", passwordHash: "unused", consentAt: new Date() });
  const doctor = await Doctor.create({ name: "Doctor One", specialty: department, hospitalId: hospital._id });
  const doctor2 = await Doctor.create({ name: "Doctor Two", specialty: department, hospitalId: hospital._id });
  async function entry(date: string, status: string, opts: { other?: boolean; dept?: string; secondDoctor?: boolean; timestamp?: boolean; missing?: boolean } = {}) {
    sequence++;
    const appointment = await Appointment.create({ hospitalId: opts.other ? otherHospital._id : hospital._id, patientId: patient._id, doctorId: opts.secondDoctor ? doctor2._id : doctor._id, date, time: `09:${String(sequence).padStart(2, "0")}`, department: opts.dept || department, status: status === "completed" ? "completed" : "confirmed", doctorDecision: "accepted" });
    const queue = await QueueEntry.create({ hospitalId: appointment.hospitalId, patientId: opts.missing ? new mongoose.Types.ObjectId() : patient._id, appointmentId: opts.missing ? new mongoose.Types.ObjectId() : appointment._id, department: appointment.department, date, sequence, token: `A-${sequence}`, status, completedAt: opts.timestamp ? new Date("2026-01-02T04:00:00Z") : null });
    return { queue, appointment };
  }
  await entry("2026-01-01", "completed");
  await entry("2026-01-02", "completed", { secondDoctor: true, timestamp: true });
  await entry("2026-01-02", "waiting");
  const serving = await entry("2026-01-03", "serving", { dept: "Cardiology" });
  servingId = String(serving.queue._id); servingAppointmentId = String(serving.appointment._id);
  await entry("2026-01-02", "cancelled");
  await entry("2026-01-02", "completed", { other: true });
  await entry("2026-01-02", "completed", { dept: "Cardiology" });
  await entry("2025-12-31", "completed");
  await entry("2026-01-04", "completed", { missing: true });
});
after(async () => { await mongoose.disconnect(); await db?.stop(); });

const getReport = (query = "from=2026-01-01&to=2026-01-03") => request(app).get(`/api/nurse/reports/completed?${query}`).auth(token, { type: "bearer" });

test("report includes completed visits across hospital departments, regardless of completion timestamp", async () => {
  const { body, headers } = await getReport().expect(200);
  assert.equal(headers["cache-control"], "no-store");
  assert.deepEqual(body.summary, { completed: 3, patients: 1, doctors: 2, averagePerDay: 1 });
  assert.deepEqual(body.daily, [{ date: "2026-01-01", count: 1 }, { date: "2026-01-02", count: 2 }, { date: "2026-01-03", count: 0 }]);
  assert.equal(body.byDoctor.reduce((sum: number, item: { count: number }) => sum + item.count, 0), 3);
  assert.equal(body.department, "All departments");
  assert.ok(body.records.some((record: { department: string }) => record.department === "Cardiology"));
  assert.equal(body.records[0].doctorName, "Doctor Two");
  assert.equal(body.records[0].completedAt, "2026-01-02T04:00:00.000Z");
  assert.equal(body.records[1].completedAt, null);
  assert.equal(body.records[0].patientName, "Patient <script>alert(1)</script>");
  const html = reportDocument(body, value => value, "en");
  assert.ok(html.includes("Patient &lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Doctor Two"));
});
test("empty and orphaned records are handled without fake identity or timestamps", async () => {
  const empty = await getReport("from=2026-02-01&to=2026-02-01").expect(200);
  assert.equal(empty.body.summary.completed, 0);
  assert.deepEqual(empty.body.daily, [{ date: "2026-02-01", count: 0 }]);
  const orphan = await getReport("from=2026-01-04&to=2026-01-04").expect(200);
  assert.equal(orphan.body.summary.completed, 1);
  assert.equal(orphan.body.summary.patients, 0);
  assert.equal(orphan.body.records[0].patientName, null);
  assert.equal(orphan.body.records[0].doctorName, null);
});
test("invalid, reversed, future and oversized date ranges are rejected and authentication required", async () => {
  for (const query of ["from=2026-02-30&to=2026-03-01", "from=2026-01-03&to=2026-01-01", "from=2026-01-01&to=2026-04-01", "from=2099-01-01&to=2099-01-01", "from=bad&to=bad", ""]) await getReport(query).expect(400);
  await request(app).get("/api/nurse/reports/completed?from=2026-01-01&to=2026-01-03").expect(401);
});
test("completing Queue Management adds the visit and its completion time to the report", async () => {
  await request(app).patch(`/api/nurse/queue/${servingId}/complete`).auth(token, { type: "bearer" }).expect(200);
  const { body } = await getReport().expect(200);
  assert.equal(body.summary.completed, 4);
  assert.ok(body.records.find((record: { id: string }) => record.id === servingId).completedAt);
  assert.equal((await Appointment.findById(servingAppointmentId))?.status, "completed");
  const queue = await request(app).get("/api/nurse/queue?date=2026-01-03&allDepartments=true").auth(token, { type: "bearer" }).expect(200);
  const report = await getReport("from=2026-01-03&to=2026-01-03").expect(200);
  const completedIds = queue.body.entries.filter((entry: { status: string }) => entry.status === "completed").map((entry: { id: string }) => entry.id).sort();
  assert.deepEqual(report.body.records.map((record: { id: string }) => record.id).sort(), completedIds);
  assert.equal(report.body.records[0].department, "Cardiology");
});

test("hospital-wide queue and report return the same completed records without other hospitals", async () => {
  const queue = await request(app).get("/api/nurse/queue?date=2026-01-02&allDepartments=true").auth(token, { type: "bearer" }).expect(200);
  const report = await getReport("from=2026-01-02&to=2026-01-02").expect(200);
  const completedIds = queue.body.entries.filter((entry: { status: string }) => entry.status === "completed").map((entry: { id: string }) => entry.id).sort();
  assert.deepEqual(report.body.records.map((record: { id: string }) => record.id).sort(), completedIds);
  assert.equal(completedIds.length, 2);
});
