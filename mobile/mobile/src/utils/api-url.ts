import Constants from "expo-constants";
import { Platform } from "react-native";
import { resolveApiUrl } from "./resolve-api-url";

export const apiBaseUrl = resolveApiUrl({
  configured: process.env.EXPO_PUBLIC_API_URL,
  development: __DEV__,
  metroHost: Constants.expoConfig?.hostUri,
  browserHost: Platform.OS === "web" && typeof window !== "undefined" ? window.location.hostname : undefined,
});
