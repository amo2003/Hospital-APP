import { Text } from "../i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, AppState, Modal, View } from "react-native";
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
  Select,
  s,
} from "../shared/ui";
export default function AppointmentsScreen({
  history = false,
}: {
  history?: boolean;
}) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      let pending = false;
      const refresh = () => {
        if (
          pending ||
          (AppState.currentState && AppState.currentState !== "active")
        )
          return;
        pending = true;
        void api
          .appointments(history ? "all" : "today")
          .then((data) => {
            if (active) {
              setItems(data);
              setError("");
            }
          })
          .catch((e) => {
            if (active) setError(messageOf(e));
          })
          .finally(() => {
            pending = false;
            if (active) setLoading(false);
          });
      };
      refresh();
      const interval = setInterval(refresh, 15000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") refresh();
      });
      return () => {
        active = false;
        clearInterval(interval);
        subscription.remove();
      };
      // Retry intentionally creates a new focus subscription after a failed request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retry, history]),
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
  const visible = items
    .filter(
      (item) =>
        !history ||
        ((!doctorFilter || item.doctorId?._id === doctorFilter) &&
          (!dateFilter || item.date === dateFilter)),
    )
    .sort((a, b) =>
      history
        ? `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
        : a.time.localeCompare(b.time),
    );
  const doctors = [
    ...new Map(
      items
        .filter((item) => item.doctorId)
        .map((item) => [item.doctorId!._id, item.doctorId!]),
    ).values(),
  ];
  return (
    <Screen footer={<BottomTabs active="appointments" />}>
      <Header
        title={history ? "Appointment History" : "Today's Appointments"}
        back={() => router.replace("/patient/home")}
      />
      {history && (
        <>
          <Select
            label="Doctor"
            placeholder="All doctors"
            value={doctorFilter}
            onChange={setDoctorFilter}
            options={[
              { label: "All doctors", value: "" },
              ...doctors.map((doctor) => ({
                label: doctor.name,
                value: doctor._id,
              })),
            ]}
          />
          <Select
            label="Date"
            placeholder="All dates"
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { label: "All dates", value: "" },
              ...[...new Set(items.map((item) => item.date))]
                .sort()
                .reverse()
                .map((date) => ({ label: date, value: date })),
            ]}
          />
        </>
      )}
      {loading && <ActivityIndicator color={C.blue} />}
      <ErrorMessage message={error} />
      {!!error && !cancel && (
        <Button title="Retry" outline onPress={() => setRetry((v) => v + 1)} />
      )}
      {!loading && !error && !visible.length && (
        <Notice>
          {history
            ? "No appointments match these filters."
            : "You have no appointments today."}
        </Notice>
      )}
      {visible.map((item) => (
        <View key={item._id} style={{ marginBottom: 20 }}>
          <AppointmentCard appointment={item} />
          {item.status === "confirmed" && (
            <Button
              title="View Queue"
              outline
              onPress={() =>
                router.push({
                  pathname: "/patient/queue",
                  params: { appointmentId: item._id },
                })
              }
              style={{ marginTop: 9 }}
            />
          )}
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
      {!history && (
        <Button
          title="Appointment History"
          outline
          onPress={() => router.push("/patient/appointment-history")}
          style={{ marginTop: 12 }}
        />
      )}
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

export function PatientAppointmentHistoryScreen() {
  return <AppointmentsScreen history />;
}
