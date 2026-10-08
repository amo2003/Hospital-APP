import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { C, s } from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import { DoctorStorage } from "../shared/doctorStorage";
import {
  doctorApi,
  doctorMessageOf,
  isAppointmentTimePassed,
  type DoctorPatientItem,
  type DoctorProfile,
} from "../shared/doctorApi";

export const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const getTodayDateStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObj);
};

const shiftDate = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dateObj.toISOString().slice(0, 10);
};

type FilterType = "all" | "confirmed" | "completed";

export default function DoctorPatientListScreen() {
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [patients, setPatients] = useState<DoctorPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const loadPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [list, meRes] = await Promise.all([
        doctorApi.getPatients({ date: selectedDate }),
        doctorProfile ? Promise.resolve(null) : doctorApi.me().catch(() => null),
      ]);
      setPatients(list);
      if (meRes?.doctor) setDoctorProfile(meRes.doctor);
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, doctorProfile]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Counts based on today's total list
  const counts = useMemo(() => {
    const total = patients.length;
    const waiting = patients.filter((p) => p.status === "confirmed").length;
    const done = patients.filter((p) => p.status === "completed").length;
    return { total, waiting, done };
  }, [patients]);

  // Filtered and searched list
  const filteredPatients = useMemo(() => {
    let list = patients;

    // Apply status filter
    if (activeFilter === "confirmed") {
      list = list.filter((p) => p.status === "confirmed");
    } else if (activeFilter === "completed") {
      list = list.filter((p) => p.status === "completed");
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.queueNumber.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          p.patientPhone.includes(q) ||
          p.department.toLowerCase().includes(q),
      );
    }

    return list;
  }, [patients, activeFilter, searchQuery]);

  async function handleStatusUpdate(
    id: string,
    newStatus: "confirmed" | "completed" | "cancelled",
  ) {
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentStatus(id, newStatus);
      setSelectedPatient(null);
      setConfirmCancelModal(false);
      await loadPatients(true);
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
      setSelectedPatient(null);
      setConfirmCancelModal(false);
      await loadPatients(true);
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

  const clinicSubtitle = doctorProfile?.specialty
    ? `${doctorProfile.specialty} OPD Clinic`
    : "General OPD Clinic";

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeHeaderArea}>
        {/* ──────────────── 1. HEADER (CarePlus Style) ──────────────── */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            style={styles.backBtn}
            onPress={() => router.replace("/doctor/dashboard")}
          >
            <Icon name="back" color={C.blue} size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bellBtn}
            onPress={() => router.push("/doctor/notifications")}
          >
            <Icon name="bell" color="#102e57" size={20} />
            {counts.waiting > 0 && <View style={styles.bellBadgeDot} />}
          </Pressable>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.screenTitle}>Patient list</Text>
          <Text style={styles.screenSubtitle}>
            {clinicSubtitle} · {counts.total} patients {selectedDate === todayStr ? "today" : `on ${formatDisplayDate(selectedDate)}`}
          </Text>
        </View>

        {/* ──────────────── 1.5. DATE SELECTOR BANNER ──────────────── */}
        <View style={styles.dateSelectorCard}>
          <Text style={styles.dateSelectorTitle}>Patients for</Text>
          <View style={styles.dateNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              style={styles.dateArrowBtn}
              onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
            >
              <Icon name="back" color="#102e57" size={16} />
            </Pressable>

            <View style={styles.dateTextWrapper}>
              <Text style={styles.dateDisplayMain}>
                {formatDisplayDate(selectedDate)}
              </Text>
              {selectedDate === todayStr && (
                <View style={styles.todayTag}>
                  <Text style={styles.todayTagText}>Today</Text>
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next day"
              style={styles.dateArrowBtn}
              onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
            >
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <Icon name="back" color="#102e57" size={16} />
              </View>
            </Pressable>
          </View>
          {selectedDate !== todayStr && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to Today"
              style={styles.returnTodayLink}
              onPress={() => setSelectedDate(todayStr)}
            >
              <Text style={styles.returnTodayLinkText}>Jump to Today</Text>
            </Pressable>
          )}
        </View>

        {/* ──────────────── 2. SEARCH INPUT ──────────────── */}
        <View style={styles.searchContainer}>
          <Icon name="search" color="#64748b" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or queue number..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* ──────────────── 3. FILTER PILLS ROW ──────────────── */}
        <View style={styles.filterPillsRow}>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.filterPill,
              activeFilter === "all" ? styles.filterPillAllActive : styles.filterPillInactive,
            ]}
            onPress={() => setActiveFilter("all")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "all"
                  ? styles.filterPillTextAllActive
                  : styles.filterPillTextInactive,
              ]}
            >
              All {counts.total > 0 ? `· ${counts.total}` : ""}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={[
              styles.filterPill,
              styles.filterPillWaiting,
              activeFilter === "confirmed" && styles.filterPillWaitingActive,
            ]}
            onPress={() => setActiveFilter("confirmed")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "confirmed"
                  ? styles.filterPillTextWaitingActive
                  : styles.filterPillTextWaiting,
              ]}
            >
              Waiting {counts.waiting > 0 ? `· ${counts.waiting}` : ""}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={[
              styles.filterPill,
              styles.filterPillDone,
              activeFilter === "completed" && styles.filterPillDoneActive,
            ]}
            onPress={() => setActiveFilter("completed")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "completed"
                  ? styles.filterPillTextDoneActive
                  : styles.filterPillTextDone,
              ]}
            >
              Done {counts.done > 0 ? `· ${counts.done}` : ""}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ──────────────── 4. PATIENT LIST SCROLL AREA ──────────────── */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
            Loading patient list...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retryBtn}
            onPress={() => loadPatients()}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPatients(true)}
              tintColor={C.blue}
            />
          }
        >
          {filteredPatients.length > 0 ? (
            <View style={styles.listContainer}>
              {filteredPatients.map((patient, index) => {
                const isWaiting = patient.status === "confirmed";
                const isDone = patient.status === "completed";
                const isCancelled = patient.status === "cancelled";

                return (
                  <View key={patient.id}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View record for ${patient.patientName}`}
                      style={styles.patientRow}
                      onPress={() => {
                        router.push({
                          pathname: "/doctor/patient-record",
                          params: { appointmentId: patient.id, patientId: patient.patientId },
                        });
                      }}
                    >
                      {/* Left: Queue Number Badge */}
                      <View
                        style={[
                          styles.queueBadge,
                          isWaiting && styles.queueBadgeWaiting,
                          isDone && styles.queueBadgeDone,
                          isCancelled && styles.queueBadgeCancelled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.queueBadgeText,
                            isWaiting && styles.queueBadgeTextWaiting,
                            isDone && styles.queueBadgeTextDone,
                            isCancelled && styles.queueBadgeTextCancelled,
                          ]}
                        >
                          {patient.queueNumber}
                        </Text>
                      </View>

                      {/* Middle: Patient Information */}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.patientNameText} numberOfLines={1}>
                          {patient.patientName}
                        </Text>
                        <Text style={styles.patientSubText} numberOfLines={1}>
                          {patient.patientId ? `${patient.patientId} · ` : ""}
                          {patient.department}
                        </Text>
                      </View>

                      {/* Right: Visit Time & Status */}
                      <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                        <Text style={styles.patientTimeText}>
                          {formatTime(patient.time)}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            isWaiting && styles.statusBadgeWaiting,
                            isDone && styles.statusBadgeDone,
                            isCancelled && styles.statusBadgeCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isWaiting && { color: "#b35a00" },
                              isDone && { color: "#2e7d32" },
                              isCancelled && { color: "#c62828" },
                            ]}
                          >
                            {isWaiting ? "Waiting" : isDone ? "Done" : "Cancelled"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {index < filteredPatients.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Icon name="user" color={C.blue} size={28} />
              </View>
              <Text style={styles.emptyTitle}>No Patients Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                  ? `No patients match "${searchQuery}". Check spelling or clear your search.`
                  : activeFilter === "confirmed"
                    ? `There are no waiting patients for ${formatDisplayDate(selectedDate)}.`
                    : activeFilter === "completed"
                      ? `No patients marked as completed for ${formatDisplayDate(selectedDate)}.`
                      : `No patient appointments scheduled for ${formatDisplayDate(selectedDate)}.`}
              </Text>
              {searchQuery.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.clearFilterBtn}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.clearFilterBtnText}>Clear Search</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}

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
          onPress={() => loadPatients(true)}
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
          onPress={() => setMenuOpen(true)}
        >
          <Icon name="menu" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>

      {/* ──────────────── 6. PATIENT / APPOINTMENT DETAILS MODAL ──────────────── */}
      <Modal
        visible={!!selectedPatient}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Patient Details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close details modal"
                onPress={() => setSelectedPatient(null)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 18, color: C.muted }}>✕</Text>
              </Pressable>
            </View>

            {selectedPatient && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Queue Number</Text>
                  <Text style={styles.modalDetailValueHighlight}>
                    {selectedPatient.queueNumber}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Patient Name</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedPatient.patientName}
                  </Text>
                </View>

                {selectedPatient.patientId ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Patient ID</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedPatient.patientId}
                    </Text>
                  </View>
                ) : null}

                {selectedPatient.patientPhone ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Phone Number</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedPatient.patientPhone}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Scheduled Time</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatTime(selectedPatient.time)}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Department</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedPatient.department}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedPatient.status === "confirmed" && styles.statusBadgeWaiting,
                      selectedPatient.status === "completed" && styles.statusBadgeDone,
                      selectedPatient.status === "cancelled" && styles.statusBadgeCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedPatient.doctorDecision === "pending" && { color: "#b45309" },
                        selectedPatient.doctorDecision === "rejected" && { color: "#dc2626" },
                        selectedPatient.status === "completed" && { color: "#2e7d32" },
                        selectedPatient.status === "cancelled" && { color: "#c62828" },
                      ]}
                    >
                      {selectedPatient.doctorDecision === "pending"
                        ? "Pending Approval"
                        : selectedPatient.doctorDecision === "rejected"
                          ? "Rejected"
                          : selectedPatient.status === "confirmed"
                            ? "Waiting"
                            : selectedPatient.status === "completed"
                              ? "Completed"
                              : "Cancelled"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Actions */}
            {selectedPatient && selectedPatient.doctorDecision === "pending" && selectedPatient.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 16 }}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.doneBtn, { backgroundColor: "#16a34a" }]}
                  disabled={actionBusy}
                  onPress={() => handleDecisionUpdate(selectedPatient.id, "accepted")}
                >
                  {actionBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.doneBtnText}>Accept Appointment</Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={styles.cancelBtn}
                  disabled={actionBusy}
                  onPress={() => handleDecisionUpdate(selectedPatient.id, "rejected")}
                >
                  <Text style={styles.cancelBtnText}>Reject Appointment</Text>
                </Pressable>
              </View>
            ) : selectedPatient && selectedPatient.doctorDecision === "rejected" ? (
              <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginTop: 16 }}>
                <Text style={{ color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                  ✕ This appointment request was rejected.
                </Text>
              </View>
            ) : selectedPatient?.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 16 }}>
                {(() => {
                  const timePassed = isAppointmentTimePassed(selectedPatient.date, selectedPatient.time);
                  return (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        style={[
                          styles.doneBtn,
                          !timePassed && { backgroundColor: "#94a3b8", opacity: 0.8 },
                        ]}
                        disabled={actionBusy || !timePassed}
                        onPress={() => handleStatusUpdate(selectedPatient.id, "completed")}
                      >
                        {actionBusy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.doneBtnText}>
                            {timePassed ? "Mark as Done" : `Scheduled for ${selectedPatient.time}`}
                          </Text>
                        )}
                      </Pressable>
                      {!timePassed && (
                        <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 8 }}>
                          <Text style={{ color: "#1e40af", fontSize: 12, textAlign: "center" }}>
                            ⏰ Consultation can be completed at or after {selectedPatient.time}.
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
                  onPress={() => setConfirmCancelModal(true)}
                >
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.finalizedNotice}>
                <Text style={styles.finalizedNoticeText}>
                  {selectedPatient?.status === "completed"
                    ? "✓ This patient appointment is marked as Completed."
                    : "✕ This appointment was Cancelled."}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={styles.closeModalBtn}
              onPress={() => setSelectedPatient(null)}
            >
              <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13 }}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ──────────────── 7. CONFIRM CANCELLATION DIALOG ──────────────── */}
      <Modal
        visible={confirmCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCancelModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmCancelModal(false)}
        >
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Cancel Appointment?</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to cancel the appointment for{" "}
              <Text style={{ fontWeight: "700", color: "#102e57" }}>
                {selectedPatient?.patientName}
              </Text>
              ? This action cannot be undone.
            </Text>

            <View style={styles.confirmBtnRow}>
              <Pressable
                accessibilityRole="button"
                style={styles.confirmNoBtn}
                disabled={actionBusy}
                onPress={() => setConfirmCancelModal(false)}
              >
                <Text style={styles.confirmNoText}>Keep</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={styles.confirmYesBtn}
                disabled={actionBusy}
                onPress={() => {
                  if (selectedPatient) {
                    handleStatusUpdate(selectedPatient.id, "cancelled");
                  }
                }}
              >
                {actionBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmYesText}>Yes, Cancel</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ──────────────── 8. DOCTOR PROFILE DRAWER / MENU ──────────────── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.drawerCard}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Icon name="user" color="#fff" size={26} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.drawerDocName}>
                  {doctorProfile?.fullName || "Doctor"}
                </Text>
                <Text style={styles.drawerDocSpecialty}>
                  {doctorProfile?.specialty || "OPD Consultant"}
                </Text>
                <Text style={styles.drawerDocHospital}>
                  {doctorProfile?.hospital || "CarePlus Hospital"}
                </Text>
              </View>
            </View>

            <View style={styles.drawerDivider} />

            <View style={{ paddingVertical: 8 }}>
              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.replace("/doctor/dashboard");
                }}
              >
                <Icon name="home" color={C.blue} size={18} />
                <Text style={styles.drawerMenuText}>Dashboard</Text>
              </Pressable>

              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/doctor/appointments");
                }}
              >
                <Icon name="calendar" color={C.blue} size={18} />
                <Text style={styles.drawerMenuText}>Appointment Schedule</Text>
              </Pressable>
            </View>

            <View style={styles.drawerDivider} />

            <Pressable
              accessibilityRole="button"
              style={styles.drawerLogoutBtn}
              onPress={handleLogout}
            >
              <Text style={styles.drawerLogoutText}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
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
    paddingBottom: 4,
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
  bellBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  bellBadgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e11d48",
  },
  titleArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102e57",
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  dateSelectorCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateSelectorTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  dateTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateDisplayMain: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102e57",
  },
  todayTag: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  todayTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },
  returnTodayLink: {
    marginTop: 6,
    alignSelf: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  returnTodayLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.blue,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    marginLeft: 8,
    paddingVertical: 4,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "700",
  },
  filterPillsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillInactive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterPillAllActive: {
    backgroundColor: "#102e57",
    borderWidth: 1,
    borderColor: "#102e57",
  },
  filterPillWaiting: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  filterPillWaitingActive: {
    backgroundColor: "#b45309",
    borderWidth: 1,
    borderColor: "#b45309",
  },
  filterPillDone: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  filterPillDoneActive: {
    backgroundColor: "#15803d",
    borderWidth: 1,
    borderColor: "#15803d",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextInactive: {
    color: "#475569",
  },
  filterPillTextAllActive: {
    color: "#ffffff",
  },
  filterPillTextWaiting: {
    color: "#b45309",
  },
  filterPillTextWaitingActive: {
    color: "#ffffff",
  },
  filterPillTextDone: {
    color: "#15803d",
  },
  filterPillTextDoneActive: {
    color: "#ffffff",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
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
  listContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  queueBadge: {
    width: 52,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  queueBadgeWaiting: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  queueBadgeDone: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  queueBadgeCancelled: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  queueBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  queueBadgeTextWaiting: {
    color: "#1d4ed8",
  },
  queueBadgeTextDone: {
    color: "#15803d",
  },
  queueBadgeTextCancelled: {
    color: "#b91c1c",
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  patientSubText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  patientTimeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  statusBadgeWaiting: {
    backgroundColor: "#fef3c7",
  },
  statusBadgeDone: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeCancelled: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  clearFilterBtn: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  clearFilterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.blue,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102e57",
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  modalDetailLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  modalDetailValue: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "600",
  },
  modalDetailValueHighlight: {
    fontSize: 15,
    color: "#1d4ed8",
    fontWeight: "800",
  },
  doneBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#e11d48",
    fontWeight: "700",
    fontSize: 13,
  },
  finalizedNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  finalizedNoticeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  closeModalBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  confirmBox: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#102e57",
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmNoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  confirmNoText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },
  confirmYesBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  confirmYesText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  drawerCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#102e57",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDocName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102e57",
  },
  drawerDocSpecialty: {
    fontSize: 12,
    color: C.blue,
    fontWeight: "600",
    marginTop: 2,
  },
  drawerDocHospital: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 14,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  drawerMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  drawerLogoutBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  drawerLogoutText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },
});
