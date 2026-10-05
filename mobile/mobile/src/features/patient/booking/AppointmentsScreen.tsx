import { Text } from "../i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { api, messageOf } from "../shared/api";
import type { Appointment } from "../shared/types";
import { AppointmentCard, isUpcoming } from "./BookingScreen";
import {
  BottomTabs,
  Button,
  C,
  ErrorMessage,
  Header,
  Notice,
  Screen,
  s,
} from "../shared/ui";
export default function AppointmentsScreen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const [history, setHistory] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      api
        .appointments()
        .then((data) => {
          if (active) setItems(data);
        })
        .catch((e) => {
          if (active) setError(messageOf(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
      // Retry intentionally creates a new focus subscription after a failed request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retry]),
  );
  async function cancelAppointment() {
    if (!cancel) return;
    setBusy(true);
    setError("");
    try {
      await api.cancel(cancel._id);
      setItems((old) =>
        old.map((a) =>
          a._id === cancel._id ? { ...a, status: "cancelled" } : a,
        ),
      );
      setCancel(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter((item) =>
    history ? !isUpcoming(item) : isUpcoming(item),
  );
  return (
    <Screen footer={<BottomTabs active="appointments" />}>
      <Header
        title="My Appointments"
        back={() => router.replace("/patient/home")}
      />
      <View style={[s.row, { marginBottom: 22 }]}>
        {["Upcoming", "History"].map((label, i) => (
          <Pressable
            key={label}
            onPress={() => setHistory(i === 1)}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 12,
              backgroundColor: history === (i === 1) ? C.blue : "#fff",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: history === (i === 1) ? "#fff" : C.blue,
                fontWeight: "600",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading && <ActivityIndicator color={C.blue} />}
      <ErrorMessage message={error} />
      {!!error && !cancel && (
        <Button title="Retry" outline onPress={() => setRetry((v) => v + 1)} />
      )}
      {!loading && !error && !visible.length && (
        <Notice>
          {history
            ? "No past or cancelled appointments."
            : "You have no upcoming appointments."}
        </Notice>
      )}
      {visible.map((item) => (
        <View key={item._id} style={{ marginBottom: 20 }}>
          <AppointmentCard appointment={item} />
          {isUpcoming(item) && (
            <Button
              title="Cancel Appointment"
              outline
              onPress={() => setCancel(item)}
              style={{ marginTop: 9 }}
            />
          )}
        </View>
      ))}
      <Button
        title="Book Appointment"
        onPress={() => router.push("/patient/book")}
        style={{ marginTop: 20 }}
      />
      <Modal
        visible={!!cancel}
        transparent
        onRequestClose={() => !busy && setCancel(null)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Cancel appointment?</Text>
            <Text style={[s.body, { marginVertical: 20 }]}>
              This will release your reserved time. You can book another
              appointment afterwards.
            </Text>
            <ErrorMessage message={error} />
            <Button
              title="Yes, cancel appointment"
              loading={busy}
              onPress={cancelAppointment}
            />
            <Button
              title="Keep appointment"
              outline
              disabled={busy}
              onPress={() => setCancel(null)}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
