import { ApiError } from "../shared/errors.js";
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
