import mongoose from "mongoose";
import dns from "node:dns";
import { isIP } from "node:net";
import { getConfig } from "./env.js";
export function configureDns() {
  const servers = process.env.DNS_SERVERS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (servers?.length) {
    if (servers.some((server) => !isIP(server)))
      throw new Error(
        "DNS_SERVERS must contain comma-separated DNS server IP addresses.",
      );
    // Only this Node process is affected; Windows network settings stay unchanged.
    dns.setServers(servers);
  }
}
export async function connectDatabase() {
  configureDns();
  const config = getConfig();
  try {
    await mongoose.connect(config.mongoUri, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 15000,
    });
  } catch (error: any) {
    if (/querySrv|queryTxt|ECONNREFUSED.*mongodb/i.test(error.message)) {
      throw new Error(
        "MongoDB DNS lookup failed before authentication. Set DNS_SERVERS=1.1.1.1,8.8.8.8 in Backend/.env and restart. If your network blocks public DNS, use the standard mongodb:// connection string supplied by Atlas. Run npm run db:check for diagnostics.",
      );
    }
    if (
      error.code === 18 ||
      /authentication failed|bad auth/i.test(error.message)
    )
      throw new Error(
        "MongoDB authentication failed. Check the Atlas database username/password and URL-encode special characters.",
      );
    if (error.name === "MongooseServerSelectionError")
      throw new Error(
        "Cannot reach MongoDB Atlas. Confirm the cluster is running, add your current public IP in Atlas Network Access, and allow outbound port 27017.",
      );
    throw error;
  }
}
