import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Calendar,
  Droplet,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { apiPost } from '../../lib/apiFetch';
import { getTodayDateString, calculateAge } from '../../lib/dateUtils';

export const isUserProfileIncomplete = (user: any): boolean => {
  if (!user) return false;
  // Check if profile was already marked complete
  try {
    const isMarked = localStorage.getItem(`carepulse_profile_completed_${user.id}`);
    if (isMarked === 'true') return false;
  } catch {}

  const phone = (user.phone || '').trim();
  const isDefaultPhone = phone === '' || phone === '+91 98765 00000' || phone === '+91 98765 43210';
  const isDefaultGender = !user.gender || user.gender === 'Not specified';
  const isDefaultDob = !user.dob || user.dob === getTodayDateString();
  const isDefaultEmergency = !user.emergencyContact?.phone || user.emergencyContact?.phone === '+91 98765 00000';

  // For Google users or any account missing primary phone / emergency / gender / dob
  return isDefaultPhone || (user.authProvider === 'google' && (isDefaultGender || isDefaultEmergency || isDefaultDob));
};

export const CompleteProfileModal: React.FC = () => {
  const user = useCarePulseStore((s) => s.user);
  const updateUser = useCarePulseStore((s) => s.updateUser);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('Parent');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const dismissed = sessionStorage.getItem(`carepulse_profile_modal_dismissed_${user.id}`);
    if (dismissed === 'true') {
      setIsOpen(false);
      return;
    }

    if (isUserProfileIncomplete(user)) {
      setFullName(user.fullName || '');
      setPhone(user.phone && user.phone !== '+91 98765 00000' && user.phone !== '+91 98765 43210' ? user.phone : '');
      setDob(user.dob && user.dob !== getTodayDateString() ? user.dob : '2000-01-15');
      setGender(user.gender && user.gender !== 'Not specified' ? user.gender : 'Male');
      setBloodGroup(user.bloodGroup || 'O+');
      setAddress(user.address || '');
      setEmergencyName(user.emergencyContact?.name || '');
      setEmergencyPhone(
        user.emergencyContact?.phone &&
        user.emergencyContact.phone !== '+91 98765 00000' &&
        user.emergencyContact.phone !== '+91 98765 43210'
          ? user.emergencyContact.phone
          : ''
      );
      setEmergencyRel(user.emergencyContact?.relationship || 'Parent');
      setAllergies(user.allergies || '');
      setConditions(user.preExistingConditions || '');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const calculatedAge = calculateAge(dob);

  const handleDismiss = () => {
    sessionStorage.setItem(`carepulse_profile_modal_dismissed_${user.id}`, 'true');
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanDob = dob.trim();
    const cleanAddress = address.trim();
    const cleanEmergName = emergencyName.trim();
    const cleanEmergPhone = emergencyPhone.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }

    const primaryDigits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || primaryDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit primary contact phone number.');
      return;
    }

    if (!cleanDob || cleanDob > getTodayDateString()) {
      setErrorMessage('Please select a valid date of birth (cannot be in the future).');
      return;
    }

    if (cleanEmergPhone) {
      const emergDigits = cleanEmergPhone.replace(/\D/g, '');
      if (emergDigits.length >= 10 && primaryDigits.slice(-10) === emergDigits.slice(-10)) {
        setErrorMessage('Emergency contact phone number must be different from your primary phone number.');
        return;
      }
    }

    setIsSubmitting(true);

    const updatedPayload = {
      fullName: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      dob: cleanDob,
      gender,
      bloodGroup,
      allergies: allergies.trim() || undefined,
      preExistingConditions: conditions.trim() || undefined,
      emergencyContact: {
        name: cleanEmergName || 'Primary Contact',
        phone: cleanEmergPhone || cleanPhone,
        relationship: emergencyRel,
      },
    };

    try {
      // 1. Update in-memory Zustand store and native Capacitor Preferences
      updateUser(updatedPayload);

      // 2. Persist to backend database (PostgreSQL / JSON DB)
      try {
        await apiPost(`/patients/${encodeURIComponent(user.id)}/update`, updatedPayload);
      } catch (backendErr) {
        console.warn('Backend profile update notice, local preferences persisted:', backendErr);
      }

      // 3. Mark completed in localStorage
      try {
        localStorage.setItem(`carepulse_profile_completed_${user.id}`, 'true');
        sessionStorage.setItem(`carepulse_profile_modal_dismissed_${user.id}`, 'true');
      } catch {}

      setSuccessMessage('Medical profile saved successfully!');
      setTimeout(() => {
        setIsSubmitting(false);
        setIsOpen(false);
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0B5A54] via-[#14B8A6] to-[#0B5A54] text-white p-5 sm:p-6 shrink-0 relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Complete later"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Account Onboarding
                </span>
                <span className="text-[10px] font-bold text-teal-100 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-teal-200" />
                  Verified Google Account
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                Complete Your Medical Profile
              </h2>
              <p className="text-[11px] text-teal-50 font-medium">
                Add your contact & emergency vitals to activate doctor bookings & e-prescriptions.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerts */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3.5 rounded-2xl flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Personal Identification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <User className="w-4 h-4 text-[#0B5A54]" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Personal Identification
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Primary Contact Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  {calculatedAge !== null && (
                    <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-1.5 py-0.2 rounded-md">
                      {calculatedAge} yrs
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dob}
                    max={getTodayDateString()}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Blood Group <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Droplet className="w-3.5 h-3.5 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Residential Address / City
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Downtown, City"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Emergency Contact (For Medical Alerts)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Mark Jenkins"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 12345"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Relationship
                </label>
                <select
                  value={emergencyRel}
                  onChange={(e) => setEmergencyRel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend / Relative</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Health Vitals (Optional) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Clinical Health Notes (Optional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Known Allergies
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, None"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pre-Existing Conditions
                </label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Mild Asthma, Hypertension, None"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              I'll do this later
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-[#0B5A54] text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Save & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
