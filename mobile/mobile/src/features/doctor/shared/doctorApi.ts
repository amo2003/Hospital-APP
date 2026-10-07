import Constants from "expo-constants";
import { Platform } from "react-native";
import { DoctorStorage } from "./doctorStorage";

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
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
      : "http://localhost:4000/api";

export class DoctorApiError extends Error {
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
  if (!base) {
    throw new DoctorApiError(
      "Backend API URL is not configured. Please check EXPO_PUBLIC_API_URL.",
    );
  }

  const token = authenticated ? await DoctorStorage.getDoctorToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${base}/doctor${path}`, {
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
        await DoctorStorage.clearDoctorSession();
      }
      throw new DoctorApiError(
        data?.message ||
          "The request could not be completed. Please check your details and try again.",
        response.status,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof DoctorApiError) throw error;
    throw new DoctorApiError(
      "Cannot connect to CarePlus server. Please ensure the backend is running.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface DoctorRegistrationPayload {
  fullName: string;
  nic: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  slmcNo: string;
  specialty: string;
  qualifications: string;
  experience: string;
  hospital: string;
  licenseUrl: string;
  phone: string;
  email: string;
  password: string;
}

export interface DoctorProfile {
  id: string;
  doctorId: string;
  fullName: string;
  nic: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  slmcNo: string;
  specialty: string;
  qualifications: string;
  experience: string;
  hospital: string;
  licenseUrl: string;
  phone: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  doctorCatalogId: string | null;
  createdAt: string;
}

export interface DoctorAppointment {
  id: string;
  appointmentId: string;
  queueNumber: string;
  patientName: string;
  patientPhone: string;
  patientId: string;
  time: string;
  date: string;
  status: "confirmed" | "completed" | "cancelled";
  doctorDecision?: "pending" | "accepted" | "rejected";
  department: string;
}

export interface DoctorPatientItem {
  id: string;
  appointmentId: string;
  queueNumber: string;
  patientName: string;
  patientPhone: string;
  patientId: string;
  gender?: string;
  dateOfBirth?: string;
  time: string;
  date: string;
  status: "confirmed" | "completed" | "cancelled";
  doctorDecision?: "pending" | "accepted" | "rejected";
  department: string;
}

export interface DoctorDashboardData {
  summary: {
    todayAppointments: number;
    pendingRequests?: number;
    waiting: number;
    completed: number;
    cancelled: number;
    currentQueue: string;
  };
  nextPatient: {
    id: string;
    appointmentId: string;
    patientName: string;
    patientPhone: string;
    patientId: string;
    time: string;
    date: string;
    status: string;
    doctorDecision?: "pending" | "accepted" | "rejected";
    department: string;
  } | null;
  todaySchedule: DoctorAppointment[];
  doctor: DoctorProfile;
}

export interface DoctorPatientRecordData {
  patient: {
    id: string;
    patientId: string;
    fullName: string;
    nic: string;
    dateOfBirth: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
    address: string;
    district: string;
  };
  appointment: {
    id: string;
    appointmentId: string;
    queueNumber: string;
    date: string;
    time: string;
    status: "confirmed" | "completed" | "cancelled";
    doctorDecision?: "pending" | "accepted" | "rejected";
    department: string;
    reasonForVisit: string;
  } | null;
  vitals: {
    bloodPressure: string;
    bloodSugar: string;
    weight: string;
  };
  lastVisit: string;
  visitHistory: Array<{
    id: string;
    appointmentId: string;
    date: string;
    time: string;
    department: string;
    status: string;
  }>;
  notes: Array<{
    id: string;
    note: string;
    vitals?: {
      bloodPressure?: string;
      bloodSugar?: string;
      weight?: string;
    };
    createdAt: string;
    doctorName: string;
  }>;
}

export const doctorApi = {
  register: (data: DoctorRegistrationPayload) =>
    request<{
      message: string;
      doctor: {
        doctorId: string;
        fullName: string;
        slmcNo: string;
        status: string;
      };
    }>("/register", "POST", data, false),

  login: (identifier: string, password: string) =>
    request<{
      token: string;
      doctor: DoctorProfile;
    }>("/login", "POST", { identifier, password }, false),

  me: () => request<{ doctor: DoctorProfile }>("/me"),

  getDashboard: () => request<DoctorDashboardData>("/dashboard"),

  getAppointments: (params?: { date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.append("date", params.date);
    if (params?.status) q.append("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<DoctorAppointment[]>(`/appointments${qs}`);
  },

  getPatients: (params?: { date?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.append("date", params.date);
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<DoctorPatientItem[]>(`/patients${qs}`);
  },

  getPatientRecord: (params: { appointmentId?: string; patientId?: string }) => {
    const q = new URLSearchParams();
    if (params.appointmentId) q.append("appointmentId", params.appointmentId);
    if (params.patientId) q.append("patientId", params.patientId);
    return request<DoctorPatientRecordData>(`/patient-record?${q.toString()}`);
  },

  addClinicalNote: (payload: {
    patientId: string;
    appointmentId?: string;
    note: string;
    vitals?: { bloodPressure?: string; bloodSugar?: string; weight?: string };
  }) =>
    request<{
      message: string;
      note: {
        id: string;
        note: string;
        vitals?: { bloodPressure?: string; bloodSugar?: string; weight?: string };
        createdAt: string;
        doctorName: string;
      };
    }>("/patient-record/notes", "POST", payload),

  updateAppointmentStatus: (
    id: string,
    status: "confirmed" | "completed" | "cancelled",
  ) =>
    request<{ message: string; appointment: { id: string; status: string } }>(
      `/appointments/${id}/status`,
      "PATCH",
      { status },
    ),

  updateAppointmentDecision: (
    id: string,
    decision: "accepted" | "rejected",
  ) =>
    request<{
      message: string;
      appointment: { id: string; status: string; doctorDecision: string };
    }>(`/appointments/${id}/decision`, "PATCH", { decision }),
};

export const isAppointmentTimePassed = (date: string, time: string): boolean => {
  if (!date || !time) return false;
  return Date.now() >= new Date(`${date}T${time}:00+05:30`).getTime();
};

export const doctorMessageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred. Please try again.";
};
