import mongoose, { Schema } from "mongoose";

const slipSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true, select: false },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  // Abandoned uploads expire; attached receipts are retained with the booking.
  expiresAt: Date,
});
slipSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PaymentSlip = mongoose.model("PaymentSlip", slipSchema);
