import { ThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
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
  return <ThemeProvider><RootContent /></ThemeProvider>;
}
function RootContent() {
  const { mode, colors, ready } = useAppTheme();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <LanguageProvider>
      <PatientProvider>
       <NurseProvider>
        <View
          style={{ flex: 1, backgroundColor: colors.canvas, alignItems: "center" }}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: Platform.OS === "web" ? 440 : undefined,
              overflow: "hidden",
            }}
          >
            <StatusBar style={mode === "dark" ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
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
