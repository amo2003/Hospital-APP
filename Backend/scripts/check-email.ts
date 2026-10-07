import "dotenv/config";
import mongoose from "mongoose";
import { configureDns, connectDatabase } from "../src/config/database.js";
import {
  mailConfig,
  mailConfigured,
  mailErrorCode,
  verifyMailConnection,
} from "../src/patient/notifications/mail.service.js";
import { Patient } from "../src/patient/auth/patient.model.js";

async function main() {
  configureDns();
  const config = mailConfig();
  console.log("Mail settings:", {
    host: !!config.host,
    user: !!config.user,
    password: !!config.password,
    from: !!config.from,
    port: config.port,
    secure: config.secure,
  });
  if (!mailConfigured())
    throw new Error("Mail settings are missing or contain placeholders.");
  try {
    await verifyMailConnection();
    console.log("SMTP connection, TLS and authentication: OK (no email sent)");
  } catch (error) {
    const code = mailErrorCode(error);
    console.error("SMTP verification:", code);
    if (code === "EAUTH")
      console.error(
        "The provider rejected SMTP credentials. Check the SMTP/app password and account permissions.",
      );
    else if (code === "MAIL_ERROR")
      console.error(
        "Check SMTP port/security settings: 587/false or 465/true.",
      );
    process.exitCode = 1;
  }
  await connectDatabase();
  const queue = await Patient.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$welcomeEmail.status", "not-queued"] },
        count: { $sum: 1 },
      },
    },
  ]);
  console.log("Welcome email queue counts:", queue);
  console.log(
    "Due now:",
    await Patient.countDocuments({
      "welcomeEmail.status": "pending",
      "welcomeEmail.nextAttemptAt": { $lte: new Date() },
    }),
  );
}
main()
  .catch(() => {
    console.error(
      "Email diagnostic could not complete. Check mail/database configuration.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
