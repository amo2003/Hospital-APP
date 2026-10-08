import type { DocumentPickerAsset } from "expo-document-picker";

export async function uploadPaymentSlip(
  url: string,
  asset: DocumentPickerAsset,
  options: { headers: Record<string, string>; signal: AbortSignal },
) {
  if (!asset.file) throw new Error("UPLOAD_FILE_UNAVAILABLE");
  const form = new FormData();
  form.append("slip", asset.file, asset.name);
  return fetch(url, { method: "POST", ...options, body: form });
}
