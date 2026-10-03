import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { Patient, publicPatient } from "./patient.model.js";
import {
  normalizePhone,
  passwordSchema,
  registrationSchema,
} from "./validation.js";
import { ApiError } from "../shared/errors.js";
import { authenticate } from "./auth.middleware.js";
export const authRoutes = Router();
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function session(patient: any) {
  return {
    token: jwt.sign(
      { version: patient.tokenVersion },
      process.env.JWT_SECRET!,
      {
        subject: String(patient._id),
        expiresIn: "12h",
        issuer: "careplus",
        audience: "patient",
      },
    ),
    patient: publicPatient(patient),
  };
}
authRoutes.post("/register", async (req, res) => {
  const { password, acceptedTerms, ...data } = registrationSchema.parse(
    req.body,
  );
  const patient = await Patient.create({
    ...data,
    passwordHash: await bcrypt.hash(password, 12),
    consentAt: new Date(),
  });
  res.status(201).json({ patient: publicPatient(patient) });
});
authRoutes.post("/login", async (req, res) => {
  const { identifier, password } = z
    .object({
      identifier: z.string().trim().min(1).max(254),
      password: z.string().min(1).max(72),
    })
    .parse(req.body);
  const patient = await Patient.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: normalizePhone(identifier) },
      { username: identifier.toLowerCase() },
    ],
  }).select("+passwordHash");
  if (!patient || !(await bcrypt.compare(password, patient.passwordHash)))
    throw new ApiError(401, "Email, phone or password is incorrect.");
  res.json(session(patient));
});
authRoutes.post("/google", async (req, res) => {
  const { idToken } = z
    .object({ idToken: z.string().min(10).max(10000) })
    .parse(req.body);
  const audience = process.env.GOOGLE_CLIENT_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!audience?.length)
    throw new ApiError(
      503,
      "Google sign-in is not configured yet. Please use email or phone.",
    );
  let identity;
  try {
    identity = (
      await new OAuth2Client().verifyIdToken({ idToken, audience })
    ).getPayload();
  } catch {
    throw new ApiError(401, "Google sign-in could not be verified.");
  }
  if (!identity?.email_verified || !identity.email)
    throw new ApiError(401, "Use a verified Google email address.");
  const patient = await Patient.findOne({
    email: identity.email.toLowerCase(),
  });
  if (!patient)
    throw new ApiError(
      409,
      "Please create your patient account using this Google email first.",
    );
  res.json(session(patient));
});
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = z
    .object({ email: z.email().toLowerCase() })
    .parse(req.body);
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  )
    throw new ApiError(
      503,
      "Password reset email is not configured. Please contact the hospital.",
    );
  const patient = await Patient.findOne({ email });
  if (patient) {
    const code = randomBytes(24).toString("hex");
    patient.resetHash = hash(code);
    patient.resetExpires = new Date(Date.now() + 15 * 60_000);
    await patient.save();
    try {
      await nodemailer
        .createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        })
        .sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: "Reset your CarePlus password",
          text: `Your CarePlus reset code is:\n${code}\n\nPaste this code in the app within 15 minutes. If you did not request this, ignore this email.`,
        });
    } catch {
      /* Keep registered addresses and reset credentials private. */
    }
  }
  res.json({
    message: "If this email is registered, a reset code will arrive shortly.",
  });
});
authRoutes.post("/reset-password", async (req, res) => {
  const { code, password } = z
    .object({ code: z.string().min(20).max(100), password: passwordSchema })
    .parse(req.body);
  const patient = await Patient.findOneAndUpdate(
    { resetHash: hash(code), resetExpires: { $gt: new Date() } },
    {
      $set: { passwordHash: await bcrypt.hash(password, 12) },
      $unset: { resetHash: 1, resetExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
  );
  if (!patient)
    throw new ApiError(400, "This reset code is invalid or has expired.");
  res.json({ message: "Password updated. Please sign in." });
});
authRoutes.post("/logout", authenticate, async (req, res) => {
  await Patient.updateOne(
    { _id: req.patient!._id },
    { $inc: { tokenVersion: 1 } },
  );
  res.sendStatus(204);
});
