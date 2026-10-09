import { Router } from "express";
import { z } from "zod";
import { Nurse, publicNurse } from "./auth/nurse.model.js";
import { nurseProfileSchema } from "./auth/validation.js";
import { Appointment, QueueEntry, QueueCounter } from "../patient/booking/booking.models.js";
import { Patient } from "../patient/auth/patient.model.js";
import { ApiError } from "../patient/shared/errors.js";
import { localToday, resolveDoctorDecision } from "../patient/booking/booking.service.js";
import { Notification } from "../patient/notifications/notification.model.js";

export const nurseRoutes = Router();

nurseRoutes.get("/notifications", async (req, res) => {
  const filters = z.object({
    type: z.enum(["all", "appointment", "queue", "general"]).default("all"),
    read: z.enum(["all", "read", "unread"]).default("all"),
  }).parse(req.query);
  const query: Record<string, unknown> = {};
  if (filters.type !== "all") query.type = filters.type;
  if (filters.read !== "all") query.read = filters.read === "read";
  const notifications = await Notification.find(query)
    .populate("patientId", "patientId fullName")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(notifications.map((notification: any) => ({
    id: String(notification._id),
    type: notification.type,
    title: notification.title,
    description: notification.description,
    read: notification.read,
    createdAt: notification.createdAt,
    patient: notification.patientId
      ? {
          patientId: notification.patientId.patientId,
          fullName: notification.patientId.fullName,
        }
      : null,
  })));
});

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
    status: z.enum(["all", "confirmed", "outpatient", "completed", "cancelled"]).default("all"),
  }).parse(req.query);
  if (q.length > 0 && q.length < 2) throw new ApiError(400, "Enter at least 2 characters to search.");
  const query: Record<string, unknown> = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { fullName: pattern },
      { patientId: pattern },
      { phone: pattern },
      { address: pattern },
      { email: pattern },
      { nic: pattern },
    ];
  }
  const candidates = await Patient.find(query)
    .select("patientId fullName dateOfBirth gender phone email address district")
    .sort({ fullName: 1 }).limit(50).lean();
  if (!candidates.length) return res.json([]);
  const patientIds = candidates.map((patient) => patient._id);
  const appointmentQuery: Record<string, unknown> = {
    patientId: { $in: patientIds },
    hospitalId: req.nurse!.hospitalId,
  };
  if (status === "outpatient" || status === "confirmed") {
    appointmentQuery.status = "confirmed";
  } else if (status !== "all") {
    appointmentQuery.status = status;
  }
  const appointments = await Appointment.find(appointmentQuery)
    .populate("hospitalId", "name").populate("doctorId", "name")
    .sort({ date: -1, time: -1 }).lean();
  const mostRecent = new Map<string, any>();
  for (const appointment of appointments) {
    const id = String(appointment.patientId);
    if (!mostRecent.has(id)) mostRecent.set(id, appointment);
  }
  const records = candidates
    .filter((patient) => status === "all" || mostRecent.has(String(patient._id)))
    .map((patient) => patientCard(patient, mostRecent.get(String(patient._id)) || null));
  res.json(records);
});

