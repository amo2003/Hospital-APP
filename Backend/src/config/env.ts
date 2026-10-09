import "dotenv/config";
export function getConfig() {
  const { MONGODB_URI, JWT_SECRET } = process.env;
  if (!MONGODB_URI || MONGODB_URI.includes("YOUR_"))
    throw new Error(
      "Set MONGODB_URI in Backend/.env to your MongoDB Atlas connection string.",
    );
  if (
    !JWT_SECRET ||
    JWT_SECRET.length < 32 ||
    JWT_SECRET.startsWith("REPLACE_")
  )
    throw new Error(
      "Set a random JWT_SECRET with at least 32 characters in Backend/.env.",
    );
  return {
    mongoUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
    port: Number(process.env.PORT || 4000),
  };
}
