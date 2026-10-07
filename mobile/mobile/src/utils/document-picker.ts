import { requireOptionalNativeModule } from "expo";
import type { DocumentPickerOptions, DocumentPickerResult } from "expo-document-picker";

// Routes must load even on older installed builds without this native module.
export function pickDocument(options: DocumentPickerOptions): Promise<DocumentPickerResult> {
  if (!requireOptionalNativeModule("ExpoDocumentPicker")) {
    throw new Error("File uploads need an updated app. Install the latest CarePlus APK or use the web app to upload your document.");
  }
  // Load only after checking availability; a top-level import crashes Expo Router.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require("expo-document-picker") as typeof import("expo-document-picker");
  return picker.getDocumentAsync(options);
}
