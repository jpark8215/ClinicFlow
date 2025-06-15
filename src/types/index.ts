
export interface Patient {
  name: string;
  avatarUrl?: string;
  initials: string;
}

export interface Appointment {
  id: string;
  time: string;
  patient: Patient;
  status: "Confirmed" | "Pending" | "Cancelled";
}

export interface PreAuthorization {
  id: string;
  patient: Patient;
  service: string;
  status: "Approved" | "Pending" | "Denied";
  submitted: string;
}

export interface IntakeTask {
  id: string;
  patient: Patient;
  task: string;
  status: "Pending OCR" | "Needs Validation" | "Complete";
}
