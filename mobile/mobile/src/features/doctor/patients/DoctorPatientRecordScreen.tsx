import PatientMedicalDetails from "./PatientMedicalDetails";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { C, s } from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import {
  doctorApi,
  doctorMessageOf,
  isAppointmentTimePassed,
  type DoctorPatientRecordData,
} from "../shared/doctorApi";

type TabType = "overview" | "history" | "notes";

export default function DoctorPatientRecordScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
  }>();

  const [record, setRecord] = useState<DoctorPatientRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Add Note Modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [bpInput, setBpInput] = useState("");
  const [bsInput, setBsInput] = useState("");
  const [wtInput, setWtInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Mark as Done action state
  const [actionBusy, setActionBusy] = useState(false);

  const loadRecord = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await doctorApi.getPatientRecord({
        appointmentId: params.appointmentId,
        patientId: params.patientId,
      });
      setRecord(data);
      if (data.vitals) {
        setBpInput(data.vitals.bloodPressure || "");
        setBsInput(data.vitals.bloodSugar || "");
        setWtInput(data.vitals.weight || "");
      }
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.appointmentId, params.patientId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  async function handleMarkAsDone() {
    if (!record?.appointment?.id) return;
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentStatus(record.appointment.id, "completed");
      await loadRecord(true);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDecisionUpdate(decision: "accepted" | "rejected") {
    if (!record?.appointment?.id) return;
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentDecision(record.appointment.id, decision);
      await loadRecord(true);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveNote() {
    if (!noteText.trim()) {
      setNoteError("Please enter a note before saving.");
      return;
    }
    if (!record?.patient?.id) return;

    setSavingNote(true);
    setNoteError("");
    try {
      await doctorApi.addClinicalNote({
        patientId: record.patient.id,
        appointmentId: record.appointment?.id,
        note: noteText.trim(),
        vitals: {
          bloodPressure: bpInput.trim() || undefined,
          bloodSugar: bsInput.trim() || undefined,
          weight: wtInput.trim() || undefined,
        },
      });
      setNoteText("");
      setNoteModalOpen(false);
      await loadRecord(true);
      setActiveTab("notes");
    } catch (err) {
      setNoteError(doctorMessageOf(err));
    } finally {
      setSavingNote(false);
    }
  }

  const patient = record?.patient;
  const appointment = record?.appointment;
  const vitals = record?.vitals || {
    bloodPressure: "",
    bloodSugar: "",
    weight: "",
  };

  const isCompleted = appointment?.status === "completed";
  const isCancelled = appointment?.status === "cancelled";
  const isWaiting = appointment?.status === "confirmed";

  const queueTag = appointment?.queueNumber
    ? `${isWaiting ? "Waiting" : isCompleted ? "Done" : "Cancelled"} — ${appointment.queueNumber}`
    : "Patient Record";

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeHeaderArea}>
        {/* ──────────────── 1. HEADER (Figma 4.13) ──────────────── */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to patient list"
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Icon name="back" color={C.blue} size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Queue & Status Pill Badge */}
          <View
            style={[
              styles.queueStatusBadge,
              isWaiting && styles.badgeWaitingBg,
              isCompleted && styles.badgeCompletedBg,
              isCancelled && styles.badgeCancelledBg,
            ]}
          >
            <Text
              style={[
                styles.queueStatusText,
                isWaiting && { color: "#b45309" },
                isCompleted && { color: "#15803d" },
                isCancelled && { color: "#b91c1c" },
              ]}
            >
              {queueTag}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
            Loading patient record...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retryBtn}
            onPress={() => loadRecord()}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : record && patient ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRecord(true)}
              tintColor={C.blue}
            />
          }
        >
          {/* ──────────────── 2. PATIENT INFO CARD ──────────────── */}
          <View style={styles.patientCard}>
            <View style={styles.avatarCircle}>
              <Icon name="user" color={C.blue} size={26} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.patientFullName} numberOfLines={1}>
                {patient.fullName}
              </Text>
              <Text style={styles.patientMeta}>
                {patient.patientId} · Age {patient.age} · {patient.gender}
              </Text>
            </View>

            {/* Heart / Health Vital Badge Circle */}
            <View style={styles.heartCircle}>
              <Text style={{ fontSize: 16 }}>♥</Text>
            </View>
          </View>

          {/* ──────────────── 3. SEGMENTED TABS (Overview, History, Notes) ──────────────── */}
          <View style={styles.tabContainer}>
            <Pressable
              accessibilityRole="button"
              style={[
                styles.tabBtn,
                activeTab === "overview" ? styles.tabBtnActive : styles.tabBtnInactive,
              ]}
              onPress={() => setActiveTab("overview")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "overview"
                    ? styles.tabBtnTextActive
                    : styles.tabBtnTextInactive,
                ]}
              >
                Overview
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[
                styles.tabBtn,
                activeTab === "history" ? styles.tabBtnActive : styles.tabBtnInactive,
              ]}
              onPress={() => setActiveTab("history")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "history"
                    ? styles.tabBtnTextActive
                    : styles.tabBtnTextInactive,
                ]}
              >
                History
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[
                styles.tabBtn,
                activeTab === "notes" ? styles.tabBtnActive : styles.tabBtnInactive,
              ]}
              onPress={() => setActiveTab("notes")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "notes"
                    ? styles.tabBtnTextActive
                    : styles.tabBtnTextInactive,
                ]}
              >
                Notes {record.notes.length > 0 ? `(${record.notes.length})` : ""}
              </Text>
            </Pressable>
          </View>

          {/* ──────────────── 4A. TAB 1: OVERVIEW ──────────────── */}
          {activeTab === "overview" && (
            <View>
              <PatientMedicalDetails details={patient.medicalDetails} birthDate={patient.dateOfBirth} />
              {/* Clinician-recorded vitals */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                  Latest recorded vitals
                </Text>
              </View>

              <View style={styles.vitalsRow}>
                {/* 1. Blood Pressure Card */}
                <View style={[styles.vitalCard, { borderTopColor: "#ea580c" }]}>
                  <View style={[styles.vitalIconCircle, { backgroundColor: "#fff7ed" }]}>
                    <Text style={{ color: "#ea580c", fontSize: 13, fontWeight: "800" }}>
                      ⚡
                    </Text>
                  </View>
                  <Text style={styles.vitalLabel}>Blood pressure</Text>
                  <Text style={styles.vitalValue}>{vitals.bloodPressure || "--"}</Text>
                </View>

                {/* 2. Blood Sugar Card */}
                <View style={[styles.vitalCard, { borderTopColor: "#0284c7" }]}>
                  <View style={[styles.vitalIconCircle, { backgroundColor: "#eff6ff" }]}>
                    <Text style={{ color: "#0284c7", fontSize: 13, fontWeight: "800" }}>
                      💧
                    </Text>
                  </View>
                  <Text style={styles.vitalLabel}>Blood sugar</Text>
                  <Text style={styles.vitalValue}>{vitals.bloodSugar || "--"}</Text>
                </View>

                {/* 3. Weight Card */}
                <View style={[styles.vitalCard, { borderTopColor: "#64748b" }]}>
                  <View style={[styles.vitalIconCircle, { backgroundColor: "#f8fafc" }]}>
                    <Text style={{ color: "#475569", fontSize: 13, fontWeight: "800" }}>
                      ⚖
                    </Text>
                  </View>
                  <Text style={styles.vitalLabel}>Weight</Text>
                  <Text style={styles.vitalValue}>{vitals.weight || "--"}</Text>
                </View>
              </View>

              {/* Reason for visit */}
              <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                <Text style={styles.sectionHeaderTitle}>Reason for visit</Text>
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>
                  {appointment?.reasonForVisit ||
                    `Routine ${appointment?.department || "OPD"} consultation and comprehensive health review.`}
                </Text>
              </View>

              {/* Last visit */}
              <View style={styles.lastVisitContainer}>
                <View style={styles.lastVisitHeaderRow}>
                  <Text style={styles.lastVisitLabel}>Last visit</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActiveTab("history")}
                  >
                    <Text style={styles.viewAllLink}>View all ›</Text>
                  </Pressable>
                </View>
                <Text style={styles.lastVisitValue}>{record.lastVisit}</Text>
              </View>

              {/* Action Buttons: Add note | Accept/Reject or Mark as done */}
              {appointment && appointment.doctorDecision === "pending" && appointment.status === "confirmed" ? (
                <View style={{ gap: 8, marginTop: 14 }}>
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.markDoneBtn, { backgroundColor: "#16a34a" }]}
                      disabled={actionBusy}
                      onPress={() => handleDecisionUpdate("accepted")}
                    >
                      {actionBusy ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.markDoneBtnText}>Accept Appointment</Text>
                      )}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      style={[styles.addNoteBtn, { borderColor: "#ef4444" }]}
                      disabled={actionBusy}
                      onPress={() => handleDecisionUpdate("rejected")}
                    >
                      <Text style={[styles.addNoteBtnText, { color: "#ef4444" }]}>Reject</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.addNoteBtn, { width: "100%" }]}
                    onPress={() => setNoteModalOpen(true)}
                  >
                    <Text style={styles.addNoteBtnText}>Add Clinical Note</Text>
                  </Pressable>
                </View>
              ) : appointment && appointment.doctorDecision === "rejected" ? (
                <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginTop: 14 }}>
                  <Text style={{ color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                    ✕ This appointment request was rejected.
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.addNoteBtn}
                      onPress={() => setNoteModalOpen(true)}
                    >
                      <Text style={styles.addNoteBtnText}>Add note</Text>
                    </Pressable>

                    {(() => {
                      const timePassed = appointment ? isAppointmentTimePassed(appointment.date, appointment.time) : true;
                      const canMarkDone = !isCompleted && !actionBusy && timePassed;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          style={[
                            styles.markDoneBtn,
                            (!timePassed || isCompleted) && styles.markDoneBtnDisabled,
                          ]}
                          disabled={!canMarkDone}
                          onPress={handleMarkAsDone}
                        >
                          {actionBusy ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.markDoneBtnText}>
                              {isCompleted
                                ? "Completed ✓"
                                : timePassed
                                  ? "Mark as done"
                                  : `Scheduled for ${appointment?.time || ""}`}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })()}
                  </View>
                  {appointment && !isCompleted && !isAppointmentTimePassed(appointment.date, appointment.time) && (
                    <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 8, marginTop: 8 }}>
                      <Text style={{ color: "#1e40af", fontSize: 12, textAlign: "center" }}>
                        ⏰ Consultation can be completed at or after {appointment.time}.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ──────────────── 4B. TAB 2: VISIT HISTORY ──────────────── */}
          {activeTab === "history" && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionHeaderTitle}>Appointment History</Text>
              {record.visitHistory.length > 0 ? (
                <View style={styles.historyList}>
                  {record.visitHistory.map((item, idx) => (
                    <View key={item.id} style={styles.historyItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyDate}>
                          {item.date} — {item.time}
                        </Text>
                        <Text style={styles.historyDept}>
                          {item.department} · {item.appointmentId}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.historyStatusPill,
                          item.status === "completed" && { backgroundColor: "#dcfce7" },
                          item.status === "confirmed" && { backgroundColor: "#fef3c7" },
                          item.status === "cancelled" && { backgroundColor: "#fee2e2" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            item.status === "completed" && { color: "#15803d" },
                            item.status === "confirmed" && { color: "#b45309" },
                            item.status === "cancelled" && { color: "#b91c1c" },
                          ]}
                        >
                          {item.status === "completed"
                            ? "Done"
                            : item.status === "confirmed"
                              ? "Waiting"
                              : "Cancelled"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTabCard}>
                  <Text style={styles.emptyTabText}>
                    No previous appointments recorded for this patient.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ──────────────── 4C. TAB 3: CLINICAL NOTES ──────────────── */}
          {activeTab === "notes" && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.notesHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Consultation Notes</Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.addNoteSmallBtn}
                  onPress={() => setNoteModalOpen(true)}
                >
                  <Text style={styles.addNoteSmallText}>+ New Note</Text>
                </Pressable>
              </View>

              {record.notes.length > 0 ? (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {record.notes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                      <View style={styles.noteTopRow}>
                        <Text style={styles.noteAuthor}>{note.doctorName}</Text>
                        <Text style={styles.noteDate}>
                          {new Date(note.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <Text style={styles.noteBody}>{note.note}</Text>
                      {note.vitals && (
                        <View style={styles.noteVitalsPills}>
                          <Text style={styles.noteVitalPill}>
                            BP: {note.vitals.bloodPressure || "—"}
                          </Text>
                          <Text style={styles.noteVitalPill}>
                            Sugar: {note.vitals.bloodSugar || "—"}
                          </Text>
                          <Text style={styles.noteVitalPill}>
                            Weight: {note.vitals.weight || "—"}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTabCard}>
                  <Text style={styles.emptyTabText}>
                    No clinical notes recorded yet.
                  </Text>
                  <Pressable
                    style={styles.addFirstNoteBtn}
                    onPress={() => setNoteModalOpen(true)}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                      Add Clinical Note
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ──────────────── 5. BOTTOM NAVIGATION BAR ──────────────── */}
      <View style={styles.bottomTabs}>
        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => router.replace("/doctor/dashboard")}
        >
          <Icon name="home" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => router.push("/doctor/appointments")}
        >
          <Icon name="calendar" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Appointments</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => router.replace("/doctor/patients")}
        >
          <Icon name="user" color={C.blue} size={20} />
          <Text style={[styles.tabLabel, { color: C.blue, fontWeight: "700" }]}>
            Patients
          </Text>
          <View style={styles.activeTabIndicator} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => router.replace("/doctor/dashboard")}
        >
          <Icon name="menu" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>

      {/* ──────────────── 6. ADD CLINICAL NOTE MODAL ──────────────── */}
      <Modal
        visible={noteModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Clinical Note</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close note modal"
                onPress={() => setNoteModalOpen(false)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 18, color: C.muted }}>✕</Text>
              </Pressable>
            </View>

            {noteError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{noteError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Clinical Notes & Assessment *</Text>
            <TextInput
              style={styles.noteTextInput}
              multiline
              numberOfLines={4}
              placeholder="Enter diagnosis, clinical observation, prescription, or follow-up instructions..."
              placeholderTextColor="#94a3b8"
              value={noteText}
              onChangeText={setNoteText}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Vitals Recorded (Optional)
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vitalSubLabel}>BP</Text>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="130/85"
                  placeholderTextColor="#94a3b8"
                  value={bpInput}
                  onChangeText={setBpInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vitalSubLabel}>Sugar</Text>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="142"
                  placeholderTextColor="#94a3b8"
                  value={bsInput}
                  onChangeText={setBsInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vitalSubLabel}>Weight</Text>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="78 kg"
                  placeholderTextColor="#94a3b8"
                  value={wtInput}
                  onChangeText={setWtInput}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.saveNoteBtn}
              disabled={savingNote}
              onPress={handleSaveNote}
            >
              {savingNote ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveNoteBtnText}>Save Note to MongoDB</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.cancelNoteBtn}
              onPress={() => setNoteModalOpen(false)}
            >
              <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13 }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f8fc",
  },
  safeHeaderArea: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f0f7ff",
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.blue,
  },
  queueStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeWaitingBg: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  badgeCompletedBg: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  badgeCancelledBg: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  queueStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  errorBox: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: C.blue,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  patientFullName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#102e57",
  },
  patientMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 3,
    fontWeight: "500",
  },
  heartCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: "#102e57",
  },
  tabBtnInactive: {
    backgroundColor: "transparent",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  tabBtnTextInactive: {
    color: "#64748b",
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102e57",
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 8,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderTopWidth: 3,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  vitalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  vitalLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },
  vitalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#102e57",
    marginTop: 4,
  },
  reasonBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reasonText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  lastVisitContainer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  lastVisitHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  lastVisitLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  viewAllLink: {
    fontSize: 12,
    color: C.blue,
    fontWeight: "700",
  },
  lastVisitValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102e57",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  addNoteBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#102e57",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addNoteBtnText: {
    color: "#102e57",
    fontWeight: "800",
    fontSize: 14,
  },
  markDoneBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  markDoneBtnDisabled: {
    backgroundColor: "#16a34a",
    opacity: 0.9,
  },
  markDoneBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  historyList: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  historyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102e57",
  },
  historyDept: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  historyStatusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  notesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addNoteSmallBtn: {
    backgroundColor: "#f0f7ff",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addNoteSmallText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  noteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noteTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102e57",
  },
  noteDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  noteBody: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  noteVitalsPills: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  noteVitalPill: {
    fontSize: 11,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  emptyTabCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTabText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  addFirstNoteBtn: {
    marginTop: 12,
    backgroundColor: C.blue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bottomTabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: 16,
    paddingTop: 8,
    justifyContent: "space-around",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 4,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    fontWeight: "500",
  },
  activeTabIndicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.blue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102e57",
  },
  modalErrorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  modalErrorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  noteTextInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#1e293b",
    height: 90,
    textAlignVertical: "top",
  },
  vitalSubLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 3,
  },
  vitalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: "#1e293b",
  },
  saveNoteBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveNoteBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  cancelNoteBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
});
