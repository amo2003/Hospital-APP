import { Router } from "express";
import { z } from "zod";
import { Appointment, Doctor, Hospital, QueueEntry } from "./booking.models.js";
import { Patient } from "../auth/patient.model.js";
import { ApiError } from "../shared/errors.js";
import { OPD_SLOTS, localToday, slotIsFuture, validateBookingDate, resolveDoctorDecision } from "./booking.service.js";
import { patientQueue } from "./patient-queue.js";
// Government OPD: payment implementation preserved but disabled.
// import { PaymentSlip } from "../payments/payment.models.js";
import { queueAppointmentEmail } from "../notifications/appointment-email.js";
import { Notification } from "../notifications/notification.model.js";
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
    await Doctor.find({ hospitalId, specialty: department, active: true })
      .populate("hospitalId", "name")
      .sort({ name: 1 }),
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
  const appointments = await Appointment.find({ patientId: req.patient!._id, ...(scope === "today" ? { date: localToday() } : {}) })
    .populate("hospitalId", "name")
    .populate("doctorId", "name specialty")
    .sort({ date: -1, time: -1 });

  res.json(
    appointments.map((apt) => {
      const obj = apt.toObject();
      return {
        ...obj,
        doctorQueueNumber: apt.doctorDecision === "accepted" ? apt.doctorQueueNumber : undefined,
        doctorDecision: resolveDoctorDecision(apt),
      };
    }),
  );
});
bookingRoutes.get("/queue", async (req, res) => {
  const { appointmentId } = z.object({ appointmentId: objectId.optional() }).parse(req.query);
  const appointment = await Appointment.findOne({
    patientId: req.patient!._id,
    ...(appointmentId ? { _id: appointmentId } : { status: "confirmed", doctorDecision: { $ne: "rejected" }, date: { $gte: localToday() } }),
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
      // expectedFeeLkr: z.number().nonnegative().optional(),
      // slipId: objectId.optional(),
    })
    .parse(req.body);
  /* Government OPD: paid booking retry logic disabled.
  // A retried confirmation after a network timeout must not create a second paid booking.
  if (data.slipId) {
    const existing = await Appointment.findOne({ patientId: req.patient!._id, "payment.slipId": data.slipId });
    if (existing && String(existing.doctorId) === data.doctorId && String(existing.hospitalId) === data.hospitalId &&
      existing.date === data.date && existing.time === data.time && existing.department === data.department) {
      if (existing.status === "cancelled") throw new ApiError(409, "This booking was cancelled. Upload a new payment slip for a new booking.");
      await existing.populate([{ path: "hospitalId", select: "name" }, { path: "doctorId", select: "name specialty" }]);
      res.json(existing);
      return;
    }
  }
  */
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
  const appointment = await Appointment.db.transaction(async (session) => {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.patient!._id },
      { $set: { updatedAt: new Date() } },
      { session },
    );
    if (!patient) throw new ApiError(401, "Please sign in again.");
    /* Government OPD: stored doctor fees must not block free bookings.
    // Serialize against fee edits so the receipt is attached to the price the patient saw.
    const pricedDoctor = await Doctor.findOneAndUpdate({ _id: doctor._id, active: true },
      { $inc: { paymentRevision: 1 } }, { session, returnDocument: "after" });
    if (!pricedDoctor) throw new ApiError(409, "This doctor is no longer available.");
    const amountLkr = pricedDoctor.feeLkr || 0;
    if ((data.expectedFeeLkr ?? 0) !== amountLkr)
      throw new ApiError(409, "The doctor fee has changed. Select the doctor again to review the latest fee.");
    if (amountLkr > 0 && (!data.slipId || !pricedDoctor.paymentInstructions.trim()))
      throw new ApiError(400, "Upload your payment slip before confirming the appointment.");
    */
    const amountLkr = 0;
    const created = (

      await Appointment.create([{ ...data, patientId: patient._id, doctorDecision: "pending",
        // payment: { amountLkr, status: amountLkr > 0 ? "pending" : "not_required", ...(amountLkr > 0 ? { slipId: data.slipId } : {}) },
        payment: { amountLkr: 0, status: "not_required" },
      }], {
        session,
      })
    )[0];
    /* Government OPD: no receipt attachment.
    if (amountLkr > 0) {
      const slip = await PaymentSlip.findOneAndUpdate({ _id: data.slipId, patientId: patient._id,
        doctorId: doctor._id, appointmentId: { $exists: false }, expiresAt: { $gt: new Date() } },
        { $set: { appointmentId: created._id }, $unset: { expiresAt: 1 } }, { session });
      if (!slip) throw new ApiError(400, "This payment slip is unavailable. Please upload it again.");
    }
    */
    await Notification.create([{
      patientId: patient._id,
      seedKey: `appointment:${created._id}:booked`,
      type: "appointment",
      title: "Appointment Booked",
      description: `${doctor.name} appointment booked for ${data.date} at ${data.time}. Waiting for doctor confirmation.`,
      action: "appointment-reminder",
      read: false,
    }], { session });
    await queueAppointmentEmail("booking", { id: created._id, patientId: patient._id, email: patient.email,
      name: patient.fullName, reference: created.appointmentId, doctor: doctor.name, hospital: hospital.name,
      department: data.department, date: data.date, time: data.time, amount: amountLkr, createdAt: created.createdAt }, session);
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
  const appointment = await Appointment.db.transaction(async (session) => {
  const current = await Appointment.findOne({
    _id: id,
    patientId: req.patient!._id,
    status: "confirmed",
  }).session(session);
  if (!current) throw new ApiError(404, "Active appointment not found.");
  if (Date.now() >= current.createdAt.getTime() + 30 * 60_000)
    throw new ApiError(400, "Appointments can only be cancelled within 30 minutes of booking.");
  if (!slotIsFuture(current.date, current.time))
    throw new ApiError(400, "Past appointments cannot be cancelled.");
  current.status = "cancelled";
  await current.save({ session });
  await QueueEntry.updateOne(
    { appointmentId: current._id, status: { $in: ["waiting", "serving"] } },
    { $set: { status: "cancelled" } },
    { session },
  );
  return current;
  });
  res.json(appointment);
});
