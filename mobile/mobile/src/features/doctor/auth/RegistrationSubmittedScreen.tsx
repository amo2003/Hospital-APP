import React from "react";
import { View } from '@/theme/primitives';
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/features/patient/i18n/LanguageProvider";
import {
  Button,
  C,
  CheckHero,
  Leaves,
  Notice,
  Row,
  Screen,
  s,
} from "@/features/patient/shared/ui";

export default function RegistrationSubmittedScreen() {
  const params = useLocalSearchParams<{
    doctorId?: string;
    fullName?: string;
    slmcNo?: string;
  }>();

  return (
    <Screen decoration={false}>
      <Leaves small />

      <CheckHero
        title="Registration Submitted!"
        subtitle="Your doctor application has been received"
      />

      <View
        style={[
          s.card,
          {
            padding: 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#ffe0b2",
            backgroundColor: "#fffdf9",
            marginVertical: 12,
          },
        ]}
      >
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: "#fff3e0",
            borderWidth: 1,
            borderColor: "#ffb74d",
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: "#e65100",
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            STATUS: PENDING APPROVAL
          </Text>
        </View>

        {params.doctorId && (
          <Row label="Doctor ID" value={params.doctorId} />
        )}
        {params.fullName && (
          <Row label="Full Name" value={params.fullName} />
        )}
        {params.slmcNo && (
          <Row label="SLMC Number" value={params.slmcNo} />
        )}
        <Row label="Review Department" value="CarePlus Medical Administration" />
      </View>

      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <Notice>
          Hospital administration will verify your SLMC registration number and
          credentials within 24 to 48 hours. Once approved, you will be able to
          log in to the Doctor Portal and manage your OPD queue.
        </Notice>
      </View>

      <View style={{ gap: 12, marginTop: 16 }}>
        <Button
          title="Go to Doctor Login"
          arrow
          onPress={() => router.replace("/doctor/login")}
        />
        <Button
          title="Back to Home"
          outline
          onPress={() => router.replace("/what-you-need")}
        />
      </View>
    </Screen>
  );
}
