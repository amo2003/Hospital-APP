import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const DOCTOR_STORAGE_KEYS = {
  DOCTOR_TOKEN: "@careplus/doctorToken",
  DOCTOR_ID: "@careplus/doctorId",
  DOCTOR_REMEMBERED: "@careplus/doctorRememberedIdentifier",
} as const;

let inMemoryDoctorToken: string | null = null;

export const DoctorStorage = {
  getDoctorToken: async (): Promise<string | null> => {
    if (inMemoryDoctorToken) return inMemoryDoctorToken;
    if (Platform.OS !== "web") {
      try {
        return await SecureStore.getItemAsync("careplus.doctor.token");
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(DOCTOR_STORAGE_KEYS.DOCTOR_TOKEN);
  },

  setDoctorSession: async (token: string, doctorId: string): Promise<void> => {
    inMemoryDoctorToken = token;
    if (Platform.OS !== "web") {
      try {
        await SecureStore.setItemAsync("careplus.doctor.token", token);
      } catch {}
    } else {
      await AsyncStorage.setItem(DOCTOR_STORAGE_KEYS.DOCTOR_TOKEN, token);
    }
    await AsyncStorage.setItem(DOCTOR_STORAGE_KEYS.DOCTOR_ID, doctorId);
  },

  clearDoctorSession: async (): Promise<void> => {
    inMemoryDoctorToken = null;
    if (Platform.OS !== "web") {
      try {
        await SecureStore.deleteItemAsync("careplus.doctor.token");
      } catch {}
    }
    await AsyncStorage.multiRemove([
      DOCTOR_STORAGE_KEYS.DOCTOR_TOKEN,
      DOCTOR_STORAGE_KEYS.DOCTOR_ID,
    ]);
  },

  getRememberedIdentifier: async (): Promise<string | null> => {
    return AsyncStorage.getItem(DOCTOR_STORAGE_KEYS.DOCTOR_REMEMBERED);
  },

  setRememberedIdentifier: async (value: string): Promise<void> => {
    if (value) {
      await AsyncStorage.setItem(DOCTOR_STORAGE_KEYS.DOCTOR_REMEMBERED, value);
    } else {
      await AsyncStorage.removeItem(DOCTOR_STORAGE_KEYS.DOCTOR_REMEMBERED);
    }
  },
};
