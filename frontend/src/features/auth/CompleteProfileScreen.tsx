import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight,
} from 'lucide-react';
import { useCarePulseStore } from '../../lib/store';
import { apiPost } from '../../lib/apiFetch';
import { getTodayDateString, calculateAge } from '../../lib/dateUtils';
import { Avatar } from '../../components/ui/Avatar';

export const PROFILE_PROMPT_KEY = 'profile_prompt_last_shown';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const isUserProfileIncomplete = (user: any): boolean => {
  if (!user) return false;
  try {
    const isMarked = localStorage.getItem(`carepulse_profile_completed_${user.id}`);
    if (isMarked === 'true') return false;
  } catch {}

  const cleanPhone = (user.phone || '').trim().replace(/\D/g, '');
  const hasNoPhone = cleanPhone.length < 10 || cleanPhone === '9876500000' || cleanPhone === '9876543210';
  const hasNoGender = !user.gender || user.gender === 'Not specified';
  const hasNoDob = !user.dob || user.dob === getTodayDateString();
  const cleanEmerg = (user.emergencyContact?.phone || '').trim().replace(/\D/g, '');
  const hasNoEmergency = cleanEmerg.length < 10 || cleanEmerg === '9876500000' || cleanEmerg === '9876543210';

  if (hasNoPhone) return true;
  if (user.authProvider === 'google') {
    return hasNoGender || hasNoEmergency || hasNoDob || !user.address;
  }
  return false;
};

/**
 * Determines whether the user should be automatically prompted to complete their profile.
 * Only returns true if:
 * 1. The profile is incomplete.
 * 2. More than 24 hours have passed since the last prompt (or never prompted).
 */
export const shouldPromptProfileCompletion = (user: any): boolean => {
  if (!user) return false;
  if (!isUserProfileIncomplete(user)) return false;

  try {
    const userKey = `profile_prompt_last_shown_${user.id}`;
    const lastShownStr = localStorage.getItem(userKey) || localStorage.getItem(PROFILE_PROMPT_KEY);
    if (!lastShownStr) {
      return true; // Not shown yet -> prompt once
    }

    const lastShown = parseInt(lastShownStr, 10);
    if (isNaN(lastShown)) {
      return true;
    }

    const now = Date.now();
    return now - lastShown > TWENTY_FOUR_HOURS_MS;
  } catch {
    return true;
  }
};

/**
 * Record the timestamp when the profile prompt is shown to the user.
 */
export const markProfilePromptShown = (userId?: string) => {
  try {
    const now = Date.now().toString();
    if (userId) {
      localStorage.setItem(`profile_prompt_last_shown_${userId}`, now);
    }
    localStorage.setItem(PROFILE_PROMPT_KEY, now);
  } catch {}
};

/**
 * Clear the profile prompt timestamp once profile is completed.
 */
export const clearProfilePromptTracking = (userId?: string) => {
  try {
    if (userId) {
      localStorage.removeItem(`profile_prompt_last_shown_${userId}`);
    }
    localStorage.removeItem(PROFILE_PROMPT_KEY);
  } catch {}
};

