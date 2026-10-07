import { Text, useLanguage } from "../i18n/LanguageProvider";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Icon, type IconName } from "./icons";
import { LanguagePicker } from "../auth/LanguagePicker";
import { BottomLeaves } from "./BottomLeaves";
export const C = {
  navy: "#102e57",
  blue: "#086ab9",
  sky: "#209bec",
  muted: "#7b8fac",
  line: "#cfe2f7",
  bg: "#f1f8ff",
  white: "#fff",
};
export const assets = {
  logo: require("../../../../assets/images/Logo.png"),
  top: require("../../../../assets/images/leaves-top.png"),
  bottom: require("../../../../assets/images/leaves-bottom.png"),
  hospital: require("../../../../assets/images/hospital-building.png"),
};
export function Wave({
  top = false,
  pale = false,
}: {
  top?: boolean;
  pale?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top: top ? 0 : undefined,
          bottom: top ? undefined : 0,
          height: top ? (pale ? 215 : 110) : 145,
        },
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 145"
        preserveAspectRatio="none"
      >
        <Path
          d={
            top && pale
              ? "M0 0H218C154 29 167 65 122 79S27 76 0 145Z"
              : top
                ? "M0 0H390V92C300 12 240 146 120 90S20 95 0 95Z"
                : "M0 123C68 100 50 67 120 40S235 11 390 0V145H0Z"
          }
          fill={pale ? "#bad7e8" : "#5ab3e9"}
        />
        <Path
          d={
            top && pale
              ? "M0 0H184C148 19 157 56 114 68S25 61 0 128Z"
              : top
                ? "M0 0H390V80C300 5 240 134 120 78S20 82 0 82Z"
                : "M0 142C80 110 86 84 139 59S300 20 390 12V145H0Z"
          }
          fill={pale ? "#6498bd" : "#103b66"}
        />
      </Svg>
    </View>
  );
}
export function Leaves({ small = false }: { small?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={assets.top}
        resizeMode="contain"
        style={{
          position: "absolute",
          width: small ? 90 : "68%",
          height: small ? 140 : "33%",
          top: small ? 15 : 20,
          left: 0,
          opacity: small ? 0.5 : 1,
        }}
      />
      <BottomLeaves
        style={{
          position: "absolute",
          width: small ? 95 : "60%",
          height: small ? 160 : "38%",
          bottom: small ? undefined : 0,
          top: small ? 110 : undefined,
          right: -3,
          opacity: small ? 0.5 : 1,
        }}
      />
    </View>
  );
}
export function Screen({
  children,
  footer,
  decoration = false,
  scroll = true,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  decoration?: boolean;
  scroll?: boolean;
}) {
  return (
    <LinearGradient colors={["#f8fcff", "#edf7ff"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {decoration && (
          <>
            <Wave />
            <BottomLeaves
              style={{
                position: "absolute",
                width: 95,
                height: 150,
                right: 0,
                bottom: 100,
                opacity: 0.4,
              }}
            />
          </>
        )}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </KeyboardAvoidingView>
        <LanguagePicker />
        {footer}
      </SafeAreaView>
    </LinearGradient>
  );
}
export function Header({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
}) {
  return (
    <View style={{ marginBottom: 24, marginTop: 17 }}>
      <View style={s.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={s.iconButton}
          onPress={
            back ||
            (() =>
              router.canGoBack() ? router.back() : router.replace("/login"))
          }
        >
          <Icon name="back" color="#222" />
        </Pressable>
        <Text style={[s.title, { flex: 1, textAlign: "center" }]}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}
export function Button({
  title,
  onPress,
  outline,
  loading,
  disabled,
  arrow,
  style,
}: {
  title: string;
  onPress: () => void;
  outline?: boolean;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={outline ? ["#fff", "#fff"] : ["#116bb0", "#0e2c58"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          s.button,
          { paddingVertical: 12, paddingHorizontal: arrow ? 36 : 18 },
          outline && { borderWidth: 1, borderColor: C.blue },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={outline ? C.blue : "#fff"} />
        ) : (
          <Text style={[s.buttonText, outline && { color: C.blue }]}>
            {title}
          </Text>
        )}
        {arrow && !loading && (
          <View style={{ position: "absolute", right: 19 }}>
            <Icon name="arrow" color={outline ? C.blue : "#fff"} />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
export function Field({
  label,
  icon,
  error,
  password,
  ...props
}: TextInputProps & {
  label: string;
  icon?: IconName;
  error?: string;
  password?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.label}>{label}</Text>
      <View
        style={[
          s.inputBox,
          !!error && { borderColor: "#d24c4c" },
          props.editable === false && { backgroundColor: "#eff5fa" },
        ]}
      >
        {icon && <Icon name={icon} size={24} />}
        <TextInput
          autoCapitalize={password ? "none" : undefined}
          autoCorrect={password ? false : undefined}
          {...props}
          accessibilityLabel={t(label)}
          accessibilityHint={error ? t(error) : props.accessibilityHint}
          placeholder={props.placeholder ? t(props.placeholder) : undefined}
          value={
            props.editable === false &&
            (label === "Gender" || label === "District / City")
              ? t(props.value || "")
              : props.value
          }
          placeholderTextColor="#8ea4c2"
          secureTextEntry={password && !visible}
          style={[
            s.input,
            props.multiline && {
              height: 65,
              textAlignVertical: "top",
              paddingTop: 12,
            },
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(visible ? "Hide password" : "Show password")}
            style={{ padding: 4 }}
            onPress={() => setVisible(!visible)}
          >
            <Icon name="eye" />
          </Pressable>
        )}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Select({
  label,
  placeholder,
  value,
  options,
  onChange,
  icon = "pin",
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  icon?: IconName;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(label)}
        style={[s.inputBox, !!error && { borderColor: "#d24c4c" }]}
        onPress={() => setOpen(true)}
      >
        <Icon name={icon} />
        <Text
          style={[
            s.input,
            { paddingVertical: 15, color: value ? C.navy : "#8ea4c2" },
          ]}
        >
          {options.find((o) => o.value === value)?.label || placeholder}
        </Text>
        <Icon name="chevron" size={19} />
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
            <Text style={s.title}>{label}</Text>
            <ScrollView style={{ maxHeight: 350, marginVertical: 15 }}>
              {options.length ? (
                options.map((o) => (
                  <Pressable
                    key={o.value}
                    accessibilityRole="button"
                    style={s.option}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={{ color: C.navy }}>{o.label}</Text>
                    {value === o.value && <Icon name="check" size={18} />}
                  </Pressable>
                ))
              ) : (
                <Text style={s.body}>No options available yet.</Text>
              )}
            </ScrollView>
            <Button title="Close" outline onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function Steps({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 30 }}>
      {labels.map((label, i) => (
        <View key={label} style={{ flex: 1, alignItems: "center" }}>
          {i < labels.length - 1 && (
            <View
              style={{
                position: "absolute",
                height: 1,
                backgroundColor: C.line,
                top: 16,
                left: "65%",
                width: "70%",
              }}
            />
          )}
          <View
            style={[
              s.step,
              i === current && { backgroundColor: C.blue, borderColor: C.blue },
              i < current && { backgroundColor: "#dff1ff" },
            ]}
          >
            {i < current ? (
              <Icon name="check" size={16} />
            ) : (
              <Text
                style={{ color: i === current ? "#fff" : C.blue, fontSize: 11 }}
              >
                {i + 1}
              </Text>
            )}
          </View>
          <Text
            style={{
              color: C.navy,
              fontSize: labels.length === 4 ? 9 : 11,
              textAlign: "center",
              fontWeight: "600",
              marginTop: 5,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.notice}>
      <View style={s.info}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>i</Text>
      </View>
      <Text style={[s.body, { flex: 1, fontSize: 12 }]}>{children}</Text>
    </View>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={[s.error, { marginBottom: 14 }]}>
      {message}
    </Text>
  ) : null;
}
export function ServiceCard() {
  return (
    <View
      style={[
        s.card,
        { flexDirection: "row", gap: 14, alignItems: "center", padding: 13 },
      ]}
    >
      <View style={[s.iconTile, { flexShrink: 0 }]}>
        <Icon name="cross" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.navy, fontWeight: "700", fontSize: 13 }}>
          OPD Appointment &{"\n"}Queue Management
        </Text>
        <Text style={{ color: C.blue, fontSize: 10, marginTop: 5 }}>
          Faster Access. Healthier Communities.
        </Text>
      </View>
    </View>
  );
}
export function CheckHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ alignItems: "center", marginTop: 32, marginBottom: 28 }}>
      <LinearGradient
        colors={["#0d6aad", "#0c2d56"]}
        style={{
          width: 108,
          height: 108,
          borderRadius: 54,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 22,
        }}
      >
        <Icon name="check" color="#fff" size={50} />
      </LinearGradient>
      <Text style={[s.title, { fontSize: 23, textAlign: "center" }]}>
        {title}
      </Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 8, gap: 12 }}>
      <Text style={[s.body, { flex: 1, fontSize: 12 }]}>{label}</Text>
      <Text
        translate={!["Name", "Full Name", "Username", "Patient ID", "Nurse ID", "Email", "Phone"].includes(label)}
        style={{ flex: 1.3, color: C.navy, fontSize: 12, fontWeight: "600" }}
      >
        {value}
      </Text>
    </View>
  );
}
export function BottomTabs({
  active,
}: {
  active: "home" | "appointments" | "notifications" | "profile";
}) {
  return (
    <View style={s.tabs}>
      {(
        [
          { key: "home", label: "Home", icon: "home" },
          { key: "appointments", label: "Appointments", icon: "calendar" },
          { key: "notifications", label: "Notifications", icon: "bell" },
          { key: "profile", label: "Profile", icon: "user" },
        ] as const
      ).map((tab) => (
        <Pressable
          key={tab.key}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: active === tab.key }}
          onPress={() => router.replace(`/patient/${tab.key}`)}
          style={{
            flex: 1,
            alignItems: "center",
            gap: 6,
            paddingVertical: 9,
            backgroundColor: active === tab.key ? "#eff8ff" : "#fff",
            borderRadius: 10,
          }}
        >
          <Icon name={tab.icon} size={21} />
          <Text style={{ fontSize: 9, fontWeight: "600", color: C.navy, textAlign: "center", paddingHorizontal: 3 }}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 25 },
  title: { color: "#142b49", fontSize: 22, fontWeight: "700" },
  subtitle: {
    color: C.blue,
    textAlign: "center",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 19,
  },
  body: { color: C.muted, fontSize: 13, lineHeight: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -12,
  },
  iconButton: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 49,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  label: { color: "#142b49", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inputBox: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 9,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: C.navy,
    paddingVertical: 12,
    minWidth: 0,
    outlineWidth: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 18,
  },
  iconTile: {
    width: 47,
    height: 47,
    backgroundColor: "#e4f3ff",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    backgroundColor: "#f3f9fe",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  info: {
    backgroundColor: C.sky,
    borderRadius: 10,
    width: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#b52d3b", fontSize: 12, marginTop: 5, lineHeight: 18 },
  step: {
    width: 33,
    height: 33,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "#09213c70",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 420,
  },
  option: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
  },
  link: { color: C.blue, fontSize: 12, fontWeight: "700" },
  centerLink: { alignItems: "center", padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
