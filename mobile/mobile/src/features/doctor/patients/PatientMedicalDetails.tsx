import { View } from "react-native";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { C, s } from "@/features/patient/shared/ui";
import type { MedicalDetails } from "@/features/patient/shared/types";
import { bmiResult } from "@/features/patient/profile/medical";

export default function PatientMedicalDetails({ details, birthDate }: {
  details?: MedicalDetails;
  birthDate: string;
}) {
  const bmi = bmiResult(details?.heightCm ?? null, details?.weightKg ?? null, birthDate);
  const color = bmi?.category === "Healthy weight" ? "#15803d"
    : bmi?.category === "Age-specific assessment needed" ? C.blue : "#b45309";
  return (
    <View style={[s.card, { marginTop: 18, gap: 12 }]}>
      <Text style={[s.title, { fontSize: 18 }]}>Patient medical details</Text>
      <Text style={s.body}>Measurements saved by the patient.</Text>
      {([
        ["Blood Group", details?.bloodGroup],
        ["Height (cm)", details?.heightCm],
        ["Weight (kg)", details?.weightKg],
      ] as const).map(([label, value]) => (
        <View key={label} style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.label, { flex: 1 }]}>{label}</Text>
          <Text translate={value == null} style={{ color: C.navy, fontWeight: "600" }}>
            {value == null ? "Not recorded" : String(value)}
          </Text>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, gap: 6 }}>
        <Text style={s.label}>Body Mass Index (BMI)</Text>
        {bmi ? (<>
          <Text translate={false} style={{ color, fontSize: 28, fontWeight: "700" }}>{bmi.value.toFixed(2)}</Text>
          <Text style={{ color, fontWeight: "700" }}>{bmi.category}</Text>
          <Text style={s.body}>
            {bmi.category === "Age-specific assessment needed"
              ? "Adult BMI categories do not apply under age 20. Ask a clinician for an age-specific assessment."
              : "Adult reference: below 18.5 underweight; 18.5 to below 25 healthy weight; 25 to below 30 overweight; 30 or above obesity range."}
          </Text>
        </>) : <Text style={s.body}>Height and weight are needed to calculate BMI.</Text>}
      </View>
    </View>
  );
}
