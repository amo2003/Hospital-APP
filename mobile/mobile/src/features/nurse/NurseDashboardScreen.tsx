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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      nurseApi
        .queue()
        .then((result) => {
          if (active) setEntries(result.entries);
        })
        .catch((e) => {
          if (active) setError(nurseMessageOf(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [retry]),
  );

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";

  return (
    <Screen footer={<NurseTabs active="home" />}>
      {/* Curved Navy Header */}
      <LinearGradient
        colors={["#07345e", "#102e57"]}
        style={{
          marginHorizontal: -24,
          marginTop: -25,
          paddingHorizontal: 24,
          paddingTop: 54,
          paddingBottom: 24,
          borderBottomLeftRadius: 38,
          borderBottomRightRadius: 38,
        }}
      >
        <View style={{ height: 36, justifyContent: "center", marginBottom: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/nurse/login"))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#ffffff25",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="back" color="#fff" size={20} />
          </Pressable>
        </View>

        {/* Staff Greeting Row */}
        <View style={[s.row, { justifyContent: "space-between", marginBottom: 18 }]}>
          <View style={[s.row, { gap: 12 }]}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Icon name="user" size={26} color="#0c3b6b" />
            </View>
            <View>
              <Text style={{ color: "#d6e8fa", fontSize: 12 }}>{greeting}</Text>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 }}>
                {nurse?.fullName ? `Nurse ${nurse.fullName}` : "CarePlus Staff"}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={() => router.push("/nurse/digital-queue")}
            style={[
              s.iconTile,
              { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ffffff20" },
            ]}
          >
            <Icon name="bell" color="#fff" size={22} />
          </Pressable>
        </View>

        {/* Search Input Button */}
        <Pressable
          onPress={() => router.push("/nurse/patients")}
          style={[
            s.inputBox,
            {
              height: 48,
              minHeight: 48,
              borderWidth: 0,
              borderRadius: 16,
              paddingHorizontal: 14,
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 2,
            },
          ]}
        >
          <Icon name="search" size={20} color="#64748b" />
          <TextInput
            editable={false}
            placeholder="Search patient, doctor, ward..."
            placeholderTextColor="#8ea4c2"
            style={[s.input, { paddingVertical: 8, fontSize: 13, color: C.navy }]}
          />
        </Pressable>
      </LinearGradient>

      {/* Today's Queue Card */}
      <View
        style={[
          s.card,
          {
            marginTop: -36,
            padding: 16,
            borderWidth: 1,
            borderColor: "#edf2f7",
            borderRadius: 22,
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 3,
          },
        ]}
      >
        <LinearGradient
          colors={["#0c3b6b", "#062244"]}
          style={{
            borderRadius: 18,
            paddingHorizontal: 18,
            paddingVertical: 16,
            minHeight: 108,
            justifyContent: "center",
          }}
        >
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View>
              <Text style={{ color: "#93c5fd", fontSize: 11, fontWeight: "700" }}>
                Today’s Queue
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 }}>
                {loading ? "Loading…" : `${waiting.length} Patients Waiting`}
              </Text>
              <Text style={{ color: "#dbeafe", fontSize: 11, marginTop: 4 }}>
                {serving
                  ? `Now serving token ${serving.token}`
                  : `Avg. wait time: ${Math.max(5, waiting.length * 8)} mins`}
              </Text>
            </View>
            <View
              style={[
                s.iconTile,
                { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ffffff20" },
              ]}
            >
              <Icon name="clock" color="#fff" size={26} />
            </View>
          </View>
        </LinearGradient>
        {error ? (
          <View style={{ marginTop: 8 }}>
            <ErrorMessage message={error} />
            <Pressable onPress={() => setRetry((v) => v + 1)}>
              <Text style={s.link}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {loading && <ActivityIndicator color={C.blue} style={{ marginTop: 8 }} />}
      </View>

      {/* Quick Actions Grid */}
      <Text style={[s.title, { fontSize: 16, marginTop: 18, marginBottom: 12 }]}>
        Quick Actions
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 10,
        }}
      >
        {actions.map((item) => (
          <ActionCard
            key={item.label}
            label={item.label}
            icon={item.icon}
            onPress={() => router.push(item.path)}
          />
        ))}
      </View>

      {/* Recent Activity Section */}
      <View
        style={[
          s.row,
          { justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
        ]}
      >
        <Text style={[s.title, { fontSize: 16 }]}>Recent Activity</Text>
        <Pressable onPress={() => router.push("/nurse/queue")}>
          <Text style={[s.link, { fontSize: 12 }]}>View queue</Text>
        </Pressable>
      </View>

      {!entries.length && !loading ? (
        <View
          style={[
            s.card,
            {
              padding: 18,
              borderWidth: 1,
              borderColor: "#edf2f7",
              borderRadius: 16,
              alignItems: "center",
              backgroundColor: "#fff",
            },
          ]}
        >
          <Text style={[s.body, { fontSize: 12, color: "#64748b" }]}>
            No patient appointments are in today’s queue yet.
          </Text>
        </View>
      ) : (
        entries.slice(0, 4).map((entry, idx) => {
          const initials =
            entry.patient?.fullName
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "PT";

          return (
            <Pressable
              key={entry.id}
              onPress={() => router.push("/nurse/queue")}
              style={[
                s.card,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  marginBottom: 9,
                  borderWidth: 1,
                  borderColor: "#edf2f7",
                  borderRadius: 16,
                  backgroundColor: "#fff",
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#e8f4fc",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#0c3b6b", fontSize: 12, fontWeight: "700" }}>
                  {initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700" }}>
                  {entry.patient?.fullName || "Patient"} checked in
                </Text>
                <Text style={[s.body, { fontSize: 11, color: "#64748b", marginTop: 2 }]}>
                  Token {entry.token} · {entry.department}
                </Text>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                {idx === 0 ? "Just now" : `${(idx + 1) * 4}m ago`}
              </Text>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
