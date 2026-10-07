import mongoose, { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

const schema = new Schema(
  {
    nurseId: {
      type: String,
      default: () => `NUR-${randomUUID().slice(0, 8).toUpperCase()}`,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    nic: { type: String, required: true, unique: true, uppercase: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    department: { type: String, required: true },
    accessDepartment: { type: String, required: true, immutable: true },
    ward: { type: String, default: "" },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    role: { type: String, enum: ["nurse"], default: "nurse", immutable: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Nurse = mongoose.model("Nurse", schema);

export function publicNurse(nurse: any) {
  const {
    _id,
    nurseId,
    fullName,
    nic,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    district,
    username,
    department,
    ward,
    hospitalId,
    role,
    status,
  } = nurse;
  return {
    id: String(_id),
    nurseId,
    fullName,
    nic,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    district,
    username,
    department,
    ward,
    hospitalId: String(hospitalId),
    role,
    status,
  };
}
