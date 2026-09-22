import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  User as UserIcon,
  Droplet,
  PhoneCall,
  ChevronRight,
  Lock,
  Bell,
  HelpCircle,
  LogOut,
  Edit3,
  X,
  CheckCircle2,
  FileCheck,
  QrCode,
  MapPin,
  AlertCircle,
  Phone,
  ShieldCheck,
  Sliders,
  ScanFace,
  Copy,
  Check,
  Mail,
  BadgeCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useTranslation } from '../../lib/i18n';
import { useCarePulseStore } from '../../lib/store';
import { calculateAge, getTodayDateString } from '../../lib/dateUtils';
import { apiPost } from '../../lib/apiFetch';
import {
  registerDeviceBiometrics,
  checkDeviceBiometricSupport,
} from '../../lib/biometricAuthService';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isUserProfileIncomplete, clearProfilePromptTracking } from '../auth/CompleteProfileScreen';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCarePulseStore((s) => s.user);
  const logout = useCarePulseStore((s) => s.logout);
  const updateUser = useCarePulseStore((s) => s.updateUser);
  const isBiometricEnabled = useCarePulseStore((s) => s.isBiometricEnabled);
  const toggleBiometric = useCarePulseStore((s) => s.toggleBiometric);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [copiedId, setCopiedId] = useState(false);
  const [biometricNotice, setBiometricNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleBiometric = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBiometricNotice(null);
    const nextState = !isBiometricEnabled;

    if (nextState) {
      const support = await checkDeviceBiometricSupport();
      if (!support.isAvailable) {
        setBiometricNotice({
          type: 'error',
          text: support.message || 'Biometric hardware unavailable on this device.',
        });
        setTimeout(() => setBiometricNotice(null), 3500);
        return;
      }

      const registered = await registerDeviceBiometrics(user?.id);
      if (registered) {
        toggleBiometric(true);
        setBiometricNotice({
          type: 'success',
          text: 'Biometric Face ID / Fingerprint lock enabled.',
        });
      } else {
        setBiometricNotice({
          type: 'error',
          text: 'Biometric registration cancelled or failed.',
        });
      }
    } else {
      toggleBiometric(false);
      setBiometricNotice({
        type: 'success',
        text: 'Biometric App Lock disabled.',
      });
    }
    setTimeout(() => setBiometricNotice(null), 3500);
  };

  const handleCopyPatientId = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(patientDisplayCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  useEffect(() => {
    const fetchAppVersion = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await App.getInfo();
          if (info?.version) {
            setAppVersion(info.version);
          }
        } catch (_) { }
      }
    };
    fetchAppVersion();
  }, []);


  // Unified Edit Form State (Name, Email, Phone, Address, DOB, Gender, Blood Group, Emergency Contact)
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.address || '');
  const [editDob, setEditDob] = useState(user?.dob || '2000-01-15');
  const [editGender, setEditGender] = useState(user?.gender || 'Female');
  const [editBloodGroup, setEditBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [editEmergencyName, setEditEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(user?.emergencyContact?.phone || '');
  const [editEmergencyRel, setEditEmergencyRel] = useState(user?.emergencyContact?.relationship || 'Parent');

  const openEditModal = () => {
    if (user) {
      setEditName(user.fullName || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone && user.phone !== '+91 98765 00000' && user.phone !== '+91 98765 43210' ? user.phone : '');
      setEditAddress(user.address || '');
      setEditDob(user.dob && user.dob !== getTodayDateString() ? user.dob : '2000-01-15');
      setEditGender(user.gender && user.gender !== 'Not specified' ? user.gender : 'Female');
      setEditBloodGroup(user.bloodGroup || 'O+');
      setEditEmergencyName(user.emergencyContact?.name || '');
      setEditEmergencyPhone(
        user.emergencyContact?.phone &&
          user.emergencyContact.phone !== '+91 98765 00000' &&
          user.emergencyContact.phone !== '+91 98765 43210'
          ? user.emergencyContact.phone
          : ''
      );
      setEditEmergencyRel(user.emergencyContact?.relationship || 'Parent');
    }
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditModalOpen(true);
  };

  const userAge = calculateAge(user?.dob);
  const editDobAge = calculateAge(editDob);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <p className="text-sm font-medium text-[#6B7280]">Please log in to view your profile.</p>
        <Button size="sm" onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  const handleSaveAllProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const cleanName = editName.trim();
    const cleanPhone = editPhone.trim();
    const cleanDob = editDob.trim();
    const cleanAddress = editAddress.trim();
    const cleanEmergName = editEmergencyName.trim();
    const cleanEmergPhone = editEmergencyPhone.trim();

    if (!cleanName) {
      setSaveError('Please enter your full legal name.');
      return;
    }

    const primaryDigits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || primaryDigits.length < 10) {
      setSaveError('Please enter a valid 10-digit primary contact phone number.');
      return;
    }

    if (!cleanDob || cleanDob > getTodayDateString()) {
      setSaveError('Please select a valid date of birth (cannot be in the future).');
      return;
    }

    if (cleanEmergPhone) {
      const emergDigits = cleanEmergPhone.replace(/\D/g, '');
      if (emergDigits.length >= 10 && primaryDigits.slice(-10) === emergDigits.slice(-10)) {
        setSaveError('Emergency contact phone must be different from your primary phone number.');
        return;
      }
    }

    setIsSaving(true);

    const updatedPayload = {
      fullName: cleanName,
      email: editEmail.trim(),
      phone: cleanPhone,
      address: cleanAddress,
      dob: cleanDob,
      gender: editGender,
      bloodGroup: editBloodGroup,
      emergencyContact: {
        name: cleanEmergName || 'Primary Contact',
        phone: cleanEmergPhone || cleanPhone,
        relationship: editEmergencyRel,
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
        } catch { }
        clearProfilePromptTracking(user.id);
      }

      setSaveSuccess('Profile and medical stats saved successfully!');
      setTimeout(() => {
        setIsSaving(false);
        setIsEditModalOpen(false);
        setSaveSuccess(null);
      }, 600);
    } catch (err: any) {
      setIsSaving(false);
      setSaveError(err.message || 'Failed to save changes.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Signout warning:', err);
    }
    navigate('/login', { replace: true });
  };

  const settingsRows = [
    {
      label: t('profile.advancedSettings', 'Advanced Settings'),
      icon: Sliders,
      subtext: t('profile.advancedSettingsSubtext', 'App features, biometric lock, alerts & audio'),
      action: () => navigate('/profile/advanced-settings'),
    },
    {
      label: t('profile.medicalHistory', 'Medical History & Reports'),
      icon: FileCheck,
      subtext: t('profile.medicalHistorySubtext', 'Consultation logs & prescriptions'),
      action: () => navigate('/history'),
    },
    {
      label: t('profile.notificationSettings', 'Notification Settings'),
      icon: Bell,
      subtext: t('profile.notificationSettingsSubtext', 'Appointment alerts & reminders'),
      action: () => navigate('/notifications'),
    },
    {
      label: t('profile.security', 'Security & Biometrics'),
      icon: Lock,
      subtext: t('profile.securitySubtext', 'Password, FaceID & 2FA Auth'),
      action: () => navigate('/profile/advanced-settings'),
    },
    {
      label: t('profile.help', 'Help Center & 24/7 Support'),
      icon: HelpCircle,
      subtext: t('profile.helpSubtext', 'Contact empathetic care team'),
      action: () => alert('CarePulse Support Hotline: 1-800-CAREPULSE'),
    },
  ];

  const patientDisplayCode =
    user.patient_code ||
    user.patientCode ||
    (user.id?.startsWith('PAT-') ? user.id : user.id ? `PAT-${user.id.slice(0, 6).toUpperCase()}` : 'PAT-000001');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800 antialiased select-none">
      {/* 1. TOPBAR WITH "PROFILE" TITLE */}
      <header className="sticky top-0 z-30 bg-transparent px-4 sm:px-6 pt-4 pb-2 w-full text-left transition-all">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
              {t('nav.profile', 'Profile')}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">
              {t('profile.accountPreferences', 'Patient Profile & Medical Identity')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 transition-all relative active:scale-95 shadow-2xs cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 relative z-20">
        {/* PATIENT CARD OVERLAP - CONCIERGE MEDICAL IDENTITY PASS */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-[32px] p-5 sm:p-6 shadow-[0_20px_50px_-12px_rgba(4,39,34,0.18),0_2px_10px_rgba(0,0,0,0.03)] border border-white ring-1 ring-slate-200/70 text-center flex flex-col items-center space-y-4 overflow-hidden">
          {/* Subtle decorative background watermark */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full pointer-events-none" />

          {/* PATIENT AVATAR WITH LUXURY HALO */}
          <div className="relative mt-1 sm:mt-2">
            <div className="p-1 rounded-full bg-gradient-to-tr from-[#059669] via-[#14B8A6] to-[#38BDF8] shadow-[0_12px_32px_-6px_rgba(16,185,129,0.45)]">
              <div className="p-1 bg-white rounded-full">
                <Avatar
                  alt={user.fullName}
                  fallbackText={user.fullName}
                  size="xl"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full"
                />
              </div>
            </div>

            {/* Active verified patient green indicator */}
            <div
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center shadow-xs"
              title="Active Verified Patient"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          {/* NAME & CONTACT INFO */}
          <div className="space-y-2 flex flex-col items-center w-full">
            <div className="flex flex-wrap items-center justify-center gap-2">
               <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
                {user.fullName}
              </h2>
              {user.authProvider === 'google' ? (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-[#0B5A54] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200/90 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Google
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-[#0B5A54] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200/90 shadow-2xs">
                  <BadgeCheck className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              )}
            </div>

            {/* CONTACT METADATA CAPSULES */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-[11px] font-semibold">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[190px]">{user.email}</span>
              </div>

              <button
                type="button"
                onClick={openEditModal}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${user.phone && user.phone !== 'No phone set'
                  ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100/80'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                title="Edit Phone Number"
              >
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{user.phone || '+ Add Phone'}</span>
              </button>

              {user.address && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/70 text-slate-600 text-[11px] font-medium max-w-xs">
                  <MapPin className="w-3 h-3 text-[#0B5A54] shrink-0" />
                  <span className="truncate">{user.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* EDIT COMPLETE MEDICAL PROFILE BUTTON - SLEEK COMPACT PILL */}
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0B5A54] via-[#0E6C64] to-[#14B8A6] hover:from-[#084540] hover:to-[#0D9488] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer font-heading mx-auto group border border-teal-300/30"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform shrink-0" />
            <span className="tracking-tight">{t('profile.editProfile', 'Edit Complete Medical Profile')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-200/90 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* SECONDARY QUICK ACTIONS DOCK */}
          <div className="grid grid-cols-3 gap-2 w-full pt-0.5">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50/90 hover:bg-teal-50 border border-slate-200/70 hover:border-teal-200/90 text-slate-700 hover:text-[#0B5A54] transition-all cursor-pointer group shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-[#0B5A54] mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10.5px] font-bold">QR Pass</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50/90 hover:bg-teal-50 border border-slate-200/70 hover:border-teal-200/90 text-slate-700 hover:text-[#0B5A54] transition-all cursor-pointer group shadow-2xs"
            >
              <FileCheck className="w-4 h-4 text-[#0B5A54] mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10.5px] font-bold">Records</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPatientId}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50/90 hover:bg-teal-50 border border-slate-200/70 hover:border-teal-200/90 text-slate-700 hover:text-[#0B5A54] transition-all cursor-pointer group shadow-2xs"
            >
              {copiedId ? (
                <Check className="w-4 h-4 text-emerald-600 mb-1 animate-in zoom-in-50" />
              ) : (
                <Copy className="w-4 h-4 text-[#0B5A54] mb-1 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[10.5px] font-bold">{copiedId ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>
        </div>

        {/* INCOMPLETE PROFILE REMINDER CARD */}
        {isUserProfileIncomplete(user) && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in backdrop-blur-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 text-left">
                <h4 className="text-xs font-black text-slate-900 font-heading tracking-tight">
                  {t('profile.incompleteTitle', 'Medical Profile Incomplete')}
                </h4>
                <p className="text-[10.5px] text-slate-600 font-medium">
                  {t('profile.incompleteDesc', 'Add your contact and emergency details to enable appointment bookings.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/complete-profile')}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#0B5A54] to-[#0D6E67] hover:from-[#08423D] hover:to-[#0B5A54] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              {t('profile.completeNow', 'Complete Now →')}
            </button>
          </div>
        )}

        {/* VITAL INFORMATION COMPACT GRID - CLINICAL VITALS DASHBOARD */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* OFFICIAL CAREPULSE PATIENT ID SMART CARD */}
            <div className="col-span-2 relative overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-50/90 via-white to-emerald-50/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#0B5A54] uppercase tracking-wider">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0B5A54] to-[#042824] text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>{t('profile.patientId', 'OFFICIAL CAREPULSE PATIENT ID')}</span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  {t('profile.activeStatus', 'Active')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <p className="text-base sm:text-lg font-black font-mono tracking-wider text-[#0B5A54]">
                    {patientDisplayCode}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {t('profile.patientIdDesc', 'Show or read this ID at reception, doctor consultation, and emergency check-in')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPatientId}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-teal-50 text-[#0B5A54] border border-teal-200 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
                  title="Copy Patient ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#0B5A54]" />
                      <span>{t('common.copy', 'Copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DATE OF BIRTH TILE */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                </div>
                <span>{t('profile.dob', 'DATE OF BIRTH')}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <p className="text-xs font-black font-heading text-slate-900">{user.dob || t('common.notSet', 'Not set')}</p>
                {userAge !== null && (
                  <span className="text-[10px] font-black text-[#0B5A54] bg-teal-100/70 px-1.5 py-0.5 rounded-md">
                    {userAge} {t('common.yrs', 'yrs')}
                  </span>
                )}
              </div>
            </div>

            {/* GENDER TILE */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-cyan-700 uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-cyan-50 border border-cyan-200/60 flex items-center justify-center shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <span>{t('profile.gender', 'GENDER')}</span>
              </div>
              <p className="text-xs font-black font-heading text-slate-900 pl-0.5">{user.gender || t('common.notSet', 'Not set')}</p>
            </div>

            {/* BLOOD GROUP TILE */}
            <div className="p-3.5 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 via-white to-rose-50/30 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-rose-600 uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-rose-100/80 border border-rose-200 flex items-center justify-center shrink-0">
                  <Droplet className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <span>{t('profile.bloodGroup', 'BLOOD GROUP')}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <p className="text-xs sm:text-sm font-black font-heading text-rose-700">{user.bloodGroup || 'O+'}</p>
                <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                  Rh Positive
                </span>
              </div>
            </div>

            {/* EMERGENCY CONTACT TILE */}
            <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-amber-700 uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span>{t('profile.emergency', 'EMERGENCY')}</span>
              </div>
              <p className="text-[11px] font-black font-heading text-slate-900 truncate pl-0.5">
                {user.emergencyContact?.name || t('profile.contactSet', 'Contact set')}
                <span className="text-[10px] text-amber-700 font-semibold block sm:inline sm:ml-1">
                  ({user.emergencyContact?.relationship || t('profile.primary', 'Primary')})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ACCOUNT PREFERENCES LIST */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-heading">
              {t('profile.accountPreferences', 'ACCOUNT PREFERENCES')}
            </h3>
            {biometricNotice && (
              <span className={`text-[10px] font-bold animate-in fade-in ${biometricNotice.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {biometricNotice.text}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden shadow-sm bg-white rounded-3xl border border-slate-200">
            {/* BIOMETRIC APP LOCK ENABLE BUTTON ROW */}
            <div
              onClick={handleToggleBiometric}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-teal-50/40 transition-colors cursor-pointer select-none group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-2xs',
                    isBiometricEnabled
                      ? 'bg-[#0B5A54] text-white shadow-xs'
                      : 'bg-teal-50 text-[#0B5A54] group-hover:bg-[#0B5A54] group-hover:text-white'
                  )}
                >
                  <ScanFace className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 font-heading">
                      {t('settings.biometricLock', 'Biometric App Lock')}
                    </h4>
                    <span
                      className={clsx(
                        'text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                        isBiometricEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {isBiometricEnabled ? t('common.on', 'ON') : t('common.off', 'OFF')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isBiometricEnabled
                      ? t('settings.biometricLockSubtextActive', '1-touch Face ID & Fingerprint unlock active')
                      : t('settings.biometricLockSubtextDisabled', 'Tap switch to enable instant biometric security')}
                  </p>
                </div>
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isBiometricEnabled}
                onClick={handleToggleBiometric}
                className={clsx(
                  'w-11 h-6 rounded-full p-0.5 relative inline-flex items-center shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none shadow-inner',
                  isBiometricEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                )}
                title={isBiometricEnabled ? 'Disable Biometric Lock' : 'Enable Biometric Lock'}
              >
                <span
                  className={clsx(
                    'w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out block pointer-events-none',
                    isBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            {settingsRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <button
                  key={idx}
                  onClick={row.action}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-teal-50/40 transition-colors active:bg-teal-100/40 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-teal-50 flex items-center justify-center text-[#0B5A54] shrink-0 group-hover:bg-[#0B5A54] group-hover:text-white group-hover:scale-105 transition-all shadow-2xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-heading">{row.label}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{row.subtext}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0B5A54] group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* SIGN OUT */}
        <div className="pt-3 flex justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full max-w-[220px] bg-gradient-to-r from-rose-50 to-rose-100/80 hover:from-rose-100 hover:to-rose-200 text-rose-700 border border-rose-200 rounded-full py-3 px-5 text-xs font-black transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer font-heading"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>{t('profile.signOut', 'Sign Out')}</span>
          </button>
        </div>

        {/* APP VERSION INDICATOR */}
        <div className="pt-4 pb-2 text-center select-none">
          <p className="text-[11px] font-bold text-slate-400 tracking-wide font-mono">
            CarePulse v{appVersion}
          </p>
        </div>
      </main>



      {/* UNIFIED COMPREHENSIVE PROFILE EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in select-none">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B5A54] to-teal-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black font-heading tracking-tight">
                    Edit Complete Medical Profile
                  </h3>
                  <p className="text-[10px] text-teal-100">
                    Update personal information, contact info, emergency contacts & health vitals.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveAllProfile} className="p-5 sm:p-6 overflow-y-auto space-y-4.5 flex-1 text-left">
              {saveError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3.5 rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {/* SECTION 1: PERSONAL & CONTACT */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider font-heading">
                    1. Personal Identification & Contact
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Primary Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                      />
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
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="e.g. 123 Main St, Bangalore"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VITALS & DEMOGRAPHICS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider font-heading">
                    2. Demographics & Vitals
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Date of Birth <span className="text-rose-500">*</span>
                      </label>
                      {editDobAge !== null && (
                        <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-1.5 py-0.2 rounded-md">
                          {editDobAge} yrs
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={editDob}
                      max={getTodayDateString()}
                      onChange={(e) => setEditDob(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
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
                    <select
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
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

              {/* SECTION 3: EMERGENCY CONTACT */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider font-heading">
                    3. Emergency Contact
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editEmergencyName}
                      onChange={(e) => setEditEmergencyName(e.target.value)}
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
                      value={editEmergencyPhone}
                      onChange={(e) => setEditEmergencyPhone(e.target.value)}
                      placeholder="+91 98765 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Relationship
                    </label>
                    <select
                      value={editEmergencyRel}
                      onChange={(e) => setEditEmergencyRel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all cursor-pointer"
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

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving Changes...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDICAL HEALTH ID QR MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 space-y-4 text-center shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold text-[#0B5A54] uppercase tracking-wider font-heading">{t('profile.medicalHealthId', 'Medical Health ID')}</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=CAREPULSE-PATIENT-${user.id}`}
                alt="Patient QR Code"
                className="w-40 h-40 mx-auto rounded-lg"
              />
            </div>

            <div className="space-y-1 text-center">
              <p className="text-xs font-bold text-slate-900">{user.fullName}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-black font-mono">
                <span>Patient ID: {patientDisplayCode}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium pt-0.5">{t('profile.qrCheckinDesc', 'CarePulse Quick Desk & OPD Check-in')}</p>
            </div>

            <Button
              fullWidth
              variant="primary"
              size="sm"
              className="rounded-xl text-xs font-bold"
              onClick={() => setIsQrModalOpen(false)}
            >
              {t('profile.closeQr', 'Close QR Code')}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
