import { Appointment } from "./booking.models.js";

export async function migratePatientBookingIndex() {
  // Ensure doctor-slot uniqueness is present before removing the old patient limit.
  await Appointment.init();
  const indexes = await Appointment.collection.indexes();
  for (const index of indexes) {
    const keys = Object.entries(index.key);
    if (index.unique && index.name && keys.length === 3 &&
        keys[0][0] === "patientId" && keys[0][1] === 1 &&
        keys[1][0] === "date" && keys[1][1] === 1 &&
        keys[2][0] === "time" && keys[2][1] === 1) {
      try {
        await Appointment.collection.dropIndex(index.name);
      } catch (error: any) {
        if (error.code !== 27) throw error; // Another instance may have migrated it.
      }
    }
  }
  await Appointment.collection.createIndex({ patientId: 1, date: 1, time: 1 }, { name: "patient_schedule" });
}
