/**
 * Helper utilities for Date calculation and formatting
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates accurate age from a Date of Birth string (YYYY-MM-DD)
 */
export const calculateAge = (dobString?: string | null): number | null => {
  if (!dobString || typeof dobString !== 'string') return null;
  const clean = dobString.trim();
  if (!clean) return null;

  const parts = clean.split('-');
  let birthDate: Date;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    birthDate = new Date(y, m, d);
  } else {
    birthDate = new Date(clean);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
};

/**
 * Formats a Date of Birth string with calculated age e.g. "1992-05-14 (34 yrs)"
 */
export const formatDobWithAge = (dobString?: string | null): string => {
  if (!dobString) return 'Not specified';
  const age = calculateAge(dobString);
  if (age !== null) {
    return `${dobString} (${age} yrs)`;
  }
  return dobString;
};
