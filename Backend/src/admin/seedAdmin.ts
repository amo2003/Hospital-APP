import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "./admin.model.js";
import { getConfig } from "../config/env.js";

async function seedAdmin() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    console.error(
      "ADMIN_SEED_PASSWORD environment variable is not set in Backend/.env. Please set it before running this script.",
    );
    process.exit(1);
  }

  const { mongoUri } = getConfig();
  console.log("Connecting to database for admin seed...");
  await mongoose.connect(mongoUri);

  try {
    const existing = await Admin.findOne({ adminId: "admin" }).select(
      "+passwordHash",
    );

    if (existing) {
      const isSamePassword = await bcrypt.compare(
        adminPassword.trim(),
        existing.passwordHash,
      );

      if (isSamePassword) {
        console.log(
          "Admin account with ID 'admin' already exists and password matches ADMIN_SEED_PASSWORD. No changes needed.",
        );
      } else {
        existing.passwordHash = await bcrypt.hash(adminPassword.trim(), 12);
        existing.tokenVersion = (existing.tokenVersion || 0) + 1;
        await existing.save();
        console.log(
          "Admin account with ID 'admin' password updated successfully to match ADMIN_SEED_PASSWORD.",
        );
      }
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword.trim(), 12);
    await Admin.create({
      adminId: "admin",
      role: "admin",
      passwordHash,
      tokenVersion: 0,
    });

    console.log("Admin account created successfully with ID: admin");
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

seedAdmin().catch((err) => {
  console.error("Admin seed failed:", err.message);
  process.exit(1);
});
