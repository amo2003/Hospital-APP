import { View } from "react-native";
import { Text, useLanguage } from "../i18n/LanguageProvider";
import { C, s } from "./ui";
import { Icon } from "./icons";
type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  error?: string;
};
export default function DateField({
  label,
  value,
  onChange,
  editable = true,
  error,
}: DateFieldProps) {
  const { language, t } = useLanguage();
  const now = new Date();
  const maximum = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.label}>{label}</Text>
      <View
        style={[
          s.inputBox,
          !editable && { backgroundColor: "#eff5fa" },
          !!error && { borderColor: "#d24c4c" },
        ]}
      >
        <Icon name="calendar" />
        <input
          type="date"
          aria-label={t(label)}
          lang={language}
          value={value}
          min="1900-01-01"
          max={maximum}
          disabled={!editable}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => {
            if (editable) {
              try {
                event.currentTarget.showPicker?.();
              } catch {
                /* Browser keyboard input remains available. */
              }
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: "none",
            padding: "13px 0",
            background: "transparent",
            color: C.navy,
            fontSize: 13,
            fontFamily: "inherit",
            colorScheme: "light",
          }}
        />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
