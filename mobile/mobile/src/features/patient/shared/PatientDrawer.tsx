import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Text, useLanguage } from "../i18n/LanguageProvider";
import { LanguagePicker } from "../auth/LanguagePicker";
import { PatientAvatar } from "../profile/ProfilePhotoPicker";
import { Icon, type IconName } from "./icons";
import { usePatient } from "./session";
import { C } from "./ui";

const links: { label: string; icon: IconName; path: Href }[] = [
  { label: "Home", icon: "home", path: "/patient/home" },
  { label: "My Appointments", icon: "calendar", path: "/patient/appointments" },
  { label: "Queue Status", icon: "clock", path: "/patient/queue" },
  { label: "Notifications", icon: "bell", path: "/patient/notifications" },
  {
    label: "Appointment History",
    icon: "id",
    path: "/patient/appointment-history",
  },
  { label: "My Profile", icon: "user", path: "/patient/profile" },
  {
    label: "Settings",
    icon: "settings",
    path: { pathname: "/patient/profile", params: { tab: "Settings" } },
  },
];

export default function PatientDrawer({ onClose }: { onClose: () => void }) {
  const { patient, signOut } = usePatient();
  const { t } = useLanguage();
  const [slide] = useState(() => new Animated.Value(-340));
  const [expanded, setExpanded] = useState<"language" | "help" | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const animation = Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [slide]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } catch {
      // signOut clears the local session even when the server is unavailable.
    } finally {
      setBusy(false);
      onClose();
      router.replace("/login");
    }
  }

  function item(
    label: string,
    icon: IconName,
    onPress: () => void,
    expandedState?: boolean,
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={t(label)}
        accessibilityState={{ disabled: busy, expanded: expandedState }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.item,
          pressed && { backgroundColor: "#e5f3ff" },
        ]}
      >
        <Icon name={icon} />
        <Text style={styles.label}>{label}</Text>
        {expandedState !== undefined && <Icon name="chevron" size={16} />}
      </Pressable>
    );
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t("Close menu")}
          onPress={onClose}
        />
        <Animated.View
          style={[styles.panel, { transform: [{ translateX: slide }] }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <PatientAvatar uri={patient?.profileImage} size={48} />
              <View style={{ flex: 1 }}>
                <Text
                  translate={false}
                  style={[styles.label, { fontWeight: "700" }]}
                >
                  {patient?.fullName}
                </Text>
                <Text style={{ color: C.muted, marginTop: 4 }}>Patient</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Close menu")}
                onPress={onClose}
                hitSlop={10}
                style={{ padding: 8 }}
              >
                <Icon name="close" size={20} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
            >
              {links.map(({ label, icon, path }) =>
                item(label, icon, () => {
                  onClose();
                  if (label !== "Home") router.push(path);
                }),
              )}
              {item(
                "Language",
                "globe",
                () => setExpanded(expanded === "language" ? null : "language"),
                expanded === "language",
              )}
              {expanded === "language" && <LanguagePicker />}
              <View style={styles.divider} />
              {item(
                "Help & Support",
                "info",
                () => setExpanded(expanded === "help" ? null : "help"),
                expanded === "help",
              )}
              {expanded === "help" && (
                <View style={styles.help}>
                  <Text style={styles.helpText}>
                    Use My Appointments to view or cancel your bookings. Update
                    your details in My Profile.
                  </Text>
                  <Text style={styles.helpText}>
                    For help with hospital services or appointments, contact
                    your hospital OPD reception.
                  </Text>
                </View>
              )}
              {item(busy ? "Logging out..." : "Log Out", "logout", logout)}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(8, 28, 51, 0.42)" },
  panel: {
    width: "86%",
    maxWidth: 340,
    height: "100%",
    backgroundColor: "#fff",
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: "#f0f8ff",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 49,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
  },
  label: { color: C.navy, fontSize: 15, flexShrink: 1, flex: 1 },
  divider: { height: 1, backgroundColor: C.line, margin: 12 },
  help: { backgroundColor: C.bg, borderRadius: 12, padding: 14, gap: 12 },
  helpText: { color: C.navy, fontSize: 13, lineHeight: 22 },
});
