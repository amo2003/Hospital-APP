// Government OPD: payment screen preserved below; disabled, not deleted.
export {};
// import { useState } from "react";
// import { View } from '@/theme/primitives';
// import { pickPaymentSlip } from "./pick-payment-slip";
// import { Text } from "../i18n/LanguageProvider";
// import { api, messageOf } from "../shared/api";
// import { Button, ErrorMessage, Notice, Row, s } from "../shared/ui";
// import type { Doctor } from "../shared/types";
//
// export type UploadedSlip = { id: string; filename: string; doctorId: string };
// export const paymentLabel = (status?: string) => status === "pending" ? "Awaiting payment approval" : status === "approved" ? "Payment approved" : status === "rejected" ? "Payment rejected" : "No payment required";
//
// export default function PaymentStep({ doctor, slip, onChange, onBusy }: {
//   doctor: Doctor; slip: UploadedSlip | null; onChange: (slip: UploadedSlip) => void; onBusy: (value: boolean) => void;
// }) {
//   const [error, setError] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const amount = doctor.feeLkr || 0;
//   async function chooseSlip() {
//     setError("");
//     try {
//       // Open directly on the user's press so web browsers allow the file chooser.
//       const result = await pickPaymentSlip();
//       if (result.canceled) return;
//       const asset = result.assets[0];
//       if (asset.size !== undefined && asset.size > 5 * 1024 * 1024) {
//         setError("Choose a payment slip smaller than 5 MB.");
//         return;
//       }
//       setUploading(true);
//       onBusy(true);
//       const uploaded = await api.uploadPaymentSlip(doctor._id, asset);
//       onChange({ id: uploaded.id, filename: asset.name, doctorId: doctor._id });
//     } catch (e) {
//       setError(messageOf(e));
//     } finally {
//       setUploading(false);
//       onBusy(false);
//     }
//   }
//   return (
//     <View style={{ gap: 16 }}>
//       <View style={s.card}>
//         <Row label="Doctor" value={doctor.name} />
//         <Row label="Appointment fee" value={`LKR ${amount.toFixed(2)}`} />
//         {amount > 0 && <>
//           <Text style={[s.label, { marginTop: 12 }]}>Payment instructions</Text>
//           <Text translate={false} selectable style={s.body}>{doctor.paymentInstructions}</Text>
//         </>}
//       </View>
//       {amount > 0 ? <>
//         <Notice>Make the payment using these instructions, then upload a clear receipt. Your payment will be verified by the admin.</Notice>
//         <Text style={s.body}>JPG, PNG or PDF. Maximum 5 MB.</Text>
//         {slip && <View style={s.card}>
//           <Text style={s.label}>Payment slip uploaded</Text>
//           <Text translate={false} style={s.body}>{slip.filename}</Text>
//         </View>}
//         <Button title={slip ? "Replace payment slip" : "Upload payment slip"} outline loading={uploading} onPress={chooseSlip} />
//         <ErrorMessage message={error} />
//       </> : <Notice>No payment required</Notice>}
//       <Notice>You can cancel within 30 minutes of booking, before your appointment starts.</Notice>
//     </View>
//   );
// }
//