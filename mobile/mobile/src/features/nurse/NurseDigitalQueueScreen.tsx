import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, ErrorMessage, Notice, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NurseQueueEntry } from "./types";
import { NurseTabs } from "./NurseShared";

export default function NurseDigitalQueueScreen() {
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError("");
    nurseApi.queue().then((data) => { if (active) setEntries(data.entries); })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]));
  const serving = entries.filter((entry) => entry.status === "serving");
  const waiting = entries.filter((entry) => entry.status === "waiting");
  const departments = Array.from(new Set(entries.map((entry) => entry.department)));
  return <Screen footer={<NurseTabs active="notifications" />}>
    <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 17, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 47, borderBottomLeftRadius: 39, borderBottomRightRadius: 39 }}><View style={[s.row, { justifyContent: "space-between" }]}><Pressable accessibilityLabel="Back to dashboard" onPress={() => router.replace("/nurse/dashboard")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable><View style={{ alignItems: "center" }}><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Digital Queue Display</Text><Text style={{ color: "#d4e8f8", fontSize: 10, marginTop: 3 }}>Live · Main Lobby Screen</Text></View><Pressable accessibilityLabel="Refresh queue" onPress={() => setRetry((n) => n + 1)} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={19} color="#fff" /></Pressable></View></LinearGradient>
    {error ? <ErrorMessage message={error} /> : null}
    <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Now Serving</Text>
    {loading ? <ActivityIndicator color={C.blue} style={{ padding: 27 }} /> : serving.length ? <View style={{ flexDirection: "row", gap: 9, marginBottom: 17 }}>{serving.map((entry) => <LinearGradient key={entry.id} colors={["#126bb0", "#082747"]} style={{ flex: 1, borderRadius: 16, padding: 14, minHeight: 125, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#cde4fa", fontSize: 9 }}>NOW SERVING</Text><Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", marginVertical: 5 }}>{entry.token}</Text><Text style={{ color: "#fff", fontSize: 11 }}>{entry.department}</Text><Text numberOfLines={1} style={{ color: "#cde4fa", fontSize: 10, marginTop: 2 }}>{entry.patient?.fullName}</Text></LinearGradient>)}</View> : <LinearGradient colors={["#126bb0", "#082747"]} style={{ borderRadius: 16, marginBottom: 17, minHeight: 108, alignItems: "center", justifyContent: "center", padding: 15 }}><Text style={{ color: "#cde4fa", fontSize: 9 }}>NOW SERVING</Text><Text style={{ color: "#fff", fontSize: 29, fontWeight: "700", marginTop: 3 }}>—</Text><Text style={{ color: "#d4e8f8", fontSize: 11 }}>No token is currently being served</Text></LinearGradient>}
    <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Up Next</Text>
    <View style={[s.card, { padding: 0, overflow: "hidden", marginBottom: 16 }]}>
      <View style={[s.row, { padding: 14, backgroundColor: "#f2f8fd", borderBottomWidth: 1, borderColor: C.line }]}><Text style={{ flex: 0.8, color: C.muted, fontSize: 9, fontWeight: "700" }}>TOKEN</Text><Text style={{ flex: 1.2, color: C.muted, fontSize: 9, fontWeight: "700" }}>PATIENT</Text><Text style={{ flex: 1.2, color: C.muted, fontSize: 9, fontWeight: "700" }}>DEPARTMENT</Text><Text style={{ color: C.muted, fontSize: 9, fontWeight: "700" }}>POSITION</Text></View>
      {loading ? <ActivityIndicator color={C.blue} style={{ padding: 22 }} /> : waiting.slice(0, 10).map((entry) => <Pressable key={entry.id} onPress={() => router.push("/nurse/queue")} style={[s.row, { padding: 14, borderBottomWidth: 1, borderColor: "#edf3f8", minHeight: 49 }]}><Text style={{ flex: 0.8, color: C.blue, fontSize: 11, fontWeight: "700" }}>{entry.token}</Text><Text numberOfLines={1} style={{ flex: 1.2, color: C.navy, fontSize: 10 }}>{entry.patient?.fullName || "Patient"}</Text><Text numberOfLines={1} style={{ flex: 1.2, color: C.navy, fontSize: 9 }}>{entry.department}</Text><Text style={{ color: C.muted, fontSize: 10 }}>{entry.position}</Text></Pressable>)}
      {!loading && !waiting.length && <Text style={[s.body, { padding: 14 }]}>No waiting patients are in the queue.</Text>}
    </View>
    <View style={{ marginBottom: 11 }}><Notice>Tokens are assigned automatically from appointments. Queue serving order is managed by the hospital queue system.</Notice></View>
    <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Department Queues</Text>
    {departments.length ? departments.map((department) => <View key={department} style={[s.card, { padding: 16, marginBottom: 9, flexDirection: "row", justifyContent: "space-between" }]}><Text style={{ color: C.navy, fontSize: 13, fontWeight: "700" }}>{department}</Text><Text style={{ color: C.blue, fontSize: 12 }}>{entries.filter((entry) => entry.department === department && entry.status === "waiting").length} waiting</Text></View>) : !loading && <View style={[s.card, { padding: 16 }]}><Text style={[s.body, { fontSize: 12 }]}>No department queues available today.</Text></View>}
    <View style={{ flexDirection: "row", gap: 9, marginTop: 9 }}><View style={{ flex: 1 }}><Button title="Refresh" outline onPress={() => setRetry((n) => n + 1)} /></View><View style={{ flex: 1 }}><Button title="Queue Management" onPress={() => router.push("/nurse/queue")} /></View></View>
  </Screen>;
}
