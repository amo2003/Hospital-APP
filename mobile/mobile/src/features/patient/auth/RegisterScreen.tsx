import { Text } from "../i18n/LanguageProvider";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Storage } from "@/utils/storage";
import { api, messageOf } from "../shared/api";
import type { Registration } from "../shared/types";
import {
  Button,
  C,
  CheckHero,
  ErrorMessage,
  Field,
  Header,
  Leaves,
  Row,
  Screen,
  Select,
  ServiceCard,
  Steps,
  s,
} from "../shared/ui";
import { Icon } from "../shared/icons";
import { LanguagePicker } from "./LanguagePicker";
import DateField from "../shared/DateField";
export const districts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];
export function parseBirthDate(value: string) {
  const parts = value.trim().split(/[\/\s-]+/);
  return parts.length === 3 && parts[0].length !== 4
    ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
    : value.trim();
}
export default function RegisterScreen() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [policy, setPolicy] = useState("");
  const [data, setData] = useState<Registration>({
    fullName: "",
    nic: "",
    dateOfBirth: "",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    district: "",
    username: "",
    password: "",
    acceptedTerms: false,
  });
  const [genderChosen, setGenderChosen] = useState(false);
  function update<K extends keyof Registration>(
    key: K,
    value: Registration[K],
  ) {
    setData((old) => ({ ...old, [key]: value }));
  }
  async function next() {
    setError("");
    if (step === 0) {
      const date = parseBirthDate(data.dateOfBirth);
      const parsed = new Date(date);
      if (
        data.fullName.trim().length < 2 ||
        !/^(\d{9}[VX]|\d{12}|[A-Z][A-Z0-9]{5,19})$/i.test(data.nic.trim()) ||
        !genderChosen
      ) {
        setError(
          "Enter your full name, a valid NIC or passport number, and select your gender.",
        );
        return;
      }
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date ||
        parsed >= new Date() ||
        parsed.getFullYear() < 1900
      ) {
        setError("Enter a valid date of birth as DD / MM / YYYY.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (
        !/^(0\d{9}|\+94\d{9})$/.test(data.phone.replace(/[\s()-]/g, "")) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
        data.address.trim().length < 5 ||
        !data.district
      ) {
        setError(
          "Enter a valid Sri Lankan phone number, email, home address, and district.",
        );
        return;
      }
      setStep(2);
      return;
    }
    if (
      !/^[a-z0-9_]{3,30}$/i.test(data.username) ||
      data.password.length < 8 ||
      data.password.length > 72 ||
      !/[a-z]/i.test(data.password) ||
      !/\d/.test(data.password)
    ) {
      setError(
        "Use a username of 3–30 letters, numbers or underscores, and a password of 8–72 characters including a letter and a number.",
      );
      return;
    }
    if (data.password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!data.acceptedTerms) {
      setError(
        "Please read and accept the Terms of Service and Privacy Policy.",
      );
      return;
    }
    setBusy(true);
    try {
      const { patient } = await api.register({
        ...data,
        dateOfBirth: parseBirthDate(data.dateOfBirth),
      });
      await Storage.setUserPath("patient");
      router.replace({
        pathname: "/account-created",
        params: {
          patientId: patient.patientId,
          name: patient.fullName,
          username: patient.username,
        },
      });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  const back = () => {
    setError("");
    if (step) setStep(step - 1);
    else router.replace("/login");
  };
  return (
    <Screen footer={<LanguagePicker />}>
      <Header
        title="Create your account"
        subtitle={
          step === 0
            ? "Join us for easier healthcare access"
            : `Step ${step + 1} of 3 - ${step === 1 ? "Contact Details" : "Account Setup"}`
        }
        back={back}
      />
      <Steps
        current={step}
        labels={["Personal\nDetails", "Contact\nDetails", "Account\nSetup"]}
      />
      {step === 0 ? (
        <>
          <Field
            label="Full Name"
            icon="user"
            placeholder="Enter your full name"
            value={data.fullName}
            onChangeText={(v) => update("fullName", v)}
            autoComplete="name"
          />
          <Field
            label="NIC / Passport No"
            icon="id"
            placeholder="Enter your NIC or passport number"
            value={data.nic}
            onChangeText={(v) => update("nic", v)}
            autoCapitalize="characters"
          />
          <DateField
            label="Date of Birth"
            value={data.dateOfBirth}
            onChange={(v) => update("dateOfBirth", v)}
          />
          <Text style={s.label}>Gender</Text>
          <View
            style={[
              s.row,
              {
                justifyContent: "space-between",
                marginTop: 5,
                marginBottom: 36,
              },
            ]}
          >
            {(["Male", "Female", "Other"] as const).map((g) => (
              <Pressable
                key={g}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: genderChosen && data.gender === g,
                }}
                onPress={() => {
                  update("gender", g);
                  setGenderChosen(true);
                }}
                style={[s.row, { gap: 7, paddingVertical: 8 }]}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: C.line,
                    backgroundColor:
                      genderChosen && data.gender === g ? C.blue : "#fff",
                  }}
                />
                <Text style={{ color: C.navy, fontSize: 13 }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : step === 1 ? (
        <>
          <Field
            label="Phone Number"
            icon="phone"
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            value={data.phone}
            onChangeText={(v) => update("phone", v)}
          />
          <Field
            label="Email Address"
            icon="mail"
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={data.email}
            onChangeText={(v) => update("email", v)}
          />
          <Field
            label="Home Address"
            icon="pin"
            placeholder="Enter your home address"
            multiline
            value={data.address}
            onChangeText={(v) => update("address", v)}
          />
          <Select
            label="District / City"
            placeholder="Select your district / city"
            value={data.district}
            options={districts.map((v) => ({ value: v, label: v }))}
            onChange={(v) => update("district", v)}
          />
        </>
      ) : (
        <>
          <Field
            label="Username"
            icon="user"
            placeholder="Choose a username"
            autoCapitalize="none"
            value={data.username}
            onChangeText={(v) => update("username", v)}
          />
          <Field
            label="Password"
            icon="lock"
            placeholder="Create a password"
            password
            value={data.password}
            onChangeText={(v) => update("password", v)}
            autoComplete="new-password"
          />
          <Field
            label="Confirm Password"
            icon="lock"
            placeholder="Confirm your password"
            password
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
          />
          <View
            style={[
              s.row,
              { gap: 9, alignItems: "flex-start", marginBottom: 30 },
            ]}
          >
            <Pressable
              accessibilityRole="checkbox"
              aria-checked={data.acceptedTerms}
              accessibilityLabel="Accept terms and privacy policy"
              accessibilityState={{ checked: data.acceptedTerms }}
              onPress={() => update("acceptedTerms", !data.acceptedTerms)}
              style={{
                width: 20,
                height: 20,
                backgroundColor: data.acceptedTerms ? C.blue : "#fff",
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 4,
              }}
            >
              {data.acceptedTerms && (
                <Icon name="check" size={18} color="#fff" />
              )}
            </Pressable>
            <Text style={[s.body, { flex: 1, fontSize: 12 }]}>
              I agree to the{" "}
              <Text
                style={s.link}
                onPress={() => setPolicy("Terms of Service")}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={s.link} onPress={() => setPolicy("Privacy Policy")}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </>
      )}
      <ErrorMessage message={error} />
      <View
        style={{
          marginTop: step === 1 ? 24 : 8,
          gap: 12,
          flexDirection: step === 1 ? "row" : "column",
        }}
      >
        {step === 1 && (
          <Button title="Back" outline onPress={back} style={{ flex: 1 }} />
        )}
        <Button
          title={step === 2 ? "Create Account" : "Next"}
          onPress={next}
          loading={busy}
          style={step === 1 ? { flex: 1 } : undefined}
        />
        {step === 2 && (
          <Button title="Back" outline disabled={busy} onPress={back} />
        )}
      </View>
      <Pressable style={s.centerLink} onPress={() => router.replace("/login")}>
        <Text style={{ color: C.blue, fontSize: 13 }}>
          Already have an account?{" "}
          <Text style={{ fontWeight: "700" }}>Login</Text>
        </Text>
      </Pressable>
      <Modal
        visible={!!policy}
        transparent
        onRequestClose={() => setPolicy("")}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>{policy}</Text>
            <Text style={[s.body, { marginVertical: 18 }]}>
              {policy === "Privacy Policy"
                ? "This student project stores the personal details you provide to manage your patient account and OPD appointments. Passwords are stored as hashes. You can edit your profile or delete your account and its appointments in Settings. Do not enter real patient information into a demonstration deployment."
                : "Use accurate information when creating an account. Appointments depend on available hospital schedules. This student project is not an emergency service. The hospital must review and replace these demonstration terms before public use."}
            </Text>
            <Button title="Close" onPress={() => setPolicy("")} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
export function AccountCreatedScreen() {
  const params = useLocalSearchParams<{
    patientId?: string;
    name?: string;
    username?: string;
  }>();
  return (
    <Screen footer={<LanguagePicker />}>
      <Leaves small />
      <CheckHero
        title={"Account Created\nSuccessfully!"}
        subtitle="Your OPD patient account is ready"
      />
      <View style={s.card}>
        <ServiceCard />
        <View
          style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }}
        />
        <Row label="Patient ID" value={params.patientId || "—"} />
        <Row label="Name" value={params.name || "—"} />
        <Row label="Username" value={params.username || "—"} />
        <Row label="Status" value="Active" />
      </View>
      <View
        style={[
          s.notice,
          {
            marginTop: 9,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          },
        ]}
      >
        <Text style={{ color: C.navy, fontWeight: "700" }}>
          What you can do next
        </Text>
        <Text style={s.subtitle}>✓ Sign in to your account</Text>
        <Text style={s.subtitle}>
          ✓ Book appointments and check booking details
        </Text>
      </View>
      <View style={{ gap: 10, marginTop: 26 }}>
        <Button
          title="Go to Login"
          arrow
          onPress={() => router.replace("/login")}
        />
        <Button
          title="Back to Home"
          outline
          onPress={() => router.replace("/")}
        />
      </View>
    </Screen>
  );
}