export const CompleteProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const updateUser = useCarePulseStore((s) => s.updateUser);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(
    user?.phone && user.phone !== '+91 98765 00000' && user.phone !== '+91 98765 43210' ? user.phone : ''
  );
  const [dob, setDob] = useState(
    user?.dob && user.dob !== getTodayDateString() ? user.dob : '2000-01-15'
  );
  const [gender, setGender] = useState(
    user?.gender && user.gender !== 'Not specified' ? user.gender : 'Female'
  );
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [address, setAddress] = useState(user?.address || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(
    user?.emergencyContact?.phone &&
    user.emergencyContact.phone !== '+91 98765 00000' &&
    user.emergencyContact.phone !== '+91 98765 43210'
      ? user.emergencyContact.phone
      : ''
  );
  const [emergencyRel, setEmergencyRel] = useState(user?.emergencyContact?.relationship || 'Parent');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      if (user.phone && user.phone !== '+91 98765 00000' && user.phone !== '+91 98765 43210') {
        setPhone(user.phone);
      }
      if (user.dob && user.dob !== getTodayDateString()) {
        setDob(user.dob);
      }
      if (user.gender && user.gender !== 'Not specified') {
        setGender(user.gender);
      }
      if (user.bloodGroup) {
        setBloodGroup(user.bloodGroup);
      }
      if (user.address) {
        setAddress(user.address);
      }
      if (user.emergencyContact?.name) {
        setEmergencyName(user.emergencyContact.name);
      }
      if (
        user.emergencyContact?.phone &&
        user.emergencyContact.phone !== '+91 98765 00000' &&
        user.emergencyContact.phone !== '+91 98765 43210'
      ) {
        setEmergencyPhone(user.emergencyContact.phone);
      }
      if (user.emergencyContact?.relationship) {
        setEmergencyRel(user.emergencyContact.relationship);
      }
    }
  }, [user]);

  // Track that the profile completion prompt has been shown
  useEffect(() => {
    if (user?.id) {
      markProfilePromptShown(user.id);
    }
  }, [user?.id]);

  const calculatedAge = calculateAge(dob);

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
        setErrorMessage('Emergency contact phone must be different from your primary phone number.');
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
      emergencyContact: {
        name: cleanEmergName || 'Primary Contact',
        phone: cleanEmergPhone || cleanPhone,
        relationship: emergencyRel,
      },
    };

    try {
      updateUser(updatedPayload);

      if (user?.id) {
        try {
          await apiPost(`/patients/${encodeURIComponent(user.id)}/update`, updatedPayload);
        } catch (backendErr) {
          console.warn('Backend update note:', backendErr);
        }
        try {
          localStorage.setItem(`carepulse_profile_completed_${user.id}`, 'true');
        } catch {}
        // Clear tracking key entirely once profile is completed
        clearProfilePromptTracking(user.id);
      }

      setSuccessMessage('Medical profile completed successfully! Redirecting to home...');
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/home', { replace: true });
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to save profile. Please try again.');
    }
  };

  const handleSkip = () => {
    if (user?.id) {
      try {
        sessionStorage.setItem(`carepulse_profile_modal_dismissed_${user.id}`, 'true');
      } catch {}
      markProfilePromptShown(user.id);
    }
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top App Header */}
      <header className="bg-gradient-to-r from-[#0B5A54] via-[#14B8A6] to-[#0B5A54] text-white px-5 pt-8 pb-12 shadow-lg relative">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                Step 1 of 1 • Account Setup
              </span>
              <h1 className="text-lg sm:text-xl font-black font-heading tracking-tight leading-tight mt-0.5">
                Complete Your Medical Profile
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-teal-100 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* User Card Overlap */}
        <div className="max-w-2xl mx-auto mt-6 bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <Avatar
            src={user?.avatarUrl || ''}
            alt={user?.fullName || 'User'}
            size="md"
            className="ring-2 ring-teal-500/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-black font-heading truncate text-slate-900">
                {user?.fullName || 'Welcome to CarePulse'}
              </p>
              <span className="bg-teal-50 text-[#0B5A54] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200/80 shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#0B5A54]" />
                Google Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">{user?.email}</p>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-2xl w-full mx-auto px-4 -mt-4 space-y-4">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-4 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card 1: Personal Identification */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#0B5A54]" />
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider font-heading">
                1. Personal Details & Contact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Primary Contact Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  {calculatedAge !== null && (
                    <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-1.5 py-0.2 rounded-md">
                      {calculatedAge} yrs
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dob}
                    max={getTodayDateString()}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Blood Group <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Droplet className="w-3.5 h-3.5 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Residential Address / City
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Downtown, Bangalore"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Emergency Contact */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider font-heading">
                2. Emergency Contact (Mandatory for Safety)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Mark Jenkins"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 12345"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Relationship
                </label>
                <select
                  value={emergencyRel}
                  onChange={(e) => setEmergencyRel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend / Relative</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer text-center"
            >
              Skip & Explore CarePulse
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-[#0B5A54] text-white text-xs font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Save & Activate CarePulse'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CompleteProfileScreen;
