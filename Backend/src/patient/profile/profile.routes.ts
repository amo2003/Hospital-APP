import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Patient, publicPatient } from "../auth/patient.model.js";
import { personalSchema } from "../auth/validation.js";
import { Appointment } from "../booking/booking.models.js";
import { ApiError } from "../shared/errors.js";
import { MAX_PHOTO_TEXT, normalizeProfilePhoto } from "./profile-photo.js";
const profileSchema = personalSchema.partial().extend({
  profileImage: z.string().max(MAX_PHOTO_TEXT, "Choose a photo smaller than 5 MB.").nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "No profile changes provided.");
export const profileRoutes = Router();
profileRoutes.get("/", (req, res) => {
  res.json(publicPatient(req.patient));
});
profileRoutes.patch("/", async (req, res) => {
  const data = profileSchema.parse(req.body);
  if (typeof data.profileImage === "string")
    data.profileImage = await normalizeProfilePhoto(data.profileImage);
  const patient = await Patient.findByIdAndUpdate(
    req.patient!._id,
    { $set: data },
    { returnDocument: 'after', runValidators: true },
  );
  if (!patient) throw new ApiError(401, "Please sign in again.");
  res.json(publicPatient(patient));
});
profileRoutes.delete("/", async (req, res) => {
  const { password } = z
    .object({ password: z.string().min(1).max(72) })
    .parse(req.body);
  const patient = await Patient.findById(req.patient!._id).select(
    "+passwordHash",
  );
  if (!patient || !(await bcrypt.compare(password, patient.passwordHash)))
    throw new ApiError(400, "Your password is incorrect.");
  await Patient.db.transaction(async (session) => {
    await Patient.deleteOne({ _id: patient._id }, { session });
    await Appointment.deleteMany({ patientId: patient._id }, { session });
  });
  res.sendStatus(204);
});
