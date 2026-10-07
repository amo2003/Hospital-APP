import { z } from "zod";

export const medicalSchema = z.object({
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).nullable(),
  heightCm: z.number().min(30, "Enter a height between 30 and 300 cm.").max(300, "Enter a height between 30 and 300 cm.").nullable(),
  weightKg: z.number().min(1, "Enter a weight between 1 and 700 kg.").max(700, "Enter a weight between 1 and 700 kg.").nullable(),
}).strict();
