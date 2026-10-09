import { Text } from "../i18n/LanguageProvider";
import { useState } from "react";
import { View } from '@/theme/primitives';
import { router } from "expo-router";
import { api, messageOf } from "../shared/api";
import { emailError, passwordError } from "./validation";
import {
  Button,
  ErrorMessage,
  Field,
  Header,
  Notice,
  Screen,
  s,
} from "../shared/ui";
export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const errors = {
    email: emailError(email),
    code: /^[a-f0-9]{48}$/i.test(code.trim())
      ? ""
      : "Paste the complete reset code from your email.",
    password: passwordError(password),
    confirm: !confirm
      ? "Confirm your password."
      : password !== confirm
        ? "Passwords do not match."
        : "",
  };
  const validation = (key: keyof typeof errors) => ({
    error: attempted || touched[key] ? errors[key] : undefined,
    onBlur: () => setTouched((old) => ({ ...old, [key]: true })),
  });
  async function submit() {
    if (busy) return;
    setError("");
    setAttempted(true);
    if (sent ? errors.code || errors.password || errors.confirm : errors.email)
      return;
    setBusy(true);
    try {
      if (sent) {
        await api.reset(code.trim(), password);
        setDone(true);
      } else {
        await api.forgot(email.trim().toLowerCase());
        setSent(true);
        setAttempted(false);
        setTouched({});
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Header title="Reset Password" />
      <Text style={[s.body, { marginBottom: 25 }]}>
        Recover access to your CarePlus patient account.
      </Text>
      {done ? (
        <>
          <Notice>Your password has been updated.</Notice>
          <View style={{ height: 24 }} />
          <Button
            title="Go to Login"
            onPress={() => router.replace("/login")}
          />
        </>
      ) : (
        <>
          {sent ? (
            <>
              <Notice>
                If your email is registered, a reset code will arrive shortly.
                The code expires in 15 minutes.
              </Notice>
              <View style={{ height: 24 }} />
              <Field
                label="Reset code"
                placeholder="Paste the code from your email"
                value={code}
                {...validation("code")}
                onChangeText={setCode}
                autoCapitalize="none"
              />
              <Field
                label="New password"
                password
                value={password}
                {...validation("password")}
                onChangeText={setPassword}
                placeholder="At least 8 characters, a letter and a number"
              />
              <Field
                label="Confirm password"
                password
                value={confirm}
                {...validation("confirm")}
                onChangeText={setConfirm}
              />
            </>
          ) : (
            <Field
              label="Email Address"
              icon="mail"
              value={email}
              {...validation("email")}
              autoCorrect={false}
              onChangeText={setEmail}
              placeholder="Enter your registered email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
          <ErrorMessage message={error} />
          <Button
            title={sent ? "Reset Password" : "Send Reset Code"}
            loading={busy}
            onPress={submit}
          />
          {sent && (
            <Button
              title="Send a new code"
              outline
              disabled={busy}
              onPress={() => {
                setSent(false);
                setError("");
                setAttempted(false);
                setTouched({});
              }}
              style={{ marginTop: 12 }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
