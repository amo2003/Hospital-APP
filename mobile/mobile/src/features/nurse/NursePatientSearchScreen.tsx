import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { C, ErrorMessage, Screen, s } from "../patient/shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NursePatient } from "./types";
import { NurseTabs } from "./NurseShared";

const filters = [
  { label: "All", value: "all" },
  { label: "Admitted", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Discharged", value: "cancelled" },
] as const;
export default function NursePatientSearchScreen() {
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]["value"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError("");
    nurseApi.patients(query, status).then((data) => { if (active) setPatients(data); })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, status, retry]));
  return <Screen footer={<NurseTabs active="appointments" />}>
    <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, paddingHorizontal: 24, paddingTop: 54, paddingBottom: 49, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
      <View style={[s.row, { justifyContent: "space-between" }]}><Pressable accessibilityLabel="Back to dashboard" onPress={() => router.replace("/nurse/dashboard")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable><Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Patient Search</Text><View style={{ width: 36 }} /></View>
    </LinearGradient>
    <View style={[s.inputBox, { marginTop: -28, marginBottom: 15, minHeight: 47, borderRadius: 23, paddingHorizontal: 13 }]}><Icon name="search" size={21} /><TextInput value={text} onChangeText={setText} onSubmitEditing={() => setQuery(text.trim())} placeholder="Search by name, ID or phone..." placeholderTextColor="#8ea4c2" returnKeyType="search" style={[s.input, { fontSize: 12, paddingVertical: 10 }]} /><Pressable accessibilityLabel="Search patients" onPress={() => setQuery(text.trim())}><Icon name="search" size={19} /></Pressable></View>
    <View style={[s.row, { gap: 6, marginBottom: 14 }]}>{filters.map((item) => <Pressable key={item.value} onPress={() => setStatus(item.value)} style={{ flex: 1, alignItems: "center", backgroundColor: status === item.value ? C.navy : "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 10 }}><Text style={{ color: status === item.value ? "#fff" : C.muted, fontSize: 9, fontWeight: "700" }}>{item.label}</Text></Pressable>)}</View>
    <Text style={[s.body, { fontSize: 12, marginBottom: 10 }]}>{loading ? "Loading patients…" : `${patients.length} patients found`}</Text>
    <ErrorMessage message={error} />
    {loading ? <ActivityIndicator color={C.blue} style={{ padding: 30 }} /> : patients.length ? patients.map((patient) => <Pressable key={patient.id} onPress={() => router.push({ pathname: "/nurse/patient/[patientId]", params: { patientId: patient.patientId } })} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, marginBottom: 9, borderWidth: 0, borderRadius: 17, minHeight: 76 }]}>
      <View style={[s.iconTile, { width: 43, height: 43, borderRadius: 23 }]}><Text style={{ color: C.blue, fontSize: 12, fontWeight: "700" }}>{patient.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ color: C.navy, fontSize: 12, fontWeight: "700" }}>{patient.fullName}</Text><Text style={[s.body, { fontSize: 10, lineHeight: 16 }]}>ID: {patient.patientId} · {patient.age}{patient.gender === "Female" ? "F" : patient.gender === "Male" ? "M" : ""}</Text><Text style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>{patient.appointment?.department || "No appointment record"}</Text></View>
      <View style={{ alignItems: "flex-end", gap: 5 }}><Text style={{ color: C.muted, fontSize: 8 }}>{patient.appointment?.date || ""}</Text><Text style={{ color: patient.appointment?.status === "confirmed" ? "#168245" : patient.appointment?.status === "completed" ? C.blue : C.muted, backgroundColor: patient.appointment?.status === "confirmed" ? "#e4f5ea" : "#edf3f8", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, fontWeight: "700" }}>{patient.appointment?.status === "confirmed" ? "Admitted" : patient.appointment?.status === "cancelled" ? "Discharged" : patient.appointment?.status === "completed" ? "Completed" : "Patient"}</Text></View>
      <Icon name="chevron" size={17} />
    </Pressable>) : !error ? <View style={[s.card, { alignItems: "center", paddingVertical: 18, borderWidth: 0 }]}><View style={[s.iconTile, { width: 40, height: 40, borderRadius: 21, marginBottom: 8 }]}><Icon name="search" /></View><Text style={{ color: C.navy, fontSize: 11, fontWeight: "700" }}>No patients found</Text><Text style={[s.body, { fontSize: 9, marginTop: 3, textAlign: "center" }]}>Try another name, patient ID or phone number.</Text></View> : null}
    <Pressable onPress={() => setRetry((value) => value + 1)} style={{ alignItems: "center", paddingVertical: 10 }}><Text style={[s.link, { fontSize: 10 }]}>Refresh patient list</Text></Pressable>
  </Screen>;
}
