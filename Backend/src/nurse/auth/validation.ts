import { z } from "zod";
import { normalizePhone, passwordSchema } from "../../patient/auth/validation.js";

const nicSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(\d{9}[VX]|\d{12}|[A-Z][A-Z0-9]{5,19})$/, "Enter a valid nurse ID or NIC number.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date < new Date() && date.getUTCFullYear() >= 1900;
}, "Enter a valid past birth date.");
const phoneSchema = z.string().transform(normalizePhone).pipe(z.string().regex(/^\+94\d{9}$/, "Enter a Sri Lankan phone number."));

export const nurseRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  nic: nicSchema,
  dateOfBirth: dateSchema,
  gender: z.enum(["Male", "Female", "Other"]),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  address: z.string().trim().min(5).max(300),
  district: z.string().trim().min(2).max(50),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
  department: z.string().trim().min(2).max(100),
  ward: z.string().trim().max(100).optional().default(""),
  password: passwordSchema,
  confirmPassword: z.string().min(1).max(72),
  acceptedTerms: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export const nurseProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  department: z.string().trim().min(2).max(100).optional(),
  ward: z.string().trim().max(100).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "Provide at least one profile field.");
