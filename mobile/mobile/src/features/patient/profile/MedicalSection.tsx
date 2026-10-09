import { useState } from "react";
import { View } from '@/theme/primitives';
import { Text } from "../i18n/LanguageProvider";
import {
  Button,
  C,
  ErrorMessage,
  Field,
  Notice,
  Select,
  s,
} from "../shared/ui";
import { api, messageOf } from "../shared/api";
import type { Patient } from "../shared/types";
import { bloodGroups, bmiResult, measurement } from "./medical";

export default function MedicalSection({
  patient,
  onSaved,
  onBusyChange,
}: {
  patient: Patient;
  onSaved: (patient: Patient) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [bloodGroup, setBloodGroup] = useState(
    patient.medicalDetails?.bloodGroup || "",
  );
  const [height, setHeight] = useState(
    String(patient.medicalDetails?.heightCm ?? ""),
  );
  const [weight, setWeight] = useState(
    String(patient.medicalDetails?.weightKg ?? ""),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState({ height: false, weight: false });
  const heightCm = measurement(height, 30, 300);
  const weightKg = measurement(weight, 1, 700);
  const heightError = Number.isNaN(heightCm)
    ? "Enter a height between 30 and 300 cm."
    : "";
  const weightError = Number.isNaN(weightKg)
    ? "Enter a weight between 1 and 700 kg."
    : "";
  const bmi = bmiResult(heightCm, weightKg, patient.dateOfBirth);
  const color =
    bmi?.category === "Healthy weight"
      ? "#168245"
      : bmi?.category === "Age-specific assessment needed"
        ? C.blue
        : "#965800";
  function changed() {
    setSaved(false);
    setError("");
  }
  async function save() {
    if (busy) return;
    setTouched({ height: true, weight: true });
    setSaved(false);
    setError("");
    if (heightError || weightError) return;
    setBusy(true);
    onBusyChange(true);
    try {
      const result = await api.updateProfile({
        medicalDetails: { bloodGroup: bloodGroup || null, heightCm, weightKg },
      });
      onSaved(result);
      setSaved(true);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <View>
      <Text style={[s.body, { marginBottom: 16 }]}>
        Your own measurements. Leave unknown details blank.
      </Text>
      {busy ? (
        <Field label="Blood Group" value={bloodGroup || ""} editable={false} />
      ) : (
        <Select
          label="Blood Group"
          placeholder="Not known"
          value={bloodGroup}
          options={[
            { label: "Not known", value: "" },
            ...bloodGroups.map((value) => ({ label: value, value })),
          ]}
          onChange={(value) => {
            setBloodGroup(value);
            changed();
          }}
        />
      )}
      <Field
        label="Height (cm)"
        placeholder="e.g. 170"
        keyboardType="decimal-pad"
        maxLength={8}
        value={height}
        editable={!busy}
        error={touched.height ? heightError : undefined}
        onBlur={() => setTouched((v) => ({ ...v, height: true }))}
        onChangeText={(v) => {
          setHeight(v);
          changed();
        }}
      />
      <Field
        label="Weight (kg)"
        placeholder="e.g. 65"
        keyboardType="decimal-pad"
        maxLength={8}
        value={weight}
        editable={!busy}
        error={touched.weight ? weightError : undefined}
        onBlur={() => setTouched((v) => ({ ...v, weight: true }))}
        onChangeText={(v) => {
          setWeight(v);
          changed();
        }}
      />
      <View
        style={[s.card, { marginBottom: 16, gap: 8 }]}
        accessibilityLiveRegion="polite"
      >
        <Text style={s.title}>Body Mass Index (BMI)</Text>
        {bmi ? (
          <>
            <Text
              translate={false}
              style={{ color, fontSize: 32, fontWeight: "700" }}
            >
              {bmi.value.toFixed(2)}
            </Text>
            <Text style={{ color, fontSize: 16, fontWeight: "700" }}>
              {bmi.category}
            </Text>
            <Text style={s.body}>
              {bmi.category === "Age-specific assessment needed"
                ? "Adult BMI categories do not apply under age 20. Ask a clinician for an age-specific assessment."
                : "Adult reference: below 18.5 underweight; 18.5 to below 25 healthy weight; 25 to below 30 overweight; 30 or above obesity range."}
            </Text>
          </>
        ) : (
          <Text style={s.body}>
            Enter valid height and weight to calculate BMI.
          </Text>
        )}
      </View>
      <Notice>
        BMI is a screening guide, not a diagnosis. Pregnancy and muscle mass can
        affect its meaning. Discuss your result with a clinician.
      </Notice>
      <View style={{ marginTop: 20 }}>
        <ErrorMessage message={error} />
        {saved && (
          <Text
            accessibilityRole="alert"
            style={{ color: "#168245", marginBottom: 12 }}
          >
            Medical details saved.
          </Text>
        )}
        <Button title="Save Medical Details" loading={busy} onPress={save} />
      </View>
    </View>
  );
}
