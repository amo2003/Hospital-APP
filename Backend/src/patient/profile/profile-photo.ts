import sharp from "sharp";
import { ApiError } from "../shared/errors.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_TEXT = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 32;

// Decode and re-encode uploads: do not trust a filename or declared MIME type.
// Small avatars live with the patient record, so they survive server redeploys.
export async function normalizeProfilePhoto(value: string): Promise<string> {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new ApiError(400, "Choose a valid JPEG, PNG or WebP photo.");
  const input = Buffer.from(match[2], "base64");
  if (input.length > MAX_PHOTO_BYTES)
    throw new ApiError(400, "Choose a photo smaller than 5 MB.");
  if (input.toString("base64") !== match[2])
    throw new ApiError(400, "Choose a valid JPEG, PNG or WebP photo.");
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== match[1] || (metadata.pages || 1) > 1)
      throw new Error("Unsupported image");
    const output = await image.rotate().resize(256, 256, { fit: "cover" })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
    // sharp strips EXIF/location metadata unless explicitly retained.
    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch {
    throw new ApiError(400, "Choose a valid JPEG, PNG or WebP photo.");
  }
}
