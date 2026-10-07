import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    seedKey: { type: String, required: true },
    type: { type: String, enum: ["queue", "appointment", "general"], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    action: { type: String, enum: ["queue", "appointment-reminder", null], default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
notificationSchema.index({ patientId: 1, createdAt: -1 });
notificationSchema.index({ patientId: 1, seedKey: 1 }, { unique: true });

export const Notification = mongoose.model("Notification", notificationSchema);
