import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { emailSchema } from "../src/patient/auth/validation.js";
import { Patient } from "../src/patient/auth/patient.model.js";
import {
  mailErrorCode,
  verifyMailConnection,
} from "../src/patient/notifications/mail.service.js";
import { deliverNextWelcomeEmail } from "../src/patient/notifications/welcome-email.worker.js";

async function main() {
  const email = emailSchema.parse(process.argv[2]);
  await connectDatabase();
  await verifyMailConnection();
  const patient = await Patient.findOne({ email }).select("+welcomeEmail");
  if (!patient) throw new Error("PATIENT_NOT_FOUND");
  if (patient.welcomeEmail?.status === "sent") {
    console.log(
      "The provider already accepted this patient's welcome email. Check inbox/spam; no duplicate sent.",
    );
    return;
  }
  if (
    patient.welcomeEmail?.status === "sending" &&
    patient.welcomeEmail.lockedUntil &&
    patient.welcomeEmail.lockedUntil > new Date()
  ) {
    console.log(
      "This patient's email is already being sent. Check its status shortly.",
    );
    return;
  }
  // Compare the previous queue state to avoid overwriting a concurrent worker claim.
  const updated = await Patient.updateOne(
    {
      _id: patient._id,
      welcomeEmail: patient.welcomeEmail || { $exists: false },
    },
    {
      $set: {
        welcomeEmail: {
          status: "pending",
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
    },
  );
  if (!updated.modifiedCount) {
    console.log("Delivery state changed; run email:check before retrying.");
    return;
  }
  await deliverNextWelcomeEmail(new Date(), String(patient._id));
  const result = await Patient.findById(patient._id).select("+welcomeEmail");
  console.log(
    "Welcome email status:",
    result?.welcomeEmail?.status || "account removed",
  );
  if (result?.welcomeEmail?.status === "sent")
    console.log(
      "SMTP provider accepted the welcome email. Check inbox and spam.",
    );
  else
    console.log(
      "Email remains queued. Keep the backend running for automatic retries.",
    );
}
main()
  .catch((error) => {
    console.error(
      error?.message === "PATIENT_NOT_FOUND"
        ? "No patient found for that email."
        : `Welcome email could not be sent (${mailErrorCode(error)}). Run npm run email:check and verify the registered address.`,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
