import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../../config/database.js";
import { Hospital, Doctor } from "./booking.models.js";
import { OPD_SLOTS } from "./booking.service.js";
// Explicit demo catalogue, replaceable by the staff scheduling module later.
async function seed() {
  await connectDatabase();
  const hospital = await Hospital.findOneAndUpdate(
    { name: "CarePlus OPD — Demo Hospital" },
    {
      $setOnInsert: {
        departments: [
          "General Medicine",
          "Cardiology",
          "Dermatology",
          "Paediatrics",
        ],
        active: true,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  for (const [name, specialty] of [
    ["Dr. Kamal Silva", "General Medicine"],
    ["Dr. Priya Sumedha", "General Medicine"],
    ["Dr. Aravinda Kamal", "Dermatology"],
    ["Dr. Senaya Subhashini", "Paediatrics"],
    ["Dr. Priya Sharma", "Cardiology"],
  ]) {
    await Doctor.updateOne(
      { name, hospitalId: hospital._id },
      {
        $setOnInsert: {
          specialty,
          weekdays: [1, 2, 3, 4, 5],
          slots: OPD_SLOTS,
          active: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(
    "Demo catalogue ready. No patient or staff accounts were created.",
  );
  await mongoose.disconnect();
}
seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
