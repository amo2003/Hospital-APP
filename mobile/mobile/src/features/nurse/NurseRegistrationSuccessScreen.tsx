import { Text } from "../patient/i18n/LanguageProvider";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, Row, Screen, s } from "../patient/shared/ui";
import { Icon } from "../patient/shared/icons";
import { LanguagePicker } from "../patient/auth/LanguagePicker";

export default function NurseRegistrationSuccessScreen() {
  const { nurseId = "", name = "", department = "", username = "" } = useLocalSearchParams<{ nurseId: string; name: string; department: string; username: string }>();
  return (
    <Screen footer={<LanguagePicker />}>
      <LinearGradient colors={["#07345e", "#102e57"]} style={{ marginHorizontal: -24, marginTop: -25, marginBottom: 17, paddingHorizontal: 24, paddingTop: 53, paddingBottom: 47, alignItems: "center", borderBottomLeftRadius: 44, borderBottomRightRadius: 44 }}>
        <Pressable accessibilityLabel="Back" onPress={() => router.replace("/nurse/login")} style={{ position: "absolute", left: 18, top: 28, width: 34, height: 34, borderRadius: 18, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color="#fff" /></Pressable>
        <LinearGradient colors={["#1477bd", "#064071"]} style={{ width: 92, height: 92, borderRadius: 48, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon name="check" size={48} color="#fff" /></LinearGradient>
        <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700", textAlign: "center", maxWidth: 290 }}>Nurse Account Created Successfully!</Text>
      </LinearGradient>
      <View style={[s.card, { borderWidth: 0, marginTop: -34, marginBottom: 19, padding: 17, borderRadius: 20 }]}>
        <Text style={[s.title, { fontSize: 15, marginBottom: 8 }]}>Nurse Login & Access Details</Text>
        <Row label="Nurse ID" value={String(nurseId)} />
        <Row label="Name" value={String(name)} />
        <Row label="Department" value={String(department)} />
        <Row label="Username" value={String(username)} />
        <View style={[s.row, { justifyContent: "space-between", paddingTop: 9 }]}><Text style={[s.body, { fontSize: 12 }]}>Status</Text><Text style={{ color: "#168245", backgroundColor: "#e1f5e9", fontSize: 10, fontWeight: "700", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12 }}>Active</Text></View>
      </View>
      <Text style={[s.title, { fontSize: 16, marginBottom: 10 }]}>What can you do next?</Text>
      {["Sign in to your account", "View your assigned queue", "Access and update patient records"].map((item) => <View key={item} style={[s.row, { gap: 10, marginVertical: 4 }]}><Icon name="check" size={17} /><Text style={{ color: C.navy, fontSize: 12 }}>{item}</Text></View>)}
      <View style={{ height: 17 }} />
      <Button title="Go to Login" arrow onPress={() => router.replace("/nurse/login")} />
      <View style={{ height: 10 }} />
      <Button title="Back to Home" outline onPress={() => router.replace("/what-you-need")} />
      <Text style={{ textAlign: "center", color: C.muted, fontSize: 10, marginTop: 14 }}>Keep your Nurse ID safe for future sign-ins.</Text>
    </Screen>
  );
}
