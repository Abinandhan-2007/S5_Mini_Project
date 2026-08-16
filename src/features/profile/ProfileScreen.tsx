import React, { useState, useRef } from 'react';
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
  Fingerprint,
  MapPin,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { useCarePulseStore } from '../../lib/store';
import { registerDeviceBiometrics } from '../../lib/biometricAuthService';
import { calculateAge, getTodayDateString } from '../../lib/dateUtils';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const logout = useCarePulseStore((s) => s.logout);
  const updateUser = useCarePulseStore((s) => s.updateUser);

  const isBiometricEnabled = useCarePulseStore((s) => s.isBiometricEnabled);
  const toggleBiometric = useCarePulseStore((s) => s.toggleBiometric);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditVitalsModalOpen, setIsEditVitalsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [editName, setEditName] = useState(user?.fullName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.address || '');

  const [editDob, setEditDob] = useState(user?.dob || '');
  const [editGender, setEditGender] = useState(user?.gender || 'Female');
  const [editBloodGroup, setEditBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [editEmergencyName, setEditEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(user?.emergencyContact?.phone || '');
  const [editEmergencyRel, setEditEmergencyRel] = useState(user?.emergencyContact?.relationship || 'Spouse');
  const [editAllergies, setEditAllergies] = useState(user?.allergies || '');
  const [editConditions, setEditConditions] = useState(user?.preExistingConditions || '');

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      fullName: editName,
      email: editEmail,
      phone: editPhone,
      address: editAddress,
    });
    setIsEditModalOpen(false);
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      dob: editDob,
      gender: editGender,
      bloodGroup: editBloodGroup,
      allergies: editAllergies,
      preExistingConditions: editConditions,
      emergencyContact: {
        name: editEmergencyName,
        phone: editEmergencyPhone,
        relationship: editEmergencyRel,
      },
    });
    setIsEditVitalsModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Signout warning:', err);
    }
    navigate('/login', { replace: true });
  };

  // Removed 'Personal & Contact Information' and 'Insurance & Coverage' as per previous request
  const settingsRows = [
    { label: 'Medical History & Reports', icon: FileCheck, subtext: 'Consultation logs & prescriptions', action: () => navigate('/history') },
    { label: 'Notification Settings', icon: Bell, subtext: 'Appointment alerts & reminders', action: () => navigate('/notifications') },
    { label: 'Security & Biometrics', icon: Lock, subtext: 'Password, FaceID & 2FA Auth', action: () => alert('Security & Biometrics settings opened') },
    { label: 'Help Center & 24/7 Support', icon: HelpCircle, subtext: 'Contact empathetic care team', action: () => alert('CarePulse Support Hotline: 1-800-CAREPULSE') },
  ];

  const handleToggleBiometric = async () => {
    const nextState = !isBiometricEnabled;
    if (nextState) {
      // Trigger native phone device biometric prompt
      await registerDeviceBiometrics(user.email);
    }
    toggleBiometric(nextState);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      <main className="px-4 sm:px-6 md:px-8 pt-6 pb-4 space-y-6 max-w-5xl mx-auto w-full">
        {/* ULTRA-PREMIUM EXECUTIVE PATIENT HERO COVER CARD */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-[#E4E7EC] relative mt-1 text-center">
          {/* VIBRANT CYAN HERO COVER BANNER */}
          <div className="h-28 bg-gradient-to-r from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] relative p-4 flex justify-between items-start shadow-inner">
            <span className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 text-[9.5px] px-2.5 py-1 rounded-full flex items-center gap-1 font-black shadow-2xs tracking-wider uppercase">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" /> VERIFIED PATIENT
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate('/notifications')}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md border border-white/30 shadow-2xs flex items-center justify-center relative active:scale-95"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-white" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 ring-1 ring-white" />
              </button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md border border-white/30 shadow-2xs flex items-center justify-center active:scale-95"
                title="Show Medical Health ID QR"
              >
                <QrCode className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* PATIENT DETAILS & AVATAR BLOCK */}
          <div className="px-5 pb-5 pt-0 relative flex flex-col items-center -mt-10 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* AVATAR WITH CAMERA BADGE */}
            <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
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
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0B5A54] text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-[#08423D] transition-transform active:scale-90"
                title="Upload Profile Photo"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* NAME & CONTACT INFO */}
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-black font-heading text-[#111827] tracking-tight">
                {user.fullName}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
                <span>{user.email}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[#0B5A54] font-bold">{user.phone}</span>
              </div>
              {user.address && (
                <div className="flex items-center justify-center gap-1 text-[11px] text-[#6B7280] font-medium max-w-xs mx-auto">
                  <MapPin className="w-3 h-3 text-[#0B5A54] shrink-0" />
                  <span className="truncate">{user.address}</span>
                </div>
              )}
            </div>

            {/* EDIT PROFILE PILL BUTTON */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full max-w-[180px] bg-[#0B5A54] hover:bg-[#08423D] text-white font-extrabold py-2 px-4 rounded-full text-xs transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* VITAL INFORMATION COMPACT GRID */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">
              VITAL MEDICAL STATS
            </h2>
            <button
              type="button"
              onClick={() => setIsEditVitalsModalOpen(true)}
              className="text-[11px] font-extrabold text-[#0B5A54] hover:underline flex items-center gap-1 bg-[#E3F3F1] hover:bg-[#0B5A54] hover:text-white px-2.5 py-0.5 rounded-full transition-colors active:scale-95"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-white shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-[#E3F3F1] flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>DATE OF BIRTH</span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <p className="text-xs font-extrabold font-heading text-[#111827]">{user.dob || 'Not set'}</p>
                {userAge !== null && (
                  <span className="text-[10px] font-bold text-[#0B5A54] bg-[#E3F3F1] px-1.5 py-0.5 rounded-md">
                    {userAge} yrs
                  </span>
                )}
              </div>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-white shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-[#E3F3F1] flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>GENDER</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-[#111827] pl-0.5">{user.gender}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-white shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-rose-600 uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-rose-50 flex items-center justify-center">
                  <Droplet className="w-3 h-3 text-rose-500" />
                </div>
                <span>BLOOD GROUP</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-[#111827] pl-0.5">{user.bloodGroup}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-white shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center gap-1.5 text-[9.5px] font-black text-amber-600 uppercase tracking-wider">
                <div className="w-5.5 h-5.5 rounded-lg bg-amber-50 flex items-center justify-center">
                  <PhoneCall className="w-3 h-3 text-amber-500" />
                </div>
                <span>EMERGENCY</span>
              </div>
              <p className="text-[11px] font-extrabold font-heading text-[#111827] truncate pl-0.5">
                {user.emergencyContact?.name} ({user.emergencyContact?.relationship})
              </p>
            </Card>
          </div>
        </div>

        {/* BIOMETRIC SECURITY TOGGLE CARD */}
        <div className="space-y-2 pt-1">
          <h2 className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest px-1">
            BIOMETRIC SECURITY
          </h2>

          <div className="bg-white border border-[#E4E7EC] shadow-2xs rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                <Fingerprint className="w-5 h-5 text-[#0B5A54]" />
              </div>
              <div className="text-left space-y-0.5">
                <h4 className="text-xs font-black font-heading text-[#111827]">
                  Biometric Login (Fingerprint / Mobile PIN)
                </h4>
                <p className="text-[10px] text-[#6B7280] font-medium">
                  {isBiometricEnabled
                    ? 'Synced with mobile phone Fingerprint / PIN'
                    : 'Disabled — Password required to log in'}
                </p>
              </div>
            </div>

            {/* INTERACTIVE TOGGLE SWITCH BUTTON */}
            <button
              type="button"
              onClick={handleToggleBiometric}
              className={clsx(
                'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shadow-inner shrink-0',
                isBiometricEnabled ? 'bg-[#0B5A54]' : 'bg-gray-300'
              )}
              title={isBiometricEnabled ? 'Disable Biometric Login' : 'Enable Biometric Login'}
            >
              <div
                className={clsx(
                  'w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out',
                  isBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* ACCOUNT PREFERENCES LIST */}
        <div className="space-y-2 pt-1">
          <h2 className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest px-1">
            ACCOUNT PREFERENCES
          </h2>

          <Card padding="none" className="divide-y divide-[#E4E7EC]/60 overflow-hidden shadow-2xs bg-white rounded-2xl border border-[#E4E7EC]">
            {settingsRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <button
                  key={idx}
                  onClick={row.action}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-[#E3F3F1]/40 transition-colors active:bg-[#E3F3F1]/60 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0 group-hover:bg-[#0B5A54] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] font-heading">{row.label}</h4>
                      <p className="text-[10px] text-[#6B7280] font-medium">{row.subtext}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0B5A54] transition-colors" />
                </button>
              );
            })}
          </Card>
        </div>

        <div className="pt-3 flex justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full max-w-[200px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-full py-3 px-5 text-xs font-black transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer font-heading"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </main>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-3.5 shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-base font-extrabold font-heading text-[#111827]">Edit Profile Info</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
              <Input
                label="FULL NAME"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="EMAIL ADDRESS"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
              <Input
                label="PHONE NUMBER"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
              <Input
                label="RESIDENTIAL ADDRESS"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Enter complete address"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditVitalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-base font-extrabold font-heading text-[#111827]">Edit Vital Medical Stats</h3>
              <button onClick={() => setIsEditVitalsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-3 text-left">
              <Input
                label={editDobAge !== null ? `DATE OF BIRTH (${editDobAge} YEARS OLD)` : 'DATE OF BIRTH'}
                type="date"
                max={getTodayDateString()}
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
              />

              <Select
                label="GENDER"
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                options={[
                  { label: 'Female', value: 'Female' },
                  { label: 'Male', value: 'Male' },
                  { label: 'Other', value: 'Other' },
                ]}
              />

              <Select
                label="BLOOD GROUP"
                value={editBloodGroup}
                onChange={(e) => setEditBloodGroup(e.target.value)}
                options={[
                  { label: 'A+', value: 'A+' },
                  { label: 'A-', value: 'A-' },
                  { label: 'B+', value: 'B+' },
                  { label: 'B-', value: 'B-' },
                  { label: 'O+', value: 'O+' },
                  { label: 'O-', value: 'O-' },
                  { label: 'AB+', value: 'AB+' },
                  { label: 'AB-', value: 'AB-' },
                ]}
              />

              <Input
                label="EMERGENCY CONTACT NAME"
                value={editEmergencyName}
                onChange={(e) => setEditEmergencyName(e.target.value)}
              />

              <Input
                label="EMERGENCY CONTACT PHONE"
                value={editEmergencyPhone}
                onChange={(e) => setEditEmergencyPhone(e.target.value)}
              />

              <Input
                label="RELATIONSHIP"
                value={editEmergencyRel}
                onChange={(e) => setEditEmergencyRel(e.target.value)}
              />

              <Input
                label="ALLERGIES (SEPARATED BY COMMAS)"
                value={editAllergies}
                onChange={(e) => setEditAllergies(e.target.value)}
              />

              <Input
                label="PRE-EXISTING CONDITIONS"
                value={editConditions}
                onChange={(e) => setEditConditions(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditVitalsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Vitals
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            <div className="space-y-0.5 text-center">
              <p className="text-xs font-bold text-[#111827]">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 font-medium">Patient ID: #CP-94827</p>
              <p className="text-[10px] text-[#0B5A54] font-bold">CarePulse Emergency Check-in</p>
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
