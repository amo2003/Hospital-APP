import type { ClientSession } from "mongoose";
import { Appointment, DoctorQueueCounter, QueueEntry } from "./booking.models.js";

export async function allocateDoctorNumber(doctorId: string, date: string, session: ClientSession, reserve = true) {
  const key = `${doctorId}:${date}`;
  const counter = await DoctorQueueCounter.findOneAndUpdate(
    { _id: key }, { $inc: { revision: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  // Lock the doctor/day counter, then number existing bookings in their original
  // creation order. This also upgrades bookings made before doctor numbering.
  const existing = await Appointment.find({ doctorId, date }).sort({ createdAt: 1, _id: 1 }).session(session);
  let sequence = Math.max(counter?.sequence || 0, ...existing.map((a) => a.doctorQueueNumber || 0));
  for (const appointment of existing) {
    if (!appointment.doctorQueueNumber) {
      appointment.doctorQueueNumber = ++sequence;
      await appointment.save({ session });
    }
  }
  await DoctorQueueCounter.updateOne({ _id: key }, { $set: { sequence: sequence + (reserve ? 1 : 0) } }, { session });
  return sequence + (reserve ? 1 : 0);
}

export async function patientQueue(appointment: InstanceType<typeof Appointment>, patient: { _id: unknown; fullName: string }) {
  if (await Appointment.exists({ doctorId: appointment.doctorId, date: appointment.date, doctorQueueNumber: { $exists: false } })) {
    await Appointment.db.transaction(async (session) => {
      await allocateDoctorNumber(String(appointment.doctorId), appointment.date, session, false);
    });
  }
  const bookings = await Appointment.find({ doctorId: appointment.doctorId, date: appointment.date })
    .select("patientId time status doctorQueueNumber createdAt")
    .sort({ createdAt: 1, _id: 1 });
  const states = await QueueEntry.find({ appointmentId: { $in: bookings.map((a) => a._id) } }).select("appointmentId status");
  const statuses = new Map(states.map((entry) => [String(entry.appointmentId), entry.status]));
  const entries = bookings.map((a, index) => {
    const isYou = String(a.patientId) === String(patient._id);
    const status = a.status === "cancelled" || a.status === "completed" ? a.status : statuses.get(String(a._id)) || "waiting";
    return {
      queueNumber: a.doctorQueueNumber || index + 1,
      isYou,
      ...(isYou ? { name: patient.fullName } : {}),
      time: a.time,
      status,
      selected: String(a._id) === String(appointment._id),
    };
  }).sort((a, b) => a.queueNumber - b.queueNumber);
  const own = entries.find((a) => a.selected)!;
  appointment.doctorQueueNumber = own.queueNumber;
  await appointment.populate([{ path: "doctorId", select: "name specialty" }, { path: "hospitalId", select: "name" }]);
  return {
    appointment,
    queueNumber: own.queueNumber,
    status: own.status,
    startsAt: `${appointment.date}T${appointment.time}:00+05:30`,
    serverTime: new Date().toISOString(),
    patientsAhead: entries.filter((a) => a.queueNumber < own.queueNumber && (a.status === "waiting" || a.status === "serving")).length,
    nowServing: entries.find((a) => a.status === "serving")?.queueNumber ?? null,
    estimatedWaitMinutes: entries.filter((a) => a.queueNumber < own.queueNumber && (a.status === "waiting" || a.status === "serving")).length * 5,
    // Names and persistent patient identifiers never leave the server for others.
    entries: entries.filter((a) => a.status !== "cancelled" || a.isYou),
  };
}
