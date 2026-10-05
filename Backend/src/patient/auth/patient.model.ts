import mongoose, { Schema } from "mongoose";
import { randomUUID } from "node:crypto";
const schema = new Schema(
  {
    patientId: {
      type: String,
      default: () => `PT-${randomUUID().slice(0, 8).toUpperCase()}`,
      unique: true,
    },
    fullName: { type: String, required: true },
    nic: { type: String, required: true, unique: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    consentAt: { type: Date, required: true },
    resetHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);
export const Patient = mongoose.model("Patient", schema);
export function publicPatient(patient: any) {
  const {
    _id,
    patientId,
    fullName,
    nic,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    district,
    username,
  } = patient;
  return {
    id: String(_id),
    patientId,
    fullName,
    nic,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    district,
    username,
  };
}
