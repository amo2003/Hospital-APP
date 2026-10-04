import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, ErrorMessage, Notice, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NursePatient } from "./types";
import { NurseTabs } from "./NurseShared";

export default function NursePatientDetailsScreen() {
  const params = useLocalSearchParams<{ patientId: string }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const [patient, setPatient] = useState<NursePatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError("");
    nurseApi.patient(patientId || "").then((data) => { if (active) setPatient(data); })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId, retry]));
  const today = new Date().toISOString().slice(0, 10);
  const appt = patient?.appointments?.find((item) => item.status === "confirmed" && item.date >= today) ||
    (patient?.appointment?.status === "confirmed" && patient.appointment.date >= today ? patient.appointment : null);
  return <Screen footer={<NurseTabs active="appointments" />}>
    {loading ? <ActivityIndicator color={C.blue} style={{ padding: 55 }} /> : error ? <><ErrorMessage message={error} /><Button title="Retry" outline onPress={() => setRetry((v) => v + 1)} /></> : patient ? <>
      <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 14, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 57, alignItems: "center", borderBottomLeftRadius: 42, borderBottomRightRadius: 42 }}>
        <View style={[s.row, { width: "100%", justifyContent: "space-between", marginBottom: 8 }]}><Pressable accessibilityLabel="Back to patient search" onPress={() => router.replace("/nurse/patients")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Patient Record</Text><View style={{ width: 36 }} /></View>
        <View style={{ width: 74, height: 74, borderRadius: 40, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Text style={{ color: C.blue, fontSize: 24, fontWeight: "700" }}>{patient.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</Text></View>
        <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700" }}>{patient.fullName}</Text>
        <Text style={{ color: "#d4e6f5", fontSize: 12, marginTop: 5 }}>ID: {patient.patientId} · {patient.age} yrs · {patient.gender}</Text>
      </LinearGradient>
      <View style={[s.card, { marginTop: -33, padding: 14, flexDirection: "row", justifyContent: "space-between", borderWidth: 0, borderRadius: 15 }]}>
        <Text style={{ color: patient.appointment?.status === "confirmed" ? "#168245" : C.muted, backgroundColor: patient.appointment?.status === "confirmed" ? "#e2f5e9" : "#edf3f8", borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>● {patient.appointment?.status || "No active appointment"}</Text>
        <Text style={{ color: C.navy, fontSize: 12, fontWeight: "700" }}>{patient.appointment?.department || "—"}</Text>
      </View>
      <Text style={[s.title, { fontSize: 16, marginTop: 18, marginBottom: 9 }]}>Contact Information</Text>
      <View style={[s.card, { padding: 14, backgroundColor: "#dff1ff", borderWidth: 0, borderRadius: 16 }]}>
        <Pressable onPress={() => void Linking.openURL(`tel:${patient.phone}`)} style={[s.row, { paddingVertical: 9 }]}><Icon name="phone" size={21} /><Text style={[s.body, { color: C.navy, fontSize: 12 }]}>{patient.phone}</Text></Pressable>
        <Pressable onPress={() => void Linking.openURL(`mailto:${patient.email}`)} style={[s.row, { paddingVertical: 9, borderTopWidth: 1, borderColor: "#bfddf4" }]}><Icon name="mail" size={21} /><Text style={[s.body, { color: C.navy, fontSize: 12 }]}>{patient.email}</Text></Pressable>
        <View style={[s.row, { paddingVertical: 9, borderTopWidth: 1, borderColor: "#bfddf4" }]}><Icon name="pin" size={21} /><Text style={[s.body, { color: C.navy, flex: 1, fontSize: 12 }]}>{patient.address}, {patient.district}</Text></View>
      </View>
      <Text style={[s.title, { fontSize: 16, marginTop: 18, marginBottom: 9 }]}>Medical Information</Text>
      <View style={[s.card, { padding: 15, borderWidth: 0 }]}><Text style={[s.body, { fontSize: 12 }]}>No medical information is available in the patient record.</Text></View>
      <Text style={[s.title, { fontSize: 16, marginTop: 18, marginBottom: 9 }]}>Upcoming Appointment</Text>
      {appt ? <View style={[s.card, { padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 0, backgroundColor: "#e8f4fd" }]}><View style={[s.iconTile, { width: 46, height: 46 }]}><Icon name="calendar" size={22} /></View><View style={{ flex: 1 }}><Text style={{ color: C.navy, fontSize: 12, fontWeight: "700" }}>{appt.doctor || "OPD Appointment"}</Text><Text style={[s.body, { fontSize: 11 }]}>{appt.department} · {appt.date} {appt.time}</Text><Text style={[s.body, { fontSize: 11 }]}>{appt.hospital}</Text></View></View> : <View style={[s.card, { padding: 14, borderWidth: 0 }]}><Text style={[s.body, { fontSize: 12 }]}>No appointment information is available.</Text></View>}
      <Button title="Back" outline onPress={() => router.replace("/nurse/patients")} style={{ marginTop: 14 }} />
    </> : null}
  </Screen>;
}
