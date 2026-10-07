import { useState } from "react";
import { Platform, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Text } from "../i18n/LanguageProvider";
import { api, messageOf } from "../shared/api";
import { Button, ErrorMessage, Notice, Row, s } from "../shared/ui";
import type { Doctor } from "../shared/types";

export type UploadedSlip = { id: string; filename: string; doctorId: string };
export const paymentLabel = (status?: string) => status === "pending" ? "Awaiting payment approval" : status === "approved" ? "Payment approved" : "No payment required";

export default function PaymentStep({ doctor, slip, onChange, onBusy }: {
  doctor: Doctor; slip: UploadedSlip | null; onChange: (slip: UploadedSlip) => void; onBusy: (value: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const amount = doctor.feeLkr || 0;
  async function chooseSlip() {
    setError("");
    try {
      // Open directly on the user's press so web browsers allow the file chooser.
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], multiple: false, copyToCacheDirectory: true, base64: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > 5 * 1024 * 1024) {
        setError("Choose a payment slip smaller than 5 MB.");
        return;
      }
      setUploading(true);
      onBusy(true);
      const form = new FormData();
      if (Platform.OS === "web" && asset.file) form.append("slip", asset.file, asset.name);
      else form.append("slip", { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" } as unknown as Blob);
      const uploaded = await api.uploadPaymentSlip(doctor._id, form);
      onChange({ id: uploaded.id, filename: asset.name, doctorId: doctor._id });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={s.card}>
        <Row label="Doctor" value={doctor.name} />
        <Row label="Appointment fee" value={`LKR ${amount.toFixed(2)}`} />
        {amount > 0 && <>
          <Text style={[s.label, { marginTop: 12 }]}>Payment instructions</Text>
          <Text translate={false} selectable style={s.body}>{doctor.paymentInstructions}</Text>
        </>}
      </View>
      {amount > 0 ? <>
        <Notice>Make the payment using these instructions, then upload a clear receipt. Your payment will be verified by the admin.</Notice>
        <Text style={s.body}>JPG, PNG or PDF. Maximum 5 MB.</Text>
        {slip && <View style={s.card}>
          <Text style={s.label}>Payment slip uploaded</Text>
          <Text translate={false} style={s.body}>{slip.filename}</Text>
        </View>}
        <Button title={slip ? "Replace payment slip" : "Upload payment slip"} outline loading={uploading} onPress={chooseSlip} />
        <ErrorMessage message={error} />
      </> : <Notice>No payment required</Notice>}
      <Notice>You can cancel within 30 minutes of booking, before your appointment starts.</Notice>
    </View>
  );
}
