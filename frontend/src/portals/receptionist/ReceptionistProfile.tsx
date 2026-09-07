import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  LogOut,
  Edit3,
  KeyRound,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  AtSign,
  Mail,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { receptionistService } from '../../services/receptionistService';
import { useNavigate } from 'react-router-dom';

interface ReceptionistProfileProps {
  onShowToast?: (msg: string) => void;
}

export const ReceptionistProfile: React.FC<ReceptionistProfileProps> = ({ onShowToast }) => {
  const profile = useStaffStore((s) => s.receptionistProfile);
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const fetchReceptionistProfile = useStaffStore((s) => s.fetchReceptionistProfile);
  const updateProfile = useStaffStore((s) => s.updateReceptionistProfile);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  // Load real profile from backend on mount
  useEffect(() => {
    fetchReceptionistProfile();
  }, [fetchReceptionistProfile]);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(profile.name || currentStaff?.name || 'REP1');
  const [username, setUsername] = useState(
    profile.username || currentStaff?.username || (profile.email ? profile.email.split('@')[0] : 'receptionist')
  );
  const [email, setEmail] = useState(profile.email || currentStaff?.email || '');
  const [clinicName, setClinicName] = useState(
    profile.clinicName || profile.hospitalName || currentStaff?.hospitalName || hospitalSettings.name || 'CarePulse Medical Center'
  );
  const [deskName, setDeskName] = useState(
    profile.deskName || currentStaff?.deskName || 'Main Reception & OPD Desk'
  );
  const [department, setDepartment] = useState(
    profile.department || currentStaff?.department || 'Main Reception & OPD Queue'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when profile or session loads
  useEffect(() => {
    setName(profile.name || currentStaff?.name || 'Reception Desk');
    setUsername(
      profile.username || currentStaff?.username || (profile.email ? profile.email.split('@')[0] : 'receptionist')
    );
    setEmail(profile.email || currentStaff?.email || '');
    setClinicName(
      profile.clinicName || profile.hospitalName || currentStaff?.hospitalName || hospitalSettings.name || 'CarePulse Medical Center'
    );
    setDeskName(profile.deskName || currentStaff?.deskName || 'Main Reception & OPD Desk');
    setDepartment(profile.department || currentStaff?.department || 'Main Reception & OPD Queue');
  }, [profile, currentStaff, hospitalSettings]);

  // Password Reset / Forgot Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Logout Warning Modal State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({
      name,
      username,
      email,
      clinicName,
      deskName,
      department,
    });
    setIsSaving(false);
    setIsEditModalOpen(false);
    onShowToast?.('✓ Receptionist desk profile updated successfully in database.');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify.');
      return;
    }

    setIsUpdatingPassword(true);
    const res = await receptionistService.changePassword(currentPassword, newPassword);
    setIsUpdatingPassword(false);

    if (!res.success) {
      setPasswordError(res.message || 'Failed to update password. Current password may be incorrect.');
      return;
    }

    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onShowToast?.('🔒 Password updated successfully in database. Use your new credentials for next login.');
  };

  const effectiveClinicName =
    profile.clinicName || profile.hospitalName || currentStaff?.hospitalName || hospitalSettings.name || 'CarePulse Medical Center';
  const effectiveDeskName =
    profile.deskName || currentStaff?.deskName || 'Main Reception & OPD Desk';
  const effectiveDepartment =
    profile.department || currentStaff?.department || 'Main Reception & OPD Queue';
  const effectiveEmployeeId =
    profile.employeeId || profile.staffCode || currentStaff?.staffCode || currentStaff?.staff_code || '';
  const effectiveUsername =
    profile.username || currentStaff?.username || (profile.email ? profile.email.split('@')[0] : (currentStaff?.email ? currentStaff.email.split('@')[0] : 'receptionist'));
  const effectiveEmail =
    profile.email || currentStaff?.email || '';
  const effectiveStatus =
    profile.operationalStatus || (currentStaff?.isActive !== false ? 'Active On Duty' : 'Inactive');

  return (
    <div className="space-y-6 pb-12 text-left animate-in fade-in duration-300">
      {/* ══════════════════════════════════════════════════════════════════
          SYMMETRIC BALANCED DUAL-FRAMEWORK CARDS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Workstation & Hospital Facility */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 min-h-[48px]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
                  Workstation & Hospital Facility
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Physical workstation configuration & desk details
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-[#0B5A54] bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <Edit3 className="w-3 h-3 text-[#0B5A54]" />
              <span>Edit Desk</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs flex-1 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Hospital / Clinic Name:</span>
              </span>
              <span className="font-extrabold text-slate-900 text-right">
                {effectiveClinicName}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Desk Station Name:</span>
              </span>
              <span className="font-extrabold text-[#0B5A54] text-right">
                {effectiveDeskName}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Department / OPD Wing:</span>
              </span>
              <span className="font-extrabold text-slate-900 text-right">{effectiveDepartment}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Operational Status:</span>
              </span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-right text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{effectiveStatus}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Account Identity & Security */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
                  Account Identity & Security
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Login credentials and authentication control
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <KeyRound className="w-3 h-3 text-amber-600" />
              <span>Reset Password</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs flex-1 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Receptionist ID:</span>
              </span>
              <span className="font-extrabold text-slate-900 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 text-right">
                {effectiveEmployeeId}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <AtSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Account Username:</span>
              </span>
              <span className="font-extrabold text-slate-900 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 text-right">
                @{effectiveUsername}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Staff Email Address:</span>
              </span>
              <span className="font-extrabold text-slate-900 font-mono text-right">{effectiveEmail}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Password & Credentials:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400 text-xs">••••••••</span>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-[11px] font-extrabold text-[#0B5A54] hover:underline cursor-pointer"
                >
                  Forgot / Change Password?
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-1.5 transition-colors">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Two-Factor Authentication:</span>
              </span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-right text-[11px]">
                Enabled (CarePulse SSO)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. EDIT PROFILE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Edit Desk Profile & Station
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="REP1"
                    className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="rep1"
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hospital / Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="BAG Hospital"
                    className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Desk Station Name</label>
                  <input
                    type="text"
                    required
                    value={deskName}
                    onChange={(e) => setDeskName(e.target.value)}
                    placeholder="Main Reception & OPD Queue Desk 01"
                    className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Staff Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bag@bitsathy"
                    className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Main Reception & OPD Queue"
                    className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. FORGOT / RESET PASSWORD MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs border border-amber-200/80">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Reset Terminal Password
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Set a new password for @{effectiveUsername}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          newPassword.length < 6
                            ? 'w-1/3 bg-rose-500'
                            : newPassword.length < 9
                            ? 'w-2/3 bg-amber-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {newPassword.length < 6
                        ? 'Weak (min 6 chars)'
                        : newPassword.length < 9
                        ? 'Moderate Password'
                        : 'Strong Password'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0B5A54] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 font-semibold space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Security Notice</span>
                </div>
                <p>
                  Once changed, you can use your new password immediately to log into this receptionist workstation terminal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError('');
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          5. LOGOUT CONFIRMATION WARNING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Terminal Sign Out?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to sign out from the Receptionist Desk terminal at{' '}
                <strong className="text-slate-900 font-extrabold">{effectiveClinicName}</strong>.
              </p>
              <p className="text-[11px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                Live queues, token counts, and doctor cabin schedules will remain saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistProfile;
