/**
 * CarePulse Centralized Backend API Client
 */

import { apiFetch } from '../lib/apiFetch';

export interface ConsultationPayload {
  patientId?: string;
  doctorId: string;
  doctorName: string;
  date?: string;
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    vitals?: Record<string, any>;
  };
  soapEmbedding?: number[];
}

export const apiClient = {
  /**
   * Fetch all past consultation records from PostgreSQL/JSON DB
   */
  async getConsultations() {
    try {
      const response = await apiFetch('/consultations', { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('⚠️ API Client backend fetch failed. Using fallback local state.', err);
      return [];
    }
  },

  /**
   * Create a new consultation SOAP record with optional vector embedding
   */
  async createConsultation(payload: ConsultationPayload) {
    try {
      const response = await apiFetch('/consultations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('⚠️ API Client backend save failed. Using local storage.', err);
      return null;
    }
  },

  /**
   * Search past consultations using vector similarity (RAG)
   */
  async searchVectorSimilarity(queryEmbedding: number[], limit = 5) {
    try {
      const response = await apiFetch('/consultations/search', {
        method: 'POST',
        body: JSON.stringify({ queryEmbedding, limit }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('⚠️ Vector similarity search request failed.', err);
      return [];
    }
  },
};
