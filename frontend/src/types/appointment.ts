// src/types/appointment.ts

export type AppointmentStatus = 'Upcoming' | 'In-Progress' | 'Completed' | 'Cancelled';

export interface StaffAppointment {
  id: string;
  ticketNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  tokenNumber?: string;
  vitals?: {
    bp?: string;
    heartRate?: number;
    temperature?: number;
  };
}
