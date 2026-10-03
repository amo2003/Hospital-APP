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
    slots: [String],
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
