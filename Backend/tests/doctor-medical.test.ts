import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import { DoctorAccount } from "../src/doctor/doctor.model.js";
import { Appointment, Doctor, Hospital } from "../src/patient/booking/booking.models.js";

let db: MongoMemoryReplSet;
let patientToken: string, doctorToken: string, unrelatedToken: string;
let patientId: string, appointmentId: string, otherAppointmentId: string;
const tokenFor = (id: unknown, role: "patient" | "doctor") => jwt.sign({ version: 0, role }, process.env.JWT_SECRET!, {
  subject: String(id), issuer: "careplus", audience: role, expiresIn: "1h",
});
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-medical-record-secret-at-least-thirty-two-characters";
  db = await MongoMemoryReplSet.create({ binary: { downloadDir: path.resolve("tests/.cache") }, replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([Patient.init(), DoctorAccount.init(), Appointment.init()]);
  const hospital = await Hospital.create({ name: "Test Hospital", departments: ["General Medicine"] });
  const doctors = [];
  for (let i = 0; i < 2; i++) {
    const catalog = await Doctor.create({ name: `Doctor ${i}`, hospitalId: hospital._id, specialty: "General Medicine" });
    const account = await DoctorAccount.create({ fullName: `Doctor ${i}`, nic: `19801234567${i}`, dob: "1980-01-01", gender: "Male", slmcNo: `MEDICAL-${i}`, specialty: "General Medicine", qualifications: "MBBS", experience: "5", hospital: hospital.name, phone: `077111111${i}`, email: `medical-doctor${i}@example.com`, passwordHash: "unused", status: "approved", doctorCatalogId: catalog._id });
    doctors.push({ catalog, token: tokenFor(account._id, "doctor") });
  }
  doctorToken = doctors[0].token;
  unrelatedToken = doctors[1].token;
  for (let i = 0; i < 2; i++) {
    const patient = await Patient.create({ fullName: `Patient ${i}`, email: `medical-patient${i}@example.com`, nic: `19901234567${i}`, phone: `+9477000000${i}`, username: `medical_patient${i}`, dateOfBirth: "1990-01-01", gender: "Other", address: "Test address", district: "Colombo", passwordHash: "unused", consentAt: new Date() });
    const appointment = await Appointment.create({ patientId: patient._id, doctorId: doctors[0].catalog._id, hospitalId: hospital._id, department: "General Medicine", date: "2026-12-01", time: i ? "09:15" : "09:00" });
    if (i === 0) {
      patientId = String(patient._id); patientToken = tokenFor(patient._id, "patient"); appointmentId = String(appointment._id);
    } else otherAppointmentId = String(appointment._id);
  }
});
after(async () => { await mongoose.disconnect(); await db?.stop(); });

test("doctor sees the selected patient's latest saved medical measurements only", async () => {
  const medicalDetails = { bloodGroup: "O+", heightCm: 181, weightKg: 72 };
  await request(app).patch("/api/patient/profile").auth(patientToken, { type: "bearer" }).send({ medicalDetails }).expect(200);
  const getRecord = (query: string, token = doctorToken) => request(app).get(`/api/doctor/patient-record?${query}`).auth(token, { type: "bearer" });
  const first = await getRecord(`appointmentId=${appointmentId}`).expect(200);
  assert.equal(first.body.patient.id, patientId);
  assert.deepEqual(first.body.patient.medicalDetails, medicalDetails);
  assert.equal(first.body.vitals.weight, "");
  const byPatient = await getRecord(`patientId=${patientId}`).expect(200);
  assert.deepEqual(byPatient.body.patient.medicalDetails, medicalDetails);
  const empty = await getRecord(`appointmentId=${otherAppointmentId}`).expect(200);
  assert.deepEqual(empty.body.patient.medicalDetails, { bloodGroup: null, heightCm: null, weightKg: null });
  await getRecord(`appointmentId=${appointmentId}`, unrelatedToken).expect(403);
  await getRecord(`patientId=${patientId}`, unrelatedToken).expect(403);
  await request(app).patch("/api/patient/profile").auth(patientToken, { type: "bearer" }).send({ medicalDetails: { ...medicalDetails, weightKg: 75 } }).expect(200);
  assert.equal((await getRecord(`appointmentId=${appointmentId}`)).body.patient.medicalDetails.weightKg, 75);
});
