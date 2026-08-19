// src/services/appointmentService.ts

export const staffAppointmentService = {
  // TODO: Fetch appointments for staff management
  getAppointments: async () => {
    // TODO: GET /api/staff/appointments
    return [];
  },

  // TODO: Book appointment on behalf of patient
  createAppointment: async (_data: any) => {
    // TODO: POST /api/receptionist/appointments
    return null;
  },

  // TODO: Patient check-in and queue token issuance
  checkInPatient: async (_appointmentId: string) => {
    // TODO: PUT /api/receptionist/appointments/{id}/checkin
    return null;
  },
};
