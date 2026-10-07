import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { C, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";

export function NurseTabs({ active }: { active: "home" | "appointments" | "notifications" | "profile" }) {
  const { t } = useLanguage();
  const tabs = [
    { key: "home", label: "Home", icon: "home", path: "/nurse/dashboard" },
    { key: "appointments", label: "Appointments", icon: "calendar", path: null },
    { key: "notifications", label: "Notifications", icon: "bell", path: null },
    { key: "profile", label: "Profile", icon: "user", path: "/nurse/profile" },
  ] as const;
  return <View style={[s.tabs, { minHeight: 66, paddingHorizontal: 12, paddingTop: 5, paddingBottom: 4 }]}>{tabs.map((tab) => <Pressable key={tab.key} accessibilityRole="button" accessibilityLabel={t(tab.label)} accessibilityState={{ selected: active === tab.key, disabled: !tab.path }} onPress={() => { if (tab.path) router.replace(tab.path); }} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 5, backgroundColor: active === tab.key ? "#eff8ff" : "#fff", borderRadius: 10 }}>
    <Icon name={tab.icon} size={23} />
    <Text style={{ fontSize: 9, fontWeight: "600", color: C.navy, textAlign: "center", paddingHorizontal: 3 }}>{tab.label}</Text>
  </Pressable>)}</View>;
}

export function ActionCard({ label, icon, onPress }: { label: string; icon: "search" | "clock" | "calendar" | "id" | "bell" | "user"; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.card, { width: "31.5%", minHeight: 92, paddingHorizontal: 6, paddingVertical: 13, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 0, borderRadius: 17 }]}>
    <View style={[s.iconTile, { width: 46, height: 46, borderRadius: 14 }]}><Icon name={icon} size={24} /></View>
    <Text style={{ color: C.navy, fontSize: 10, lineHeight: 14, fontWeight: "600", textAlign: "center" }}>{label}</Text>
  </Pressable>;
}
