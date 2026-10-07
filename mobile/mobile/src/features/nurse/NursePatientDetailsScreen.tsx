import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, ErrorMessage, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import type { NursePatient } from "./types";
import { NurseTabs } from "./NurseShared";

export default function NursePatientDetailsScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ patientId: string }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const [patient, setPatient] = useState<NursePatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      nurseApi
        .patient(patientId || "")
        .then((data) => {
          if (active) setPatient(data);
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
    }, [patientId, retry]),
  );

  const appt =
    patient?.appointments?.find((item) => item.status === "confirmed") ||
    patient?.appointment ||
    (patient?.appointments && patient.appointments.length > 0 ? patient.appointments[0] : null);

  const initials =
    patient?.fullName
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PT";

  const isConfirmed = appt?.status === "confirmed";
  const statusLabel = isConfirmed
    ? "Admitted"
    : appt?.status === "completed"
    ? "Completed"
    : appt?.status === "cancelled"
    ? "Discharged"
    : "Registered";

  const statusBg = isConfirmed
    ? "#e6f7ec"
    : appt?.status === "completed"
    ? "#e0f2fe"
    : appt?.status === "cancelled"
    ? "#f1f5f9"
    : "#eff6ff";

  const statusColor = isConfirmed
    ? "#15803d"
    : appt?.status === "completed"
    ? "#0284c7"
    : appt?.status === "cancelled"
    ? "#64748b"
    : "#2563eb";

  return (
    <Screen footer={<NurseTabs active="appointments" />}>
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ padding: 60 }} />
      ) : error ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ErrorMessage message={error} />
          <Button
            title="Retry"
            outline
            onPress={() => setRetry((v) => v + 1)}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : patient ? (
        <>
          {/* Header Curved Card */}
          <LinearGradient
            colors={["#07345e", "#102e57"]}
            style={{
              marginHorizontal: -24,
              marginTop: -25,
              marginBottom: 14,
              paddingHorizontal: 24,
              paddingTop: 54,
              paddingBottom: 48,
              alignItems: "center",
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
            }}
          >
            {/* Top Navigation Row */}
            <View
              style={[
                s.row,
                { width: "100%", justifyContent: "space-between", marginBottom: 12 },
              ]}
            >
              <Pressable
                accessibilityLabel={t("Back to patient search")}
                onPress={() => router.replace("/nurse/patients")}
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
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Patient Record</Text>
              <View style={{ width: 38 }} />
            </View>

            {/* Avatar Initials Circle */}
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ color: "#0c3b6b", fontSize: 24, fontWeight: "700" }}>{initials}</Text>
            </View>

            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }} translate={false}>{patient.fullName}</Text>
            <Text style={{ color: "#d5e7f6", fontSize: 12, marginTop: 4 }}>
              <Text>ID:</Text> <Text translate={false}>{patient.patientId}</Text> · <Text>{patient.age ? `${patient.age} yrs` : "Age —"}</Text> · <Text>{patient.gender}</Text>
            </Text>
          </LinearGradient>

          {/* Status and Details Strip Card */}
          <View
            style={[
              s.card,
              {
                marginTop: -32,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 1,
                borderColor: "#edf2f7",
                borderRadius: 18,
                backgroundColor: "#fff",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 6,
                elevation: 3,
              },
            ]}
          >
            <View
              style={{
                backgroundColor: statusBg,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: statusColor, fontSize: 10, fontWeight: "700" }}>
                ● {statusLabel}
              </Text>
            </View>
            <Text style={{ color: C.navy, fontSize: 12, fontWeight: "600" }}>
              {appt?.department || "General OPD"}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 11 }}>
              {patient.district || "Registered Patient"}
            </Text>
          </View>

          {/* Contact Information Section */}
          <Text style={[s.title, { fontSize: 15, marginTop: 18, marginBottom: 8 }]}>
            Contact Information
          </Text>
          <View
            style={[
              s.card,
              {
                padding: 14,
                backgroundColor: "#e8f4fc",
                borderWidth: 1,
                borderColor: "#d4e9f9",
                borderRadius: 18,
              },
            ]}
          >
            <Pressable
              onPress={() => void Linking.openURL(`tel:${patient.phone}`)}
              style={[s.row, { paddingVertical: 8, gap: 12 }]}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="phone" size={18} color={C.blue} />
              </View>
              <Text style={[s.body, { color: C.navy, fontSize: 13, fontWeight: "600" }]}>
                {patient.phone}
              </Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "#cde4f7", marginVertical: 4 }} />

            <Pressable
              onPress={() => void Linking.openURL(`mailto:${patient.email}`)}
              style={[s.row, { paddingVertical: 8, gap: 12 }]}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="mail" size={18} color={C.blue} />
              </View>
              <Text style={[s.body, { color: C.navy, fontSize: 13, fontWeight: "600" }]}>
                {patient.email}
              </Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "#cde4f7", marginVertical: 4 }} />

            <View style={[s.row, { paddingVertical: 8, gap: 12 }]}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="pin" size={18} color={C.blue} />
              </View>
              <Text style={[s.body, { color: C.navy, flex: 1, fontSize: 12, fontWeight: "600" }]}>
                {patient.address}, {patient.district}
              </Text>
            </View>
          </View>

          {/* Medical Information Section */}
          <Text style={[s.title, { fontSize: 15, marginTop: 18, marginBottom: 8 }]}>
            Medical Information
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={[
                s.card,
                {
                  flex: 1,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#edf2f7",
                  borderRadius: 16,
                  backgroundColor: "#fff",
                },
              ]}
            >
              <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700" }}>ALLERGIES</Text>
              <Text style={{ color: C.navy, fontSize: 12, fontWeight: "600", marginTop: 4 }}>
                None reported
              </Text>
            </View>
            <View
              style={[
                s.card,
                {
                  flex: 1,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#edf2f7",
                  borderRadius: 16,
                  backgroundColor: "#fff",
                },
              ]}
            >
              <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700" }}>
                CHRONIC CONDITIONS
              </Text>
              <Text style={{ color: C.navy, fontSize: 12, fontWeight: "600", marginTop: 4 }}>
                None reported
              </Text>
            </View>
          </View>

          {/* Upcoming Appointment Section */}
          <Text style={[s.title, { fontSize: 15, marginTop: 18, marginBottom: 8 }]}>
            Upcoming Appointment
          </Text>
          {appt ? (
            <View
              style={[
                s.card,
                {
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderWidth: 1,
                  borderColor: "#d9eaf8",
                  backgroundColor: "#f0f7fe",
                  borderRadius: 18,
                },
              ]}
            >
              <View
                style={[
                  s.iconTile,
                  { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff" },
                ]}
              >
                <Icon name="calendar" size={22} color={C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700" }}>
                  {appt.doctor || "Consultant Physician"}
                </Text>
                <Text style={[s.body, { fontSize: 11, color: "#64748b", marginTop: 2 }]}>
                  <Text>{appt.department}</Text> · <Text>{appt.date}</Text> <Text>at</Text> <Text>{appt.time}</Text>
                </Text>
                <Text style={[s.body, { fontSize: 11, color: "#64748b" }]}>{appt.hospital}</Text>
              </View>
              <View
                style={{
                  backgroundColor: "#e0f2fe",
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#0284c7", fontSize: 9, fontWeight: "700" }}>
                  {appt.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
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
              <Icon name="calendar" size={26} color="#94a3b8" />
              <Text style={{ color: C.navy, fontSize: 13, fontWeight: "700", marginTop: 6 }}>
                No appointment record
              </Text>
              <Text style={[s.body, { fontSize: 11, color: "#64748b", marginTop: 2 }]}>
                This patient has no upcoming appointments scheduled.
              </Text>
            </View>
          )}

          {/* Read-Only Notice and Navigation Button */}
          <Button
            title="Back to Patient Search"
            outline
            onPress={() => router.replace("/nurse/patients")}
            style={{ marginTop: 20, marginBottom: 12 }}
          />
        </>
      ) : null}
    </Screen>
  );
}
