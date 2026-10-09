import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Text, useLanguage } from "@/features/patient/i18n/LanguageProvider";
import {
  Button,
  C,
  ErrorMessage,
  Field,
  Header,
  Screen,
  Select,
  s,
} from "@/features/patient/shared/ui";
import { Icon } from "@/features/patient/shared/icons";
import DateField from "@/features/patient/shared/DateField";
import { LanguagePicker } from "@/features/patient/auth/LanguagePicker";
import {
  doctorApi,
  doctorMessageOf,
  type DoctorProfile,
} from "../shared/doctorApi";
import { DoctorStorage } from "../shared/doctorStorage";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "ENT (Ear, Nose, Throat)",
  "Gastroenterology",
  "General Medicine",
  "General OPD",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Surgery",
].map((s) => ({ label: s, value: s }));

const HOSPITALS = [
  "CarePlus Colombo Central",
  "CarePlus Kandy General",
  "CarePlus Galle Medical Centre",
  "National Hospital Sri Lanka",
  "Teaching Hospital Karapitiya",
  "Colombo South Teaching Hospital",
  "Other Hospital",
].map((h) => ({ label: h, value: h }));

export default function DoctorProfileScreen() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [data, setData] = useState<DoctorProfile | null>(null);
  const [tab, setTab] = useState<"Personal" | "Professional" | "Settings">(
    "Personal"
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password reset state
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Logout state
  const [confirmLogout, setConfirmLogout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");

      doctorApi
        .me()
        .then((res) => {
          if (active && res.doctor) {
            setProfile(res.doctor);
            setData(res.doctor);
          }
        })
        .catch((err) => {
          if (active) setError(doctorMessageOf(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const update = (key: keyof DoctorProfile, value: string) => {
    setData((old) => (old ? { ...old, [key]: value } : old));
  };

  async function handleSave() {
    if (!data) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload: Partial<DoctorProfile> = {
        fullName: data.fullName,
        dob: data.dob,
        gender: data.gender,
        nic: data.nic,
        phone: data.phone,
        email: data.email,
        slmcNo: data.slmcNo,
        specialty: data.specialty,
        qualifications: data.qualifications,
        experience: data.experience,
        hospital: data.hospital,
      };

      const res = await doctorApi.updateProfile(payload);
      setProfile(res.doctor);
      setData(res.doctor);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(doctorMessageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      await doctorApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setChangePasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      setPasswordError(doctorMessageOf(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await DoctorStorage.clearDoctorSession();
    } finally {
      setBusy(false);
      setConfirmLogout(false);
      router.replace("/doctor/login");
    }
  }

  const doctorInitials = (profile?.fullName || "DR")
    .replace(/^Dr\.\s*/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const footer = (
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
        onPress={() => router.replace("/doctor/appointments")}
      >
        <Icon name="calendar" color={C.muted} size={20} />
        <Text style={styles.tabLabel}>Appointments</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={styles.tabItem}
        onPress={() => router.replace("/doctor/notifications")}
      >
        <Icon name="bell" color={C.muted} size={20} />
        <Text style={styles.tabLabel}>Notifications</Text>
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.tabItem}>
        <Icon name="user" color={C.blue} size={20} />
        <Text style={[styles.tabLabel, { color: C.blue, fontWeight: "700" }]}>
          Profile
        </Text>
        <View style={styles.activeTabIndicator} />
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <View>
        <Header
          title="My Profile"
          back={() => router.replace("/doctor/dashboard")}
        />
        <Pressable
          accessibilityLabel="Profile settings"
          disabled={busy}
          onPress={() => setTab("Settings")}
          style={{ position: "absolute", right: -10, top: 26, padding: 6 }}
        >
          <Icon name="more" color="#222" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={C.blue} style={{ padding: 48 }} />
      ) : error && !profile ? (
        <View style={{ gap: 12 }}>
          <ErrorMessage message={error} />
          <Button
            title="Retry"
            outline
            onPress={() => router.replace("/doctor/profile")}
          />
        </View>
      ) : profile && data ? (
        <>
          {/* Top Profile Summary Card */}
          <View style={[s.row, { marginBottom: 25, alignItems: "center" }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{doctorInitials || "DR"}</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text
                translate={false}
                style={{ color: "#26313a", fontSize: 17, fontWeight: "700" }}
              >
                {editing ? data.fullName : profile.fullName}
              </Text>
              <Text style={[s.body, { fontSize: 11, marginTop: 2 }]}>
                Doctor ID: {profile.doctorId}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                SLMC: {profile.slmcNo}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Edit Profile")}
                disabled={busy || editing}
                onPress={() => {
                  setData(profile);
                  setError("");
                  setSuccess("");
                  setEditing(true);
                  if (tab === "Settings") setTab("Personal");
                }}
                style={[
                  styles.editProfileBtn,
                  editing && { opacity: 0.6 },
                ]}
              >
                <Icon name="edit" color="#fff" size={15} />
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  Edit Profile
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Segmented Pill Tabs */}
          <View style={[s.row, { marginBottom: 20 }]}>
            {(["Personal", "Professional", "Settings"] as const).map(
              (label) => (
                <Pressable
                  key={label}
                  disabled={busy}
                  onPress={() => {
                    setTab(label);
                    setError("");
                    setSuccess("");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 22,
                    backgroundColor: tab === label ? C.blue : "transparent",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: tab === label ? "700" : "500",
                      color: tab === label ? "#fff" : "#50555b",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* Tab 1: Personal Details */}
          {tab === "Personal" ? (
            <View>
              <Field
                label="Full Name"
                value={data.fullName}
                editable={editing && !busy}
                maxLength={100}
                onChangeText={(v) => update("fullName", v)}
              />

              <DateField
                label="Date of Birth"
                value={data.dob}
                editable={editing && !busy}
                onChange={(v) => update("dob", v)}
              />

              {editing ? (
                <Select
                  label="Gender"
                  value={data.gender}
                  placeholder="Select gender"
                  options={["Male", "Female", "Other"].map((v) => ({
                    value: v,
                    label: v,
                  }))}
                  onChange={(v) => update("gender", v)}
                />
              ) : (
                <Field label="Gender" value={data.gender} editable={false} />
              )}

              <Field
                label="NIC / Passport No"
                value={data.nic}
                editable={editing && !busy}
                maxLength={12}
                autoCapitalize="characters"
                onChangeText={(v) => update("nic", v)}
              />

              <Field
                label="Email"
                value={data.email}
                editable={editing && !busy}
                maxLength={254}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(v) => update("email", v)}
              />

              <Field
                label="Phone Number"
                value={data.phone}
                editable={editing && !busy}
                maxLength={25}
                keyboardType="phone-pad"
                onChangeText={(v) => update("phone", v)}
              />

              <ErrorMessage message={error} />
              {!!success && (
                <Text style={{ color: "#168245", marginBottom: 15, fontWeight: "600" }}>
                  {success}
                </Text>
              )}

              {editing && (
                <View style={{ gap: 10, marginTop: 10, marginBottom: 20 }}>
                  <Button
                    title="Save Changes"
                    loading={busy}
                    onPress={handleSave}
                  />
                  <Button
                    title="Cancel edits"
                    outline
                    disabled={busy}
                    onPress={() => {
                      setData(profile);
                      setEditing(false);
                      setError("");
                      setSuccess("");
                    }}
                  />
                </View>
              )}
            </View>
          ) : tab === "Professional" ? (
            /* Tab 2: Professional Details */
            <View>
              <Field
                label="SLMC Registration Number"
                value={data.slmcNo}
                editable={editing && !busy}
                autoCapitalize="characters"
                onChangeText={(v) => update("slmcNo", v)}
              />

              {editing ? (
                <Select
                  label="Medical Specialty"
                  value={data.specialty}
                  placeholder="Select specialty"
                  options={SPECIALTIES}
                  onChange={(v) => update("specialty", v)}
                />
              ) : (
                <Field
                  label="Medical Specialty"
                  value={data.specialty}
                  editable={false}
                />
              )}

              <Field
                label="Qualifications (Degrees / Certifications)"
                value={data.qualifications}
                editable={editing && !busy}
                maxLength={200}
                onChangeText={(v) => update("qualifications", v)}
              />

              <Field
                label="Experience (Years / Background)"
                value={String(data.experience || "")}
                editable={editing && !busy}
                maxLength={50}
                onChangeText={(v) => update("experience", v)}
              />

              {editing ? (
                <Select
                  label="Hospital / Clinic"
                  value={data.hospital}
                  placeholder="Select hospital"
                  options={HOSPITALS}
                  onChange={(v) => update("hospital", v)}
                />
              ) : (
                <Field
                  label="Hospital / Clinic"
                  value={data.hospital}
                  editable={false}
                />
              )}

              <Field
                label="Account Status"
                value={profile.status === "approved" ? "Approved & Active" : profile.status}
                editable={false}
              />

              <ErrorMessage message={error} />
              {!!success && (
                <Text style={{ color: "#168245", marginBottom: 15, fontWeight: "600" }}>
                  {success}
                </Text>
              )}

              {editing && (
                <View style={{ gap: 10, marginTop: 10, marginBottom: 20 }}>
                  <Button
                    title="Save Changes"
                    loading={busy}
                    onPress={handleSave}
                  />
                  <Button
                    title="Cancel edits"
                    outline
                    disabled={busy}
                    onPress={() => {
                      setData(profile);
                      setEditing(false);
                      setError("");
                      setSuccess("");
                    }}
                  />
                </View>
              )}
            </View>
          ) : (
            /* Tab 3: Settings */
            <View style={{ gap: 18 }}>
              <Text style={s.title}>Account Settings</Text>

              <View style={[s.card, { padding: 16 }]}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.navy, marginBottom: 4 }}>
                  Password & Security
                </Text>
                <Text style={[s.body, { fontSize: 12, marginBottom: 14 }]}>
                  Keep your account secure by using a strong password.
                </Text>
                <Button
                  title="Reset / Change Password"
                  outline
                  onPress={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                    setPasswordSuccess("");
                    setChangePasswordModal(true);
                  }}
                />
              </View>

              <View style={[s.card, { padding: 16 }]}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.navy, marginBottom: 6 }}>
                  Language Preference
                </Text>
                <LanguagePicker />
              </View>

              <View style={[s.card, { padding: 16, borderColor: "#ffcdd2" }]}>
                <Text
                  style={{ color: "#b32c3a", fontWeight: "700", fontSize: 15, marginBottom: 6 }}
                >
                  Doctor Session
                </Text>
                <Text style={[s.body, { fontSize: 12, marginBottom: 14 }]}>
                  Log out of this device. You will need your SLMC No, Email, or Phone to sign in again.
                </Text>
                <Button
                  title="Log Out of Doctor Portal"
                  onPress={() => setConfirmLogout(true)}
                  style={{ backgroundColor: "#d32f2f" }}
                />
              </View>
            </View>
          )}

          {/* Change Password Modal */}
          <Modal
            visible={changePasswordModal}
            transparent
            animationType="slide"
            onRequestClose={() => !passwordBusy && setChangePasswordModal(false)}
          >
            <View style={s.overlay}>
              <View style={s.modal}>
                <Text style={s.title}>Change Password</Text>
                <Text style={[s.body, { marginVertical: 12, fontSize: 12 }]}>
                  Enter your current password and a new secure password (minimum 8 characters).
                </Text>

                <Field
                  label="Current Password"
                  password
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />

                <Field
                  label="New Password"
                  password
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                <Field
                  label="Confirm New Password"
                  password
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <ErrorMessage message={passwordError} />
                {!!passwordSuccess && (
                  <Text style={{ color: "#168245", marginVertical: 8, fontWeight: "600" }}>
                    {passwordSuccess}
                  </Text>
                )}

                <View style={{ marginTop: 12, gap: 10 }}>
                  <Button
                    title="Update Password"
                    loading={passwordBusy}
                    onPress={handleChangePassword}
                  />
                  <Button
                    title="Cancel"
                    outline
                    disabled={passwordBusy}
                    onPress={() => setChangePasswordModal(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>

          {/* Confirm Logout Modal */}
          <Modal
            visible={confirmLogout}
            transparent
            animationType="fade"
            onRequestClose={() => !busy && setConfirmLogout(false)}
          >
            <View style={s.overlay}>
              <View style={s.modal}>
                <Text style={s.title}>Log out of CarePlus?</Text>
                <Text style={[s.body, { marginVertical: 16 }]}>
                  Are you sure you want to end your current session on this device?
                </Text>
                <View style={{ gap: 10 }}>
                  <Button
                    title="Log Out"
                    loading={busy}
                    onPress={handleLogout}
                    style={{ backgroundColor: "#d32f2f" }}
                  />
                  <Button
                    title="Cancel"
                    outline
                    disabled={busy}
                    onPress={() => setConfirmLogout(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#07345e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  editProfileBtn: {
    flexDirection: "row",
    backgroundColor: "#073049",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  bottomTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5edf5",
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -6,
    width: 18,
    height: 3,
    backgroundColor: C.blue,
    borderRadius: 2,
  },
});
