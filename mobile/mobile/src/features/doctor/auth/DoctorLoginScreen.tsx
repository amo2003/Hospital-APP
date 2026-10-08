import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import {
  assets,
  Button,
  C,
  ErrorMessage,
  Field,
  Leaves,
  Screen,
  s,
  Wave,
} from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import { DoctorStorage } from "../shared/doctorStorage";
import { doctorApi, doctorMessageOf } from "../shared/doctorApi";

export default function DoctorLoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    DoctorStorage.getRememberedIdentifier()
      .then((saved) => {
        if (saved) setIdentifier(saved);
      })
      .catch(() => {});
  }, []);

  async function handleLogin() {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Please enter your Doctor ID (SLMC, email or phone) and password.");
      return;
    }

    setBusy(true);
    try {
      const result = await doctorApi.login(identifier.trim(), password);
      await DoctorStorage.setDoctorSession(result.token, result.doctor.id);
      if (remember) {
        await DoctorStorage.setRememberedIdentifier(identifier.trim());
      } else {
        await DoctorStorage.setRememberedIdentifier("");
      }
      router.replace("/doctor/dashboard" as any);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginHorizontal: -24, minHeight: 260 }}>
        <Wave top />
        <Leaves small />
        <View style={{ alignItems: "center", paddingTop: 65, paddingBottom: 12, paddingHorizontal: 16 }}>
          <Text style={[s.title, { fontSize: 21 }]}>CarePlus Hospital</Text>
          <Text style={[s.subtitle, { fontSize: 11, marginTop: 2 }]}>
            Doctor Portal
          </Text>
          <Image
            source={assets.hospital}
            resizeMode="contain"
            style={{ width: 220, height: 95, marginTop: 6 }}
          />
          <Text style={[s.title, { fontSize: 22, marginTop: -2, textAlign: "center" }]}>
            Welcome, Doctor!
          </Text>
          <Text style={[s.subtitle, { fontWeight: "700", marginTop: 2, textAlign: "center" }]}>
            Sign in to access your OPD dashboard
          </Text>
        </View>
      </View>

      <View style={{ height: 16 }} />

      <Field
        label="Doctor ID"
        icon="user"
        placeholder="Enter SLMC No, Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoComplete="username"
      />

      <Field
        label="Password"
        icon="lock"
        placeholder="Enter your password"
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        onSubmitEditing={handleLogin}
      />

      <View
        style={[
          s.row,
          { justifyContent: "space-between", marginTop: -2, marginBottom: 16 },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          aria-checked={remember}
          accessibilityState={{ checked: remember }}
          onPress={() => setRemember(!remember)}
          style={[s.row, { gap: 7, paddingVertical: 6 }]}
        >
          <View
            style={{
              width: 17,
              height: 17,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: C.blue,
              backgroundColor: remember ? C.blue : "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {remember && <Icon name="check" color="#fff" size={13} />}
          </View>
          <Text style={{ color: C.muted, fontSize: 12 }}>Remember me</Text>
        </Pressable>
      </View>

      <ErrorMessage message={error} />

      <Button
        title="Login as Doctor"
        arrow
        onPress={handleLogin}
        loading={busy}
      />

      <Pressable
        style={s.centerLink}
        onPress={() => router.push("/doctor/register")}
      >
        <Text style={{ color: C.muted, fontSize: 12 }}>
          New doctor?{" "}
          <Text style={s.link}>Register Here</Text>
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/who-you-are")}
        style={{ alignItems: "center", marginTop: 8 }}
      >
        <Text style={[s.link, { fontWeight: "400", fontSize: 11 }]}>
          Change selected role
        </Text>
      </Pressable>
    </Screen>
  );
}
