import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Button, C, ErrorMessage, Screen, s } from "../patient/shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NurseQueueEntry } from "./types";
import { NurseTabs } from "./NurseShared";

const tabs = ["waiting", "serving", "completed"] as const;
export default function NurseQueueScreen() {
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof tabs)[number]>("waiting");
  const [selected, setSelected] = useState<NurseQueueEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError("");
    nurseApi.queue().then((data) => { if (active) setEntries(data.entries); })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]));
  const filtered = entries.filter((entry) => entry.status === filter);
  async function cancel() {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      await nurseApi.cancelQueue(selected.id);
      setSelected(null);
      const data = await nurseApi.queue(); setEntries(data.entries);
    } catch (e) { setError(nurseMessageOf(e)); }
    finally { setBusy(false); }
  }
  return <Screen footer={<NurseTabs active="appointments" />}>
    <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 13, paddingHorizontal: 24, paddingTop: 53, paddingBottom: 47, borderBottomLeftRadius: 38, borderBottomRightRadius: 38 }}><View style={[s.row, { justifyContent: "space-between" }]}><Pressable accessibilityLabel="Back to dashboard" onPress={() => router.replace("/nurse/dashboard")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Queue Management</Text><View style={{ width: 36 }} /></View></LinearGradient>
    <LinearGradient colors={["#126bb0", "#082747"]} style={{ marginTop: -34, marginBottom: 14, borderRadius: 19, paddingHorizontal: 18, paddingVertical: 16, minHeight: 132, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#cde4fa", fontSize: 10, letterSpacing: 0.6 }}>NOW SERVING</Text>
      {entries.some((entry) => entry.status === "serving") ? (() => { const current = entries.find((entry) => entry.status === "serving")!; return <><Text style={{ color: "#fff", fontSize: 37, fontWeight: "700", marginTop: 2 }}>{current.token}</Text><Text style={{ color: "#e4f2fc", fontSize: 12 }}>{current.patient?.fullName} · {current.department}</Text></>; })() : <><Text style={{ color: "#fff", fontSize: 30, fontWeight: "700", marginTop: 5 }}>—</Text><Text style={{ color: "#d4e8f8", fontSize: 11 }}>No patient is currently being served</Text></>}
      <View style={[s.row, { width: "100%", justifyContent: "space-between", marginTop: 11 }]}><Text style={{ color: "#d4e8f8", fontSize: 9 }}>Waiting: {entries.filter((entry) => entry.status === "waiting").length}</Text><Text style={{ color: "#d4e8f8", fontSize: 9 }}>Queue status is system managed</Text></View>
    </LinearGradient>
    <View style={[s.row, { gap: 7, marginBottom: 13 }]}>{tabs.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={{ flex: 1, alignItems: "center", backgroundColor: filter === item ? C.navy : "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 19, paddingVertical: 11 }}><Text style={{ color: filter === item ? "#fff" : C.muted, fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>{item}{item === "waiting" ? ` (${entries.filter((entry) => entry.status === item).length})` : ""}</Text></Pressable>)}</View>
    <ErrorMessage message={error} />
    {loading ? <ActivityIndicator color={C.blue} style={{ padding: 30 }} /> : filtered.length ? filtered.map((entry) => <View key={entry.id} style={[s.card, { marginBottom: 9, padding: 14, borderWidth: 0, borderRadius: 17, minHeight: 86 }]}>
      <View style={[s.row, { gap: 11 }]}><View style={[s.iconTile, { width: 44, height: 44, borderRadius: 23 }]}><Text style={{ color: C.blue, fontSize: 10, fontWeight: "700" }}>{entry.token}</Text></View><View style={{ flex: 1 }}><Text style={{ color: C.navy, fontSize: 12, fontWeight: "700" }}>{entry.patient?.fullName || "Patient"}</Text><Text style={[s.body, { fontSize: 10 }]}>{entry.department} · {entry.patient?.patientId || ""}</Text></View><Text style={{ color: entry.status === "waiting" ? "#168245" : C.muted, backgroundColor: entry.status === "waiting" ? "#e4f5ea" : "#edf3f8", borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, textTransform: "capitalize" }}>{entry.status}</Text></View>
      <View style={[s.row, { justifyContent: "space-between", marginTop: 10 }]}><Text style={[s.body, { fontSize: 10 }]}>Queue position: {entry.position || "—"}</Text>{entry.status === "waiting" && <Pressable accessibilityRole="button" onPress={() => setSelected(entry)} style={[s.row, { gap: 5, paddingVertical: 4, paddingHorizontal: 5 }]}><Icon name="cross" size={17} color="#b32c3a" /><Text style={{ color: "#b32c3a", fontSize: 10, fontWeight: "700" }}>Cancel entry</Text></Pressable>}</View>
    </View>) : !error ? <View style={[s.card, { alignItems: "center", paddingVertical: 17, borderWidth: 0 }]}><View style={[s.iconTile, { width: 38, height: 38, borderRadius: 20, marginBottom: 7 }]}><Icon name="clock" size={19} /></View><Text style={{ color: C.navy, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>No {filter} patients</Text><Text style={[s.body, { fontSize: 9, marginTop: 3, textAlign: "center" }]}>Queue entries for this status will appear here when available.</Text></View> : null}
    <Pressable onPress={() => setRetry((n) => n + 1)} style={{ alignItems: "center", paddingVertical: 10 }}><Text style={[s.link, { fontSize: 10 }]}>Refresh queue</Text></Pressable>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => !busy && setSelected(null)}><View style={s.overlay}><View style={s.modal}>
      <Text style={s.title}>Cancel queue entry?</Text>
      <Text style={[s.body, { marginVertical: 16 }]}>{selected?.token} for {selected?.patient?.fullName} will be removed from the waiting queue. The patient’s account and appointment record will not be deleted.</Text>
      <ErrorMessage message={error} />
      <Button title="Confirm Cancellation" loading={busy} onPress={cancel} />
      <Button title="Keep in Queue" outline disabled={busy} onPress={() => setSelected(null)} style={{ marginTop: 10 }} />
    </View></View></Modal>
  </Screen>;
}
