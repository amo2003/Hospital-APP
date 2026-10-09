import React, { useState, useRef } from "react";
import { Platform } from 'react-native';
import { Pressable, View } from '@/theme/primitives';
import { pickDocument } from "@/utils/document-picker";
import { router } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import {
  Button,
  C,
  ErrorMessage,
  Field,
  Header,
  Notice,
  Screen,
  Select,
  Steps,
  s,
} from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import DateField from "@/features/patient/shared/DateField";
import { doctorApi, doctorMessageOf, type DoctorRegistrationPayload } from "../shared/doctorApi";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "ENT (Ear, Nose, Throat)",
  "Gastroenterology",
  "General Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Surgery",
].map((s) => ({ label: s, value: s }));

const HOSPITALS = [
  "CarePlus Colombo Central",
  "CarePlus Kandy General",
  "CarePlus Galle Medical Centre",
  "National Hospital Sri Lanka",
  "Teaching Hospital Karapitiya",
  "Colombo South Teaching Hospital",
  "Other Hospital",
].map((h) => ({ label: h, value: h }));

export default function DoctorRegisterScreen() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");
  const fileInputRef = useRef<any>(null);

  async function handlePickPdf() {
    setError("");
    if (Platform.OS === "web") {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const res = await pickDocument({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const name = file.name || "medical_license.pdf";
        const sizeKb = file.size ? `${(file.size / 1024).toFixed(1)} KB` : "";
        setSelectedFileName(name);
        setSelectedFileSize(sizeKb);
        update("licenseUrl", name);
      }
    } catch (err) {
      setError(doctorMessageOf(err));
    }
  }

  function handleWebFileChange(e: any) {
    const file = e.target?.files?.[0];
    if (file) {
      const name = file.name || "medical_license.pdf";
      const sizeKb = file.size ? `${(file.size / 1024).toFixed(1)} KB` : "";
      setSelectedFileName(name);
      setSelectedFileSize(sizeKb);
      update("licenseUrl", name);
    }
  }

  const [data, setData] = useState<DoctorRegistrationPayload>({
    fullName: "",
    nic: "",
    dob: "1990-01-01",
    gender: "Male",
    slmcNo: "",
    specialty: "",
    qualifications: "",
    experience: "",
    hospital: "",
    licenseUrl: "",
    phone: "",
    email: "",
    password: "",
  });

  function update<K extends keyof DoctorRegistrationPayload>(
    key: K,
    value: DoctorRegistrationPayload[K],
  ) {
    setData((old) => ({ ...old, [key]: value }));
  }

  function handleNext() {
    setError("");

    // Step 0: Personal validation
    if (step === 0) {
      if (!data.fullName.trim() || data.fullName.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters).");
        return;
      }
      if (!data.nic.trim() || data.nic.trim().length < 10) {
        setError("Please enter a valid NIC or passport number (10-12 characters).");
        return;
      }
      if (!data.dob) {
        setError("Please select your date of birth.");
        return;
      }
      setStep(1);
      return;
    }

    // Step 1: Professional validation
    if (step === 1) {
      if (!data.slmcNo.trim() || data.slmcNo.trim().length < 3) {
        setError("Please enter your SLMC registration number.");
        return;
      }
      if (!data.specialty) {
        setError("Please select your medical specialty.");
        return;
      }
      if (!data.qualifications.trim()) {
        setError("Please enter your medical qualifications (e.g. MBBS, MD).");
        return;
      }
      if (!data.experience.trim()) {
        setError("Please enter your years of clinical experience.");
        return;
      }
      if (!data.hospital) {
        setError("Please select your primary hospital.");
        return;
      }
      setStep(2);
      return;
    }

    // Step 2: Account submission
    if (step === 2) {
      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!data.phone.trim() || data.phone.trim().length < 9) {
        setError("Please enter a valid phone number (at least 9 digits).");
        return;
      }
      if (!data.password || data.password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (data.password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }
      if (!acceptedTerms) {
        setError("You must accept the terms and clinical privacy policy to register.");
        return;
      }

      submitRegistration();
    }
  }

  async function submitRegistration() {
    setBusy(true);
    setError("");
    try {
      const payload: DoctorRegistrationPayload = {
        ...data,
        fullName: data.fullName.trim(),
        nic: data.nic.trim().toUpperCase(),
        slmcNo: data.slmcNo.trim().toUpperCase(),
        specialty: data.specialty.trim(),
        qualifications: data.qualifications.trim(),
        experience: data.experience.trim(),
        hospital: data.hospital.trim(),
        licenseUrl: data.licenseUrl.trim() || `${data.slmcNo.trim().toUpperCase()}_license.pdf`,
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      };

      const result = await doctorApi.register(payload);

      router.replace({
        pathname: "/doctor/submitted" as any,
        params: {
          doctorId: result.doctor.doctorId,
          fullName: result.doctor.fullName,
          slmcNo: result.doctor.slmcNo,
        },
      });
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen decoration={false}>
      <Header
        title="Doctor Registration"
        subtitle={
          step === 0
            ? "Step 1 of 3: Personal Information"
            : step === 1
              ? "Step 2 of 3: Professional Credentials"
              : "Step 3 of 3: Account Security"
        }
        back={() => {
          if (step > 0) setStep(step - 1);
          else router.replace("/doctor/login");
        }}
      />

      <Steps
        labels={["Personal", "Professional", "Account"]}
        current={step}
      />

      <ErrorMessage message={error} />

      {/* ──────────────── STEP 0: PERSONAL ──────────────── */}
      {step === 0 && (
        <View>
          <Field
            label="Full Name"
            icon="user"
            placeholder="e.g. Dr. Kasun Wickramasinghe"
            value={data.fullName}
            onChangeText={(v) => update("fullName", v)}
          />

          <Field
            label="NIC / Passport Number"
            icon="pin"
            placeholder="e.g. 198812345678"
            value={data.nic}
            onChangeText={(v) => update("nic", v)}
            autoCapitalize="characters"
          />

          <DateField
            label="Date of Birth"
            value={data.dob}
            onChange={(v) => update("dob", v)}
          />

          <View style={{ marginBottom: 20 }}>
            <Text style={s.label}>Gender</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              {(["Male", "Female", "Other"] as const).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: data.gender === item }}
                  onPress={() => update("gender", item)}
                  style={[
                    s.row,
                    {
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: data.gender === item ? C.blue : C.line,
                      backgroundColor: data.gender === item ? "#edf6ff" : "#fff",
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 1.5,
                      borderColor: C.blue,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {data.gender === item && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: C.blue,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      color: data.gender === item ? C.navy : C.muted,
                      fontWeight: data.gender === item ? "600" : "400",
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ──────────────── STEP 1: PROFESSIONAL ──────────────── */}
      {step === 1 && (
        <View>
          <Field
            label="SLMC Registration Number"
            icon="cross"
            placeholder="e.g. SLMC-45678"
            value={data.slmcNo}
            onChangeText={(v) => update("slmcNo", v)}
            autoCapitalize="characters"
          />

          <Select
            label="Medical Specialty"
            placeholder="Select Medical Specialty"
            value={data.specialty}
            options={SPECIALTIES}
            onChange={(v) => update("specialty", v)}
            icon="cross"
          />

          <Field
            label="Qualifications"
            icon="user"
            placeholder="e.g. MBBS, MD (Cardiology)"
            value={data.qualifications}
            onChangeText={(v) => update("qualifications", v)}
          />

          <Field
            label="Years of Experience"
            icon="calendar"
            placeholder="e.g. 8 years"
            value={data.experience}
            onChangeText={(v) => update("experience", v)}
            keyboardType="numeric"
          />

          <Select
            label="Hospital Affiliation"
            placeholder="Select Hospital"
            value={data.hospital}
            options={HOSPITALS}
            onChange={(v) => update("hospital", v)}
            icon="pin"
          />

          {/* Medical License Document Upload (PDF) */}
          <View style={{ marginBottom: 18 }}>
            <Text style={s.label}>Medical License Document (PDF)</Text>

            {Platform.OS === "web" && (
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: "none" }}
                onChange={handleWebFileChange}
              />
            )}

            {data.licenseUrl ? (
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: "#0284c7",
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: "#f0f9ff",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: "#fee2e2",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#fca5a5",
                    }}
                  >
                    <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 11 }}>
                      PDF
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}
                    >
                      {selectedFileName || data.licenseUrl}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "600", marginTop: 2 }}>
                      ✓ Attached {selectedFileSize ? `· ${selectedFileSize}` : ""}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change PDF"
                  onPress={handlePickPdf}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: "#e0f2fe",
                    borderWidth: 1,
                    borderColor: "#bae6fd",
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#0369a1" }}>
                    Change
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload Medical License PDF"
                onPress={handlePickPdf}
                style={{
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: "#94a3b8",
                  borderRadius: 14,
                  paddingVertical: 18,
                  paddingHorizontal: 16,
                  backgroundColor: "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "#e0f2fe",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="id" color="#0284c7" size={22} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e293b" }}>
                  Upload SLMC License (PDF)
                </Text>
                <Text style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>
                  Click to select medical license or registration certificate (.pdf)
                </Text>
              </Pressable>
            )}
          </View>

          <Notice>
            Hospital administration will verify your SLMC registration number
            against the Sri Lanka Medical Council registry.
          </Notice>
          <View style={{ height: 12 }} />
        </View>
      )}

      {/* ──────────────── STEP 2: ACCOUNT ──────────────── */}
      {step === 2 && (
        <View>
          <Field
            label="Official Email Address"
            icon="mail"
            placeholder="e.g. doctor@careplus.lk"
            value={data.email}
            onChangeText={(v) => update("email", v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Field
            label="Phone Number"
            icon="phone"
            placeholder="e.g. 0771234567"
            value={data.phone}
            onChangeText={(v) => update("phone", v)}
            keyboardType="phone-pad"
          />

          <Field
            label="Password"
            icon="lock"
            placeholder="At least 8 characters"
            password
            value={data.password}
            onChangeText={(v) => update("password", v)}
          />

          <Field
            label="Confirm Password"
            icon="lock"
            placeholder="Re-enter password"
            password
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            accessibilityRole="checkbox"
            aria-checked={acceptedTerms}
            accessibilityState={{ checked: acceptedTerms }}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            style={[s.row, { gap: 10, marginVertical: 14, alignItems: "flex-start" }]}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: C.blue,
                backgroundColor: acceptedTerms ? C.blue : "#fff",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {acceptedTerms && <Icon name="check" color="#fff" size={14} />}
            </View>
            <Text style={{ flex: 1, color: C.navy, fontSize: 12, lineHeight: 18 }}>
              I certify that the medical credentials provided are accurate and
              agree to the{" "}
              <Text style={{ color: C.blue, fontWeight: "700" }}>
                CarePlus Clinical Terms of Service
              </Text>.
            </Text>
          </Pressable>
        </View>
      )}

      <View style={{ marginTop: 20, marginBottom: 20 }}>
        <Button
          title={step === 2 ? "Submit Registration" : "Next Step"}
          arrow
          onPress={handleNext}
          loading={busy}
        />
      </View>

      <Pressable
        style={s.centerLink}
        onPress={() => router.replace("/doctor/login")}
      >
        <Text style={{ color: C.muted, fontSize: 12 }}>
          Already registered? <Text style={s.link}>Login Here</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}
