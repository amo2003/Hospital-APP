import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ApiError } from "../shared/errors.js";

export const googleClient = new OAuth2Client();
const identitySchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string().max(100),
});
export type GoogleIdentity = z.infer<typeof identitySchema>;
export async function verifyGoogleIdentity(
  idToken: string,
): Promise<GoogleIdentity> {
  const audience = process.env.GOOGLE_CLIENT_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!audience?.length)
    throw new ApiError(
      503,
      "Google sign-in is not configured yet. Please use email or phone.",
    );
  let payload;
  try {
    payload = (
      await googleClient.verifyIdToken({ idToken, audience })
    ).getPayload();
  } catch {
    throw new ApiError(401, "Google sign-in could not be verified.");
  }
  if (!payload?.email_verified || !payload.email || !payload.sub)
    throw new ApiError(401, "Use a verified Google email address.");
  return identitySchema.parse({
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: (payload.name || "").slice(0, 100),
  });
}

// Onboarding proof is deliberately incompatible with a patient access token.
export function googleProof(
  identity: GoogleIdentity,
  purpose: "register" | "link",
) {
  return jwt.sign({ ...identity, purpose }, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    issuer: "careplus",
    audience: "google-onboarding",
    expiresIn: "10m",
  });
}
export function readGoogleProof(
  token: string,
  purpose: "register" | "link",
): GoogleIdentity {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
      issuer: "careplus",
      audience: "google-onboarding",
    });
    if (typeof payload === "string" || payload.purpose !== purpose)
      throw new Error("Wrong proof purpose");
    return identitySchema.parse(payload);
  } catch {
    throw new ApiError(
      401,
      "Google verification expired. Please continue with Google again.",
    );
  }
}
