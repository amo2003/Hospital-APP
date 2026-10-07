import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { PatientProvider } from "@/features/patient/shared/session";
import { LanguageProvider } from "@/features/patient/i18n/LanguageProvider";
import { NurseProvider } from "@/features/nurse/session";
SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <LanguageProvider>
      <PatientProvider>
       <NurseProvider>
        <View
          style={{ flex: 1, backgroundColor: "#e1ecf5", alignItems: "center" }}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: Platform.OS === "web" ? 440 : undefined,
              overflow: "hidden",
            }}
          >
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#f2f9ff" },
                animation: "slide_from_right",
              }}
            />
          </View>
        </View>
        </NurseProvider>
            </PatientProvider>
    </LanguageProvider>
  );
}
