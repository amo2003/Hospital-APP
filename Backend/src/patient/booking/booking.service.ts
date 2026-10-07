import { ApiError } from "../shared/errors.js";
// OPD sessions use 15-minute appointments; closing times are not start times.
// Shared by availability and booking validation, including existing doctors.
export const OPD_SLOTS = [9, 17, 18].flatMap((hour) =>
  [0, 15, 30, 45].map(
    (minute) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  ),
);
export const localToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validateBookingDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+05:30`);
  const max = new Date();
  max.setDate(max.getDate() + 90);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    isNaN(parsed.getTime()) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
    date < localToday() ||
    parsed > max
  )
    throw new ApiError(400, "Choose a valid date within the next 90 days.");
}
export function slotIsFuture(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`).getTime() > Date.now();
}
export function appointmentTimeHasPassed(date: string, time: string) {
  return Date.now() >= new Date(`${date}T${time}:00+05:30`).getTime();
}
export function resolveDoctorDecision(apt: any): "pending" | "accepted" | "rejected" {
  if (!apt) return "pending";
  if (apt.status === "completed") {
    return "accepted";
  }
  if (apt.status === "cancelled") {
    return apt.doctorDecision === "rejected" ? "rejected" : "accepted";
  }
  if (apt.doctorDecision === "accepted") {
    return "accepted";
  }
  if (apt.doctorDecision === "rejected") {
    return "rejected";
  }
  return "pending";
}
