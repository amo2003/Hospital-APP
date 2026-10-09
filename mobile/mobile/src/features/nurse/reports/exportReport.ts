import type { NurseReport } from "../types";
import { Platform } from "react-native";
import { reportDocument } from "./reportDocument";

export async function exportReport(report: NurseReport, t: (value: string) => string, language: string) {
  // Load on demand so an older development APK can still open Reports.
  let Print: typeof import("expo-print");
  let FileSystem: typeof import("expo-file-system/legacy");
  try {
    Print = await import("expo-print");
    FileSystem = await import("expo-file-system/legacy");
  } catch {
    throw new Error(t("PDF export needs an updated app build or Expo Go."));
  }
  const filename = `CarePlus-Queue-${report.from}-${report.to}.pdf`;
  if (Platform.OS === "android") {
    // Avoid sharing Expo Print's temporary URI outside Expo Go's project scope.
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return false;
    const { base64 } = await Print.printToFileAsync({ html: reportDocument(report, t, language), base64: true, width: 595, height: 842 });
    if (!base64) throw new Error(t("Could not generate the PDF. Please try again."));
    const destination = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, filename, "application/pdf");
    try {
      await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
    } catch (error) {
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
      throw error;
    }
    return true;
  }
  const Sharing = await import("expo-sharing");
  if (!await Sharing.isAvailableAsync() || !FileSystem.cacheDirectory) throw new Error(t("Saving PDF is unavailable on this device."));
  const { base64 } = await Print.printToFileAsync({ html: reportDocument(report, t, language), base64: true, width: 595, height: 842 });
  if (!base64) throw new Error(t("Could not generate the PDF. Please try again."));
  const uri = `${FileSystem.cacheDirectory}${Date.now()}-${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  try {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: t("Save PDF report") });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
  // iOS does not report whether the share sheet was saved or cancelled.
  return false;
}
