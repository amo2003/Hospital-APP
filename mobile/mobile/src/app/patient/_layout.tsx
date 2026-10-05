import { Redirect, Stack } from "expo-router";
import { usePatient } from "@/features/patient/shared/session";
export default function PatientLayout() {
  const { patient } = usePatient();
  return patient ? (
    <Stack screenOptions={{ headerShown: false }} />
  ) : (
    <Redirect href="/login" />
  );
}
