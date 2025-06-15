
import { Appointment, PreAuthorization, IntakeTask } from "@/types";

export const appointments: Appointment[] = [
  { id: "1", time: "09:00 AM", patient: { name: "Sarah Johnson", initials: "SJ" }, status: "Confirmed" },
  { id: "2", time: "09:30 AM", patient: { name: "Michael Smith", initials: "MS" }, status: "Confirmed" },
  { id: "3", time: "10:00 AM", patient: { name: "Emily Davis", initials: "ED" }, status: "Pending" },
];

export const preAuthorizations: PreAuthorization[] = [
  { id: "pa1", patient: { name: "Robert Brown", initials: "RB" }, service: "MRI Scan", status: "Approved", submitted: "3 days ago" },
  { id: "pa2", patient: { name: "Linda Wilson", initials: "LW" }, service: "Physical Therapy", status: "Pending", submitted: "1 day ago" },
  { id: "pa3", patient: { name: "James Miller", initials: "JM" }, service: "Cardiology Consult", status: "Denied", submitted: "5 days ago" },
];

export const intakeTasks: IntakeTask[] = [
  { id: "it1", patient: { name: "Jessica Garcia", initials: "JG" }, task: "New Patient Packet", status: "Pending OCR" },
  { id: "it2", patient: { name: "David Martinez", initials: "DM" }, task: "Insurance Card", status: "Needs Validation" },
  { id: "it3", patient: { name: "Maria Rodriguez", initials: "MR" }, task: "Referral Letter", status: "Complete" },
];

export const noShowRiskData = [
  { name: 'Mon', risk: 30 },
  { name: 'Tue', risk: 20 },
  { name: 'Wed', risk: 25 },
  { name: 'Thu', risk: 40 },
  { name: 'Fri', risk: 35 },
  { name: 'Sat', risk: 15 },
  { name: 'Sun', risk: 10 },
];
