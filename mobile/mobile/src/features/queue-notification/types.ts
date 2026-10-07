export interface QueueStatus {
  department: string;
  doctorName: string;
  roomNumber: string;
  currentToken: string;
  userToken: string;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  lastUpdated: string;
  progressPercent: number;
}

export interface TimelineNode {
  id: string;
  tokenOrTitle: string;
  subtitle: string;
  isFilled: boolean;
  isActive?: boolean;
}

export interface PatientNotificationItem {
  id: string;
  type: 'queue' | 'appointment' | 'general';
  title: string;
  time: string;
  description: string;
  iconType: 'dot' | 'reminder' | 'delay' | 'confirmed';
}

export interface AppointmentHistoryItem {
  id: string;
  department: string;
  doctorName: string;
  date: string;
  time: string;
  token: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
}

export interface DoctorAlertItem {
  id: string;
  type: 'checkin' | 'queue' | 'schedule';
  title: string;
  time: string;
  description: string;
  iconType: 'dot' | 'queue' | 'schedule';
}

export interface AdminAlertItem {
  id: string;
  type: 'approval' | 'queue' | 'report' | 'system';
  title: string;
  time: string;
  description: string;
  iconType: 'warning' | 'queue' | 'report' | 'info';
}

export interface AppointmentReminderDetails {
  timingBadge: string;
  department: string;
  doctorName: string;
  dateTime: string;
  tokenAndRoom: string;
  checklist: string[];
  reminderStatus: string;
  reminderSubtext: string;
}
