import { Text } from "../i18n/LanguageProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Storage, type UserPath } from "@/utils/storage";
import { assets, Button, C, ErrorMessage, Leaves, s, Wave } from "../shared/ui";
import { LanguagePicker } from "./LanguagePicker";
import { HeartMark } from "../shared/icons";
export default function LaunchScreen() {
  const [error, setError] = useState("");
  const navigated = useRef(false);
  const start = useCallback(async () => {
    if (navigated.current) return;
    try {
      await Storage.clearSession();
      await Storage.clearNurseSession();
      const path = await Storage.getUserPath();
      navigated.current = true;
      router.replace(
        path === "patient"
          ? "/login"
          : path === "staff"
            ? "/who-you-are"
            : "/what-you-need",
      );
    } catch {
      setError("Unable to read your saved choice. Tap to try again.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void start();
    }, 2200);
    return () => clearTimeout(timer);
  }, [start]);
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Wave top pale />
      <Wave pale />
      <Leaves />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 10,
        }}
      >
        <Image
          source={assets.logo}
          style={{ width: "86%", height: 226 }}
          resizeMode="contain"
        />
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={{ padding: 18 }}
        >
          <Text style={{ color: "#0050b8", fontSize: 14, fontWeight: "700" }}>
            Click to Start
          </Text>
        </Pressable>
        <ErrorMessage message={error} />
      </View>
      <LanguagePicker />
    </View>
  );
}
export function OptionsScreen() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(path: UserPath) {
    setBusy(true);
    try {
      await Storage.setUserPath(path);
      router.replace(path === "patient" ? "/login" : "/who-you-are");
    } catch {
      setError("Unable to save your choice. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ChoiceLayout title="What You Need?">
      <Button
        title="Book a Appointment"
        arrow
        disabled={busy}
        onPress={() => select("patient")}
      />
      <Text
        style={{
          color: "#0050b8",
          textAlign: "center",
          fontWeight: "700",
          marginVertical: 31,
        }}
      >
        OR
      </Text>
      <Button
        title="Go To Staff Portal"
        arrow
        disabled={busy}
        onPress={() => select("staff")}
      />
      <ErrorMessage message={error} />
    </ChoiceLayout>
  );
}
function ChoiceLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Wave top pale />
      <Wave pale />
      <Leaves />
      <View style={{ flex: 1, justifyContent: "center", paddingBottom: 36 }}>
        <Text
          style={[
            s.title,
            { fontSize: 28, textAlign: "center", marginBottom: 46, paddingHorizontal: 20 },
          ]}
        >
          {title}
        </Text>
        <View style={{ alignSelf: "center", width: "80%", maxWidth: 330 }}>
          <View
            style={{ pointerEvents: "none", position: "absolute", alignSelf: "center", top: -20 }}
          >
            <HeartMark size={320} opacity={0.2} />
          </View>
          {children}
        </View>
      </View>
      <LanguagePicker />
    </View>
  );
}
export function StaffHandoffScreen() {
  const [role, setRole] = useState("");
  return (
    <ChoiceLayout title="Who You Are?">
      <Button title="Doctor" arrow onPress={() => setRole("Doctor")} />
      <Text
        style={{
          color: C.blue,
          textAlign: "center",
          fontWeight: "700",
          marginVertical: 31,
        }}
      >
        OR
      </Text>
      <Button title="Nurse" arrow onPress={() => router.replace("/nurse/login")} />
      {!!role && (
        <Text
          style={[
            s.body,
            { marginTop: 18, textAlign: "center", color: C.navy },
          ]}
        >
          {role} portal will be connected by the staff team.
        </Text>
      )}
      <Pressable
        onPress={() => router.replace("/what-you-need")}
        style={s.centerLink}
      >
        <Text style={s.link}>Change selected option</Text>
      </Pressable>
    </ChoiceLayout>
  );
}
