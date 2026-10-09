import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { C, s } from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import { DoctorStorage } from "../shared/doctorStorage";
import {
  doctorApi,
  doctorMessageOf,
  isAppointmentTimePassed,
  type DoctorAppointment,
  type DoctorProfile,
} from "../shared/doctorApi";

export const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
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

const getMonthYearStr = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObj);
};

const getDetailedSelectedDateStr = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(dateObj);
};

const shiftDate = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dateObj.toISOString().slice(0, 10);
};

const getWeekDays = (referenceDateStr: string) => {
  const [y, m, d] = referenceDateStr.split("-").map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = ref.getUTCDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(Date.UTC(y, m - 1, d + distanceToMonday + i, 12, 0, 0));
    const isoString = dayDate.toISOString().slice(0, 10);
    const dayNumber = String(dayDate.getUTCDate()).padStart(2, "0");
    const dayShort = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(dayDate);
    days.push({
      dateStr: isoString,
      dayNumber,
      dayShort,
    });
  }
  return days;
};

type FilterType = "all" | "confirmed" | "completed";

export default function DoctorAppointmentsScreen() {
  const { date: paramDate } = useLocalSearchParams<{ date?: string }>();
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [selectedDate, setSelectedDate] = useState(() =>
    typeof paramDate === "string" && paramDate ? paramDate : todayStr,
  );

  useEffect(() => {
    if (typeof paramDate === "string" && paramDate && paramDate !== selectedDate) {
      setSelectedDate(paramDate);
    }
  }, [paramDate]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [selectedApt, setSelectedApt] = useState<DoctorAppointment | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const loadAppointments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const [apts, meRes] = await Promise.all([
          doctorApi.getAppointments({ date: selectedDate }),
          doctorProfile ? Promise.resolve(null) : doctorApi.me().catch(() => null),
        ]);
        setAppointments(apts);
        if (meRes?.doctor) setDoctorProfile(meRes.doctor);
      } catch (err) {
        setError(doctorMessageOf(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, doctorProfile],
  );

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const total = appointments.length;
    const waiting = appointments.filter((a) => a.status === "confirmed").length;
    const done = appointments.filter((a) => a.status === "completed").length;
    return { total, waiting, done };
  }, [appointments]);

  // Filtered list
  const filteredAppointments = useMemo(() => {
    if (activeFilter === "confirmed") {
      return appointments.filter((a) => a.status === "confirmed");
    }
    if (activeFilter === "completed") {
      return appointments.filter((a) => a.status === "completed");
    }
    return appointments;
  }, [appointments, activeFilter]);

  async function handleStatusUpdate(
    id: string,
    newStatus: "confirmed" | "completed" | "cancelled",
  ) {
    setActionBusy(true);
    try {
      await doctorApi.updateAppointmentStatus(id, newStatus);
      setSelectedApt(null);
      setConfirmCancelModal(false);
      await loadAppointments(true);
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
      await loadAppointments(true);
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

  const isToday = selectedDate === todayStr;

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
          <Text style={styles.screenTitle}>Appointment schedule</Text>
          <Text style={styles.screenSubtitle}>
            {isToday
              ? `${counts.total} appointments today`
              : `${counts.total} appointments on this date`}
          </Text>
        </View>

        {/* ──────────────── 2. CALENDAR / DATE NAVIGATION ──────────────── */}
        <View style={styles.calendarContainer}>
          {/* Month Header with Week Navigation */}
          <View style={styles.monthHeaderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              style={styles.calendarNavBtn}
              onPress={() => setSelectedDate((d) => shiftDate(d, -7))}
            >
              <Icon name="back" color="#0F2C59" size={16} />
            </Pressable>

            <View style={styles.monthTitleWrapper}>
              <Icon name="calendar" color={C.blue} size={15} />
              <Text style={styles.monthTitleText}>
                {getMonthYearStr(selectedDate)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              style={styles.calendarNavBtn}
              onPress={() => setSelectedDate((d) => shiftDate(d, 7))}
            >
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <Icon name="back" color="#0F2C59" size={16} />
              </View>
            </Pressable>
          </View>

          {/* 7-Day Horizontal Strip */}
          <View style={styles.weekStripRow}>
            {weekDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              const isTodayDay = day.dateStr === todayStr;

              return (
                <Pressable
                  key={day.dateStr}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.dayShort} ${day.dayNumber}`}
                  onPress={() => setSelectedDate(day.dateStr)}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                    !isSelected && isTodayDay && styles.dayPillTodayBorder,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayShortText,
                      isSelected ? styles.dayTextSelected : styles.dayShortTextNormal,
                    ]}
                  >
                    {day.dayShort}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected ? styles.dayTextSelected : styles.dayNumberTextNormal,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                  {isTodayDay && (
                    <View
                      style={[
                        styles.todayDot,
                        isSelected ? { backgroundColor: "#FFFFFF" } : { backgroundColor: C.blue },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selected Date Summary & Return Today Link */}
          <View style={styles.selectedDateBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedLabel}>Selected:</Text>
              <Text style={styles.selectedFullDate}>
                {getDetailedSelectedDateStr(selectedDate)}
              </Text>
            </View>

            {!isToday && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to Today"
                style={styles.calendarTodayBtn}
                onPress={() => setSelectedDate(todayStr)}
              >
                <Text style={styles.calendarTodayBtnText}>Go to Today</Text>
              </Pressable>
            )}
          </View>
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
                styles.filterPillTextWaiting,
                activeFilter === "confirmed" && { fontWeight: "800" },
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
                styles.filterPillTextDone,
                activeFilter === "completed" && { fontWeight: "800" },
              ]}
            >
              Done {counts.done > 0 ? `· ${counts.done}` : ""}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ──────────────── 4. APPOINTMENTS LIST ──────────────── */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
            Loading appointments...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => loadAppointments()}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollList}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAppointments(true)}
              tintColor={C.blue}
              colors={[C.blue]}
            />
          }
        >
          {filteredAppointments.length > 0 ? (
            <View style={{ gap: 12 }}>
              {filteredAppointments.map((apt) => {
                const isDone = apt.status === "completed";
                const isCancelled = apt.status === "cancelled" || apt.doctorDecision === "rejected";
                const isPending = apt.doctorDecision === "pending" && apt.status === "confirmed";
                const isWaiting = apt.status === "confirmed" && !isPending && !isCancelled;

                const accentColor = isPending
                  ? "#F59E0B"
                  : isWaiting
                    ? "#3B82F6"
                    : isDone
                      ? "#10B981"
                      : "#EF4444";

                return (
                  <Pressable
                    key={apt.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Appointment for ${apt.patientName}`}
                    onPress={() => setSelectedApt(apt)}
                    style={[styles.appointmentCard, { borderLeftColor: accentColor }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aptMetaText}>
                        {formatTime(apt.time)} · {apt.queueNumber}
                      </Text>
                      <Text style={styles.patientNameText}>
                        {apt.patientName}
                      </Text>
                      <Text style={styles.departmentText}>
                        {apt.department}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={[
                          styles.statusPill,
                          isPending && { backgroundColor: "#FEF3C7" },
                          isWaiting && styles.statusPillWaitingBg,
                          isDone && styles.statusPillDoneBg,
                          isCancelled && styles.statusPillCancelledBg,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillLabel,
                            isPending && { color: "#b45309", fontWeight: "700" },
                            isWaiting && { color: "#1d4ed8" },
                            isDone && { color: "#15803d" },
                            isCancelled && { color: "#dc2626" },
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
                      <View style={{ transform: [{ rotate: "180deg" }] }}>
                        <Icon name="back" color="#94a3b8" size={14} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="calendar" color={C.blue} size={30} />
              </View>
              <Text style={styles.emptyTitle}>No appointments scheduled</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter !== "all"
                  ? `There are no ${activeFilter === "confirmed" ? "waiting" : "completed"} appointments for this date.`
                  : "There are no appointments booked for this date."}
              </Text>
              {!isToday && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go to Today"
                  style={styles.returnTodayBtn}
                  onPress={() => setSelectedDate(todayStr)}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                    Go to Today
                  </Text>
                </Pressable>
              )}
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
          onPress={() => loadAppointments(true)}
        >
          <Icon name="calendar" color={C.blue} size={20} />
          <Text style={[styles.tabLabel, { color: C.blue, fontWeight: "700" }]}>
            Appointments
          </Text>
          <View style={styles.activeTabIndicator} />
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
          onPress={() => router.push("/doctor/profile")}
        >
          <Icon name="user" color={C.muted} size={20} />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>

      {/* ──────────────── 6. APPOINTMENT DETAILS & STATUS MODAL ──────────────── */}
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
                accessibilityRole="button"
                accessibilityLabel="Close"
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
                      selectedApt.status === "confirmed" && styles.statusPillWaitingBg,
                      selectedApt.status === "completed" && styles.statusPillDoneBg,
                      selectedApt.status === "cancelled" && styles.statusPillCancelledBg,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillLabel,
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
                            ? "Waiting"
                            : selectedApt.status === "completed"
                              ? "Completed"
                              : "Cancelled"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Permitted Status Actions */}
            {selectedApt && selectedApt.doctorDecision === "pending" && selectedApt.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.doneBtn, { backgroundColor: "#16a34a" }]}
                  disabled={actionBusy}
                  onPress={() => handleDecisionUpdate(selectedApt.id, "accepted")}
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
                  onPress={() => handleDecisionUpdate(selectedApt.id, "rejected")}
                >
                  <Text style={styles.cancelBtnText}>Reject Appointment</Text>
                </Pressable>
              </View>
            ) : selectedApt && selectedApt.doctorDecision === "rejected" ? (
              <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginTop: 8 }}>
                <Text style={{ color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                  ✕ This appointment request was rejected.
                </Text>
              </View>
            ) : selectedApt?.status === "confirmed" ? (
              <View style={{ gap: 10, marginTop: 8 }}>
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
                          <ActivityIndicator size="small" color="#fff" />
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
                  onPress={() => setConfirmCancelModal(true)}
                >
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.finalizedNotice}>
                <Text style={styles.finalizedNoticeText}>
                  {selectedApt?.status === "completed"
                    ? "✓ This appointment has been marked as Completed."
                    : "✕ This appointment has been Cancelled."}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={styles.closeModalBtn}
              onPress={() => setSelectedApt(null)}
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
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconCircle}>
              <Icon name="cross" color="#dc2626" size={24} />
            </View>
            <Text style={styles.confirmTitle}>Cancel appointment?</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to cancel the appointment for{" "}
              <Text style={{ fontWeight: "700" }}>{selectedApt?.patientName}</Text>?
              This action will update the clinic queue.
            </Text>

            <View style={{ gap: 8, marginTop: 16 }}>
              <Pressable
                accessibilityRole="button"
                style={styles.confirmDestructiveBtn}
                disabled={actionBusy}
                onPress={() => {
                  if (selectedApt) handleStatusUpdate(selectedApt.id, "cancelled");
                }}
              >
                {actionBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDestructiveBtnText}>
                    Yes, Cancel Appointment
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={styles.confirmKeepBtn}
                disabled={actionBusy}
                onPress={() => setConfirmCancelModal(false)}
              >
                <Text style={styles.confirmKeepBtnText}>Keep Appointment</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ──────────────── 8. DOCTOR PROFILE / LOGOUT MODAL ──────────────── */}
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
                <Icon name="user" color={C.blue} size={30} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#102e57", marginTop: 8 }}>
                {doctorProfile?.fullName || "Doctor"}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {doctorProfile?.specialty || "Medical Specialist"} · {doctorProfile?.slmcNo || ""}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {doctorProfile?.hospital || "CarePlus Hospital"}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: "#f0f4f9", marginVertical: 8 }} />

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
              style={[styles.closeModalBtn, { marginTop: 4 }]}
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  safeHeaderArea: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    color: C.blue,
    fontSize: 14,
    fontWeight: "600",
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  titleArea: {
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F2C59",
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  calendarContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 12,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F2C59",
  },
  weekStripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayPill: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillSelected: {
    backgroundColor: "#0F2C59",
    borderColor: "#0F2C59",
  },
  dayPillTodayBorder: {
    borderColor: C.blue,
  },
  dayShortText: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  dayShortTextNormal: {
    color: "#64748B",
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "800",
  },
  dayNumberTextNormal: {
    color: "#0F2C59",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  selectedDateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  selectedFullDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F2C59",
  },
  calendarTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  calendarTodayBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.blue,
  },

  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  filterPillAllActive: {
    backgroundColor: "#0F2C59",
  },
  filterPillInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillWaiting: {
    backgroundColor: "#FEF3C7",
  },
  filterPillWaitingActive: {
    borderWidth: 1.5,
    borderColor: "#D97706",
  },
  filterPillDone: {
    backgroundColor: "#DCFCE7",
  },
  filterPillDoneActive: {
    borderWidth: 1.5,
    borderColor: "#16A34A",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextAllActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterPillTextInactive: {
    color: "#64748B",
  },
  filterPillTextWaiting: {
    color: "#B45309",
  },
  filterPillTextDone: {
    color: "#15803D",
  },

  scrollList: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
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
    color: "#DC2626",
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

  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#E8F0F8",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F2C59",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  aptMetaText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2C59",
    marginTop: 3,
  },
  departmentText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillWaitingBg: {
    backgroundColor: "#FEF3C7",
  },
  statusPillDoneBg: {
    backgroundColor: "#DCFCE7",
  },
  statusPillCancelledBg: {
    backgroundColor: "#FEE2E2",
  },
  statusPillLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2C59",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  returnTodayBtn: {
    backgroundColor: C.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 18,
  },

  bottomTabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#64748B",
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F2C59",
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F2C59",
  },

  doneBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },
  finalizedNotice: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  finalizedNoticeText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  closeModalBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  confirmModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    marginHorizontal: 28,
    marginVertical: "auto",
    alignSelf: "center",
    width: "86%",
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2C59",
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  confirmDestructiveBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  confirmDestructiveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  confirmKeepBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  confirmKeepBtnText: {
    color: "#0F2C59",
    fontWeight: "600",
    fontSize: 13,
  },

  menuModalCard: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
