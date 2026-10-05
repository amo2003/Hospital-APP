import { Text } from "../i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
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
import { Icon, GoogleLogo } from "../shared/icons";
import { LanguagePicker } from "./LanguagePicker";
WebBrowser.maybeCompleteAuthSession();
export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = usePatient();
  useEffect(() => {
    Storage.rememberedIdentifier()
      .then((value) => {
        if (value) setIdentifier(value);
      })
      .catch(() => {});
  }, []);
  async function login() {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Enter your email or phone and password.");
      return;
    }
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
  const googleConfigured =
    Platform.OS === "web"
      ? !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      : Platform.OS === "ios"
        ? !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
        : !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  return (
    <Screen footer={<LanguagePicker />}>
      <View style={{ marginHorizontal: -24, height: 286 }}>
        <Wave top />
        <Leaves small />
        <View style={{ alignItems: "center", paddingTop: 75 }}>
          <Text style={[s.title, { fontSize: 21 }]}>CarePlus Hospital</Text>
          <Text style={[s.subtitle, { fontSize: 11, marginTop: 2 }]}>
            Your Health, Our Priority
          </Text>
          <Image
            source={assets.hospital}
            resizeMode="contain"
            style={{ width: 235, height: 102, marginTop: 8 }}
          />
          <Text style={[s.title, { fontSize: 29, marginTop: -2 }]}>
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
        onChangeText={setIdentifier}
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
        onChangeText={setPassword}
        autoComplete="current-password"
        onSubmitEditing={login}
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
            }}
          >
            {remember && <Icon name="check" color="#fff" size={14} />}
          </View>
          <Text style={{ color: C.muted, fontSize: 12 }}>Remember me</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/forgot-password")}>
          <Text style={s.link}>Forgot Password?</Text>
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
      {googleConfigured ? (
        <GoogleButton onError={setError} />
      ) : (
        <GoogleVisual
          onPress={() =>
            setError(
              "Google sign-in needs your OAuth client IDs in the mobile and backend .env files. Email or phone sign-in is available.",
            )
          }
        />
      )}
      <Pressable style={s.centerLink} onPress={() => router.push("/register")}>
        <Text style={{ color: C.muted, fontSize: 12 }}>
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
    </Screen>
  );
}
function GoogleVisual({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.inputBox,
        { justifyContent: "center", opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={{ position: "absolute", left: 18 }}>
        <GoogleLogo />
      </View>
      <Text style={{ color: C.navy, fontSize: 14, fontWeight: "600" }}>
        Continue with Google
      </Text>
    </Pressable>
  );
}
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { signIn } = usePatient();
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });
  useEffect(() => {
    if (response?.type === "error")
      onError("Google sign-in could not be completed.");
    if (response?.type !== "success") return;
    Promise.resolve()
      .then(() => {
        const token =
          response.authentication?.idToken || response.params.id_token;
        if (!token)
          throw new Error(
            "Google did not return an identity token. Check the OAuth configuration.",
          );
        return api.google(token);
      })
      .then(async (result) => {
        await signIn(result.token, result.patient);
        router.replace("/patient/home");
      })
      .catch((e) => onError(messageOf(e)))
      .finally(() => setBusy(false));
    // Handle a provider response once, rather than re-authenticating on context updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return (
    <GoogleVisual
      disabled={!request || busy}
      onPress={() => {
        setBusy(true);
        void promptAsync()
          .then((result) => {
            if (result.type !== "success") setBusy(false);
          })
          .catch((e) => {
            setBusy(false);
            onError(messageOf(e));
          });
      }}
    />
  );
}
