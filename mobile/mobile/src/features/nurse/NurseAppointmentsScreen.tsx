import { useCallback, useState } from "react";
import { ActivityIndicator } from 'react-native';
import { ScrollView, TextInput, View } from '@/theme/primitives';
import { useFocusEffect, router } from "expo-router";
import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { C, ErrorMessage, Header, Screen, s } from "../patient/shared/ui";
import { nurseApi, nurseMessageOf } from "./api";
import { NurseTabs } from "./NurseShared";
import type { NurseAppointment } from "./types";

export default function NurseAppointmentsScreen() {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<NurseAppointment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      nurseApi.appointments()
        .then((result) => {
          if (active) {
            setAppointments(result);
            setError("");
          }
        })
        .catch((reason) => active && setError(nurseMessageOf(reason)))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, []),
  );
  const query = search.trim().toLowerCase();
  const visible = appointments.filter((appointment) =>
    !query || [appointment.appointmentId, appointment.department, appointment.patient?.fullName, appointment.patient?.patientId, appointment.doctor?.name]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(query)),
  );
  return (
    <Screen footer={<NurseTabs active="appointments" />}>
      <Header title={t("Appointments")} subtitle="Appointment history for your hospital" back={() => router.replace("/nurse/dashboard")} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search patient, doctor or appointment..."
        placeholderTextColor={C.muted}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {loading && <ActivityIndicator color={C.blue} style={{ marginVertical: 24 }} />}
      {!!error && <ErrorMessage message={error} />}
      {!loading && !error && visible.length === 0 && <Text style={[s.body, { textAlign: "center", marginVertical: 24 }]}>No appointments found.</Text>}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {visible.map((appointment) => (
          <View key={appointment.id} style={[s.card, { marginBottom: 10 }]}> 
            <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}> 
              <Text style={[s.title, { fontSize: 15, flex: 1 }]}>{appointment.patient?.fullName || "Patient"}</Text>
              <Text style={styles.status}>{appointment.status}</Text>
            </View>
            <Text style={[s.link, { marginTop: 5 }]}>{appointment.patient?.patientId || ""}</Text>
            <Text style={[s.body, { marginTop: 5 }]}>{appointment.doctor?.name || "Doctor"} · {appointment.department}</Text>
            <Text style={s.body}>{appointment.date} · {appointment.time}</Text>
            <Text style={s.body}>Reference: {appointment.appointmentId}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = {
  search: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: "#fff",
    color: C.navy,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  status: {
    color: C.blue,
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "capitalize" as const,
  },
};
