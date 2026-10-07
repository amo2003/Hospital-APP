import {
  filterName,
  filterNic,
  personalErrors,
  normalizePhone,
  type RegistrationErrors,
} from "../auth/validation";
import { Text, useLanguage } from "../i18n/LanguageProvider";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Storage } from "@/utils/storage";
import { api, messageOf } from "../shared/api";
import { usePatient } from "../shared/session";
import {
  BottomTabs,
  Button,
  C,
  ErrorMessage,
  Field,
  Header,
  Notice,
  Screen,
  Select,
  s,
} from "../shared/ui";
import { Icon } from "../shared/icons";
import { districts, parseBirthDate } from "../auth/RegisterScreen";
import DateField from "../shared/DateField";
import ProfilePhotoPicker, { PatientAvatar } from "./ProfilePhotoPicker";
import type { Patient } from "../shared/types";
export default function ProfileScreen() {
  const { patient } = usePatient();
  return patient ? (
    <PatientProfileScreen key={patient.id} />
  ) : (
    <Redirect href="/login" />
  );
}
function PatientProfileScreen() {
  const { t } = useLanguage();
  const { patient, setPatient, signOut } = usePatient();
  const [data, setData] = useState(patient!);
  const [tab, setTab] = useState("Personal");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegistrationErrors, boolean>>
  >({});
  const errors = personalErrors(data);
  const fieldError = (key: keyof RegistrationErrors) =>
    editing && (submitted || touched[key]) ? errors[key] : undefined;
  const validation = (key: keyof RegistrationErrors) => ({
    error: fieldError(key),
    onBlur: () => setTouched((old) => ({ ...old, [key]: true })),
  });
  const update = <K extends keyof Patient>(key: K, value: Patient[K]) => {
    setData((old) => ({ ...old, [key]: value }));
    setError("");
    setSuccess("");
  };
  async function save() {
    setError("");
    setSuccess("");
    if (busy || photoBusy || !editing) return;
    setSubmitted(true);
    if (Object.keys(errors).length) {
      setError("Please check the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const { fullName, nic, gender, phone, email, address, district } = data;
      const result = await api.updateProfile({
        fullName: fullName.trim(),
        nic: nic.trim().toUpperCase(),
        gender,
        phone: normalizePhone(phone),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        district,
        dateOfBirth: parseBirthDate(data.dateOfBirth),
        ...(data.profileImage !== patient?.profileImage
          ? { profileImage: data.profileImage || null }
          : {}),
      });
      setPatient(result);
      setData(result);
      setEditing(false);
      setSubmitted(false);
      setTouched({});
      setSuccess("Your profile has been updated.");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount(password);
      await Storage.clearAll();
      setPatient(null);
      router.replace("/login");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await signOut();
    } catch {
      /* Local credentials are cleared even if the server is unavailable. */
    } finally {
      setBusy(false);
      router.replace("/login");
    }
  }
  return (
    <Screen footer={<BottomTabs active="profile" />}>
      <View>
        <Header
          title="My Profile"
          back={() => router.replace("/patient/home")}
        />
        <Pressable
          accessibilityLabel="Profile settings"
          disabled={busy || photoBusy}
          onPress={() => setTab("Settings")}
          style={{ position: "absolute", right: -10, top: 26 }}
        >
          <Icon name="more" color="#222" />
        </Pressable>
      </View>
      <View style={[s.row, { marginBottom: 27 }]}>
        <PatientAvatar
          uri={editing ? data.profileImage : patient?.profileImage}
        />
        <View style={{ flex: 1 }}>
          <Text
            translate={false}
            style={{ color: "#26313a", fontSize: 17, fontWeight: "700" }}
          >
            {patient?.fullName}
          </Text>
          <Text style={[s.body, { fontSize: 11, marginTop: 2 }]}>
            Patient ID: {patient?.patientId}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Edit Profile")}
            disabled={busy || photoBusy || editing}
            onPress={() => {
              setData(patient!);
              setSubmitted(false);
              setTouched({});
              setError("");
              setSuccess("");
              setEditing(true);
              setTab("Personal");
            }}
            style={{
              flexDirection: "row",
              backgroundColor: "#073049",
              padding: 9,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              marginTop: 8,
            }}
          >
            <Icon name="edit" color="#fff" size={17} />
            <Text style={{ color: "#fff", fontSize: 12 }}>Edit Profile</Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.row, { marginBottom: 20 }]}>
        {["Personal", "Medical", "Settings"].map((label) => (
          <Pressable
            key={label}
            disabled={busy || photoBusy}
            onPress={() => setTab(label)}
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
                color: tab === label ? "#fff" : "#50555b",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "Personal" ? (
        <>
          {editing && (
            <ProfilePhotoPicker
              value={data.profileImage}
              onChange={(value) => update("profileImage", value)}
              disabled={busy}
              onBusyChange={setPhotoBusy}
            />
          )}
          <Field
            label="Full Name"
            value={data.fullName}
            editable={editing && !busy}
            {...validation("fullName")}
            maxLength={100}
            onChangeText={(v) => update("fullName", filterName(v))}
          />
          <DateField
            label="Date of Birth"
            value={data.dateOfBirth}
            editable={editing && !busy}
            error={fieldError("dateOfBirth")}
            onChange={(v) => {
              update("dateOfBirth", v);
              setTouched((old) => ({ ...old, dateOfBirth: true }));
            }}
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
              error={fieldError("gender")}
              onChange={(v) => {
                if (!busy) update("gender", v as Patient["gender"]);
              }}
            />
          ) : (
            <Field label="Gender" value={data.gender} editable={false} />
          )}
          <Field
            label="NIC / Passport No"
            value={data.nic}
            editable={editing && !busy}
            {...validation("nic")}
            maxLength={12}
            autoCapitalize="characters"
            onChangeText={(v) => update("nic", filterNic(v))}
          />
          <Field
            label="Email"
            value={data.email}
            editable={editing && !busy}
            {...validation("email")}
            maxLength={254}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(v) => update("email", v)}
          />
          <Field
            label="Phone Number"
            value={data.phone}
            editable={editing && !busy}
            {...validation("phone")}
            maxLength={25}
            keyboardType="phone-pad"
            onChangeText={(v) => update("phone", v)}
          />
          <Field
            label="Home Address"
            value={data.address}
            editable={editing && !busy}
            {...validation("address")}
            maxLength={300}
            onChangeText={(v) => update("address", v)}
          />
          {editing ? (
            <Select
              label="District / City"
              value={data.district}
              placeholder="Select district"
              options={districts.map((v) => ({ value: v, label: v }))}
              error={fieldError("district")}
              onChange={(v) => {
                if (!busy) update("district", v);
              }}
            />
          ) : (
            <Field
              label="District / City"
              value={data.district}
              editable={false}
            />
          )}
          <ErrorMessage message={error} />
          {!!success && (
            <Text style={{ color: "#168245", marginBottom: 15 }}>
              {success}
            </Text>
          )}
          <Button
            title="Save Changes"
            disabled={!editing || photoBusy}
            loading={busy}
            onPress={save}
          />
          {editing && (
            <Button
              title="Cancel edits"
              outline
              disabled={busy || photoBusy}
              onPress={() => {
                setData(patient!);
                setEditing(false);
                setError("");
                setSuccess("");
                setSubmitted(false);
                setTouched({});
              }}
              style={{ marginTop: 10 }}
            />
          )}
        </>
      ) : tab === "Medical" ? (
        <Notice>
          Your medical records will be available when the hospital medical
          records service is connected.
        </Notice>
      ) : (
        <View style={{ gap: 15 }}>
          <Text style={s.title}>Language</Text>
          <Button
            title="Reset Password"
            outline
            onPress={() => router.push("/forgot-password")}
          />
          <Button title="Log Out" loading={busy} onPress={logout} />
          <View style={[s.card, { marginTop: 16 }]}>
            <Text
              style={{ color: "#b32c3a", fontWeight: "700", marginBottom: 8 }}
            >
              Delete Account
            </Text>
            <Text style={[s.body, { marginBottom: 18 }]}>
              Permanently delete your patient account and appointments. Your
              selected patient option will stay saved on this device.
            </Text>
            <Button
              title="Delete My Account"
              outline
              onPress={() => {
                setDeleting(true);
                setError("");
                setPassword("");
              }}
            />
          </View>
        </View>
      )}
      <Modal
        visible={deleting}
        transparent
        onRequestClose={() => !busy && setDeleting(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Delete your account?</Text>
            <Text style={[s.body, { marginVertical: 18 }]}>
              This permanently removes your account and appointments. Enter your
              password to confirm.
            </Text>
            <Field
              label="Password"
              password
              value={password}
              onChangeText={setPassword}
            />
            <ErrorMessage message={error} />
            <Button
              title="Permanently Delete Account"
              disabled={!password}
              loading={busy}
              onPress={remove}
            />
            <Button
              title="Keep My Account"
              outline
              disabled={busy}
              onPress={() => setDeleting(false)}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
