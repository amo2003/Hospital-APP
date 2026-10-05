import { Text } from "../i18n/LanguageProvider";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
import { LanguagePicker } from "../auth/LanguagePicker";
export default function ProfileScreen() {
  const { patient, setPatient, signOut } = usePatient();
  const [data, setData] = useState(patient!);
  const [tab, setTab] = useState("Personal");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const update = (key: string, value: string) =>
    setData((old) => ({ ...old, [key]: value }));
  async function save() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const { fullName, nic, gender, phone, email, address, district } = data;
      const result = await api.updateProfile({
        fullName,
        nic,
        gender,
        phone,
        email,
        address,
        district,
        dateOfBirth: parseBirthDate(data.dateOfBirth),
      });
      setPatient(result);
      setData(result);
      setEditing(false);
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
          onPress={() => setTab("Settings")}
          style={{ position: "absolute", right: -10, top: 26 }}
        >
          <Icon name="more" color="#222" />
        </Pressable>
      </View>
      <View style={[s.row, { marginBottom: 27 }]}>
        <LinearGradient
          colors={["#116eb1", "#03263b"]}
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="user" size={36} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#26313a", fontSize: 17, fontWeight: "700" }}>
            {patient?.fullName}
          </Text>
          <Text style={[s.body, { fontSize: 11, marginTop: 2 }]}>
            Patient ID: {patient?.patientId}
          </Text>
          <Pressable
            onPress={() => {
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
          <Field
            label="Full Name"
            value={data.fullName}
            editable={editing}
            onChangeText={(v) => update("fullName", v)}
          />
          <DateField
            label="Date of Birth"
            value={data.dateOfBirth}
            editable={editing}
            onChange={(v) => update("dateOfBirth", v)}
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
            editable={editing}
            onChangeText={(v) => update("nic", v)}
          />
          <Field
            label="Email"
            value={data.email}
            editable={editing}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(v) => update("email", v)}
          />
          <Field
            label="Phone Number"
            value={data.phone}
            editable={editing}
            keyboardType="phone-pad"
            onChangeText={(v) => update("phone", v)}
          />
          <Field
            label="Home Address"
            value={data.address}
            editable={editing}
            onChangeText={(v) => update("address", v)}
          />
          {editing ? (
            <Select
              label="District / City"
              value={data.district}
              placeholder="Select district"
              options={districts.map((v) => ({ value: v, label: v }))}
              onChange={(v) => update("district", v)}
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
            disabled={!editing}
            loading={busy}
            onPress={save}
          />
          {editing && (
            <Button
              title="Cancel edits"
              outline
              onPress={() => {
                setData(patient!);
                setEditing(false);
                setError("");
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
          <LanguagePicker />
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
