export type GoogleOnboarding = {
  proofToken: string;
  email: string;
  name: string;
};
export type GoogleAuthResult =
  | { status: "signed-in"; token: string; patient: Patient }
  | (GoogleOnboarding & { status: "registration-required" | "link-required" });
export type Patient = {
  id: string;
  patientId: string;
  fullName: string;
  profileImage?: string | null;
  medicalDetails?: MedicalDetails;
  nic: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  address: string;
  district: string;
  username: string;
};
export type MedicalDetails = {
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
};
export type Registration = Omit<
  Patient,
  "id" | "patientId" | "profileImage" | "medicalDetails"
> & {
  password: string;
  acceptedTerms: boolean;
};
export type Hospital = { _id: string; name: string; departments: string[] };
export type Doctor = {
  _id: string;
  name: string;
  specialty: string;
  weekdays: number[];
  hospitalId: string | { _id: string; name: string };
  hospitalName?: string;
  feeLkr?: number;
  paymentInstructions?: string;
};
export type Appointment = {
  _id: string;
  appointmentId: string;
  hospitalId: { _id: string; name: string } | null;
  doctorId: { _id: string; name: string; specialty: string } | null;
  department: string;
  date: string;
  time: string;
  doctorQueueNumber?: number;
  createdAt?: string;
  payment?: { amountLkr: number; status: "not_required" | "pending" | "approved" | "rejected"; reviewedAt?: string; rejectionReason?: string };
  status: "confirmed" | "cancelled" | "completed";
  doctorDecision?: "pending" | "accepted" | "rejected";
};
export type Slot = { time: string; available: boolean };
export type PatientQueue = {
  appointment: Appointment;
  queueNumber: number;
  status: "waiting" | "serving" | "completed" | "cancelled";
  startsAt: string;
  serverTime: string;
  patientsAhead: number;
  nowServing: number | null;
  estimatedWaitMinutes: number;
  entries: {
    queueNumber: number;
    isYou: boolean;
    name?: string;
    time: string;
    status: PatientQueue["status"];
    selected: boolean;
  }[];
};
