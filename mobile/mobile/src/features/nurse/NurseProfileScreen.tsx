import ThemeSelector from "@/theme/ThemeSelector";
import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal } from 'react-native';
import { Pressable, View, LinearGradient } from '@/theme/primitives';
import { router, useFocusEffect } from "expo-router";
import { Storage } from "@/utils/storage";
import { Button, C, ErrorMessage, Field, Screen, Select, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { nurseApi, nurseMessageOf } from "./api";
import { useNurse } from "./session";
import type { Nurse } from "./types";
import { NurseTabs } from "./NurseShared";

const departments = ["General OPD", "General Medicine", "Cardiology", "Dermatology", "Paediatrics", "Emergency", "Surgical Ward"];
export default function NurseProfileScreen() {
  const { t } = useLanguage();
  const { setNurse, signOut } = useNurse();
  const [profile, setProfile] = useState<Nurse | null>(null);
  const [draft, setDraft] = useState<Nurse | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError("");
    nurseApi.profile().then((value) => { if (active) { setProfile(value); setDraft(value); setNurse(value); } })
      .catch((e) => { if (active) setError(nurseMessageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry, setNurse]));
  const update = (key: keyof Nurse, value: string) => setDraft((old) => old ? { ...old, [key]: value } : old);

  async function save() {
    if (!draft) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const saved = await nurseApi.updateProfile({ fullName: draft.fullName, phone: draft.phone, department: draft.department, ward: draft.ward });
      setProfile(saved); setDraft(saved); setNurse(saved); setEditing(false); setSuccess("Your nurse profile has been updated.");
    } catch (e) { setError(nurseMessageOf(e)); }
    finally { setBusy(false); }
  }
  async function deactivate() {
    setBusy(true); setError("");
    try {
      await nurseApi.deactivate();
      await Storage.clearNurseSession();
      setNurse(null); setConfirmDeactivate(false); router.replace("/nurse/login");
    } catch (e) { setError(nurseMessageOf(e)); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try {
      await signOut();
    } catch {
      // signOut always clears the local nurse session, even if the API is unreachable.
    } finally {
      setBusy(false);
      setConfirmLogout(false);
      router.replace("/nurse/login");
    }
  }

  return <Screen footer={<NurseTabs active="profile" />}>
    {loading ? <ActivityIndicator color={C.blue} style={{ padding: 55 }} /> : error && !profile ? <><ErrorMessage message={error} /><Button title="Retry" outline onPress={() => setRetry((n) => n + 1)} /></> : profile && draft ? <>
      <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 17, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 51, borderBottomLeftRadius: 42, borderBottomRightRadius: 42, alignItems: "center" }}>
        <View style={[s.row, { width: "100%", justifyContent: "space-between", marginBottom: 11 }]}><Pressable accessibilityLabel={t("Back to dashboard")} onPress={() => router.replace("/nurse/dashboard")} style={{ width: 36, height: 36, borderRadius: 19, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>My Profile</Text><View style={{ width: 36 }} /></View>
        <LinearGradient colors={["#1477bd", "#064071"]} style={{ width: 78, height: 78, borderRadius: 41, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", marginBottom: 9 }}><Text style={{ color: "#fff", fontSize: 23, fontWeight: "700" }}>{profile.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</Text></LinearGradient>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }} translate={false}>{profile.fullName}</Text>
        <Text style={{ color: "#d5e7f6", fontSize: 11, marginTop: 4 }}>Nurse ID: {profile.nurseId}</Text>
        <Text style={{ color: "#168245", backgroundColor: "#e1f5e9", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, fontSize: 9, fontWeight: "700", marginTop: 7 }}>● {profile.status === "active" ? "Active" : "Inactive"}</Text>
      </LinearGradient>
      <ThemeSelector />
      {!editing ? <>
        <Text style={[s.title, { fontSize: 16, marginBottom: 9 }]}>Account Information</Text>
        <View style={[s.card, { padding: 10, borderWidth: 0, borderRadius: 17 }]}>
          <ProfileRow icon="user" label="Full Name" value={profile.fullName} />
          <ProfileRow icon="id" label="Nurse / Staff ID" value={profile.nurseId} />
          <ProfileRow icon="mail" label="Email Address" value={profile.email} />
          <ProfileRow icon="phone" label="Phone Number" value={profile.phone} />
          <ProfileRow icon="pin" label="Department / Ward" value={profile.ward || profile.department} />
          <ProfileRow icon="user" label="Username" value={profile.username} last />
        </View>
        {success ? <Text style={{ color: "#168245", fontSize: 10, textAlign: "center", marginTop: 8 }}>{success}</Text> : null}
        <Button title="Edit Profile" onPress={() => { setEditing(true); setError(""); setSuccess(""); }} style={{ marginTop: 14 }} />
      </> : <>
        <Text style={[s.title, { fontSize: 16, marginBottom: 9 }]}>Edit Profile</Text>
        <View style={[s.card, { borderWidth: 0, padding: 16 }]}>
          <Field label="Full Name" icon="user" value={draft.fullName} onChangeText={(v) => update("fullName", v)} />
          <Field label="Phone Number" icon="phone" value={draft.phone} keyboardType="phone-pad" onChangeText={(v) => update("phone", v)} />
          <Select label="Department / Ward" icon="pin" value={draft.department} placeholder="Select department" options={departments.map((value) => ({ value, label: value }))} onChange={(v) => { update("department", v); update("ward", v); }} />
          <Text style={[s.body, { fontSize: 10, marginTop: -9, marginBottom: 14 }]}>Nurse ID and email are protected identity fields.</Text>
          <ErrorMessage message={error} />
          {success ? <Text style={{ color: "#168245", fontSize: 11, marginBottom: 10 }}>{success}</Text> : null}
          <Button title="Save Changes" loading={busy} onPress={save} />
          <Button title="Cancel" outline disabled={busy} onPress={() => { setDraft(profile); setEditing(false); setError(""); }} style={{ marginTop: 10 }} />
        </View>
      </>}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => setConfirmLogout(true)}
        style={{ minHeight: 49, marginTop: 14, marginBottom: 2, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: busy ? 0.55 : 1 }}
      >
        <Icon name="logout" size={19} />
        <Text style={{ color: C.navy, fontSize: 14, fontWeight: "700" }}>Log Out</Text>
      </Pressable>
      <View style={[s.card, { marginTop: 18, marginBottom: 8, padding: 15, borderColor: "#f0d9da", borderRadius: 16 }]}>
        <Text style={{ color: "#a83a43", fontSize: 13, fontWeight: "700", marginBottom: 5 }}>Deactivate Account</Text>
        <Text style={[s.body, { fontSize: 11, marginBottom: 11 }]}>Deactivate and sign out. Your information will be retained.</Text>
        <Pressable accessibilityRole="button" onPress={() => setConfirmDeactivate(true)} style={{ alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5b9bc", borderRadius: 11 }}><Text style={{ color: "#a83a43", fontSize: 10, fontWeight: "700" }}>Deactivate Account</Text></Pressable>
      </View>
    </> : null}
    <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => !busy && setConfirmLogout(false)}>
      <View style={s.overlay}><View style={s.modal}>
        <Text style={s.title}>Log Out</Text>
        <Text style={[s.body, { marginVertical: 16 }]}>Are you sure you want to log out?</Text>
        <Button title="Cancel" outline disabled={busy} onPress={() => setConfirmLogout(false)} />
        <Button title="Log Out" loading={busy} onPress={logout} style={{ marginTop: 10 }} />
      </View></View>
    </Modal>
    <Modal visible={confirmDeactivate} transparent animationType="fade" onRequestClose={() => !busy && setConfirmDeactivate(false)}>
      <View style={s.overlay}><View style={s.modal}>
        <Text style={s.title}>Deactivate your account?</Text>
        <Text style={[s.body, { marginVertical: 16 }]}>You will be signed out immediately. Your profile data will be retained, but you will not be able to log in while the account is inactive.</Text>
        <ErrorMessage message={error} />
        <Button title="Confirm Deactivation" loading={busy} onPress={deactivate} />
        <Button title="Keep My Account" outline disabled={busy} onPress={() => setConfirmDeactivate(false)} style={{ marginTop: 10 }} />
      </View></View>
    </Modal>
  </Screen>;
}

function ProfileRow({ icon, label, value, last = false }: { icon: "user" | "id" | "mail" | "phone" | "pin"; label: string; value: string; last?: boolean }) {
  return <View style={[s.row, { paddingHorizontal: 9, paddingVertical: 12, gap: 11, borderBottomWidth: last ? 0 : 1, borderColor: "#edf3f8" }]}><View style={[s.iconTile, { width: 36, height: 36, borderRadius: 11 }]}><Icon name={icon} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 9 }}>{label}</Text><Text style={{ color: C.navy, fontSize: 12, fontWeight: "600", marginTop: 3 }} translate={label === "Department / Ward"}>{value}</Text></View></View>;
}
