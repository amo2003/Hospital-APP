import { Redirect, Stack } from "expo-router";
import { useNurse } from "@/features/nurse/session";

export default function ProtectedNurseLayout() {
  const { nurse } = useNurse();
  return nurse ? <Stack screenOptions={{ headerShown: false }} /> : <Redirect href="/nurse/login" />;
}
