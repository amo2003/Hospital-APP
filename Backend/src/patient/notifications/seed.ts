import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../../config/database.js";
import { Patient } from "../auth/patient.model.js";
import { Appointment, Doctor, Hospital, QueueCounter, QueueEntry } from "../booking/booking.models.js";
import { Notification } from "./notification.model.js";

const demoNotifications = [
  {
    seedKey: "queue-update",
    type: "queue" as const,
    title: "Queue Update",
    description: "Your queue position is being monitored. Open Live Queue for the latest status.",
    action: "queue" as const,
  },
  {
    seedKey: "appointment-reminder",
    type: "appointment" as const,
    title: "Appointment Reminder",
    description: "Check your appointment details before leaving for the hospital.",
    action: "appointment-reminder" as const,
  },
  {
    seedKey: "clinic-update",
    type: "general" as const,
    title: "Clinic Update",
    description: "Please arrive 15 minutes before your scheduled appointment time.",
    action: null,
  },
  {
    seedKey: "appointment-confirmed",
    type: "appointment" as const,
    title: "Appointment Confirmed",
    description: "Your appointment is confirmed. Queue information will appear when the appointment is active.",
    action: "appointment-reminder" as const,
  },
];

async function seed() {
  await connectDatabase();
  const patients = await Patient.find({}, { _id: 1 }).sort({ createdAt: 1 }).lean();
  if (!patients.length) {
    throw new Error("Create or register a patient account before running the queue demo seed.");
  }

  for (const patient of patients) {
    for (const notification of demoNotifications) {
      await Notification.updateOne(
        { patientId: patient._id, seedKey: notification.seedKey },
        { $set: notification, $setOnInsert: { patientId: patient._id, read: false } },
        { upsert: true },
      );
    }
  }

  const hospital = await Hospital.findOne({ active: true }).sort({ name: 1 });
  const doctor = hospital
    ? await Doctor.findOne({ hospitalId: hospital._id, active: true }).sort({ name: 1 })
    : null;
  if (hospital && doctor) {
    const date = nextWeekday(30);
    const demoPatients = patients.slice(0, 5);
    for (const [index, patient] of demoPatients.entries()) {
      const time = ["09:00", "10:00", "12:00", "16:00", "18:00"][index];
      let appointment = await Appointment.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        date,
        status: "confirmed",
      });
      if (!appointment) {
        appointment = await Appointment.create({
          patientId: patient._id,
          hospitalId: hospital._id,
          doctorId: doctor._id,
          department: doctor.specialty,
          date,
          time,
          doctorQueueNumber: index + 1,
          doctorDecision: "accepted",
          status: "confirmed",
        });
      }
      const counter = await QueueCounter.findOneAndUpdate(
        { hospitalId: hospital._id, date, department: doctor.specialty },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await QueueEntry.updateOne(
        { appointmentId: appointment._id },
        {
          $setOnInsert: {
            patientId: patient._id,
            hospitalId: hospital._id,
            department: doctor.specialty,
            date,
            sequence: counter?.sequence || index + 1,
            token: `${doctor.specialty.slice(0, 1).toUpperCase()}-${String(counter?.sequence || index + 1).padStart(3, "0")}`,
            status: index === 0 ? "serving" : "waiting",
          },
        },
        { upsert: true },
      );
    }
    console.log(`Demo queue ready for ${demoPatients.length} patient account(s) on ${date}.`);
  }

  console.log(`Queue notification demo data ready for ${patients.length} patient account(s).`);
  await mongoose.disconnect();
}

function nextWeekday(daysAhead: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  do {
    if (date.getDay() === 0 || date.getDay() === 6)
      date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return date.toISOString().slice(0, 10);
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
