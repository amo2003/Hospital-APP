import { Router } from "express";
import { z } from "zod";
import { Nurse, publicNurse } from "./auth/nurse.model.js";
import { nurseProfileSchema } from "./auth/validation.js";
import { Appointment, QueueEntry } from "../patient/booking/booking.models.js";
import { Patient } from "../patient/auth/patient.model.js";
import { ApiError } from "../patient/shared/errors.js";
import { localToday } from "../patient/booking/booking.service.js";

export const nurseRoutes = Router();

nurseRoutes.get("/profile", (req, res) => {
  res.json(publicNurse(req.nurse));
});

nurseRoutes.patch("/profile", async (req, res) => {
  const data = nurseProfileSchema.parse(req.body);
  const nurse = await Nurse.findByIdAndUpdate(req.nurse!._id, { $set: data }, {
    returnDocument: "after", runValidators: true,
  });
  if (!nurse || nurse.status !== "active") throw new ApiError(401, "Please sign in again.");
  res.json(publicNurse(nurse));
});

nurseRoutes.delete("/profile", async (req, res) => {
  const nurse = await Nurse.findByIdAndUpdate(req.nurse!._id, {
    $set: { status: "inactive" }, $inc: { tokenVersion: 1 },
  }, { returnDocument: "after" });
  if (!nurse) throw new ApiError(401, "Please sign in again.");
  res.sendStatus(204);
});

nurseRoutes.post("/auth/logout", async (req, res) => {
  await Nurse.updateOne({ _id: req.nurse!._id }, { $inc: { tokenVersion: 1 } });
  res.sendStatus(204);
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patientCard = (patient: any, appointment: any) => ({
  id: String(patient._id),
  patientId: patient.patientId,
  fullName: patient.fullName,
  gender: patient.gender,
  age: Math.max(0, new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()),
  phone: patient.phone,
  email: patient.email,
  address: patient.address,
  district: patient.district,
  appointment: appointment ? {
    id: String(appointment._id),
    status: appointment.status,
    department: appointment.department,
    date: appointment.date,
    time: appointment.time,
    hospital: appointment.hospitalId?.name || "",
    doctor: appointment.doctorId?.name || "",
  } : null,
});

nurseRoutes.get("/patients", async (req, res) => {
  const { q = "", status = "all" } = z.object({
    q: z.string().trim().max(100).default(""),
    status: z.enum(["all", "confirmed", "completed", "cancelled"]).default("all"),
  }).parse(req.query);
  if (q.length > 0 && q.length < 2) throw new ApiError(400, "Enter at least 2 characters to search.");
  const query: Record<string, unknown> = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    query.$or = [{ fullName: pattern }, { patientId: pattern }, { phone: pattern }];
  }
  const candidates = await Patient.find(query)
    .select("patientId fullName dateOfBirth gender phone email address district")
    .sort({ fullName: 1 }).limit(30).lean();
  if (!candidates.length) return res.json([]);
  const patientIds = candidates.map((patient) => patient._id);
  const appointmentQuery: Record<string, unknown> = {
    patientId: { $in: patientIds },
    hospitalId: req.nurse!.hospitalId,
      department: req.nurse!.accessDepartment,
  };
  if (status !== "all") appointmentQuery.status = status;
  const appointments = await Appointment.find(appointmentQuery)
    .populate("hospitalId", "name").populate("doctorId", "name")
    .sort({ date: -1, time: -1 }).lean();
  const mostRecent = new Map<string, any>();
  for (const appointment of appointments) {
    const id = String(appointment.patientId);
    if (!mostRecent.has(id)) mostRecent.set(id, appointment);
  }
  const records = candidates
    .filter((patient) => mostRecent.has(String(patient._id)))
    .map((patient) => patientCard(patient, mostRecent.get(String(patient._id))));
  res.json(records);
});

nurseRoutes.get("/patients/:patientId", async (req, res) => {
  const patientId = z.string().regex(/^PT-[A-Z0-9]{8}$/i).parse(req.params.patientId);
  const patient = await Patient.findOne({ patientId }).select(
    "patientId fullName dateOfBirth gender phone email address district",
  ).lean();
  if (!patient) throw new ApiError(404, "Patient not found.");
  const appointments = await Appointment.find({
    patientId: patient._id,
    hospitalId: req.nurse!.hospitalId,
    department: req.nurse!.accessDepartment,
  })
    .populate("hospitalId", "name").populate("doctorId", "name specialty")
    .sort({ date: -1, time: -1 }).limit(10).lean();
  if (!appointments.length) throw new ApiError(404, "Patient not found in your assigned hospital and department.");
  res.json({
    ...patientCard(patient, appointments[0]),
    appointments: appointments.map((appointment: any) => ({
      id: String(appointment._id),
      status: appointment.status,
      department: appointment.department,
      date: appointment.date,
      time: appointment.time,
      hospital: appointment.hospitalId?.name || "",
      doctor: appointment.doctorId?.name || "",
      specialty: appointment.doctorId?.specialty || "",
    })),
  });
});

nurseRoutes.get("/queue", async (req, res) => {
  const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.query);
  const queueDate = date || localToday();
  const entries = await QueueEntry.find({
    date: queueDate,
    hospitalId: req.nurse!.hospitalId,
    department: req.nurse!.accessDepartment,
    status: { $ne: "cancelled" },
  })
    .populate("patientId", "patientId fullName gender")
    .populate("hospitalId", "name")
    .sort({ department: 1, sequence: 1 }).lean();
  const waitingPositions = new Map<string, number>();
  let position = 0;
  for (const entry of entries as any[]) {
    if (entry.status === "waiting") waitingPositions.set(String(entry._id), ++position);
  }
  const queue = entries.map((entry: any) => ({
    id: String(entry._id),
    token: entry.token,
    sequence: entry.sequence,
    status: entry.status,
    department: entry.department,
    date: entry.date,
    patient: entry.patientId ? {
      patientId: entry.patientId.patientId,
      fullName: entry.patientId.fullName,
      gender: entry.patientId.gender,
    } : null,
    hospital: entry.hospitalId?.name || "",
    position: waitingPositions.get(String(entry._id)) || 0,
  }));
  res.json({ date: queueDate, entries: queue });
});

nurseRoutes.patch("/queue/:id/cancel", async (req, res) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid queue entry.").parse(req.params.id);
  const entry = await QueueEntry.findOneAndUpdate(
    { _id: id, status: "waiting", hospitalId: req.nurse!.hospitalId, department: req.nurse!.accessDepartment }, { $set: { status: "cancelled" } }, { returnDocument: "after" },
  );
  if (!entry) throw new ApiError(409, "This queue entry is no longer waiting and cannot be cancelled.");
  res.json({ id: String(entry._id), token: entry.token, status: entry.status });
});
