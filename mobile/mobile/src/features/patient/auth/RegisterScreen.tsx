import { filterName, filterNic } from "./validation";
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
import DateField from "../shared/DateField";
import {
  districts,
  parseBirthDate,
  registrationErrors,
  registrationSteps,
  type RegistrationErrors,
} from "./validation";
import { usePatient } from "../shared/session";
export { districts } from "./validation";
export { parseBirthDate } from "./validation";
export default function RegisterScreen() {
  const { googleOnboarding, setGoogleOnboarding, signIn } = usePatient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [policy, setPolicy] = useState("");
  const [data, setData] = useState<Registration>({
    fullName: googleOnboarding?.name || "",
    nic: "",
    dateOfBirth: "",
    gender: "Male",
    phone: "",
    email: googleOnboarding?.email || "",
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
    setError("");
  }
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegistrationErrors, boolean>>
  >({});
  const [attempted, setAttempted] = useState(false);
  const errors = registrationErrors(data, confirm, genderChosen);
  const fieldError = (key: keyof RegistrationErrors) =>
    attempted || touched[key] ? errors[key] : undefined;
  const validation = (key: keyof RegistrationErrors) => ({
    error: fieldError(key),
    onBlur: () => setTouched((old) => ({ ...old, [key]: true })),
  });
  async function next() {
    if (busy) return;
    setError("");
    setAttempted(true);
    if (registrationSteps[step].some((key) => errors[key])) return;
    if (step < 2) {
      setStep(step + 1);
      setAttempted(false);
      return;
    }
    const invalidStep = registrationSteps.findIndex((keys) =>
      keys.some((key) => errors[key]),
    );
    if (invalidStep !== -1) {
      setStep(invalidStep);
      return;
    }
    setBusy(true);
    try {
      const { patient, token } = await api.register({
        ...data,
        ...(googleOnboarding
          ? { googleRegistrationToken: googleOnboarding.proofToken }
          : {}),
        dateOfBirth: parseBirthDate(data.dateOfBirth),
      });
      if (token) {
        await signIn(token, patient);
        router.replace("/patient/home");
        return;
      }
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
    if (busy) return;
    setAttempted(false);
    setError("");
    if (step) setStep(step - 1);
    else {
      setGoogleOnboarding(null);
      router.replace("/login");
    }
  };
  return (
    <Screen>
      {googleOnboarding && (
        <View
          style={[
            s.notice,
            {
              marginTop: 12,
              flexDirection: "column",
              alignItems: "flex-start",
            },
          ]}
        >
          <Text style={s.body}>
            Google verified. Complete your patient details and choose a CarePlus
            password for account recovery.
          </Text>
          <Text translate={false} style={s.body}>
            {googleOnboarding.email}
          </Text>
          <Pressable
            onPress={() => {
              setGoogleOnboarding(null);
              router.replace("/login");
            }}
          >
            <Text style={s.link}>Use another Google account</Text>
          </Pressable>
        </View>
      )}
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
            {...validation("fullName")}
            onChangeText={(v) => update("fullName", filterName(v))}
            autoComplete="name"
          />
          <Field
            label="NIC / Passport No"
            icon="id"
            placeholder="12 digits or 9 digits followed by V"
            value={data.nic}
            {...validation("nic")}
            onChangeText={(v) => update("nic", filterNic(v))}
            autoCapitalize="characters"
          />
          <DateField
            label="Date of Birth"
            value={data.dateOfBirth}
            error={fieldError("dateOfBirth")}
            onChange={(v) => update("dateOfBirth", v)}
          />
          <Text style={s.label}>Gender</Text>
          <ErrorMessage message={fieldError("gender") || ""} />
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
            {...validation("phone")}
            onChangeText={(v) => update("phone", v)}
          />
          <Field
            label="Email Address"
            editable={!googleOnboarding}
            icon="mail"
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={data.email}
            {...validation("email")}
            onChangeText={(v) => update("email", v)}
          />
          <Field
            label="Home Address"
            icon="pin"
            placeholder="Enter your home address"
            multiline
            value={data.address}
            {...validation("address")}
            onChangeText={(v) => update("address", v)}
          />
          <Select
            label="District / City"
            placeholder="Select your district / city"
            value={data.district}
            error={fieldError("district")}
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
            autoCorrect={false}
            value={data.username}
            {...validation("username")}
            onChangeText={(v) => update("username", v)}
          />
          <Field
            label="Password"
            icon="lock"
            placeholder="At least 8 characters, a letter and a number"
            password
            value={data.password}
            {...validation("password")}
            onChangeText={(v) => update("password", v)}
            autoComplete="new-password"
          />
          <Field
            label="Confirm Password"
            icon="lock"
            placeholder="Confirm your password"
            password
            value={confirm}
            {...validation("confirm")}
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
          <ErrorMessage message={fieldError("acceptedTerms") || ""} />
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
      <Pressable
        style={s.centerLink}
        onPress={() => {
          setGoogleOnboarding(null);
          router.replace("/login");
        }}
      >
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
    <Screen>
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
