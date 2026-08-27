// src/services/consultationService.ts

export const staffConsultationService = {
  // TODO: Doctor clinical consultation save with SOAP and prescription
  createConsultation: async (_consultationData: any) => {
    // TODO: POST /api/doctor/consultations
    return null;
  },

  // TODO: Fetch patient's medical history for doctor review
  getPatientConsultations: async (_patientId: string) => {
    // TODO: GET /api/consultations/patient/{patientId}
    return [];
  },
};
