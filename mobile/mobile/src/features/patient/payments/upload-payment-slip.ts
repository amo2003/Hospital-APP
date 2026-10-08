import { File, UploadType } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";

export async function uploadPaymentSlip(
  url: string,
  asset: DocumentPickerAsset,
  options: { headers: Record<string, string>; signal: AbortSignal },
) {
  const file = new File(asset.uri);
  if (!file.exists || file.size === 0) throw new Error("UPLOAD_FILE_UNAVAILABLE");
  if (file.size > 5 * 1024 * 1024) throw new Error("UPLOAD_TOO_LARGE");
  // Stream the selected document through the native uploader. Do not serialize
  // local files through the JS fetch/FormData bridge on Android or iOS.
  const task = file.createUploadTask(url, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "slip",
    mimeType: asset.mimeType || file.type || "application/octet-stream",
    headers: options.headers,
    signal: options.signal,
    sessionType: "foreground",
  });
  try {
    const result = await task.uploadAsync();
    return {
      status: result.status,
      ok: result.status >= 200 && result.status < 300,
      json: async () => JSON.parse(result.body),
    };
  } finally {
    task.release();
  }
}
