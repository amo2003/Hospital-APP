import { z } from "zod";
import type { Types } from "mongoose";
import { Hospital, QueueEntry } from "../../patient/booking/booking.models.js";
import { localToday } from "../../patient/booking/booking.service.js";
import { ApiError } from "../../patient/shared/errors.js";

const dayMs = 86_400_000;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid report date.");

export const reportQuerySchema = z.object({ from: date, to: date }).superRefine((value, ctx) => {
  const days = (Date.parse(value.to) - Date.parse(value.from)) / dayMs;
  if (days < 0 || days > 89) ctx.addIssue({ code: "custom", message: "Choose a date range of up to 90 days, with the start before the end." });
  if (value.to > localToday()) ctx.addIssue({ code: "custom", message: "Report dates cannot be in the future." });
});

type PatientRef = { _id: Types.ObjectId; patientId: string; fullName: string };
type AppointmentRef = { appointmentId: string; time: string; doctorId: { _id: Types.ObjectId; name: string } | null };

export async function completedQueueReport(scope: { hospitalId: Types.ObjectId; accessDepartment: string }, from: string, to: string) {
  // Queue Management covers all departments in this hospital. Report the same
  // completed entries, including legacy entries without a completion timestamp.
  const entries = await QueueEntry.find({
    hospitalId: scope.hospitalId,
    status: "completed", date: { $gte: from, $lte: to },
  }).select("token date department patientId appointmentId completedAt sequence")
    .populate<{ patientId: PatientRef | null }>("patientId", "patientId fullName")
    .populate<{ appointmentId: AppointmentRef | null }>({ path: "appointmentId", select: "appointmentId time doctorId", populate: { path: "doctorId", select: "name" } })
    .sort({ date: -1, sequence: 1 }).limit(5001).lean();
  if (entries.length > 5000) throw new ApiError(422, "This report has too many records. Choose a shorter date range.");
  const hospital = await Hospital.findById(scope.hospitalId).select("name").lean();
  const records = entries.map(entry => ({
    id: String(entry._id), token: entry.token, date: entry.date, department: entry.department,
    patientId: entry.patientId?.patientId ?? null, patientName: entry.patientId?.fullName ?? null,
    appointmentId: entry.appointmentId?.appointmentId ?? null, time: entry.appointmentId?.time ?? null,
    doctorId: entry.appointmentId?.doctorId ? String(entry.appointmentId.doctorId._id) : null,
    doctorName: entry.appointmentId?.doctorId?.name ?? null,
    // Old entries have no reliable completion timestamp; do not invent one from updatedAt.
    completedAt: entry.completedAt?.toISOString() ?? null,
  }));
  const daily = new Map<string, number>();
  for (let stamp = Date.parse(from); stamp <= Date.parse(to); stamp += dayMs) daily.set(new Date(stamp).toISOString().slice(0, 10), 0);
  const doctors = new Map<string, { id: string; name: string | null; count: number }>();
  for (const record of records) {
    daily.set(record.date, (daily.get(record.date) ?? 0) + 1);
    const id = record.doctorId ?? "unavailable";
    const item = doctors.get(id) ?? { id, name: record.doctorName, count: 0 };
    item.count++; doctors.set(id, item);
  }
  return {
    from, to, generatedAt: new Date().toISOString(), hospital: hospital?.name ?? "", department: "All departments",
    summary: { completed: records.length, patients: new Set(entries.filter(e => e.patientId).map(e => String(e.patientId!._id))).size,
      doctors: [...doctors.keys()].filter(id => id !== "unavailable").length, averagePerDay: Number((records.length / daily.size).toFixed(1)) },
    daily: [...daily].map(([date, count]) => ({ date, count })),
    byDoctor: [...doctors.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)), records,
  };
}
