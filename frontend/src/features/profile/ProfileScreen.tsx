import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
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
  Globe,
} from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { LanguageSelectModal } from '../../components/ui/LanguageSelectModal';
import { useTranslation } from '../../lib/i18n';
import { useCarePulseStore } from '../../lib/store';
import { calculateAge, getTodayDateString } from '../../lib/dateUtils';
import { apiPost } from '../../lib/apiFetch';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isUserProfileIncomplete, clearProfilePromptTracking } from '../auth/CompleteProfileScreen';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentOption } = useTranslation();
  const user = useCarePulseStore((s) => s.user);
  const logout = useCarePulseStore((s) => s.logout);
  const updateUser = useCarePulseStore((s) => s.updateUser);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateUser({ avatarUrl: reader.result });
          if (user?.id) {
            apiPost(`/patients/${encodeURIComponent(user.id)}/update`, { avatarUrl: reader.result }).catch(() => { });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
      label: t('profile.language', 'Language Preference'),
      icon: Globe,
      subtext: `${currentOption.nativeLabel} (${currentOption.label}) • ${currentOption.flag}`,
      badge: currentOption.nativeLabel,
      action: () => setIsLanguageModalOpen(true),
    },
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800 antialiased">
      {/* HEADER SECTION WITH HERO GRADIENT */}
      <header className="bg-gradient-to-br from-[#0B5A54] via-[#0D6E67] to-[#14B8A6] pt-7 pb-16 px-5 text-white shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <h1 className="text-base sm:text-lg font-black font-heading tracking-tight">
            {t('profile.title', 'Patient Profile & Vitals')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md border border-white/30 shadow-2xs flex items-center justify-center active:scale-95 cursor-pointer"
              title="Show Medical Health ID QR"
            >
              <QrCode className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="max-w-lg mx-auto px-4 -mt-10 space-y-4">
        {/* PATIENT CARD OVERLAP */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 text-center relative flex flex-col items-center space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* AVATAR WITH CAMERA BADGE */}
          <div className="relative cursor-pointer group -mt-12" onClick={handleAvatarClick}>
            <Avatar
              src={user.avatarUrl}
              alt={user.fullName}
              size="lg"
              hasRing
              className="ring-4 ring-white shadow-xl transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAvatarClick();
              }}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0B5A54] text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-[#08423D] transition-transform active:scale-90 cursor-pointer"
              title="Upload Profile Photo"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* NAME & CONTACT INFO */}
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-lg font-black font-heading text-slate-900 tracking-tight">
                {user.fullName}
              </h2>
              {user.authProvider === 'google' && (
                <span className="bg-teal-50 text-[#0B5A54] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                  Google
                </span>
              )}
            </div>

            {/* PROMINENT EASY-TO-READ PATIENT DISPLAY CODE */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/90 text-[#0B5A54] text-xs font-black shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Patient ID:</span>
              <span className="font-mono font-black tracking-wider text-xs">{patientDisplayCode}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 pt-0.5">
              <span>{user.email}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[#0B5A54] font-bold">{user.phone || 'No phone set'}</span>
            </div>
            {user.address && (
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium max-w-xs mx-auto">
                <MapPin className="w-3 h-3 text-[#0B5A54] shrink-0" />
                <span className="truncate">{user.address}</span>
              </div>
            )}
          </div>

          {/* EDIT PROFILE BUTTON */}
          <button
            type="button"
            onClick={openEditModal}
            className="w-full bg-[#E3F3F1] hover:bg-[#0B5A54] text-[#0B5A54] hover:text-white border border-[#14B8A6]/30 py-2.5 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer shadow-2xs font-heading"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('profile.editProfile', 'Edit Complete Medical Profile')}</span>
          </button>
        </div>

        {/* INCOMPLETE PROFILE REMINDER CARD */}
        {isUserProfileIncomplete(user) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 text-left">
                <h4 className="text-xs font-black text-slate-900 font-heading tracking-tight">
                  Medical Profile Incomplete
                </h4>
                <p className="text-[10.5px] text-slate-600 font-medium">
                  Add your contact and emergency details to enable appointment bookings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/complete-profile')}
              className="px-3.5 py-1.5 bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Complete Now →
            </button>
          </div>
        )}

        {/* VITAL INFORMATION COMPACT GRID */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-heading">
              VITAL MEDICAL STATS
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* OFFICIAL CAREPULSE PATIENT ID CARD */}
            <Card padding="sm" className="col-span-2 space-y-1.5 border border-teal-200/90 bg-gradient-to-r from-teal-50/80 via-white to-teal-50/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[#0B5A54] text-white flex items-center justify-center">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                  <span>{t('profile.patientId', 'OFFICIAL CAREPULSE PATIENT ID')}</span>
                </div>
                <span className="text-[10px] font-bold text-[#0B5A54] bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                  {t('profile.activeStatus', 'Active')}
                </span>
              </div>
              <div className="flex items-center justify-between pl-0.5 pt-0.5">
                <div>
                  <p className="text-sm sm:text-base font-black font-mono tracking-wider text-[#0B5A54]">
                    {patientDisplayCode}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Show or read this ID at reception, doctor consultation, and emergency check-in
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(patientDisplayCode);
                    alert(`Patient ID ${patientDisplayCode} copied to clipboard!`);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-teal-50 text-[#0B5A54] border border-teal-200 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Copy Patient ID"
                >
                  Copy
                </button>
              </div>
            </Card>
            <Card padding="sm" className="space-y-1 border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>{t('profile.dob', 'DATE OF BIRTH')}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <p className="text-xs font-extrabold font-heading text-slate-900">{user.dob || 'Not set'}</p>
                {userAge !== null && (
                  <span className="text-[10px] font-bold text-[#0B5A54] bg-teal-50 px-1.5 py-0.5 rounded-md">
                    {userAge} yrs
                  </span>
                )}
              </div>
            </Card>

            <Card padding="sm" className="space-y-1 border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-teal-50 flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>{t('profile.gender', 'GENDER')}</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-slate-900 pl-0.5">{user.gender || 'Not set'}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-rose-600 uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-rose-50 flex items-center justify-center">
                  <Droplet className="w-3 h-3 text-rose-500" />
                </div>
                <span>{t('profile.bloodGroup', 'BLOOD GROUP')}</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-slate-900 pl-0.5">{user.bloodGroup || 'O+'}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-amber-600 uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-amber-50 flex items-center justify-center">
                  <PhoneCall className="w-3 h-3 text-amber-500" />
                </div>
                <span>{t('profile.emergency', 'EMERGENCY')}</span>
              </div>
              <p className="text-[11px] font-extrabold font-heading text-slate-900 truncate pl-0.5">
                {user.emergencyContact?.name || 'Contact set'} ({user.emergencyContact?.relationship || 'Primary'})
              </p>
            </Card>
          </div>
        </div>

        {/* ACCOUNT PREFERENCES LIST */}
        <div className="space-y-2 pt-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 font-heading">
            {t('profile.accountPreferences', 'ACCOUNT PREFERENCES')}
          </h3>

          <Card padding="none" className="divide-y divide-slate-100 overflow-hidden shadow-2xs bg-white rounded-2xl border border-slate-200">
            {settingsRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <button
                  key={idx}
                  onClick={row.action}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-teal-50/50 transition-colors active:bg-teal-100/50 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-[#0B5A54] shrink-0 group-hover:bg-[#0B5A54] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-heading">{row.label}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{row.subtext}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0B5A54] transition-colors" />
                </button>
              );
            })}
          </Card>
        </div>

        {/* SIGN OUT */}
        <div className="pt-3 flex justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full max-w-[200px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full py-3 px-5 text-xs font-black transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer font-heading"
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

      {/* LANGUAGE SELECTION MODAL */}
      <LanguageSelectModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />

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
              <h3 className="text-xs font-extrabold text-[#0B5A54] uppercase tracking-wider font-heading">Medical Health ID</h3>
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
              <p className="text-[10px] text-slate-500 font-medium pt-0.5">CarePulse Quick Desk & OPD Check-in</p>
            </div>

            <Button
              fullWidth
              variant="primary"
              size="sm"
              className="rounded-xl text-xs font-bold"
              onClick={() => setIsQrModalOpen(false)}
            >
              Close QR Code
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
