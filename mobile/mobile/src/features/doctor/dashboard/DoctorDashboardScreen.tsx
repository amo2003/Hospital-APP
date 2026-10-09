import ThemeSelector from "@/theme/ThemeSelector";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, RefreshControl, StyleSheet } from 'react-native';
import { Pressable, ScrollView, View, SafeAreaView } from '@/theme/primitives';
import { router } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { C, s } from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import { DoctorStorage } from "../shared/doctorStorage";
import {
  doctorApi,
  doctorMessageOf,
  isAppointmentTimePassed,
  type DoctorAppointment,
  type DoctorDashboardData,
} from "../shared/doctorApi";

export const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const getGreeting = (name: string) => {
  const hour = new Date().getHours();
  const prefix =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";
  const docName = name
    ? name.startsWith("Dr.")
      ? name
      : `Dr. ${name}`
    : "Doctor";
  return `${prefix}, ${docName}`;
};

export default function DoctorDashboardScreen() {
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedApt, setSelectedApt] = useState<DoctorAppointment | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await doctorApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleStatusUpdate(
    id: string,
    newStatus: "confirmed" | "completed" | "cancelled",
  ) {
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentStatus(id, newStatus);
      setSelectedApt(null);
      await loadDashboard(true);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDecisionUpdate(
    id: string,
    decision: "accepted" | "rejected",
  ) {
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentDecision(id, decision);
      setSelectedApt(null);
      await loadDashboard(true);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    await DoctorStorage.clearDoctorSession();
    router.replace("/doctor/login");
  }

  const waitingCount = data?.summary?.waiting ?? 0;
  const doctorName = data?.doctor?.fullName || "";

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f8fc" }}>
      {/* ──────────────── 1. HEADER (Navy with CarePlus branding) ──────────────── */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
          <View style={styles.headerTopRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              onPress={() => setMenuOpen(true)}
              style={styles.headerIconBtn}
            >
              <Icon name="menu" color="#fff" size={24} />
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={styles.headerIconBtn}
                onPress={() => router.push("/doctor/notifications")}
              >
                <Icon name="bell" color="#fff" size={21} />
                {waitingCount > 0 && <View style={styles.notificationDot} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.greetingArea}>
            <Text style={styles.greetingTitle}>
              {getGreeting(doctorName)}
            </Text>
            <Text style={styles.greetingSubtitle}>
              Here’s your day at a glance
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* ──────────────── 2. MAIN SCROLLABLE CONTENT ──────────────── */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
            Loading today’s OPD schedule...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadDashboard()}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDashboard(true)}
              tintColor={C.blue}
              colors={[C.blue]}
            />
          }
        >
          {/* ──── 2A. SUMMARY CARDS (Patients today & Current queue) ──── */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Patients today</Text>
              <Text style={styles.summaryValueNavy}>
                {data?.summary?.todayAppointments ?? 0}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Current queue</Text>
              <Text style={styles.summaryValueBlue}>
                {data?.summary?.currentQueue ?? "None"}
              </Text>
            </View>
          </View>

          {/* ──── 2B. NEXT PATIENT CARD ──── */}
          {data?.nextPatient ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const found = data.todaySchedule.find(
                  (a) => a.id === data.nextPatient!.id,
                );
                if (found) setSelectedApt(found);
              }}
              style={styles.nextPatientCard}
            >
              <View style={styles.patientAvatarCircle}>
                <Icon name="user" color={C.blue} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nextPatientLabel}>Next patient</Text>
                <Text style={styles.nextPatientName}>
                  {data.nextPatient.patientName} — {formatTime(data.nextPatient.time)}
                </Text>
              </View>
              <Icon name="chevron" color={C.muted} size={16} />
            </Pressable>
          ) : (
            <View style={styles.nextPatientCard}>
              <View style={styles.patientAvatarCircle}>
                <Icon name="check" color="#2e7d32" size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nextPatientLabel}>Next patient</Text>
                <Text style={styles.nextPatientName}>No waiting patients</Text>
              </View>
            </View>
          )}

          {/* ──── 2C. TODAY'S SCHEDULE SECTION ──── */}
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.scheduleTitle}>Today’s schedule</Text>
              <Text style={styles.scheduleSubtitle}>
                {data?.todaySchedule?.length || 0} appointments
              </Text>
            </View>

            {data?.todaySchedule && data.todaySchedule.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                {data.todaySchedule.map((apt, index) => {
                  const isDone = apt.status === "completed";
                  const isCancelled = apt.status === "cancelled" || apt.doctorDecision === "rejected";
                  const isPending = apt.doctorDecision === "pending" && apt.status === "confirmed";
                  const isWaiting = apt.status === "confirmed" && !isPending && !isCancelled;

                  return (
                    <View key={apt.id}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSelectedApt(apt)}
                        style={styles.scheduleRow}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.aptTimeAndName}>
                            {formatTime(apt.time)} — {apt.patientName}
                          </Text>
                          <Text style={styles.aptQueueNumber}>
                            Queue #{apt.queueNumber} · {apt.department}
                          </Text>
                        </View>

                        {/* Status Pill */}
                        <View
                          style={[
                            styles.statusPill,
                            isPending && { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
                            isWaiting && styles.statusPillWaiting,
                            isDone && styles.statusPillDone,
                            isCancelled && styles.statusPillCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              isPending && { color: "#b45309", fontWeight: "700" },
                              isWaiting && { color: "#b35a00" },
                              isDone && { color: "#2e7d32" },
                              isCancelled && { color: "#c62828" },
                            ]}
                          >
                            {isPending
                              ? "Pending"
                              : isWaiting
                                ? "Waiting"
                                : isDone
                                  ? "Done"
                                  : apt.doctorDecision === "rejected"
                                    ? "Rejected"
                                    : "Cancelled"}
                          </Text>
                        </View>
                      </Pressable>
                      {index < data.todaySchedule.length - 1 && (
                        <View style={styles.rowDivider} />
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="calendar" color={C.blue} size={28} />
                </View>
                <Text style={styles.emptyTitle}>
                  No Appointments Scheduled Today
                </Text>
                <Text style={styles.emptySubtitle}>
                  You have no patients booked for today’s OPD clinic. New
                  patient bookings will appear here in real-time.
                </Text>
              </View>
            )}

            {/* Notice banner below list */}
            {waitingCount > 0 && (
              <View style={styles.queueNoticeBox}>
                <View style={styles.infoCircle}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 10 }}>
                    i
                  </Text>
                </View>
                <Text style={styles.queueNoticeText}>
                  You have {waitingCount} patient{waitingCount > 1 ? "s" : ""}{" "}
                  waiting. Check the queue before starting.
                </Text>
              </View>
            )}
          </View>

          {/* ──── 2D. ACTION BUTTONS (View schedule / Patient list) ──── */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              accessibilityRole="button"
              style={styles.viewScheduleBtn}
              onPress={() => router.push("/doctor/appointments")}
            >
              <Text style={styles.viewScheduleText}>View schedule</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.patientListBtn}
              onPress={() => router.push("/doctor/patients")}
            >
              <Text style={styles.patientListText}>Patient list</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* ──────────────── 3. BOTTOM NAVIGATION BAR ──────────────── */}
      <View style={styles.bottomTabs}>
        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => loadDashboard(true)}
        >
          <Icon name="home" color={C.blue} size={20} />
          <Text style={[styles.tabLabel, { color: C.blue, fontWeight: "700" }]}>
            Home
          </Text>
          <View style={styles.activeTabIndicator} />
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
          onPress={() => router.push("/doctor/notifications")}
        >
          <Icon name="bell" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Notifications</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.tabItem}
          onPress={() => setMenuOpen(true)}
        >
          <Icon name="user" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>

      {/* ──────────────── 4. APPOINTMENT DETAILS & STATUS MODAL ──────────────── */}
      <Modal
        visible={!!selectedApt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedApt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <Pressable
                onPress={() => setSelectedApt(null)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 18, color: C.muted }}>✕</Text>
              </Pressable>
            </View>

            {selectedApt && (
              <View style={{ marginVertical: 12 }}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Patient Name</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedApt.patientName}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Queue Number</Text>
                  <Text style={[styles.modalDetailValue, { color: C.blue }]}>
                    #{selectedApt.queueNumber}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Appointment ID</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedApt.appointmentId}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Time & Date</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatTime(selectedApt.time)} · {selectedApt.date}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Department</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedApt.department}
                  </Text>
                </View>

                {selectedApt.patientPhone ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Contact Phone</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedApt.patientPhone}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Current Status</Text>
                  <View
                    style={[
                      styles.statusPill,
                      selectedApt.status === "confirmed" &&
                        styles.statusPillWaiting,
                      selectedApt.status === "completed" && styles.statusPillDone,
                      selectedApt.status === "cancelled" &&
                        styles.statusPillCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        selectedApt.doctorDecision === "pending" && { color: "#b45309" },
                        selectedApt.doctorDecision === "rejected" && { color: "#dc2626" },
                        selectedApt.status === "completed" && { color: "#15803d" },
                        selectedApt.status === "cancelled" && { color: "#dc2626" },
                      ]}
                    >
                      {selectedApt.doctorDecision === "pending"
                        ? "Pending Approval"
                        : selectedApt.doctorDecision === "rejected"
                          ? "Rejected"
                          : selectedApt.status === "confirmed"
                            ? "Waiting in Queue"
                            : selectedApt.status === "completed"
                              ? "Completed"
                              : "Cancelled"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons for Appointment */}
            {selectedApt && selectedApt.doctorDecision === "pending" && selectedApt.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.doneBtn, { backgroundColor: "#16a34a" }]}
                  disabled={actionBusy}
                  onPress={() => handleDecisionUpdate(selectedApt.id, "accepted")}
                >
                  {actionBusy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.doneBtnText}>Accept Appointment</Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={styles.cancelBtn}
                  disabled={actionBusy}
                  onPress={() => handleDecisionUpdate(selectedApt.id, "rejected")}
                >
                  <Text style={styles.cancelBtnText}>Reject Appointment</Text>
                </Pressable>
              </View>
            ) : selectedApt && selectedApt.doctorDecision === "rejected" ? (
              <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginTop: 10 }}>
                <Text style={{ color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                  ✕ This appointment request was rejected.
                </Text>
              </View>
            ) : selectedApt?.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                {(() => {
                  const timePassed = isAppointmentTimePassed(selectedApt.date, selectedApt.time);
                  return (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        style={[
                          styles.doneBtn,
                          !timePassed && { backgroundColor: "#94a3b8", opacity: 0.8 },
                        ]}
                        disabled={actionBusy || !timePassed}
                        onPress={() => handleStatusUpdate(selectedApt.id, "completed")}
                      >
                        {actionBusy ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.doneBtnText}>
                            {timePassed ? "Mark as Done" : `Scheduled for ${selectedApt.time}`}
                          </Text>
                        )}
                      </Pressable>
                      {!timePassed && (
                        <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 8 }}>
                          <Text style={{ color: "#1e40af", fontSize: 12, textAlign: "center" }}>
                            ⏰ Consultation can be completed at or after {selectedApt.time}.
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}

                <Pressable
                  accessibilityRole="button"
                  style={styles.cancelBtn}
                  disabled={actionBusy}
                  onPress={() => handleStatusUpdate(selectedApt.id, "cancelled")}
                >
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              style={styles.closeBtn}
              onPress={() => setSelectedApt(null)}
            >
              <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13 }}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ──────────────── 5. DOCTOR PROFILE / LOGOUT MENU MODAL ──────────────── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuModalCard}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={styles.largeAvatarCircle}>
                <Icon name="user" color={C.blue} size={28} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: C.navy,
                  marginTop: 8,
                }}
              >
                {data?.doctor?.fullName || "Doctor"}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted }}>
                {data?.doctor?.specialty || "OPD Specialist"} ·{" "}
                {data?.doctor?.slmcNo || ""}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {data?.doctor?.hospital || "CarePlus Hospital"}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <ThemeSelector />
            <Pressable
              accessibilityRole="button"
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Text style={{ color: "#d32f2f", fontWeight: "700", fontSize: 14 }}>
                Log Out of Doctor Portal
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.closeBtn, { marginTop: 8 }]}
              onPress={() => setMenuOpen(false)}
            >
              <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13 }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#0B2545",
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 16,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff9800",
    borderWidth: 1.5,
    borderColor: "#0B2545",
  },
  greetingArea: {
    marginTop: 4,
  },
  greetingTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
  },
  greetingSubtitle: {
    color: "#cfe2f7",
    fontSize: 12,
    marginTop: 3,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: C.blue,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8f0f8",
    shadowColor: "#0b2545",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: {
    color: "#7b8fac",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryValueNavy: {
    color: "#102e57",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryValueBlue: {
    color: "#1D6FE0",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },

  nextPatientCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8f0f8",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#0b2545",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  patientAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  nextPatientLabel: {
    color: "#7b8fac",
    fontSize: 11,
  },
  nextPatientName: {
    color: "#102e57",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8f0f8",
    marginBottom: 16,
    shadowColor: "#0b2545",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleTitle: {
    color: "#102e57",
    fontSize: 15,
    fontWeight: "700",
  },
  scheduleSubtitle: {
    color: C.blue,
    fontSize: 11,
    fontWeight: "600",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  aptTimeAndName: {
    color: "#102e57",
    fontSize: 13,
    fontWeight: "600",
  },
  aptQueueNumber: {
    color: "#7b8fac",
    fontSize: 11,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#f0f4f9",
  },

  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillWaiting: {
    backgroundColor: "#fff3e0",
  },
  statusPillDone: {
    backgroundColor: "#e8f5e9",
  },
  statusPillCancelled: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  queueNoticeBox: {
    backgroundColor: "#edf6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 10,
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  queueNoticeText: {
    flex: 1,
    color: "#086ab9",
    fontSize: 11,
    lineHeight: 16,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#102e57",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#7b8fac",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },

  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  viewScheduleBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#102e57",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  viewScheduleText: {
    color: "#102e57",
    fontWeight: "700",
    fontSize: 13,
  },
  patientListBtn: {
    flex: 1,
    backgroundColor: "#116bb0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  patientListText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  bottomTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e8f0f8",
    paddingVertical: 6,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#7b8fac",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -6,
    width: 28,
    height: 3,
    backgroundColor: C.blue,
    borderRadius: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#102e57",
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#f2f6fa",
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#7b8fac",
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102e57",
  },
  doneBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d32f2f",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#d32f2f",
    fontWeight: "700",
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  menuModalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 30,
    marginVertical: "auto",
    padding: 20,
    alignSelf: "center",
    width: "84%",
  },
  largeAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
