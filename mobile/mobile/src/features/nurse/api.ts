import { router } from "expo-router";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Storage } from "@/utils/storage";
import type { Nurse, NursePatient, NurseQueueEntry, NurseRegistration } from "./types";

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ||
  (Platform.OS === "web" && typeof window !== "undefined" ? window.location.hostname : undefined);
const base = configuredBase && !configuredBase.includes("YOUR_")
  ? configuredBase
  : __DEV__ && devHost ? `http://${devHost}:4000/api` : undefined;

export class NurseApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

async function request<T>(path: string, method = "GET", body?: unknown, authenticated = true): Promise<T> {
  if (!base || base.includes("YOUR_"))
    throw new NurseApiError("Set EXPO_PUBLIC_API_URL in the mobile .env to your running backend URL.");
  const token = authenticated ? await Storage.getNurseToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/nurse${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        await Storage.clearNurseSession();
        router.replace("/nurse/login");
      }
      throw new NurseApiError(data?.message || "The request could not be completed. Please try again.", response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof NurseApiError) throw error;
    throw new NurseApiError("Cannot reach CarePlus. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export const nurseApi = {
  register: (data: NurseRegistration) => request<{ nurse: Nurse }>("/auth/register", "POST", data, false),
  login: (identifier: string, password: string) => request<{ token: string; nurse: Nurse }>("/auth/login", "POST", { identifier, password }, false),
  profile: () => request<Nurse>("/profile"),
  updateProfile: (data: Pick<Nurse, "fullName" | "phone" | "department" | "ward">) => request<Nurse>("/profile", "PATCH", data),
  deactivate: () => request<void>("/profile", "DELETE"),
  logout: () => request<void>("/auth/logout", "POST"),
  patients: (q = "", status = "all") => request<NursePatient[]>(`/patients?q=${encodeURIComponent(q)}&status=${status}`),
  patient: (patientId: string) => request<NursePatient>(`/patients/${encodeURIComponent(patientId)}`),
  queue: (date?: string, allDepartments = false) => {
    const query = [date ? `date=${encodeURIComponent(date)}` : "", allDepartments ? "allDepartments=true" : ""].filter(Boolean).join("&");
    return request<{ date: string; entries: NurseQueueEntry[] }>(`/queue${query ? `?${query}` : ""}`);
  },
  callNext: () => request<NurseQueueEntry>("/queue/call-next", "POST"),
  completeQueue: (id: string) => request<NurseQueueEntry>(`/queue/${encodeURIComponent(id)}/complete`, "PATCH"),
  cancelQueue: (id: string) => request<{ id: string; token: string; status: string }>(`/queue/${encodeURIComponent(id)}/cancel`, "PATCH"),
};

export const nurseMessageOf = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
