import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
const { MongoClient } = mongoose.mongo;
const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("YOUR_")) {
  console.error("Set MONGODB_URI in Backend/.env first.");
  process.exit(1);
}
const host = new URL(uri).hostname;
console.log("Checking MongoDB hostname:", host);
console.log("System DNS servers:", dns.getServers().join(", "));
for (const [name, servers] of [
  ["System", null],
  ["Public", ["1.1.1.1", "8.8.8.8"]],
]) {
  const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
  if (servers) resolver.setServers(servers);
  if (uri.startsWith("mongodb+srv://")) {
    try {
      const records = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
      console.log(`${name} SRV lookup: OK (${records.length} hosts)`);
    } catch (error) {
      console.log(`${name} SRV lookup: ${error.code}`);
    }
  }
}
if (process.env.DNS_SERVERS)
  dns.setServers(
    process.env.DNS_SERVERS.split(",").map((value) => value.trim()),
  );
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  await client.db(process.env.MONGODB_DB || undefined).command({ ping: 1 });
  console.log("Database authentication and ping: OK");
} catch (error) {
  console.error(
    `Database connection: ${error.name} (${error.code || "no error code"})`,
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
