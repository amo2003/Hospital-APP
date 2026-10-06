import { router } from "expo-router";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Storage } from "@/utils/storage";
import type {
  Appointment,
  Doctor,
  Hospital,
  Patient,
  Registration,
  Slot,
  GoogleAuthResult,
} from "./types";
const configuredBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
// Expo Go exposes the Metro host. Use it only for an unconfigured development build.
const devHost =
  Constants.expoConfig?.hostUri?.split(":")[0] ||
  (Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.hostname
    : undefined);
const base =
  configuredBase && !configuredBase.includes("YOUR_")
    ? configuredBase
    : __DEV__ && devHost
      ? `http://${devHost}:4000/api`
      : undefined;
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  authenticated = true,
): Promise<T> {
  if (!base || base.includes("YOUR_"))
    throw new ApiError(
      "Set EXPO_PUBLIC_API_URL in the mobile .env to your running backend URL.",
    );
  const token = authenticated ? await Storage.getUserToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/patient${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        await Storage.clearSession();
        router.replace("/login");
      }
      throw new ApiError(
        data?.message ||
          "The request could not be completed. Please try again.",
        response.status,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Cannot reach CarePlus. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export const api = {
  register: (data: Registration & { googleRegistrationToken?: string }) =>
    request<{ patient: Patient; token?: string }>(
      "/auth/register",
      "POST",
      data,
      false,
    ),
  login: (identifier: string, password: string) =>
    request<{ token: string; patient: Patient }>(
      "/auth/login",
      "POST",
      { identifier, password },
      false,
    ),
  google: (idToken: string) =>
    request<GoogleAuthResult>("/auth/google", "POST", { idToken }, false),
  linkGoogle: (proofToken: string, password: string) =>
    request<{ token: string; patient: Patient }>(
      "/auth/google/link",
      "POST",
      { proofToken, password },
      false,
    ),
  forgot: (email: string) =>
    request<{ message: string }>(
      "/auth/forgot-password",
      "POST",
      { email },
      false,
    ),
  reset: (code: string, password: string) =>
    request<{ message: string }>(
      "/auth/reset-password",
      "POST",
      { code, password },
      false,
    ),
  logout: () => request<void>("/auth/logout", "POST"),
  profile: () => request<Patient>("/profile"),
  updateProfile: (data: Partial<Patient>) =>
    request<Patient>("/profile", "PATCH", data),
  deleteAccount: (password: string) =>
    request<void>("/profile", "DELETE", { password }),
  hospitals: () => request<Hospital[]>("/booking/hospitals"),
  doctors: (hospitalId: string, department: string) =>
    request<Doctor[]>(
      `/booking/doctors?hospitalId=${hospitalId}&department=${encodeURIComponent(department)}`,
    ),
  slots: (doctorId: string, date: string) =>
    request<Slot[]>(`/booking/slots?doctorId=${doctorId}&date=${date}`),
  appointments: () => request<Appointment[]>("/booking/appointments"),
  book: (data: {
    hospitalId: string;
    department: string;
    doctorId: string;
    date: string;
    time: string;
  }) => request<Appointment>("/booking/appointments", "POST", data),
  cancel: (id: string) =>
    request<Appointment>(`/booking/appointments/${id}/cancel`, "PATCH"),
};
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
