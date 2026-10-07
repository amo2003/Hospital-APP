import mongoose, { Schema } from "mongoose";

export interface IAdmin {
  _id: mongoose.Types.ObjectId;
  adminId: string;
  role: "admin";
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    adminId: { type: String, required: true, unique: true, trim: true },
    role: { type: String, default: "admin" },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
