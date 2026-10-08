import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { Doctor } from "../booking/booking.models.js";
import { ApiError } from "../shared/errors.js";
import { PaymentSlip } from "./payment.models.js";

export const paymentRoutes = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } }).single("slip");
paymentRoutes.post("/slips/:doctorId", (req, res, next) => {
  upload(req, res, (error) => next(error ? new ApiError(400, "Upload one JPG, PNG or PDF payment slip, up to 5 MB.") : undefined));
}, async (req, res) => {
  const doctorId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.doctorId);
  const doctor = await Doctor.findOne({ _id: doctorId, active: true });
  if (!doctor) throw new ApiError(404, "Doctor not found.");
  if (!doctor.feeLkr || !doctor.paymentInstructions.trim()) throw new ApiError(400, "Payment is not required for this doctor.");
  const file = req.file;
  if (!file?.size) throw new ApiError(400, "Choose a payment slip to upload.");
  let data: Buffer;
  let contentType: string;
  let extension: string;
  if (file.buffer.subarray(0, 5).toString() === "%PDF-" && file.buffer.subarray(-1024).includes(Buffer.from("%%EOF"))) {
    data = file.buffer;
    contentType = "application/pdf";
    extension = "pdf";
  } else {
    try {
      const photo = sharp(file.buffer, { limitInputPixels: 20_000_000, failOn: "warning" });
      const metadata = await photo.metadata();
      if (!["jpeg", "png"].includes(metadata.format || "")) throw new Error("Unsupported image");
      data = await photo.rotate().resize({ width: 2400, height: 3200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
      contentType = "image/jpeg";
      extension = "jpg";
    } catch {
      throw new ApiError(400, "Upload a valid JPG, PNG or PDF payment slip.");
    }
  }
  const slip = await PaymentSlip.create({ patientId: req.patient!._id, doctorId, data, contentType,
    filename: `payment-slip.${extension}`, size: data.length, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) });
  res.status(201).json({ id: slip._id, filename: slip.filename, uploadedAt: slip.uploadedAt });
});
