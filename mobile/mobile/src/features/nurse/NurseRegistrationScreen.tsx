import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { NurseRegistration } from "./types";
import { nurseApi, nurseMessageOf } from "./api";
import { Button, C, ErrorMessage, Field, Screen, Select, s } from "../patient/shared/ui";
import { districts } from "../patient/auth/RegisterScreen";
import { Icon } from "../patient/shared/icons";

const departments = ["General OPD", "General Medicine", "Cardiology", "Dermatology", "Paediatrics", "Emergency", "Surgical Ward"];
const toIsoDate = (value: string) => {
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{1,2})[ /-](\d{1,2})[ /-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : clean;
};

export default function NurseRegistrationScreen() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [data, setData] = useState<NurseRegistration>({
    fullName: "", nic: "", dateOfBirth: "", gender: "Female", phone: "", email: "", address: "", district: "",
    username: "", department: "", ward: "", password: "", confirmPassword: "", acceptedTerms: false,
  });
  const update = <K extends keyof NurseRegistration>(key: K, value: NurseRegistration[K]) => setData((current) => ({ ...current, [key]: value }));

  async function next() {
    setError("");
    if (step === 0) {
      if (data.fullName.trim().length < 2 || !data.nic.trim() || !data.dateOfBirth.trim() || !data.department) {
        setError("Complete your name, Nurse ID / NIC, date of birth, department and gender."); return;
      }
      setStep(1); return;
    }
    if (step === 1) {
      if (!data.phone.trim() || !data.email.trim() || data.address.trim().length < 5 || !data.district) {
        setError("Enter your phone, email, home address and district."); return;
      }
      setStep(2); return;
    }
    if (!/^[a-z0-9_]{3,30}$/i.test(data.username) || data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      setError("Use a username of 3–30 letters, numbers or underscores and a password with at least 8 characters, a letter and a number."); return;
    }
    if (data.password !== data.confirmPassword) { setError("Passwords do not match."); return; }
    if (!terms) { setError("Please read and accept the Terms of Service and Privacy Policy."); return; }
    setBusy(true);
    try {
      const result = await nurseApi.register({ ...data, dateOfBirth: toIsoDate(data.dateOfBirth), acceptedTerms: true });
      router.replace({ pathname: "/nurse/success", params: { nurseId: result.nurse.nurseId, name: result.nurse.fullName, department: result.nurse.department, username: result.nurse.username } });
    } catch (e) { setError(nurseMessageOf(e)); }
    finally { setBusy(false); }
  }

  return (
    <Screen>
      <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 19, paddingHorizontal: 24, paddingTop: 55, paddingBottom: 30, borderBottomLeftRadius: 43, borderBottomRightRadius: 43 }}>
        <View style={[s.row, { justifyContent: "space-between", marginBottom: 13 }]}>
          <Pressable accessibilityLabel={t("Back")} onPress={() => step ? setStep(step - 1) : router.replace("/nurse/login")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable>
          <View style={{ flex: 1, alignItems: "center", marginRight: 30 }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" }}>Create Nurse Account</Text>
            <Text style={{ color: "#d5e6f5", fontSize: 11, marginTop: 4, textAlign: "center" }}>Step {step + 1} of 3 - { ["Personal Details", "Contact Details", "Account Setup"][step] }</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
          {["Personal", "Contact", "Account"].map((label, index) => <View key={label} style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
            {index > 0 && <View style={{ position: "absolute", width: "100%", height: 1, backgroundColor: index <= step ? "#d9efff" : "#7694b1", left: "-50%" }} />}
            <View style={{ zIndex: 1, alignItems: "center", flex: 1, paddingHorizontal: 3 }}>
              <View style={{ width: 30, height: 30, borderRadius: 16, backgroundColor: index <= step ? "#fff" : "#21496e", borderWidth: 1, borderColor: "#d8eafb", alignItems: "center", justifyContent: "center" }}>
                {index < step ? <Icon name="check" size={17} /> : <Text style={{ color: index === step ? C.blue : "#d5e6f5", fontSize: 12, fontWeight: "700" }}>{index + 1}</Text>}
              </View>
              <Text style={{ color: "#e0edf8", fontSize: 9, marginTop: 4, textAlign: "center" }}>{label}</Text>
            </View>
          </View>)}
        </View>
      </LinearGradient>
      <View style={[s.card, { borderWidth: 0, padding: 20, borderRadius: 20, marginTop: -33 }]}>
        {step === 0 ? <>
          <Field label="Full Name" icon="user" placeholder="Enter your full name" value={data.fullName} onChangeText={(v) => update("fullName", v)} autoComplete="name" />
          <Field label="Nurse ID / NIC Number" icon="id" placeholder="Enter your nurse ID or NIC" value={data.nic} onChangeText={(v) => update("nic", v)} autoCapitalize="characters" />
          <Field label="Date of Birth" icon="calendar" placeholder="DD / MM / YYYY" value={data.dateOfBirth} onChangeText={(v) => update("dateOfBirth", v)} />
          <Select label="Department / Ward" icon="calendar" placeholder="Select department" value={data.department} options={departments.map((value) => ({ label: value, value }))} onChange={(v) => { update("department", v); update("ward", v); }} />
          <Text style={[s.label, { fontSize: 13, marginBottom: 7 }]}>Gender</Text>
          <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }]}>
            {(["Female", "Male", "Other"] as const).map((gender) => <Pressable key={gender} accessibilityRole="radio" accessibilityState={{ checked: data.gender === gender }} onPress={() => update("gender", gender)} style={[s.row, { gap: 5, paddingVertical: 8 }]}>
              <View style={{ width: 20, height: 20, borderRadius: 11, borderWidth: 1, borderColor: C.blue, alignItems: "center", justifyContent: "center" }}>{data.gender === gender && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.blue }} />}</View>
              <Text style={{ color: C.navy, fontSize: 12 }}>{gender}</Text>
            </Pressable>)}
          </View>
        </> : step === 1 ? <>
          <Field label="Phone Number" icon="phone" placeholder="Enter your phone number" value={data.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" />
          <Field label="Email Address" icon="mail" placeholder="Enter your email address" value={data.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Home Address" icon="pin" placeholder="Enter your home address" value={data.address} onChangeText={(v) => update("address", v)} />
          <Select label="District / City" placeholder="Select district / city" value={data.district} options={districts.map((value) => ({ label: value, value }))} onChange={(v) => update("district", v)} />
        </> : <>
          <Field label="Username" icon="user" placeholder="Choose a username" value={data.username} onChangeText={(v) => update("username", v)} autoCapitalize="none" />
          <Field label="Password" icon="lock" placeholder="Create a password" password value={data.password} onChangeText={(v) => update("password", v)} />
          <Field label="Confirm Password" icon="lock" placeholder="Confirm your password" password value={data.confirmPassword} onChangeText={(v) => update("confirmPassword", v)} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: terms }} onPress={() => { setTerms(!terms); update("acceptedTerms", !terms); }} style={[s.row, { alignItems: "flex-start", gap: 9, marginBottom: 20 }]}>
            <View style={{ width: 21, height: 21, borderRadius: 5, borderWidth: 1, borderColor: C.blue, backgroundColor: terms ? C.blue : "#fff", alignItems: "center", justifyContent: "center" }}>{terms && <Icon name="check" size={16} color="#fff" />}</View>
            <Text style={{ flex: 1, color: C.muted, fontSize: 11, lineHeight: 17 }}>I agree to the <Text style={s.link}>Terms of Service</Text> and <Text style={s.link}>Privacy Policy</Text>.</Text>
          </Pressable>
        </>}
        <ErrorMessage message={error} />
        <View style={[s.row, { gap: 10, marginTop: 4 }]}>
          {step > 0 && <View style={{ flex: 1 }}><Button title="Back" outline onPress={() => { setError(""); setStep(step - 1); }} /></View>}
          <View style={{ flex: 1 }}><Button title={step === 2 ? "Create Account" : "Next"} onPress={next} loading={busy} /></View>
        </View>
      </View>
      {step > 0 && <Pressable style={s.centerLink} onPress={() => router.replace("/nurse/login")}><Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>Already have an account? <Text style={s.link}>Login</Text></Text></Pressable>}
      {step === 0 && <Pressable style={s.centerLink} onPress={() => router.replace("/nurse/login")}><Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>Already have an account? <Text style={s.link}>Login</Text></Text></Pressable>}
    </Screen>
  );
}
