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
  nic: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  address: string;
  district: string;
  username: string;
};
export type Registration = Omit<Patient, "id" | "patientId"> & {
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
};
export type Appointment = {
  _id: string;
  appointmentId: string;
  hospitalId: { _id: string; name: string } | null;
  doctorId: { _id: string; name: string; specialty: string } | null;
  department: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled" | "completed";
};
export type Slot = { time: string; available: boolean };
