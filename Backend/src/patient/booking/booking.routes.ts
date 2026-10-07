import { Router } from "express";
import { z } from "zod";
import { Appointment, Doctor, DoctorQueueCounter, Hospital, QueueEntry, QueueCounter } from "./booking.models.js";
import { Patient } from "../auth/patient.model.js";
import { ApiError } from "../shared/errors.js";
import { OPD_SLOTS, localToday, slotIsFuture, validateBookingDate } from "./booking.service.js";
import { allocateDoctorNumber, patientQueue } from "./patient-queue.js";
export const bookingRoutes = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
bookingRoutes.get("/hospitals", async (_req, res) => {
  res.json(await Hospital.find({ active: true }).sort({ name: 1 }));
});
bookingRoutes.get("/doctors", async (req, res) => {
  const { hospitalId, department } = z
    .object({ hospitalId: objectId, department: z.string().min(1).max(100) })
    .parse(req.query);
  res.json(
    await Doctor.find({ hospitalId, specialty: department, active: true }).sort(
      { name: 1 },
    ),
  );
});
bookingRoutes.get("/slots", async (req, res) => {
  const { doctorId, date } = z
    .object({ doctorId: objectId, date: z.string() })
    .parse(req.query);
  validateBookingDate(date);
  const doctor = await Doctor.findOne({ _id: doctorId, active: true });
  if (!doctor) throw new ApiError(404, "Doctor not found.");
  const busy = await Appointment.find({
    doctorId,
    date,
    status: "confirmed",
  }).select("time");
  const working = doctor.weekdays.includes(
    new Date(`${date}T12:00:00+05:30`).getUTCDay(),
  );
  res.json(
    working
      ? OPD_SLOTS.map((time) => ({
          time,
          available:
            slotIsFuture(date, time) && !busy.some((a) => a.time === time),
        }))
      : [],
  );
});
bookingRoutes.get("/appointments", async (req, res) => {
  const { scope } = z.object({ scope: z.enum(["today", "all"]).optional() }).parse(req.query);
  res.json(
    await Appointment.find({ patientId: req.patient!._id, ...(scope === "today" ? { date: localToday() } : {}) })
      .populate("hospitalId", "name")
      .populate("doctorId", "name specialty")
      .sort({ date: -1, time: -1 }),
  );
});
bookingRoutes.get("/queue", async (req, res) => {
  const { appointmentId } = z.object({ appointmentId: objectId.optional() }).parse(req.query);
  const appointment = await Appointment.findOne({
    patientId: req.patient!._id,
    ...(appointmentId ? { _id: appointmentId } : { status: "confirmed", date: { $gte: localToday() } }),
  }).sort({ date: 1, time: 1 });
  if (!appointment) {
    if (appointmentId) throw new ApiError(404, "Appointment not found.");
    res.json(null);
    return;
  }
  res.json(await patientQueue(appointment, req.patient!));
});
bookingRoutes.post("/appointments", async (req, res) => {
  const data = z
    .object({
      hospitalId: objectId,
      doctorId: objectId,
      department: z.string().min(1).max(100),
      date: z.string(),
      time: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .parse(req.body);
  validateBookingDate(data.date);
  const [doctor, hospital] = await Promise.all([
    Doctor.findOne({
      _id: data.doctorId,
      hospitalId: data.hospitalId,
      specialty: data.department,
      active: true,
    }),
    Hospital.findOne({
      _id: data.hospitalId,
      active: true,
      departments: data.department,
    }),
  ]);
  if (
    !doctor ||
    !hospital ||
    !doctor.weekdays.includes(
      new Date(`${data.date}T12:00:00+05:30`).getUTCDay(),
    ) ||
    !OPD_SLOTS.includes(data.time) ||
    !slotIsFuture(data.date, data.time)
  )
    throw new ApiError(
      400,
      "This appointment slot is unavailable. Please choose another.",
    );
  await DoctorQueueCounter.updateOne({ _id: `${data.doctorId}:${data.date}` }, { $setOnInsert: { sequence: 0, revision: 0 } }, { upsert: true });
  const appointment = await Appointment.db.transaction(async (session) => {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.patient!._id },
      { $set: { updatedAt: new Date() } },
      { session },
    );
    if (!patient) throw new ApiError(401, "Please sign in again.");
    const doctorQueueNumber = await allocateDoctorNumber(data.doctorId, data.date, session);
    const created = (
      await Appointment.create([{ ...data, patientId: patient._id, doctorQueueNumber }], {
        session,
      })
    )[0];
    const counter = await QueueCounter.findOneAndUpdate(
      { hospitalId: data.hospitalId, date: data.date, department: data.department },
      { $inc: { sequence: 1 } },
      { new: true, returnDocument: "after", upsert: true, session, setDefaultsOnInsert: true },
    );
    const prefix = data.department.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "Q";
    const sequence = counter?.sequence || 1;
    await QueueEntry.create([{
      appointmentId: created._id,
      patientId: patient._id,
      hospitalId: data.hospitalId,
      department: data.department,
      date: data.date,
      sequence,
      token: `${prefix}-${String(sequence).padStart(3, "0")}`,
    }], { session });
    return created;
  });
  await appointment.populate([
    { path: "hospitalId", select: "name" },
    { path: "doctorId", select: "name specialty" },
  ]);
  res.status(201).json(appointment);
});
bookingRoutes.patch("/appointments/:id/cancel", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const appointment = await Appointment.findOne({
    _id: id,
    patientId: req.patient!._id,
    status: "confirmed",
  });
  if (!appointment) throw new ApiError(404, "Active appointment not found.");
  if (!slotIsFuture(appointment.date, appointment.time))
    throw new ApiError(400, "Past appointments cannot be cancelled.");
  appointment.status = "cancelled";
  await appointment.save();
  await QueueEntry.updateOne(
    { appointmentId: appointment._id, status: "waiting" },
    { $set: { status: "cancelled" } },
  );
  res.json(appointment);
});
