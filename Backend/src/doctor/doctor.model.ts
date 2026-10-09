import mongoose, { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

export interface IDoctorAccount {
  _id: mongoose.Types.ObjectId;
  doctorId: string;
  fullName: string;
  nic: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  slmcNo: string;
  specialty: string;
  qualifications: string;
  experience: string;
  hospital: string;
  licenseUrl: string;
  phone: string;
  email: string;
  passwordHash: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  doctorCatalogId?: mongoose.Types.ObjectId | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const doctorAccountSchema = new Schema<IDoctorAccount>(
  {
    doctorId: {
      type: String,
      default: () => `DOC-${randomUUID().slice(0, 8).toUpperCase()}`,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    nic: { type: String, required: true, unique: true, uppercase: true, trim: true },
    dob: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    slmcNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    qualifications: { type: String, required: true, trim: true },
    experience: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    licenseUrl: { type: String, default: "" },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    doctorCatalogId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DoctorAccount = mongoose.model<IDoctorAccount>(
  "DoctorAccount",
  doctorAccountSchema,
);

export function publicDoctor(doctor: any) {
  const {
    _id,
    doctorId,
    fullName,
    nic,
    dob,
    gender,
    slmcNo,
    specialty,
    qualifications,
    experience,
    hospital,
    licenseUrl,
    phone,
    email,
    status,
    rejectionReason,
    doctorCatalogId,
    createdAt,
  } = doctor;
  return {
    id: String(_id),
    doctorId,
    fullName,
    nic,
    dob,
    gender,
    slmcNo,
    specialty,
    qualifications,
    experience,
    hospital,
    licenseUrl,
    phone,
    email,
    status,
    rejectionReason: rejectionReason || undefined,
    doctorCatalogId: doctorCatalogId ? String(doctorCatalogId) : null,
    createdAt,
  };
}

export interface IClinicalNote {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  note: string;
  vitals?: {
    bloodPressure?: string;
    bloodSugar?: string;
    weight?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const clinicalNoteSchema = new Schema<IClinicalNote>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    note: { type: String, required: true, trim: true },
    vitals: {
      bloodPressure: { type: String, default: "130/85" },
      bloodSugar: { type: String, default: "142" },
      weight: { type: String, default: "78 kg" },
    },
  },
  { timestamps: true }
);

export const ClinicalNote = mongoose.model<IClinicalNote>(
  "ClinicalNote",
  clinicalNoteSchema,
);
