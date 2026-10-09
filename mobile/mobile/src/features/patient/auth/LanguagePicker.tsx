import { useState } from "react";
import { Pressable, Text, View } from '@/theme/primitives';
import { useLanguage, type Language } from "../i18n/LanguageProvider";
export function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  const [error, setError] = useState("");
  return (
    <View style={{ alignItems: "center", paddingVertical: 12 }}>
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "#cfe2f7",
          borderRadius: 20,
          backgroundColor: "#fff",
          overflow: "hidden",
        }}
      >
        {(
          [
            { code: "en", label: "EN", name: "English" },
            { code: "si", label: "සිංහල", name: "Sinhala" },
            { code: "ta", label: "தமிழ்", name: "Tamil" },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.code}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: language === item.code }}
            aria-pressed={language === item.code}
            onPress={() => {
              void setLanguage(item.code as Language)
                .then(() => setError(""))
                .catch(() => setError("Unable to save language."));
            }}
            style={{
              minWidth: 70,
              paddingHorizontal: 9,
              paddingVertical: 7,
              alignItems: "center",
              backgroundColor: language === item.code ? "#8ed0ff" : "#fff",
            }}
          >
            <Text
              style={{
                color: "#086ab9",
                fontSize: 12,
                fontWeight: language === item.code ? "700" : "400",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!error && (
        <Text style={{ color: "#b52d3b", fontSize: 12 }}>{t(error)}</Text>
      )}
    </View>
  );
}
