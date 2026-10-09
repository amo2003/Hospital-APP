import { z } from "zod";
export const districts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];
const emailPattern =
  /^(?!\.)(?!.*\.\.)(?=.{1,64}@)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i;
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(
    emailPattern,
    "Enter a valid email address, such as name@example.com.",
  );
export const normalizePhone = (value: string) => {
  const phone = value.replace(/[\s()-]/g, "");
  return phone.startsWith("0") ? `+94${phone.slice(1)}` : phone;
};
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters, including a letter and a number.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password is too long. Use at most 72 UTF-8 bytes.",
  )
  .regex(
    /[A-Za-z]/,
    "Use at least 8 characters, including a letter and a number.",
  )
  .regex(
    /[0-9]/,
    "Use at least 8 characters, including a letter and a number.",
  );
export const personalSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(
      /^[\p{L}\p{M} \u200c\u200d]+$/u,
      "Enter a name using letters and spaces only.",
    )
    .regex(/\p{L}/u, "Enter your full name."),
  nic: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(\d{9}V|\d{12})$/, "Enter 12 digits or 9 digits followed by V."),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(value);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
      }).format(new Date());
      return (
        !isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value <= today &&
        date.getUTCFullYear() >= 1900
      );
    }, "Choose a valid birth date from 1900 to today."),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .regex(
          /^\+947\d{8}$/,
          "Enter a valid mobile number: 0771234567 or +94771234567.",
        ),
    ),
  email: emailSchema,
  address: z
    .string()
    .trim()
    .min(5, "Enter a home address of 5–300 characters.")
    .max(300, "Enter a home address of 5–300 characters."),
  district: z
    .string()
    .trim()
    .refine((value) => districts.includes(value), "Select your district."),
});
export const registrationSchema = personalSchema.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,30}$/,
      "Use 3–30 letters, numbers or underscores for your username.",
    ),
  password: passwordSchema,
  acceptedTerms: z.literal(true),
});
