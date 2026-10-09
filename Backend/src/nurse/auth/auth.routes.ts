import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ApiError } from "../../patient/shared/errors.js";
import { Nurse, publicNurse } from "./nurse.model.js";
import { nurseRegistrationSchema } from "./validation.js";
import { Hospital } from "../../patient/booking/booking.models.js";

export const nurseAuthRoutes = Router();

function session(nurse: InstanceType<typeof Nurse>) {
  return {
    token: jwt.sign({ version: nurse.tokenVersion }, process.env.JWT_SECRET!, {
      subject: String(nurse._id), expiresIn: "12h", issuer: "careplus", audience: "nurse",
    }),
    nurse: publicNurse(nurse),
  };
}

nurseAuthRoutes.post("/register", async (req, res) => {
  const { password, confirmPassword: _confirmPassword, acceptedTerms: _acceptedTerms, ...data } = nurseRegistrationSchema.parse(req.body);
  const hospital = await Hospital.findOne({ active: true })
    .sort({ name: 1, _id: 1 })
    .select("_id");
  if (!hospital)
    throw new ApiError(
      503,
      "No active hospital is available for nurse registration. For this demo, run `npm run seed` in the Backend folder to create the CarePlus demo hospital, then try again.",
    );
  const nurse = await Nurse.create({
    ...data,
    accessDepartment: data.department,
    hospitalId: hospital._id,
    passwordHash: await bcrypt.hash(password, 12),
    status: "pending",
  });
  res.status(201).json({ nurse: publicNurse(nurse) });
});

nurseAuthRoutes.post("/login", async (req, res) => {
  const { identifier, password } = z.object({
    identifier: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(72),
  }).parse(req.body);
  const normalized = identifier.toLowerCase();
  const nurse = await Nurse.findOne({
    $or: [{ nurseId: identifier.toUpperCase() }, { email: normalized }, { username: normalized }],
  }).select("+passwordHash");
  if (!nurse || !(await bcrypt.compare(password, nurse.passwordHash)))
    throw new ApiError(401, "Staff ID, email or password is incorrect.");
  if (nurse.status === "pending")
    throw new ApiError(403, "Your registration is pending admin approval.");
  if (nurse.status === "rejected") {
    const reasonMsg = nurse.rejectionReason ? ` (${nurse.rejectionReason})` : "";
    throw new ApiError(403, `Your nurse registration was rejected.${reasonMsg}`);
  }
  if (nurse.status !== "active")
    throw new ApiError(403, "This nurse account is inactive. Contact your hospital administrator.");
  res.json(session(nurse));
});
