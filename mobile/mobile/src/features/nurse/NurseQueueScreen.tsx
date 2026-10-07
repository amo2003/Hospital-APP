import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
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
  const { t } = useLanguage();
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof tabs)[number]>("waiting");
  const [selected, setSelected] = useState<NurseQueueEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  const loadQueue = useCallback(() => {
    let active = true;
    setLoading(true);
    setError("");
    nurseApi
      .queue()
      .then((data) => {
        if (active) setEntries(data.entries);
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
  }, [retry]);

  useFocusEffect(loadQueue);

  const waitingEntries = entries.filter((entry) => entry.status === "waiting");
  const servingEntries = entries.filter((entry) => entry.status === "serving");
  const completedEntries = entries.filter((entry) => entry.status === "completed");
  const currentServing = servingEntries[0] || null;

  const filtered = entries.filter((entry) => entry.status === filter);

  async function handleCallNext() {
    setBusy(true);
    setError("");
    try {
      await nurseApi.callNext();
      const data = await nurseApi.queue();
      setEntries(data.entries);
      setFilter("serving");
    } catch (e) {
      setError(nurseMessageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!currentServing) return;
    setBusy(true);
    setError("");
    try {
      await nurseApi.completeQueue(currentServing.id);
      const data = await nurseApi.queue();
      setEntries(data.entries);
      setFilter("waiting");
    } catch (e) {
      setError(nurseMessageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await nurseApi.cancelQueue(selected.id);
      setSelected(null);
      const data = await nurseApi.queue();
      setEntries(data.entries);
    } catch (e) {
      setError(nurseMessageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<NurseTabs active="appointments" />}>
      {/* Header */}
      <LinearGradient
        colors={["#07345e", "#102e57"]}
        style={{
          marginHorizontal: -24,
          marginTop: -25,
          marginBottom: 14,
          paddingHorizontal: 24,
          paddingTop: 54,
          paddingBottom: 44,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }}
      >
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Pressable
            accessibilityLabel={t("Back to dashboard")}
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
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Queue Management</Text>
          <Pressable
            accessibilityLabel={t("Refresh queue")}
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

      {/* NOW SERVING Hero Card */}
      <LinearGradient
        colors={["#0e4b85", "#082747"]}
        style={{
          marginTop: -32,
          marginBottom: 14,
          borderRadius: 22,
          paddingHorizontal: 20,
          paddingVertical: 18,
          minHeight: 140,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text style={{ color: "#a5d5fa", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
          NOW SERVING
        </Text>
        {currentServing ? (
          <>
            <Text
              style={{
                color: "#fff",
                fontSize: 40,
                fontWeight: "800",
                marginTop: 2,
                letterSpacing: 1,
              }}
            >
              {currentServing.token}
            </Text>
            <Text style={{ color: "#e4f2fc", fontSize: 13, fontWeight: "600" }}>
              <Text translate={false}>{currentServing.patient?.fullName || t("Patient")}</Text> · <Text>{currentServing.department}</Text>
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", marginTop: 4 }}>
              —
            </Text>
            <Text style={{ color: "#d4e8f8", fontSize: 12 }}>
              No patient is currently being served
            </Text>
          </>
        )}
        <View
          style={[
            s.row,
            {
              width: "100%",
              justifyContent: "space-between",
              marginTop: 14,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: "#ffffff20",
            },
          ]}
        >
          <Text style={{ color: "#cde4fa", fontSize: 11 }}>
            <Text>Waiting:</Text> {waitingEntries.length}
          </Text>
          <Text style={{ color: "#cde4fa", fontSize: 11 }}>
            <Text>Avg wait:</Text> {Math.max(5, waitingEntries.length * 8)} <Text>mins</Text>
          </Text>
        </View>
      </LinearGradient>

      {/* Prominent Action Buttons: Call Next Patient / Complete */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {currentServing ? (
          <>
            <View style={{ flex: 1.5 }}>
              <Button
                title="Complete Patient"
                loading={busy}
                onPress={handleComplete}
                style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Skip / Cancel"
                outline
                disabled={busy}
                onPress={() => setSelected(currentServing)}
              />
            </View>
          </>
        ) : (
          <>
            <View style={{ flex: 1.5 }}>
              <Button
                title="Call Next Patient"
                loading={busy}
                disabled={waitingEntries.length === 0}
                onPress={handleCallNext}
                style={{ backgroundColor: "#0c3b6b", borderColor: "#0c3b6b" }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Refresh"
                outline
                disabled={busy}
                onPress={() => setRetry((n) => n + 1)}
              />
            </View>
          </>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[s.row, { gap: 8, marginBottom: 14 }]}>
        {tabs.map((item) => {
          const active = filter === item;
          const count =
            item === "waiting"
              ? waitingEntries.length
              : item === "serving"
              ? servingEntries.length
              : completedEntries.length;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={{
                flex: 1,
                alignItems: "center",
                backgroundColor: active ? "#0c3b6b" : "#fff",
                borderWidth: 1,
                borderColor: active ? "#0c3b6b" : "#e2e8f0",
                borderRadius: 20,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: active ? "#fff" : "#64748b",
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "capitalize", textAlign: "center", paddingHorizontal: 3,
                }}
              >
                <Text>{item}</Text> ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorMessage message={error} />

      {/* Entries List */}
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ padding: 36 }} />
      ) : filtered.length ? (
        filtered.map((entry) => {
          const isWaiting = entry.status === "waiting";
          const isServing = entry.status === "serving";

          const badgeBg = isWaiting ? "#e6f7ec" : isServing ? "#e0f2fe" : "#f1f5f9";
          const badgeColor = isWaiting ? "#15803d" : isServing ? "#0284c7" : "#64748b";

          return (
            <View
              key={entry.id}
              style={[
                s.card,
                {
                  marginBottom: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#edf2f7",
                  borderRadius: 18,
                  backgroundColor: "#fff",
                  minHeight: 88,
                },
              ]}
            >
              <View style={[s.row, { gap: 12 }]}>
                {/* Token Badge */}
                <View
                  style={{
                    backgroundColor: "#e8f4fc",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#cde4f7",
                  }}
                >
                  <Text style={{ color: "#0c3b6b", fontSize: 13, fontWeight: "800" }}>
                    {entry.token}
                  </Text>
                </View>

                {/* Patient Details */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700" }}>
                    {entry.patient?.fullName || "Patient"}
                  </Text>
                  <Text style={[s.body, { fontSize: 11, color: "#64748b", marginTop: 2 }]}>
                    <Text>{entry.department}</Text> · <Text>{entry.patient?.patientId || "No ID"}</Text>
                  </Text>
                </View>

                {/* Status Pill */}
                <View
                  style={{
                    backgroundColor: badgeBg,
                    borderRadius: 12,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: badgeColor,
                      fontSize: 10,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {entry.status}
                  </Text>
                </View>
              </View>

              {/* Bottom Row */}
              <View
                style={[
                  s.row,
                  {
                    justifyContent: "space-between",
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderColor: "#f1f5f9",
                  },
                ]}
              >
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  {isWaiting && entry.position
                    ? `Queue Position: #${entry.position}`
                    : isServing
                    ? "Currently with physician"
                    : "Completed Consultation"}
                </Text>
                {isWaiting && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelected(entry)}
                    style={[s.row, { gap: 4, paddingVertical: 2, paddingHorizontal: 6 }]}
                  >
                    <Icon name="cross" size={16} color="#dc2626" />
                    <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "700" }}>
                      Cancel entry
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      ) : !error ? (
        <View
          style={[
            s.card,
            { alignItems: "center", paddingVertical: 28, borderWidth: 0, backgroundColor: "#fff" },
          ]}
        >
          <View
            style={[
              s.iconTile,
              { width: 44, height: 44, borderRadius: 22, marginBottom: 8, backgroundColor: "#f1f5f9" },
            ]}
          >
            <Icon name="clock" size={20} color="#64748b" />
          </View>
          <Text
            style={{
              color: C.navy,
              fontSize: 13,
              fontWeight: "700",
              textTransform: "capitalize",
            }}
          >
            No {filter} patients
          </Text>
          <Text style={[s.body, { fontSize: 11, marginTop: 4, textAlign: "center" }]}>
            Queue entries for this status will appear here when patients are queued.
          </Text>
        </View>
      ) : null}

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => !busy && setSelected(null)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Cancel queue entry?</Text>
            <Text style={[s.body, { marginVertical: 16 }]}>
              {t("Token {token} for {name} will be removed from the queue. The patient’s account record will not be deleted.", { token: selected?.token || "", name: selected?.patient?.fullName || t("this patient") })}
            </Text>
            <ErrorMessage message={error} />
            <Button title="Confirm Cancellation" loading={busy} onPress={handleCancel} />
            <Button
              title="Keep in Queue"
              outline
              disabled={busy}
              onPress={() => setSelected(null)}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
