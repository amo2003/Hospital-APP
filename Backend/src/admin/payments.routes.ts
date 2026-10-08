import { Router } from "express";
import { z } from "zod";
import { authenticateAdmin } from "./admin.middleware.js";
import { Appointment, Doctor, Hospital } from "../patient/booking/booking.models.js";
import { Patient } from "../patient/auth/patient.model.js";
import { PaymentSlip } from "../patient/payments/payment.models.js";
import { queueAppointmentEmail } from "../patient/notifications/appointment-email.js";
import { slotIsFuture } from "../patient/booking/booking.service.js";
import { ApiError } from "../patient/shared/errors.js";

export const adminPaymentRoutes = Router();
adminPaymentRoutes.use(authenticateAdmin);
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
adminPaymentRoutes.get("/doctor-fees", async (_req, res) => {
  res.json(await Doctor.find({ active: true }).populate("hospitalId", "name").sort({ name: 1 }));
});
adminPaymentRoutes.patch("/doctor-fees/:id", async (req, res) => {
  const doctorId = id.parse(req.params.id);
  const data = z.object({ feeLkr: z.number().min(0).max(1_000_000).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, "Use at most two decimal places."),
    paymentInstructions: z.string().trim().max(2000) }).refine((v) => v.feeLkr === 0 || v.paymentInstructions.length >= 10,
    "Provide bank/account payment instructions for a paid appointment.").parse(req.body);
  const doctor = await Doctor.findOneAndUpdate({ _id: doctorId, active: true }, { $set: data, $inc: { paymentRevision: 1 } }, { returnDocument: "after", runValidators: true });
  if (!doctor) throw new ApiError(404, "Doctor not found.");
  res.json(doctor);
});
adminPaymentRoutes.get("/payments", async (req, res) => {
  const query = z.object({ doctorId: id.optional(), status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
  const baseFilter = { "payment.slipId": { $exists: true },
    ...(query.doctorId ? { doctorId: query.doctorId } : {}), ...(query.date ? { date: query.date } : {}) };
  const filter = { ...baseFilter, ...(query.status !== "all" ? { "payment.status": query.status } : {}) };
  const [items, total, pending, approved, rejected] = await Promise.all([Appointment.find(filter).populate("doctorId", "name specialty").populate("hospitalId", "name")
    .populate("patientId", "fullName patientId").populate("payment.slipId", "filename contentType uploadedAt size")
    .sort({ createdAt: -1 }).skip((query.page - 1) * 30).limit(30).lean(), Appointment.countDocuments(filter),
    ...["pending", "approved", "rejected"].map((status) => Appointment.countDocuments({ ...baseFilter, "payment.status": status }))]);
  res.json({ items, total, page: query.page, counts: { pending, approved, rejected } });
});
adminPaymentRoutes.get("/payments/:id/slip", async (req, res) => {
  const appointment = await Appointment.findById(id.parse(req.params.id));
  const slip = appointment?.payment?.slipId && await PaymentSlip.findOne({ _id: appointment.payment.slipId, appointmentId: appointment._id }).select("+data");
  if (!slip?.data) throw new ApiError(404, "Payment slip not found.");
  res.set({ "Content-Type": slip.contentType, "Content-Disposition": `attachment; filename="${slip.filename}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.send(slip.data);
});
adminPaymentRoutes.patch("/payments/:id/approve", async (req, res) => {
  const appointmentId = id.parse(req.params.id);
  const result = await Appointment.db.transaction(async (session) => {
    const appointment = await Appointment.findById(appointmentId).session(session);
    if (!appointment?.payment?.slipId) throw new ApiError(404, "Payment not found.");
    if (appointment.payment.status === "approved") return appointment;
    if (appointment.payment.status !== "pending") throw new ApiError(409, "This payment has already been reviewed. Refresh the list.");
    if (appointment.status !== "confirmed" || appointment.doctorDecision === "rejected" || !slotIsFuture(appointment.date, appointment.time))
      throw new ApiError(400, "Only active, upcoming appointments can have payments approved.");
    const patient = await Patient.findById(appointment.patientId).session(session);
    const doctor = await Doctor.findById(appointment.doctorId).session(session);
    const hospital = await Hospital.findById(appointment.hospitalId).session(session);
    if (!patient || !doctor || !hospital) throw new ApiError(404, "Appointment details are unavailable.");
    appointment.payment.status = "approved";
    appointment.payment.reviewedAt = new Date();
    appointment.payment.reviewedBy = req.admin!._id;
    await appointment.save({ session });
    await queueAppointmentEmail("payment-approved", { id: appointment._id, patientId: patient._id,
      email: patient.email, name: patient.fullName, reference: appointment.appointmentId, doctor: doctor.name,
      hospital: hospital.name, department: appointment.department, date: appointment.date, time: appointment.time,
      amount: appointment.payment.amountLkr, createdAt: appointment.createdAt }, session);
    return appointment;
  });
  res.json(result);
});

adminPaymentRoutes.patch("/payments/:id/reject", async (req, res) => {
  const appointmentId = id.parse(req.params.id);
  const { reason } = z.object({ reason: z.string().trim().min(5, "Enter a rejection reason (at least 5 characters).").max(500) }).parse(req.body);
  const result = await Appointment.db.transaction(async (session) => {
    const appointment = await Appointment.findById(appointmentId).session(session);
    if (!appointment?.payment?.slipId) throw new ApiError(404, "Payment not found.");
    if (appointment.payment.status === "rejected" && appointment.payment.rejectionReason === reason) return appointment;
    if (appointment.payment.status !== "pending") throw new ApiError(409, "This payment has already been reviewed. Refresh the list.");
    if (appointment.status !== "confirmed" || appointment.doctorDecision === "rejected" || !slotIsFuture(appointment.date, appointment.time))
      throw new ApiError(400, "Only active, upcoming appointments can have payments reviewed.");
    appointment.payment.status = "rejected";
    appointment.payment.rejectionReason = reason;
    appointment.payment.reviewedAt = new Date();
    appointment.payment.reviewedBy = req.admin!._id;
    await appointment.save({ session });
    return appointment;
  });
  res.json(result);
});
