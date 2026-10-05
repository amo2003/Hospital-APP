import { z } from "zod";
export const normalizePhone = (value: string) => {
  const phone = value.replace(/[\s()-]/g, "");
  return phone.startsWith("0") ? `+94${phone.slice(1)}` : phone;
};
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72)
  .regex(/[A-Za-z]/, "Include a letter.")
  .regex(/[0-9]/, "Include a number.");
export const personalSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  nic: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^(\d{9}[VX]|\d{12}|[A-Z][A-Z0-9]{5,19})$/,
      "Enter a valid NIC or passport number.",
    ),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(value);
      return (
        !isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        date < new Date() &&
        date.getUTCFullYear() >= 1900
      );
    }, "Enter a valid past birth date."),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\+94\d{9}$/, "Enter a Sri Lankan phone number.")),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  address: z.string().trim().min(5).max(300),
  district: z.string().trim().min(2).max(50),
});
export const registrationSchema = personalSchema.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/),
  password: passwordSchema,
  acceptedTerms: z.literal(true),
});
