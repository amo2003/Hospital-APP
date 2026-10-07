import mongoose, { Schema } from "mongoose";
import { randomUUID } from "node:crypto";
export const Hospital = mongoose.model(
  "Hospital",
  new Schema({
    name: { type: String, required: true },
    departments: [String],
    active: { type: Boolean, default: true },
  }),
);
export const Doctor = mongoose.model(
  "Doctor",
  new Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    weekdays: [Number],
    slots: {
      type: [String],
      default: () => ["09:00", "10:00", "12:00", "16:00", "18:00"],
    },
    active: { type: Boolean, default: true },
  }),
);
const schema = new Schema(
  {
    appointmentId: {
      type: String,
      unique: true,
      default: () => `OPD-${randomUUID().slice(0, 12).toUpperCase()}`,
    },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);
// Unique indexes also protect simultaneous requests from different devices.
schema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);
schema.index(
  { patientId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);
export const Appointment = mongoose.model("Appointment", schema);

const queueEntrySchema = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    sequence: { type: Number, required: true },
    token: { type: String, required: true },
    status: { type: String, enum: ["waiting", "serving", "completed", "cancelled"], default: "waiting" },
  },
  { timestamps: true },
);
queueEntrySchema.index({ hospitalId: 1, date: 1, department: 1, sequence: 1 }, { unique: true });
export const QueueEntry = mongoose.model("QueueEntry", queueEntrySchema);

const queueCounterSchema = new Schema({
  hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
  date: { type: String, required: true },
  department: { type: String, required: true },
  sequence: { type: Number, default: 0 },
});
queueCounterSchema.index({ hospitalId: 1, date: 1, department: 1 }, { unique: true });
export const QueueCounter = mongoose.model("QueueCounter", queueCounterSchema);
