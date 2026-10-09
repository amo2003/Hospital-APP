import { useAppTheme } from "@/theme/ThemeProvider";
import { useState } from "react";
import { Modal, Platform } from 'react-native';
import { Pressable, View } from '@/theme/primitives';
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Text, useLanguage } from "../i18n/LanguageProvider";
import { Button, C, s } from "./ui";
import { Icon } from "./icons";
export type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  error?: string;
};
export const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export default function DateField({
  label,
  value,
  onChange,
  editable = true,
  error,
}: DateFieldProps) {
  const { language, t } = useLanguage();
  const { mode } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected =
    value && !isNaN(new Date(value).getTime())
      ? new Date(`${value}T12:00:00`)
      : new Date(2000, 0, 1, 12);
  const [draft, setDraft] = useState(selected);
  function show() {
    if (!editable) return;
    if (Platform.OS === "android")
      DateTimePickerAndroid.open({
        value: selected,
        mode: "date",
        display: "calendar",
        maximumDate: new Date(),
        minimumDate: new Date(1900, 0, 1),
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(dateString(date));
        },
      });
    else {
      setDraft(selected);
      setOpen(true);
    }
  }
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(label)}
        disabled={!editable}
        onPress={show}
        style={[
          s.inputBox,
          !editable && { backgroundColor: "#eff5fa" },
          !!error && { borderColor: "#d24c4c" },
        ]}
      >
        <Icon name="calendar" />
        <Text
          style={{
            flex: 1,
            color: value ? C.navy : "#8ea4c2",
            paddingVertical: 14,
            fontSize: 13,
          }}
        >
          {value ? value.split("-").reverse().join(" / ") : "DD / MM / YYYY"}
        </Text>
        <Icon name="chevron" size={18} />
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Select date</Text>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              locale={language === "en" ? "en_GB" : `${language}_LK`}
              onChange={(_event, date) => {
                if (date) setDraft(date);
              }}
              themeVariant={mode}
            />
            <Button
              title="Done"
              onPress={() => {
                onChange(dateString(draft));
                setOpen(false);
              }}
            />
            <Button
              title="Cancel"
              outline
              onPress={() => setOpen(false)}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
