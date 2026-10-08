import { File } from "expo-file-system";
import type { DocumentPickerResult } from "expo-document-picker";

export async function pickPaymentSlip(): Promise<DocumentPickerResult> {
  // Use the filesystem's own picker: it grants access to the selected content://
  // document. DocumentPicker's global cache can be outside Expo Go's app scope.
  const selection = await File.pickFileAsync({
    mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    multipleFiles: false,
  });
  if (selection.canceled) return { canceled: true, assets: null };
  const file = selection.result;
  return {
    canceled: false,
    assets: [{
      uri: file.uri,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      lastModified: Date.now(),
    }],
  };
}
