import "dotenv/config";
import mongoose from "mongoose";
import { getConfig } from "./config/env.js";
import { app } from "./app.js";
import { Patient } from "./patient/auth/patient.model.js";
import { Appointment, QueueEntry, QueueCounter } from "./patient/booking/booking.models.js";
import { Nurse } from "./nurse/auth/nurse.model.js";
import { connectDatabase } from "./config/database.js";
async function start() {
  const config = getConfig();
  await connectDatabase();
  await Promise.all([Patient.init(), Appointment.init(), Nurse.init(), QueueEntry.init(), QueueCounter.init()]);
  const server = app.listen(config.port, "0.0.0.0", () =>
    console.log(`CarePlus patient API listening on port ${config.port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(() => {
        void mongoose.disconnect().then(() => process.exit(0));
      }),
    );
}
start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
