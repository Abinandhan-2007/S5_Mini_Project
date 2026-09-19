import { useTranslation } from './LanguageContext';
import type { SupportedLanguage } from './types';

/**
 * Maps raw clinical specialty strings (e.g., "Cardiology", "Cardiologist", "Surgery")
 * to their localized equivalents in the selected language.
 */
export function getLocalizedSpecialty(
  specialty: string | null | undefined,
  t: (key: string, fallbackOrParams?: string | Record<string, any>) => string
): string {
  if (!specialty || !specialty.trim()) return '';
  const cleaned = specialty.trim().toLowerCase();

  // Normalize common medical variations
  let key = 'general';
  if (cleaned.includes('cardio')) key = 'cardiology';
  else if (cleaned.includes('derma')) key = 'dermatology';
  else if (cleaned.includes('pediat') || cleaned.includes('paediat')) key = 'pediatrics';
  else if (cleaned.includes('neuro')) key = 'neurology';
  else if (cleaned.includes('endo')) key = 'endocrinology';
  else if (cleaned.includes('arthro')) key = 'arthropathic';
  else if (cleaned.includes('ortho')) key = 'orthopedics';
  else if (cleaned.includes('surg')) key = 'surgery';
  else if (cleaned.includes('emerg') || cleaned.includes('trauma')) key = 'emergencyCare';
  else if (cleaned.includes('neona')) key = 'neonatology';
  else if (cleaned.includes('allergy')) key = 'allergy';
  else if (cleaned.includes('well')) key = 'wellness';
  else if (cleaned.includes('ent') || cleaned.includes('throat') || cleaned.includes('ear')) key = 'ent';
  else if (cleaned.includes('ophthal') || cleaned.includes('eye')) key = 'ophthalmology';
  else if (cleaned.includes('gynec') || cleaned.includes('obste')) key = 'gynecology';
  else if (cleaned.includes('psych')) key = 'psychiatry';
  else if (cleaned.includes('internal')) key = 'internalMedicine';
  else if (cleaned.includes('general') || cleaned.includes('physician')) key = 'generalMedicine';

  return t(`specialties.${key}`, specialty);
}

/**
 * Localizes ONLY the doctor title prefix ("Dr." / "Doctor") while keeping
 * the doctor's personal name in Latin script (e.g., "டாக்டர் Olivia Chen").
 * This guarantees consistency with physical clinic nameplates and official credentials.
 */
export function getLocalizedDoctorName(
  doctorName: string | null | undefined,
  t: (key: string, fallbackOrParams?: string | Record<string, any>) => string
): string {
  if (!doctorName || !doctorName.trim()) return '';
  const prefix = t('doctors.doctorPrefix', 'Dr.');

  // Strip existing prefix variations (Dr., Doctor, or localized prefixes if already present)
  const cleanedName = doctorName.trim();
  const withoutPrefix = cleanedName
    .replace(/^(Dr\.\s*|Dr\s+|Doctor\s+|டாக்டர்\s*|डॉ\.\s*|ഡോ\.\s*)/i, '')
    .trim();

  return withoutPrefix ? `${prefix} ${withoutPrefix}` : cleanedName;
}

/**
 * Pass-through returning the hospital name completely unchanged across all languages
 * to match physical building signage, appointment slips, and clinic registrations.
 */
export function getLocalizedHospitalName(hospitalName: string | null | undefined): string {
  return hospitalName || '';
}

/**
 * Custom React hook for seamless localized entity rendering inside components.
 */
export function useLocalizedEntities() {
  const { t, language } = useTranslation();

  return {
    formatSpecialty: (specialty: string | null | undefined) => getLocalizedSpecialty(specialty, t),
    formatDoctorName: (name: string | null | undefined) => getLocalizedDoctorName(name, t),
    formatHospitalName: getLocalizedHospitalName,
    language: language as SupportedLanguage,
    t,
  };
}
