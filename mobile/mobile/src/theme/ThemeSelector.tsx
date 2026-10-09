import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text, useLanguage } from "@/features/patient/i18n/LanguageProvider";
import { useAppTheme } from "./ThemeProvider";
export default function ThemeSelector() {
  const { mode, setMode, colors } = useAppTheme();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <View style={{ padding: 14, gap: 12, marginVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Appearance</Text>
    <View style={{ flexDirection: "row", gap: 10 }}>
      {(["light", "dark"] as const).map((value) => <Pressable key={value}
        accessibilityRole="radio" accessibilityLabel={t(value === "light" ? "Light theme" : "Dark theme")}
        aria-checked={mode === value} accessibilityState={{ checked: mode === value, disabled: busy }} disabled={busy}
        onPress={async (event) => {
          event.stopPropagation(); setBusy(true); setError(false);
          try { await setMode(value); } catch { setError(true); } finally { setBusy(false); }
        }}
        style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, borderWidth: 2,
          borderColor: mode === value ? colors.accent : colors.border,
          backgroundColor: mode === value ? (mode === "dark" ? "#163a58" : "#e5f3ff") : colors.surface,
          alignItems: "center", gap: 5 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value === "light" ? "#f9c74f" : "#344d73", borderWidth: 2, borderColor: value === "light" ? "#e5ad28" : "#8eafd5" }} />
        <Text style={{ color: colors.text, fontWeight: "600", textAlign: "center" }}>{value === "light" ? "Light theme" : "Dark theme"}</Text>
      </Pressable>)}
    </View>
    {error && <Text accessibilityRole="alert" style={{ color: mode === "dark" ? "#ffabb3" : "#b42318" }}>Unable to save theme. Please try again.</Text>}
  </View>;
}
