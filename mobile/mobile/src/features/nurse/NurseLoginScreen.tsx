import { Text } from "../patient/i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Storage } from "@/utils/storage";
import { assets, Button, C, ErrorMessage, Field, Leaves, Screen, s, Wave } from "../patient/shared/ui";
import { GoogleLogo, Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import { useNurse } from "./session";

export default function NurseLoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useNurse();

  useEffect(() => {
    Storage.rememberedNurseIdentifier().then((value) => value && setIdentifier(value)).catch(() => {});
  }, []);

  async function login() {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Enter your Staff ID or email and password.");
      return;
    }
    setBusy(true);
    try {
      const result = await nurseApi.login(identifier.trim(), password);
      await signIn(result.token, result.nurse);
      await Storage.rememberNurseIdentifier(remember ? identifier.trim() : "");
      router.replace("/nurse/dashboard");
    } catch (e) {
      setError(nurseMessageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginHorizontal: -24, height: 184 }}>
        <Wave top />
        <Leaves small />
        <View style={{ alignItems: "center", paddingTop: 44 }}>
          <Image source={assets.logo} resizeMode="contain" style={{ width: 205, height: 108 }} />
        </View>
      </View>
      <View style={[s.card, { borderWidth: 0, padding: 21, marginTop: 4 }]}>
        <Text style={[s.title, { fontSize: 21 }]}>Nurse Login</Text>
        <Text style={[s.body, { fontSize: 12, marginTop: 4, marginBottom: 19 }]}>Enter your credentials to continue</Text>
        <Field label="Staff ID" icon="user" placeholder="e.g. NUR-00231" value={identifier} onChangeText={setIdentifier} autoCapitalize="characters" autoComplete="username" />
        <Field label="Password" icon="lock" placeholder="Enter your password" password value={password} onChangeText={setPassword} onSubmitEditing={login} autoComplete="current-password" />
        <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: -7, marginBottom: 14 }]}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember(!remember)} style={[s.row, { gap: 7, paddingVertical: 6, flexShrink: 1 }]}>
            <View style={{ width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: C.blue, backgroundColor: remember ? C.blue : "#fff", alignItems: "center", justifyContent: "center" }}>
              {remember && <Icon name="check" color="#fff" size={14} />}
            </View>
            <Text style={{ color: C.muted, fontSize: 12, flexShrink: 1 }}>Remember me</Text>
          </Pressable>
          <Pressable style={{ marginLeft: "auto", maxWidth: "100%" }} onPress={() => setError("Contact your hospital administrator to reset your nurse password.")}><Text style={s.link}>Forgot Password?</Text></Pressable>
        </View>
        <ErrorMessage message={error} />
        <Button title="Log In" onPress={login} loading={busy} />
        <View style={[s.row, { marginVertical: 14 }]}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          <Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        </View>
        <Pressable style={[s.inputBox, { justifyContent: "center", minHeight: 54, paddingLeft: 50, paddingRight: 16, paddingVertical: 12 }]} onPress={() => setError("Nurse Google sign-in is not available. Use your Staff ID and password.")}>
          <View style={{ position: "absolute", left: 18 }}><GoogleLogo size={21} /></View>
          <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700", flexShrink: 1, textAlign: "center" }}>Continue with Google</Text>
        </Pressable>
      </View>
      <Pressable style={s.centerLink} onPress={() => router.push("/nurse/register")}>
        <Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>Don’t have an account? <Text style={s.link}>Sign Up</Text></Text>
      </Pressable>
      <Pressable style={{ alignItems: "center", paddingBottom: 8 }} onPress={() => router.replace("/what-you-need")}>
        <Text style={[s.link, { fontWeight: "400", fontSize: 11 }]}>Back to Home</Text>
      </Pressable>
    </Screen>
  );
}
