import { router } from "expo-router";
import Constants from "expo-constants";
// Government OPD: upload integration preserved but disabled.
// import type { DocumentPickerAsset } from "expo-document-picker";
// import { uploadPaymentSlip } from "../payments/upload-payment-slip";
import { Platform } from 'react-native';

import { Storage } from "@/utils/storage";
import type {
  Appointment,
  Doctor,
  Hospital,
  Patient,
  Registration,
  Slot,
  GoogleAuthResult,
  PatientQueue,
} from "./types";
import type { PatientNotificationRecord } from "../../queue-notification/types";
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
  // upload?: DocumentPickerAsset,
): Promise<T> {
  if (!base || base.includes("YOUR_"))
    throw new ApiError(
      "Set EXPO_PUBLIC_API_URL in the mobile .env to your running backend URL.",
    );
  const token = authenticated ? await Storage.getUserToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), /* upload ? 60000 : */ 15000);
  try {
    const url = `${base}/patient${path}`;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const response = /* upload
      ? await uploadPaymentSlip(url, upload, { headers, signal: controller.signal })
      : */ await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
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
    /* Government OPD: upload-specific errors disabled.
    if (upload) {
      const detail = error instanceof Error ? error.message : "";
      if (detail === "UPLOAD_FILE_UNAVAILABLE")
        throw new ApiError("This payment slip is unavailable. Please upload it again.");
      if (detail === "UPLOAD_TOO_LARGE")
        throw new ApiError("Choose a payment slip smaller than 5 MB.");
      if (controller.signal.aborted)
        throw new ApiError("Payment slip upload timed out. Please try again.");
      // Keep diagnostic codes, never log receipt contents, auth tokens or file URIs.
      const code = /network|connect|socket|resolve|host|internet/i.test(detail)
        ? "UPLOAD_NETWORK" : "UPLOAD_NATIVE";
      if (__DEV__) console.warn("[payment-upload/native-v2]", code, error instanceof Error ? error.name : "UnknownError");
      throw new ApiError(`Payment slip upload failed. Please try again. (${code})`);
    }
    */
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
  appointments: (scope: "today" | "all" = "all") =>
    request<Appointment[]>(`/booking/appointments?scope=${scope}`),
  queue: (appointmentId?: string) =>
    request<PatientQueue | null>(
      `/booking/queue${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ""}`,
    ),
  notifications: () =>
    request<PatientNotificationRecord[]>("/notifications"),
  markNotificationRead: (id: string) =>
    request<PatientNotificationRecord>(`/notifications/${id}/read`, "PATCH"),
  deleteNotification: (id: string) =>
    request<void>(`/notifications/${id}`, "DELETE"),
  book: (data: {
    hospitalId: string;
    department: string;
    doctorId: string;
    date: string;
    time: string;
    // expectedFeeLkr?: number;
    // slipId?: string;
  }) => request<Appointment>("/booking/appointments", "POST", data),
  // uploadPaymentSlip: (doctorId: string, asset: DocumentPickerAsset) =>
  //   request<{ id: string; filename: string; uploadedAt: string }>(`/payments/slips/${doctorId}`, "POST", undefined, true, asset),
  cancel: (id: string) =>
    request<Appointment>(`/booking/appointments/${id}/cancel`, "PATCH"),
};
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
