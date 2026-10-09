export type Nurse = {
  id: string;
  nurseId: string;
  fullName: string;
  nic: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  address: string;
  district: string;
  username: string;
  department: string;
  ward: string;
  hospitalId: string;
  role: "nurse";
  status: "pending" | "active" | "rejected" | "inactive";
  rejectionReason?: string;
};

export type NurseRegistration = Omit<Nurse, "id" | "nurseId" | "role" | "status" | "hospitalId"> & {
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type NursePatient = {
  id: string;
  patientId: string;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  phone: string;
  email: string;
  address: string;
  district: string;
  appointment: null | {
    id: string;
    status: "confirmed" | "cancelled" | "completed";
    department: string;
    date: string;
    time: string;
    hospital: string;
    doctor: string;
  };
  appointments?: Array<NonNullable<NursePatient["appointment"]> & { specialty?: string }>;
};

export type NurseQueueEntry = {
  createdAt?: string;
  updatedAt?: string;
  id: string;
  token: string;
  sequence: number;
  status: "waiting" | "serving" | "completed" | "cancelled";
  department: string;
  date: string;
  patient: { patientId: string; fullName: string; gender: string } | null;
  hospital: string;
  position: number;
};

export type NurseNotification = {
  id: string;
  type: "appointment" | "queue" | "general";
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  patient: { patientId: string; fullName: string } | null;
};

export type NurseAppointment = {
  id: string;
  appointmentId: string;
  date: string;
  time: string;
  status: "confirmed" | "completed" | "cancelled";
  doctorDecision: "pending" | "accepted" | "rejected";
  department: string;
  patient: { patientId: string; fullName: string; phone: string } | null;
  doctor: { name: string; specialty: string } | null;
};

export type NurseReport = {
  from: string; to: string; generatedAt: string; hospital: string; department: string;
  summary: { completed: number; patients: number; doctors: number; averagePerDay: number };
  daily: { date: string; count: number }[];
  byDoctor: { id: string; name: string | null; count: number }[];
  records: {
    id: string; token: string; date: string; department: string;
    patientId: string | null; patientName: string | null; appointmentId: string | null;
    time: string | null; doctorId: string | null; doctorName: string | null; completedAt: string | null;
  }[];
};
