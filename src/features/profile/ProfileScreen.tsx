import React, { useState, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Share2,
  Calendar,
  User as UserIcon,
  Droplet,
  PhoneCall,
  ChevronRight,
  Lock,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  Edit3,
  X,
  CheckCircle2,
  FileCheck,
  QrCode,
} from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { useCarePulseStore } from '../../lib/store';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const logout = useCarePulseStore((s) => s.logout);
  const updateUser = useCarePulseStore((s) => s.updateUser);

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

  const [editDob, setEditDob] = useState(user?.dob || '');
  const [editGender, setEditGender] = useState(user?.gender || 'Female');
  const [editBloodGroup, setEditBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [editEmergencyName, setEditEmergencyName] = useState(user?.emergencyContact.name || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(user?.emergencyContact.phone || '');
  const [editEmergencyRel, setEditEmergencyRel] = useState(user?.emergencyContact.relationship || 'Spouse');
  const [editAllergies, setEditAllergies] = useState(user?.allergies || '');
  const [editConditions, setEditConditions] = useState(user?.preExistingConditions || '');

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] flex flex-col items-center justify-center p-4">
        <p className="text-[#6B7280]">Please log in to view your profile.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>
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

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const settingsRows = [
    { label: 'Personal & Contact Information', icon: UserIcon, subtext: 'Name, Phone, Email & Address', action: () => setIsEditModalOpen(true) },
    { label: 'Medical History & Reports', icon: FileCheck, subtext: 'Consultation logs & prescriptions', action: () => navigate('/history') },
    { label: 'Insurance & Coverage', icon: Shield, subtext: 'CarePulse Platinum Plan • Active', action: () => alert('Insurance: CarePulse Platinum Plan (ID #CP-94827)') },
    { label: 'Notification Settings', icon: Bell, subtext: 'Appointment reminders & SMS alerts', action: () => alert('Notification settings opened') },
    { label: 'Security & Biometrics', icon: Lock, subtext: 'Password, FaceID & 2FA Auth', action: () => alert('Security & Biometrics settings opened') },
    { label: 'Help Center & 24/7 Support', icon: HelpCircle, subtext: 'Contact empathetic care team', action: () => alert('CarePulse Support Hotline: 1-800-CAREPULSE') },
  ];

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      <main className="px-3.5 pt-3 pb-4 space-y-3">
        {/* COMPACT PATIENT HERO COVER CARD WITH NOTIFICATION BELL */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#E4E7EC] relative">
          <div className="h-20 bg-gradient-teal relative p-3 flex justify-between items-start">
            <Badge variant="tint" size="sm" className="bg-white/20 text-white backdrop-blur-md border border-white/30 text-[9px] px-2 py-0.5 gap-1 font-bold">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" /> VERIFIED PATIENT
            </Badge>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => alert('Notifications: You have 1 upcoming appointment!')}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-md shadow-2xs relative"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-white" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400 ring-1 ring-white" />
              </button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-md shadow-2xs"
                title="Show Medical Health ID QR"
              >
                <QrCode className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* User Details Content */}
          <div className="px-4 pb-3.5 pt-0 text-center relative flex flex-col items-center -mt-9 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="relative cursor-pointer" onClick={handleAvatarClick}>
              <Avatar src={user.avatarUrl} alt={user.fullName} size="lg" hasRing className="ring-3 ring-white shadow-md" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAvatarClick();
                }}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#0B5A54] text-white flex items-center justify-center border border-white shadow-xs hover:bg-[#08423D] transition-transform active:scale-90"
                title="Upload Profile Photo"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>

            <div className="space-y-0">
              <h1 className="text-base font-bold font-heading text-[#111827]">{user.fullName}</h1>
              <p className="text-[11px] text-[#6B7280] font-medium">{user.email}</p>
              <p className="text-[11px] text-[#0B5A54] font-bold">{user.phone}</p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-2 pt-0.5 w-full max-w-[260px]">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 rounded-lg py-1.5 text-xs"
                leftIcon={<Edit3 className="w-3 h-3" />}
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </Button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="w-8 h-8 rounded-lg bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white transition-colors flex items-center justify-center shrink-0 border border-[#14B8A6]/30 shadow-2xs"
                title="Share Medical ID"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* VITAL INFORMATION COMPACT GRID */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
              VITAL MEDICAL STATS
            </h2>
            <button
              type="button"
              onClick={() => setIsEditVitalsModalOpen(true)}
              className="text-[11px] font-bold text-[#0B5A54] hover:underline flex items-center gap-0.5 bg-[#E3F3F1] hover:bg-[#0B5A54] hover:text-white px-2 py-0.5 rounded-pill transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit Vitals
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-[#F8FAFC]">
              <div className="flex items-center gap-1 text-[9px] font-bold text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-[#E3F3F1] flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>DATE OF BIRTH</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-[#111827] pl-0.5">{user.dob}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-[#F8FAFC]">
              <div className="flex items-center gap-1 text-[9px] font-bold text-[#0B5A54] uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-[#E3F3F1] flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-[#0B5A54]" />
                </div>
                <span>GENDER</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-[#111827] pl-0.5">{user.gender}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-[#F8FAFC]">
              <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center">
                  <Droplet className="w-3 h-3 text-rose-500" />
                </div>
                <span>BLOOD GROUP</span>
              </div>
              <p className="text-xs font-extrabold font-heading text-[#111827] pl-0.5">{user.bloodGroup}</p>
            </Card>

            <Card padding="sm" className="space-y-1 border border-[#E4E7EC] bg-[#F8FAFC]">
              <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
                  <PhoneCall className="w-3 h-3 text-amber-500" />
                </div>
                <span>EMERGENCY</span>
              </div>
              <p className="text-[11px] font-extrabold font-heading text-[#111827] truncate pl-0.5">
                {user.emergencyContact.name} ({user.emergencyContact.relationship})
              </p>
            </Card>
          </div>
        </div>

        {/* ACCOUNT SETTINGS LIST */}
        <div className="space-y-1.5">
          <h2 className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider px-1">
            ACCOUNT PREFERENCES
          </h2>

          <Card padding="none" className="divide-y divide-[#E4E7EC]/60 overflow-hidden shadow-2xs bg-[#F8FAFC]">
            {settingsRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <button
                  key={idx}
                  onClick={row.action}
                  className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#E3F3F1]/40 transition-colors active:bg-[#E3F3F1]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827]">{row.label}</h4>
                      <p className="text-[10px] text-[#6B7280] font-medium">{row.subtext}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                </button>
              );
            })}
          </Card>
        </div>

        {/* SIGN OUT BUTTON */}
        <Button
          fullWidth
          variant="danger-tint"
          size="sm"
          className="rounded-xl py-2 font-bold text-xs"
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-[#E4E7EC]">
              <h3 className="text-sm font-bold font-heading text-[#111827]">Edit Profile Info</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-2.5">
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

              <div className="pt-1.5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/3 rounded-lg"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 rounded-lg">
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VITALS MODAL */}
      {isEditVitalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-2.5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-1.5 border-b border-[#E4E7EC]">
              <div className="flex items-center gap-1.5 text-[#0B5A54]">
                <Edit3 className="w-3.5 h-3.5 text-[#0B5A54]" />
                <h3 className="text-xs font-bold font-heading text-[#111827]">Edit Vital Medical Stats</h3>
              </div>
              <button onClick={() => setIsEditVitalsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-3.5 h-3.5 text-[#6B7280]" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-2">
              <Input
                label="DATE OF BIRTH"
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="GENDER"
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  options={[
                    { value: 'Female', label: 'Female' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />

                <Select
                  label="BLOOD GROUP"
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  options={[
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' },
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'AB+', label: 'AB+' },
                  ]}
                />
              </div>

              <div className="space-y-1.5 pt-1 border-t border-[#E4E7EC]">
                <span className="block text-[9px] font-extrabold text-[#0B5A54] uppercase tracking-wider">
                  EMERGENCY CONTACT DETAILS
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    label="CONTACT NAME"
                    value={editEmergencyName}
                    onChange={(e) => setEditEmergencyName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                  <Input
                    label="RELATIONSHIP"
                    value={editEmergencyRel}
                    onChange={(e) => setEditEmergencyRel(e.target.value)}
                    placeholder="e.g. Spouse"
                    required
                  />
                </div>
                <Input
                  label="CONTACT PHONE"
                  value={editEmergencyPhone}
                  onChange={(e) => setEditEmergencyPhone(e.target.value)}
                  placeholder="Emergency phone"
                  required
                />
              </div>

              <div className="space-y-1.5 pt-1 border-t border-[#E4E7EC]">
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    label="ALLERGIES"
                    value={editAllergies}
                    onChange={(e) => setEditAllergies(e.target.value)}
                    placeholder="e.g. Penicillin"
                  />
                  <Input
                    label="CONDITIONS"
                    value={editConditions}
                    onChange={(e) => setEditConditions(e.target.value)}
                    placeholder="e.g. Asthma"
                  />
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditVitalsModalOpen(false)}
                  className="w-1/3 rounded-lg py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 rounded-lg py-1.5 text-xs font-bold">
                  Save Vitals
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5">
          <div className="bg-white w-full max-w-xs rounded-2xl p-4 text-center space-y-3 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center pb-1.5 border-b border-[#E4E7EC]">
              <h3 className="text-xs font-bold font-heading text-[#111827]">Digital Health ID</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="bg-[#F3F5F8] p-3 rounded-xl border border-[#E4E7EC] flex flex-col items-center space-y-1.5">
              <div className="w-28 h-28 bg-white p-2 rounded-lg border border-[#0B5A54] shadow-2xs flex items-center justify-center">
                <QrCode className="w-full h-full text-[#0B5A54]" />
              </div>
              <p className="text-[11px] font-bold text-[#0B5A54] font-mono">ID: CP-94827-SJ</p>
              <p className="text-[10px] text-[#6B7280]">Show QR code at check-in</p>
            </div>

            <Button fullWidth size="sm" onClick={() => setIsQrModalOpen(false)} className="rounded-lg">
              Close Digital ID
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
