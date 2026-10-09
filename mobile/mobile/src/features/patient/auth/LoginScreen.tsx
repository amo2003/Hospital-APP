import { Text } from "../i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { Image, Modal } from 'react-native';
import { Pressable, View } from '@/theme/primitives';
import { router } from "expo-router";

import { loginErrors } from "./validation";
import { Storage } from "@/utils/storage";
import { api, messageOf } from "../shared/api";
import { usePatient } from "../shared/session";
import {
  assets,
  Button,
  C,
  ErrorMessage,
  Field,
  Leaves,
  Screen,
  ServiceCard,
  s,
  Wave,
} from "../shared/ui";
import { Icon } from "../shared/icons";
import GoogleSignInButton from "./google/GoogleSignInButton";
import type { GoogleOnboarding } from "../shared/types";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, setGoogleOnboarding } = usePatient();
  const [link, setLink] = useState<GoogleOnboarding | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  async function handleGoogle(idToken: string) {
    setBusy(true);
    try {
      const result = await api.google(idToken);
      if (result.status === "signed-in") {
        await signIn(result.token, result.patient);
        router.replace("/patient/home");
      } else if (result.status === "registration-required") {
        setGoogleOnboarding(result);
        router.replace("/register");
      } else {
        setLink(result);
        setLinkPassword("");
      }
    } finally {
      setBusy(false);
    }
  }
  async function confirmLink() {
    if (!link || busy) return;
    if (!linkPassword) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.linkGoogle(link.proofToken, linkPassword);
      await signIn(result.token, result.patient);
      setLink(null);
      router.replace("/patient/home");
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    Storage.rememberedIdentifier()
      .then((value) => {
        if (value) setIdentifier(value);
      })
      .catch(() => {});
  }, []);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({
    identifier: false,
    password: false,
  });
  const fieldErrors = loginErrors(identifier, password);
  async function login() {
    if (busy) return;
    setError("");
    setAttempted(true);
    if (Object.keys(fieldErrors).length) return;
    setBusy(true);
    try {
      const result = await api.login(identifier.trim(), password);
      await signIn(result.token, result.patient);
      await Storage.rememberIdentifier(remember ? identifier.trim() : "");
      router.replace("/patient/home");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View
        style={{ marginHorizontal: -24, minHeight: 286, paddingBottom: 14 }}
      >
        <Wave top />
        <Leaves small />
        <View
          style={{
            alignItems: "center",
            paddingTop: 75,
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={[
              s.title,
              { fontSize: 21, textAlign: "center", width: "100%" },
            ]}
          >
            CarePlus Hospital
          </Text>
          <Text style={[s.subtitle, { fontSize: 11, marginTop: 2 }]}>
            Your Health, Our Priority
          </Text>
          <Image
            source={assets.hospital}
            resizeMode="contain"
            style={{ width: 235, maxWidth: "100%", height: 102, marginTop: 8 }}
          />
          <Text
            style={[
              s.title,
              {
                fontSize: 29,
                marginTop: 4,
                textAlign: "center",
                width: "100%",
              },
            ]}
          >
            Welcome back!
          </Text>
          <Text style={[s.subtitle, { fontWeight: "700", marginTop: 2 }]}>
            Sign in to your account
          </Text>
        </View>
      </View>
      <ServiceCard />
      <View style={{ height: 14 }} />
      <Field
        label="Email or Phone"
        icon="user"
        placeholder="Enter Email or Phone"
        value={identifier}
        onChangeText={(value) => {
          setIdentifier(value);
          setError("");
        }}
        error={
          attempted || touched.identifier ? fieldErrors.identifier : undefined
        }
        onBlur={() => setTouched((old) => ({ ...old, identifier: true }))}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="username"
      />
      <Field
        label="Password"
        icon="lock"
        placeholder="Password"
        password
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError("");
        }}
        error={attempted || touched.password ? fieldErrors.password : undefined}
        onBlur={() => setTouched((old) => ({ ...old, password: true }))}
        autoComplete="current-password"
        onSubmitEditing={login}
      />
      <View
        style={[
          s.row,
          {
            justifyContent: "space-between",
            flexWrap: "wrap",
            rowGap: 2,
            marginTop: -2,
            marginBottom: 16,
          },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          aria-checked={remember}
          accessibilityState={{ checked: remember }}
          onPress={() => setRemember(!remember)}
          style={[
            s.row,
            { gap: 7, paddingVertical: 6, maxWidth: "100%", flexShrink: 1 },
          ]}
        >
          <View
            style={{
              width: 17,
              height: 17,
              flexShrink: 0,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: C.blue,
              backgroundColor: remember ? C.blue : "#fff",
              alignItems: "center",
            }}
          >
            {remember && <Icon name="check" color="#fff" size={14} />}
          </View>
          <Text style={{ color: C.muted, fontSize: 12, flexShrink: 1 }}>
            Remember me
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/forgot-password")}
          style={{
            maxWidth: "100%",
            flexShrink: 1,
            marginLeft: "auto",
            paddingVertical: 6,
          }}
        >
          <Text style={[s.link, { textAlign: "right", flexShrink: 1 }]}>
            Forgot Password?
          </Text>
        </Pressable>
      </View>
      <ErrorMessage message={error} />
      <Button title="Login" arrow onPress={login} loading={busy} />
      <View style={[s.row, { marginVertical: 15 }]}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.blue }} />
        <Text style={{ color: C.blue, fontSize: 10, fontWeight: "700" }}>
          OR
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.blue }} />
      </View>
      <GoogleSignInButton
        onCredential={handleGoogle}
        onError={setError}
        disabled={busy || !!link}
      />
      <Pressable
        style={s.centerLink}
        onPress={() => router.replace("/register")}
      >
        <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>
          Don’t have an account? <Text style={s.link}>Sign Up</Text>
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/what-you-need")}
        style={{ alignItems: "center" }}
      >
        <Text style={[s.link, { fontWeight: "400", fontSize: 11 }]}>
          Change selected option
        </Text>
      </Pressable>
      <Modal
        visible={!!link}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) {
            setLink(null);
            setError("");
          }
        }}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Link your Google account</Text>
            <Text style={[s.body, { marginVertical: 16 }]}>
              An account already uses this email. Enter your CarePlus password
              once to connect Google sign-in.
            </Text>
            <Text translate={false} style={[s.body, { marginBottom: 15 }]}>
              {link?.email}
            </Text>
            <Field
              label="Password"
              password
              value={linkPassword}
              onChangeText={setLinkPassword}
              autoComplete="current-password"
              onSubmitEditing={confirmLink}
            />
            <ErrorMessage message={error} />
            <Button
              title="Link and Sign In"
              onPress={confirmLink}
              loading={busy}
              disabled={!linkPassword}
            />
            <Button
              title="Cancel"
              outline
              disabled={busy}
              onPress={() => {
                setLink(null);
                setLinkPassword("");
                setError("");
              }}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
