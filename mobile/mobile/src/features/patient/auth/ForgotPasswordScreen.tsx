import { Text } from "../i18n/LanguageProvider";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { api, messageOf } from "../shared/api";
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
  async function submit() {
    setError("");
    if (sent && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (sent) {
        await api.reset(code.trim(), password);
        setDone(true);
      } else {
        await api.forgot(email.trim().toLowerCase());
        setSent(true);
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
                onChangeText={setCode}
                autoCapitalize="none"
              />
              <Field
                label="New password"
                password
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters, a letter and a number"
              />
              <Field
                label="Confirm password"
                password
                value={confirm}
                onChangeText={setConfirm}
              />
            </>
          ) : (
            <Field
              label="Email Address"
              icon="mail"
              value={email}
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
              onPress={() => {
                setSent(false);
                setError("");
              }}
              style={{ marginTop: 12 }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
