import { Text } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, ErrorMessage, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NurseQueueEntry } from "./types";
import { NurseTabs } from "./NurseShared";

const defaultDepartments = ["General OPD", "Cardiology", "Paediatrics", "Dermatology"];

export default function NurseDigitalQueueScreen() {
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const fetchQueue = useCallback(() => {
    let active = true;
    nurseApi
      .queue(undefined, true)
      .then((data) => {
        if (active) {
          setEntries(data.entries);
          setError("");
        }
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchQueue();
      // Auto-poll every 8 seconds for live lobby screen updates
      const interval = setInterval(() => {
        fetchQueue();
      }, 8000);
      return () => clearInterval(interval);
    }, [fetchQueue, retry]),
  );

  const servingEntries = entries.filter((entry) => entry.status === "serving");
  const waitingEntries = entries.filter((entry) => entry.status === "waiting");

  // Determine active department counters
  const activeDepartments = Array.from(
    new Set([...entries.map((entry) => entry.department), ...defaultDepartments]),
  ).slice(0, 3);

  const counters = activeDepartments.map((dept, index) => {
    const serving = servingEntries.find((entry) => entry.department === dept);
    return {
      counterNum: index + 1,
      department: dept,
      servingToken: serving?.token || "—",
      patientName: serving?.patient?.fullName || null,
    };
  });

  return (
    <Screen footer={<NurseTabs active="notifications" />}>
      {/* Header */}
      <LinearGradient
        colors={["#07345e", "#102e57"]}
        style={{
          marginHorizontal: -24,
          marginTop: -25,
          marginBottom: 16,
          paddingHorizontal: 24,
          paddingTop: 54,
          paddingBottom: 44,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }}
      >
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Pressable
            accessibilityLabel="Back to dashboard"
            onPress={() => router.replace("/nurse/dashboard")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#ffffff25",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="back" size={20} color="#fff" />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
              Digital Queue Display
            </Text>
            <Text style={{ color: "#a5d5fa", fontSize: 11, marginTop: 2 }}>
              Live · Main Lobby Screen
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh digital display"
            onPress={() => setRetry((n) => n + 1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#ffffff25",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="clock" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {error ? <ErrorMessage message={error} /> : null}

      {/* Now Serving Section */}
      <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Now Serving</Text>
      {loading && !entries.length ? (
        <ActivityIndicator color={C.blue} style={{ padding: 24 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
          style={{ marginBottom: 16 }}
        >
          {counters.map((counter) => (
            <LinearGradient
              key={counter.counterNum}
              colors={["#0c3b6b", "#062244"]}
              style={{
                width: 140,
                borderRadius: 18,
                padding: 14,
                minHeight: 124,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  color: "#93c5fd",
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                }}
              >
                COUNTER {counter.counterNum}
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 26,
                  fontWeight: "800",
                  marginVertical: 4,
                  letterSpacing: 0.5,
                }}
              >
                {counter.servingToken}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: "#e2e8f0", fontSize: 11, fontWeight: "600" }}
              >
                {counter.department}
              </Text>
              {counter.patientName && (
                <Text
                  numberOfLines={1}
                  style={{ color: "#93c5fd", fontSize: 10, marginTop: 2 }}
                >
                  {counter.patientName}
                </Text>
              )}
            </LinearGradient>
          ))}
        </ScrollView>
      )}

      {/* Up Next Section */}
      <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Up Next</Text>
      <View
        style={[
          s.card,
          {
            padding: 0,
            overflow: "hidden",
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#edf2f7",
            borderRadius: 18,
            backgroundColor: "#fff",
          },
        ]}
      >
        <View
          style={[
            s.row,
            {
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "#f8fafc",
              borderBottomWidth: 1,
              borderColor: "#e2e8f0",
            },
          ]}
        >
          <Text style={{ flex: 1, color: "#64748b", fontSize: 10, fontWeight: "700" }}>
            TOKEN
          </Text>
          <Text style={{ flex: 1.6, color: "#64748b", fontSize: 10, fontWeight: "700" }}>
            DEPARTMENT
          </Text>
          <Text
            style={{
              width: 60,
              textAlign: "right",
              color: "#64748b",
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            COUNTER
          </Text>
        </View>

        {loading && !entries.length ? (
          <ActivityIndicator color={C.blue} style={{ padding: 20 }} />
        ) : waitingEntries.length ? (
          waitingEntries.slice(0, 8).map((entry, idx) => {
            const counterIdx =
              activeDepartments.findIndex((d) => d === entry.department) + 1 ||
              (idx % 3) + 1;
            return (
              <View
                key={entry.id}
                style={[
                  s.row,
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: idx === waitingEntries.length - 1 ? 0 : 1,
                    borderColor: "#f1f5f9",
                  },
                ]}
              >
                <Text style={{ flex: 1, color: "#0284c7", fontSize: 13, fontWeight: "800" }}>
                  {entry.token}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1.6, color: C.navy, fontSize: 12, fontWeight: "600" }}
                >
                  {entry.department}
                </Text>
                <Text
                  style={{
                    width: 60,
                    textAlign: "right",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {counterIdx}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={[s.body, { padding: 16, textAlign: "center", color: "#64748b" }]}>
            No waiting patients in today’s queue.
          </Text>
        )}
      </View>

      {/* Notice Card */}
      <View
        style={[
          s.card,
          {
            padding: 14,
            marginBottom: 16,
            backgroundColor: "#fffbeb",
            borderColor: "#fef3c7",
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          },
        ]}
      >
        <Icon name="clock" size={20} color="#b45309" />
        <Text style={{ flex: 1, color: "#92400e", fontSize: 11, lineHeight: 16 }}>
          Tokens update in real-time. Please proceed directly to your designated counter when your
          token is called.
        </Text>
      </View>

      {/* Display Controls */}
      <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>Display Controls</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Cast to TV"
            outline
            onPress={() => router.push("/nurse/queue")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Preview Screen"
            onPress={() => setRetry((n) => n + 1)}
          />
        </View>
      </View>
    </Screen>
  );
}
