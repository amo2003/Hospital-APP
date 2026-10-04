import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { C, ErrorMessage, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import { useNurse } from "./session";
import type { NurseQueueEntry } from "./types";
import { ActionCard, NurseTabs } from "./NurseShared";

export default function NurseDashboardScreen() {
  const { nurse } = useNurse();
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError("");
    nurseApi.queue().then((result) => { if (active) setEntries(result.entries); })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]));
  const waiting = entries.filter((entry) => entry.status === "waiting");
  const serving = entries.find((entry) => entry.status === "serving");
  const actions = [
    { label: "Patient Search", icon: "search" as const, path: "/nurse/patients" as const },
    { label: "Queue Mgmt", icon: "clock" as const, path: "/nurse/queue" as const },
    { label: "Appointments", icon: "calendar" as const, path: "/nurse/queue" as const },
    { label: "Digital Queue", icon: "id" as const, path: "/nurse/digital-queue" as const },
    { label: "Reports", icon: "bell" as const, path: "/nurse/digital-queue" as const },
    { label: "Staff Settings", icon: "user" as const, path: "/nurse/profile" as const },
  ];
  return <Screen footer={<NurseTabs active="home" />}>
    <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, paddingHorizontal: 24, paddingTop: 55, paddingBottom: 21, borderBottomLeftRadius: 38, borderBottomRightRadius: 38 }}>
      <View style={{ height: 36, justifyContent: "center", marginBottom: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.canGoBack() ? router.back() : router.replace("/nurse/login")}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff30", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="back" color="#fff" size={21} />
        </Pressable>
      </View>
      <View style={[s.row, { justifyContent: "space-between", marginBottom: 17 }]}>
        <View style={[s.row, { gap: 12 }]}>
          <View style={{ width: 46, height: 46, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={27} /></View>
          <View><Text style={{ color: "#d6e8fa", fontSize: 12 }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},</Text><Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 2 }}>{nurse?.fullName}</Text></View>
        </View>
        <Pressable accessibilityLabel="Notifications" onPress={() => {}} style={[s.iconTile, { width: 46, height: 46, borderRadius: 24, backgroundColor: "#ffffff24" }]}><Icon name="bell" color="#fff" size={24} /></Pressable>
      </View>
      <Pressable onPress={() => router.push("/nurse/patients")} style={[s.inputBox, { height: 50, minHeight: 50, borderWidth: 0, borderRadius: 14, paddingHorizontal: 13 }]}>
        <Icon name="search" size={23} /><TextInput editable={false} placeholder="Search patient, doctor, ward..." placeholderTextColor="#8ea4c2" style={[s.input, { paddingVertical: 10, fontSize: 12 }]} />
      </Pressable>
    </LinearGradient>
    <View style={[s.card, { marginTop: -39, padding: 15, borderWidth: 0, borderRadius: 20 }]}>
      <LinearGradient colors={["#126bb0", "#082747"]} style={{ borderRadius: 17, paddingHorizontal: 17, paddingVertical: 15, minHeight: 104 }}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View><Text style={{ color: "#cde4fa", fontSize: 11 }}>Today’s Queue</Text><Text style={{ color: "#fff", fontSize: 21, fontWeight: "700", marginTop: 2 }}>{loading ? "Loading…" : `${waiting.length} Patients Waiting`}</Text><Text style={{ color: "#cde4fa", fontSize: 11, marginTop: 3 }}>{serving ? `Now serving ${serving.token}` : "Queue status from today’s appointments"}</Text></View>
          <View style={[s.iconTile, { width: 48, height: 48, borderRadius: 25, backgroundColor: "#ffffff20" }]}><Icon name="clock" color="#fff" size={26} /></View>
        </View>
      </LinearGradient>
      {error ? <><ErrorMessage message={error} /><Pressable onPress={() => setRetry((v) => v + 1)}><Text style={s.link}>Retry</Text></Pressable></> : null}
      {loading && <ActivityIndicator color={C.blue} style={{ marginTop: 8 }} />}
    </View>
    <Text style={[s.title, { fontSize: 17, marginTop: 17, marginBottom: 10 }]}>Quick Actions</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>{actions.map((item) => <ActionCard key={item.label} label={item.label} icon={item.icon} onPress={() => router.push(item.path)} />)}</View>
    <View style={[s.row, { justifyContent: "space-between", marginTop: 19, marginBottom: 10 }]}>
      <Text style={[s.title, { fontSize: 17 }]}>Recent Activity</Text>
      <Pressable onPress={() => router.push("/nurse/queue")}><Text style={[s.link, { fontSize: 12 }]}>View queue</Text></Pressable>
    </View>
    {!entries.length && !loading ? <View style={[s.card, { padding: 18 }]}><Text style={[s.body, { fontSize: 12 }]}>No appointments are in today’s queue yet.</Text></View> : entries.slice(0, 4).map((entry) => <Pressable key={entry.id} onPress={() => router.push("/nurse/queue")} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 13, padding: 15, marginBottom: 9 }]}>
      <View style={[s.iconTile, { width: 42, height: 42, borderRadius: 22 }]}><Text style={{ color: C.blue, fontSize: 9, fontWeight: "700" }}>{entry.token}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ color: C.navy, fontSize: 12, fontWeight: "700" }}>{entry.patient?.fullName || "Patient"}</Text><Text style={[s.body, { fontSize: 10 }]}>{entry.department} · {entry.status}</Text></View>
      <Text style={{ color: C.muted, fontSize: 10 }}>{entry.position ? `#${entry.position}` : ""}</Text>
    </Pressable>)}
  </Screen>;
}
