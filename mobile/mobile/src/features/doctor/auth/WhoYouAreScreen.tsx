import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import { Button, C, Leaves, s, Wave } from "@/features/patient/shared/ui";
import { HeartMark } from "@/features/patient/shared/icons";

export default function WhoYouAreScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Wave top pale />
      <Wave pale />
      <Leaves />
      <View style={{ flex: 1, justifyContent: "center", paddingBottom: 36 }}>
        <Text
          style={[
            s.title,
            { fontSize: 28, textAlign: "center", marginBottom: 46 },
          ]}
        >
          Who You Are?
        </Text>
        <View style={{ alignSelf: "center", width: "60%" }}>
          <View
            pointerEvents="none"
            style={{ position: "absolute", alignSelf: "center", top: -20 }}
          >
            <HeartMark size={320} opacity={0.2} />
          </View>
          <Button
            title="Doctor"
            arrow
            onPress={() => router.push("/doctor/login")}
          />
          <Text
            style={{
              color: C.blue,
              textAlign: "center",
              fontWeight: "700",
              marginVertical: 31,
            }}
          >
            OR
          </Text>
          <Button
            title="Nurse"
            arrow
            onPress={() => router.push("/nurse/login" as any)}
          />
          <Pressable
            onPress={() => router.replace("/what-you-need")}
            style={s.centerLink}
          >
            <Text style={s.link}>Change selected option</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
