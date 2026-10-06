import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { mailConfigured, mailDelivery } from "../notifications/mail.service.js";
import {
  googleProof,
  readGoogleProof,
  verifyGoogleIdentity,
} from "./google.service.js";
import { z } from "zod";
import { Patient, publicPatient } from "./patient.model.js";
import {
  normalizePhone,
  passwordSchema,
  registrationSchema,
  emailSchema,
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
  const proofToken = z
    .string()
    .max(4000)
    .optional()
    .parse(req.body.googleRegistrationToken);
  const identity = proofToken
    ? readGoogleProof(proofToken, "register")
    : undefined;
  if (identity && identity.email !== data.email)
    throw new ApiError(400, "Use the email verified by Google.");
  const patient = await Patient.create({
    ...data,
    ...(identity ? { googleSubject: identity.sub } : {}),
    passwordHash: await bcrypt.hash(password, 12),
    consentAt: new Date(),
    welcomeEmail: { status: "pending", attempts: 0, nextAttemptAt: new Date() },
  });
  res
    .status(201)
    .json(identity ? session(patient) : { patient: publicPatient(patient) });
});
authRoutes.post("/login", async (req, res) => {
  const { identifier, password } = z
    .object({
      identifier: z
        .string()
        .trim()
        .min(1)
        .max(254)
        .refine((value) => {
          if (value.includes("@")) return emailSchema.safeParse(value).success;
          if (/^[+\d\s()-]+$/.test(value))
            return /^\+94\d{9}$/.test(normalizePhone(value));
          // Keep existing username login support for API clients.
          return /^[a-z0-9_]{3,30}$/i.test(value);
        }, "Enter a valid email address or Sri Lankan phone number."),
      password: z.string().min(1, "Enter your password.").max(72),
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
  const identity = await verifyGoogleIdentity(idToken);
  const linked = await Patient.findOne({ googleSubject: identity.sub });
  if (linked) {
    res.json({ status: "signed-in", ...session(linked) });
    return;
  }
  const existing = await Patient.findOne({ email: identity.email }).select(
    "+googleSubject",
  );
  if (existing?.googleSubject)
    throw new ApiError(
      409,
      "This patient account is linked to a different Google account. Sign in with your CarePlus password.",
    );
  const purpose = existing ? "link" : "register";
  res.json({
    status: existing ? "link-required" : "registration-required",
    proofToken: googleProof(identity, purpose),
    email: identity.email,
    name: identity.name,
  });
});
authRoutes.post("/google/link", async (req, res) => {
  const { proofToken, password } = z
    .object({
      proofToken: z.string().max(4000),
      password: z.string().min(1).max(72),
    })
    .parse(req.body);
  const identity = readGoogleProof(proofToken, "link");
  const patient = await Patient.findOne({ email: identity.email }).select(
    "+passwordHash +googleSubject",
  );
  if (!patient || !(await bcrypt.compare(password, patient.passwordHash)))
    throw new ApiError(401, "Your password is incorrect.");
  if (patient.googleSubject && patient.googleSubject !== identity.sub)
    throw new ApiError(
      409,
      "This patient account is linked to a different Google account. Sign in with your CarePlus password.",
    );
  // Conditional write protects linking against a simultaneous request with a different Google identity.
  const updated = await Patient.findOneAndUpdate(
    {
      _id: patient._id,
      passwordHash: patient.passwordHash,
      $or: [
        { googleSubject: { $exists: false } },
        { googleSubject: identity.sub },
      ],
    },
    { $set: { googleSubject: identity.sub } },
    { returnDocument: "after" },
  );
  if (!updated)
    throw new ApiError(409, "Account changed. Please sign in again.");
  res.json(session(updated));
});
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = z.object({ email: emailSchema }).parse(req.body);
  if (!mailConfigured())
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
      await mailDelivery.send({
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