nurseRoutes.get("/patients/:patientId", async (req, res) => {
  const patientId = z.string().regex(/^PT-[A-Z0-9]{8}$/i).parse(req.params.patientId);
  const patient = await Patient.findOne({ patientId }).select(
    "patientId fullName dateOfBirth gender phone email address district",
  ).lean();
  if (!patient) throw new ApiError(404, "Patient not found.");
  const appointments = await Appointment.find({ patientId: patient._id })
    .populate("hospitalId", "name").populate("doctorId", "name specialty")
    .sort({ date: -1, time: -1 }).limit(10).lean();
  res.json({
    ...patientCard(patient, appointments[0] || null),
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

nurseRoutes.get("/appointments", async (req, res) => {
  const { date, status } = z.object({
    date: z.string().trim().optional(),
    status: z.enum(["all", "confirmed", "completed", "cancelled"]).default("all"),
  }).parse(req.query);
  const query: Record<string, unknown> = { hospitalId: req.nurse!.hospitalId };
  if (date) query.date = date;
  if (status !== "all") query.status = status;
  const appointments = await Appointment.find(query)
    .populate("patientId", "patientId fullName phone")
    .populate("doctorId", "name specialty")
    .sort({ date: -1, time: -1 })
    .limit(100)
    .lean();
  res.json(appointments.map((appointment: any) => ({
    id: String(appointment._id),
    appointmentId: appointment.appointmentId,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    doctorDecision: resolveDoctorDecision(appointment),
    department: appointment.department,
    patient: appointment.patientId
      ? { patientId: appointment.patientId.patientId, fullName: appointment.patientId.fullName, phone: appointment.patientId.phone }
      : null,
    doctor: appointment.doctorId
      ? { name: appointment.doctorId.name, specialty: appointment.doctorId.specialty }
      : null,
  })));
});

nurseRoutes.get("/queue", async (req, res) => {
  const { date, allDepartments } = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    allDepartments: z.enum(["true", "false"]).optional(),
  }).parse(req.query);
  const queueDate = date || localToday();

  const filter: Record<string, unknown> = {
    date: queueDate,
    status: { $ne: "cancelled" },
  };
  if (allDepartments !== "true") {
    filter.department = req.nurse!.accessDepartment;
  }
  filter.hospitalId = req.nurse!.hospitalId;

  let entries = await QueueEntry.find(filter)
    .populate("appointmentId", "doctorDecision status")
    .populate("patientId", "patientId fullName gender")
    .populate("hospitalId", "name")
    .sort({ department: 1, sequence: 1 }).lean();

  if (!entries.length) {
    const fallbackFilter: Record<string, unknown> = {
      date: queueDate,
      status: { $ne: "cancelled" },
    };
    if (allDepartments !== "true") {
      fallbackFilter.department = req.nurse!.accessDepartment;
    }
    entries = await QueueEntry.find(fallbackFilter)
      .populate("appointmentId", "doctorDecision status")
      .populate("patientId", "patientId fullName gender")
      .populate("hospitalId", "name")
      .sort({ department: 1, sequence: 1 }).lean();
  }

  if (!entries.length && allDepartments !== "true") {
    entries = await QueueEntry.find({
      date: queueDate,
      status: { $ne: "cancelled" },
    })
      .populate("appointmentId", "doctorDecision status")
      .populate("patientId", "patientId fullName gender")
      .populate("hospitalId", "name")
      .sort({ department: 1, sequence: 1 }).lean();
  }

  // Active queue must exclude appointments that are pending doctor approval or rejected
  entries = (entries as any[]).filter((entry) => {
    const apt = entry.appointmentId;
    if (!apt) return true;
    const decision = resolveDoctorDecision(apt);
    if (decision === "pending" || decision === "rejected") return false;
    return true;
  });

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

nurseRoutes.post("/queue/call-next", async (req, res) => {
  const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.query);
  const queueDate = date || localToday();

  let activeServing = await QueueEntry.findOne({
    hospitalId: req.nurse!.hospitalId,
    department: req.nurse!.accessDepartment,
    date: queueDate,
    status: "serving",
  });
  if (!activeServing) {
    activeServing = await QueueEntry.findOne({
      date: queueDate,
      status: "serving",
    });
  }
  if (activeServing) {
    throw new ApiError(409, "A patient is already being served. Complete the current consultation first.");
  }

  const candidates = await QueueEntry.find({
    hospitalId: req.nurse!.hospitalId,
    department: req.nurse!.accessDepartment,
    date: queueDate,
    status: "waiting",
  })
    .sort({ sequence: 1 })
    .populate("appointmentId", "doctorDecision status");

  let eligible = candidates.find((e: any) => {
    const apt = e.appointmentId;
    if (!apt) return true;
    const decision = resolveDoctorDecision(apt);
    return decision !== "pending" && decision !== "rejected";
  });

  if (!eligible) {
    const fallbackCandidates = await QueueEntry.find({
      date: queueDate,
      status: "waiting",
    })
      .sort({ sequence: 1 })
      .populate("appointmentId", "doctorDecision status");

    eligible = fallbackCandidates.find((e: any) => {
      const apt = e.appointmentId;
      if (!apt) return true;
      const decision = resolveDoctorDecision(apt);
      return decision !== "pending" && decision !== "rejected";
    });
  }

  if (!eligible) {
    throw new ApiError(404, "No waiting patients in the queue for today.");
  }

  const nextWaiting = await QueueEntry.findOneAndUpdate(
    { _id: eligible._id, status: "waiting" },
    { $set: { status: "serving" } },
    { returnDocument: "after" },
  )
    .populate("patientId", "patientId fullName gender")
    .populate("hospitalId", "name");

  if (!nextWaiting) {
    throw new ApiError(409, "The selected queue entry was already updated. Please try again.");
  }

  res.json({
    id: String(nextWaiting._id),
    token: nextWaiting.token,
    sequence: nextWaiting.sequence,
    status: nextWaiting.status,
    department: nextWaiting.department,
    date: nextWaiting.date,
    patient: nextWaiting.patientId ? {
      patientId: (nextWaiting.patientId as any).patientId,
      fullName: (nextWaiting.patientId as any).fullName,
      gender: (nextWaiting.patientId as any).gender,
    } : null,
    hospital: (nextWaiting.hospitalId as any)?.name || "",
    position: 0,
  });
});

nurseRoutes.patch("/queue/:id/complete", async (req, res) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid queue entry.").parse(req.params.id);
  const entry = await QueueEntry.findOneAndUpdate(
    {
      _id: id,
      status: "serving",
    },
    { $set: { status: "completed" } },
    { returnDocument: "after" },
  )
    .populate("patientId", "patientId fullName gender")
    .populate("hospitalId", "name");
  if (!entry) {
    throw new ApiError(404, "Active serving queue entry not found.");
  }
  await Appointment.updateOne({ _id: entry.appointmentId }, { $set: { status: "completed" } });
  res.json({
    id: String(entry._id),
    token: entry.token,
    sequence: entry.sequence,
    status: entry.status,
    department: entry.department,
    date: entry.date,
    patient: entry.patientId ? {
      patientId: (entry.patientId as any).patientId,
      fullName: (entry.patientId as any).fullName,
      gender: (entry.patientId as any).gender,
    } : null,
    hospital: (entry.hospitalId as any)?.name || "",
    position: 0,
  });
});

nurseRoutes.patch("/queue/:id/cancel", async (req, res) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid queue entry.").parse(req.params.id);
  const entry = await QueueEntry.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ["waiting", "serving"] },
    },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" },
  );
  if (!entry) throw new ApiError(409, "This queue entry cannot be cancelled.");
  res.json({ id: String(entry._id), token: entry.token, status: entry.status });
});
