import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from 'react-native';

export type UserPath = "patient" | "staff";
export const STORAGE_KEYS = {
  USER_PATH: "@careplus/userPath",
  USER_TOKEN: "@careplus/userToken",
  USER_ID: "@careplus/userId",
} as const;
let sessionToken: string | null = null;
let nurseSessionToken: string | null = null;
// Cold starts deliberately require login; tokens remain only in memory on web.
export const Storage = {
  getUserPath: () =>
    AsyncStorage.getItem(STORAGE_KEYS.USER_PATH) as Promise<UserPath | null>,
  setUserPath: (path: UserPath) =>
    AsyncStorage.setItem(STORAGE_KEYS.USER_PATH, path),
  getUserToken: async () => sessionToken,
  setSession: async (token: string, _userId: string) => {
    if (Platform.OS !== "web")
      await SecureStore.setItemAsync("careplus.session", token);
    sessionToken = token;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PATH, "patient");
  },
  clearSession: async (_clearPath = false) => {
    sessionToken = null;
    if (Platform.OS !== "web")
      await SecureStore.deleteItemAsync("careplus.session");
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.USER_ID,
    ]);
  },
  getNurseToken: async () => nurseSessionToken,
  setNurseSession: async (token: string) => {
    if (Platform.OS !== "web")
      await SecureStore.setItemAsync("careplus.nurseSession", token);
    nurseSessionToken = token;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PATH, "staff");
  },
  clearNurseSession: async () => {
    nurseSessionToken = null;
    if (Platform.OS !== "web")
      await SecureStore.deleteItemAsync("careplus.nurseSession");
  },
  // Account deletion must retain the selected path.
  clearAll: async () => {
    await Storage.clearSession();
    await AsyncStorage.removeItem("@careplus/rememberedIdentifier");
  },
  rememberedIdentifier: () =>
    AsyncStorage.getItem("@careplus/rememberedIdentifier"),
  rememberIdentifier: (value: string) =>
    value
      ? AsyncStorage.setItem("@careplus/rememberedIdentifier", value)
      : AsyncStorage.removeItem("@careplus/rememberedIdentifier"),
  rememberedNurseIdentifier: () => AsyncStorage.getItem("@careplus/rememberedNurseIdentifier"),
  rememberNurseIdentifier: (value: string) => value
    ? AsyncStorage.setItem("@careplus/rememberedNurseIdentifier", value)
    : AsyncStorage.removeItem("@careplus/rememberedNurseIdentifier"),
};
