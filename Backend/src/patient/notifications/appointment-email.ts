import mongoose, { Schema, type ClientSession } from "mongoose";
import { randomUUID } from "node:crypto";
import { Appointment } from "../booking/booking.models.js";
import { Patient } from "../auth/patient.model.js";
import { slotIsFuture } from "../booking/booking.service.js";
import { mailConfigured, mailDelivery, mailErrorCode } from "./mail.service.js";

const schema = new Schema({
  _id: String,
  appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  kind: { type: String, enum: ["booking", "doctor-confirmed", "payment-approved"], required: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ["pending", "sending", "sent", "failed", "skipped"], default: "pending" },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  claimId: String,
  lockedUntil: Date,
  sentAt: Date,
});
schema.index({ status: 1, nextAttemptAt: 1 });
export const AppointmentEmail = mongoose.model("AppointmentEmail", schema);

export async function queueAppointmentEmail(kind: "booking" | "doctor-confirmed" | "payment-approved", details: {
  id: mongoose.Types.ObjectId; patientId: mongoose.Types.ObjectId; email: string; name: string;
  reference: string; doctor: string; hospital: string; department: string; date: string; time: string;
  amount: number; createdAt: Date;
}, session: ClientSession) {
  const approved = kind === "payment-approved";
  const confirmed = kind === "doctor-confirmed";
  const cancelUntil = new Date(details.createdAt.getTime() + 30 * 60_000).toLocaleString("en-GB", { timeZone: "Asia/Colombo" });
  const text = [
    `Hello ${details.name},`, "",
    confirmed
      ? "Your doctor has confirmed your appointment. Please arrive at the hospital on time, preferably 15 minutes before your appointment."
      : approved
        ? "Your appointment payment has been approved. Please arrive at the hospital on time, at least 15 minutes before your appointment."
        : "Your appointment has been booked and is awaiting doctor confirmation. You will receive another email when the doctor confirms it. The appointment details are below.",
    `Appointment ID: ${details.reference}`, `Doctor: ${details.doctor}`, `Hospital: ${details.hospital}`,
    `Department: ${details.department}`, `Date: ${details.date}`, `Time: ${details.time} (Sri Lanka time)`,
    // Government OPD: payment wording preserved but disabled.
    // `Amount: LKR ${details.amount.toFixed(2)}`,
    // `Payment: ${approved ? "Approved" : details.amount > 0 ? "Pending admin verification" : "No payment required"}`,
    // !approved && details.amount > 0 ? "Your payment slip is awaiting review. You will receive another email after approval." : "Bring a valid ID and your medical records if available.",
    "Bring a valid ID and your medical records if available.",
    ...(kind === "booking" ? [`You can cancel in the app within 30 minutes of booking, until ${cancelUntil} (Sri Lanka time), before the appointment starts.`] : []),
    "", "CarePlus Hospital",
  ].join("\n");
  await AppointmentEmail.create([{ _id: `${kind}:${details.id}`, appointmentId: details.id, patientId: details.patientId,
    kind, recipient: details.email, subject: confirmed ? "CarePlus - Appointment confirmed" : approved ? "CarePlus - Payment approved" : "CarePlus - Appointment booked", text }], { session });
}

export async function deliverNextAppointmentEmail(now = new Date()) {
  if (!mailConfigured()) return false;
  const claimId = randomUUID();
  // Government OPD: do not deliver previously queued payment-approval emails.
  const email = await AppointmentEmail.findOneAndUpdate({ kind: { $in: ["booking", "doctor-confirmed"] }, attempts: { $lt: 5 }, $or: [
    { status: "pending", nextAttemptAt: { $lte: now } }, { status: "sending", lockedUntil: { $lte: now } },
  ] }, { $set: { status: "sending", claimId, lockedUntil: new Date(now.getTime() + 120_000) } }, { returnDocument: "after", sort: { nextAttemptAt: 1 } });
  if (!email) return false;
  const claim = { _id: email._id, claimId };
  const [appointment, patient] = await Promise.all([Appointment.findById(email.appointmentId), Patient.exists({ _id: email.patientId })]);
  if (!patient || !appointment || appointment.status === "cancelled" || appointment.doctorDecision === "rejected" ||
    (email.kind === "doctor-confirmed" && (appointment.doctorDecision !== "accepted" || appointment.status !== "confirmed" || !slotIsFuture(appointment.date, appointment.time))) ||
    (email.kind === "payment-approved" && !slotIsFuture(appointment.date, appointment.time))) {
    await AppointmentEmail.updateOne(claim, { $set: { status: "skipped" }, $unset: { claimId: 1, lockedUntil: 1 } });
    return true;
  }
  const attempts = email.attempts + 1;
  try {
    await mailDelivery.send({ to: email.recipient, subject: email.subject, text: email.text,
      messageId: `<${String(email._id).replace(":", "-")}@careplus.patient>` });
  } catch (error) {
    await AppointmentEmail.updateOne(claim, { $set: { status: attempts >= 5 ? "failed" : "pending", attempts,
      nextAttemptAt: new Date(now.getTime() + 60_000 * 2 ** (attempts - 1)) }, $unset: { claimId: 1, lockedUntil: 1 } });
    console.warn(`Appointment email attempt ${attempts}/5 failed (${mailErrorCode(error)}).`);
    return true;
  }
  await AppointmentEmail.updateOne(claim, { $set: { status: "sent", attempts, sentAt: new Date() }, $unset: { claimId: 1, lockedUntil: 1 } });
  return true;
}

export function startAppointmentEmailWorker() {
  let stopping = false;
  let inFlight: Promise<void> | undefined;
  const tick = () => {
    if (stopping || inFlight) return;
    inFlight = (async () => { for (let i = 0; i < 5 && !stopping; i++) if (!await deliverNextAppointmentEmail()) break; })()
      .catch(() => console.warn("Appointment email processing will be retried."))
      .finally(() => { inFlight = undefined; });
  };
  const timer = setInterval(tick, 5000);
  timer.unref();
  tick();
  return async () => { stopping = true; clearInterval(timer); await inFlight; };
}
