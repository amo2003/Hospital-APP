import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
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
] as const;

export default function NursePatientSearchScreen() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]["value"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      nurseApi
        .patients(query, status)
        .then((data) => {
          if (active) setPatients(data);
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
    }, [query, status, retry]),
  );

  return (
    <Screen footer={<NurseTabs active="appointments" />}>
      {/* Curved Navy Header */}
      <LinearGradient
        colors={["#07345e", "#102e57"]}
        style={{
          marginHorizontal: -24,
          marginTop: -25,
          paddingHorizontal: 24,
          paddingTop: 54,
          paddingBottom: 46,
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
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Patient Search</Text>
          <Pressable
            accessibilityLabel={t("Search filters")}
            onPress={() => {}}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#ffffff25",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="user" size={19} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search Input Bar */}
      <View
        style={[
          s.inputBox,
          {
            marginTop: -26,
            marginBottom: 16,
            minHeight: 50,
            borderRadius: 25,
            paddingHorizontal: 16,
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10,
            elevation: 4,
          },
        ]}
      >
        <Icon name="search" size={21} color="#64748b" />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQuery(text.trim())}
          placeholder={t("Search by name, ID or phone...")}
          placeholderTextColor="#8ea4c2"
          returnKeyType="search"
          style={[s.input, { fontSize: 13, paddingVertical: 10, color: C.navy }]}
        />
        <Pressable accessibilityLabel={t("Execute search")} onPress={() => setQuery(text.trim())}>
          <Icon name="search" size={20} color={C.blue} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
        {filters.map((item) => {
          const active = status === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setStatus(item.value)}
              style={{
                flex: 1,
                alignItems: "center",
                backgroundColor: active ? "#0c3b6b" : "#fff",
                borderWidth: 1,
                borderColor: active ? "#0c3b6b" : "#e2e8f0",
                borderRadius: 20,
                paddingVertical: 9,
                shadowColor: "#000",
                shadowOpacity: active ? 0.08 : 0.02,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ color: active ? "#fff" : "#64748b", fontSize: 11, fontWeight: "700", textAlign: "center", paddingHorizontal: 3 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Patient Count */}
      <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
        <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700" }}>
          {loading ? "Searching patients…" : `${patients.length} patients found`}
        </Text>
      </View>

      <ErrorMessage message={error} />

      {/* Patient Cards List */}
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ padding: 36 }} />
      ) : patients.length ? (
        patients.map((patient) => {
          const initials = patient.fullName
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "PT";

          const isAdmitted = patient.appointment?.status === "confirmed";
          const isCompleted = patient.appointment?.status === "completed";
          const isCancelled = patient.appointment?.status === "cancelled";

          const badgeText = isAdmitted
            ? "Admitted"
            : isCompleted
            ? "Completed"
            : isCancelled
            ? "Discharged"
            : "Registered";

          const badgeBg = isAdmitted
            ? "#e6f7ec"
            : isCompleted
            ? "#e0f2fe"
            : isCancelled
            ? "#f1f5f9"
            : "#eff6ff";

          const badgeColor = isAdmitted
            ? "#15803d"
            : isCompleted
            ? "#0284c7"
            : isCancelled
            ? "#64748b"
            : "#2563eb";

          return (
            <Pressable
              key={patient.id}
              onPress={() =>
                router.push({
                  pathname: "/nurse/patient/[patientId]",
                  params: { patientId: patient.patientId },
                })
              }
              style={[
                s.card,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "#edf2f7",
                  borderRadius: 18,
                  minHeight: 80,
                  backgroundColor: "#fff",
                },
              ]}
            >
              {/* Initials Avatar */}
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: "#e8f4fc",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#d0e6f8",
                }}
              >
                <Text style={{ color: "#0c3b6b", fontSize: 14, fontWeight: "700" }}>
                  {initials}
                </Text>
              </View>

              {/* Patient Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.navy, fontSize: 14, fontWeight: "700" }} translate={false}>{patient.fullName}</Text>
                <Text style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                  <Text>ID:</Text> <Text translate={false}>{patient.patientId}</Text> · <Text>{patient.age ? `${patient.age} yrs` : "Age —"}</Text> · <Text>{patient.gender}</Text>
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <View
                    style={{
                      backgroundColor: badgeBg,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: badgeColor, fontSize: 9, fontWeight: "700" }}>
                      ● {badgeText}
                    </Text>
                  </View>
                  <Text style={{ color: "#94a3b8", fontSize: 10 }}>
                    {patient.appointment?.department || "General Patient"}
                  </Text>
                </View>
              </View>

              {/* Right Side */}
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ color: "#94a3b8", fontSize: 10 }}>
                  {patient.appointment?.date || ""}
                </Text>
                <Icon name="chevron" size={18} color="#94a3b8" />
              </View>
            </Pressable>
          );
        })
      ) : !error ? (
        <View
          style={[
            s.card,
            { alignItems: "center", paddingVertical: 32, borderWidth: 0, backgroundColor: "#fff" },
          ]}
        >
          <View
            style={[
              s.iconTile,
              { width: 48, height: 48, borderRadius: 24, marginBottom: 10, backgroundColor: "#f1f5f9" },
            ]}
          >
            <Icon name="search" size={24} color="#64748b" />
          </View>
          <Text style={{ color: C.navy, fontSize: 14, fontWeight: "700" }}>No patients found</Text>
          <Text style={[s.body, { fontSize: 11, marginTop: 4, textAlign: "center" }]}>
            Try another name, patient ID, or phone number.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => setRetry((value) => value + 1)}
        style={{ alignItems: "center", paddingVertical: 14 }}
      >
        <Text style={[s.link, { fontSize: 11 }]}>Refresh patient list</Text>
      </Pressable>
    </Screen>
  );
}
