import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Edit2,
  Lock,
  X,
  Code2,
  Database,
  Cpu,
  Save,
  Check,
  Clock,
  MapPin,
  Laptop,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminSettingsProfileProps {
  onShowToast: (msg: string) => void;
}

interface RolePermissionState {
  viewBookings: boolean;
  manageDoctors: boolean;
  manageReceptionists: boolean;
  manageTokens: boolean;
  viewReports: boolean;
  editHospitalSettings: boolean;
  manageUsers: boolean;
}

export const AdminSettingsProfile: React.FC<AdminSettingsProfileProps> = ({ onShowToast }) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const updateAdminProfile = useStaffStore((s) => s.updateAdminProfile);
  // Derive name dynamically based on logged in user or adminProfile
  const initialAdminName =
    currentStaff?.name ||
    adminProfile.name ||
    (currentStaff?.email ? currentStaff.email.split('@')[0] : 'Admin');

  // Profile state
  const [name, setName] = useState(initialAdminName);
  const [email, setEmail] = useState(currentStaff?.email || adminProfile.email || 'admin@carepulse.com');
  const [phone, setPhone] = useState(adminProfile.phone || '+1 (555) 735-4600');
  const [department, setDepartment] = useState(adminProfile.department || 'Platform Super Administration');

  // Username inline edit state
  const [username, setUsername] = useState('superadmin_carepulse');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  // Password state
  const [currentPassword, setCurrentPassword] = useState(adminProfile.password || 'admin123');
  const [showPasswordMask, setShowPasswordMask] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Modals state
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Change Password Form state
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwdNew, setShowPwdNew] = useState(false);

  // Permissions Matrix state (Roles as rows, permissions as keys)
  const [permissions, setPermissions] = useState<Record<'admin' | 'doctor' | 'receptionist', RolePermissionState>>({
    admin: {
      viewBookings: true,
      manageDoctors: true,
      manageReceptionists: true,
      manageTokens: true,
      viewReports: true,
      editHospitalSettings: true,
      manageUsers: true,
    },
    receptionist: {
      viewBookings: true,
      manageDoctors: true,
      manageReceptionists: false,
      manageTokens: true,
      viewReports: false,
      editHospitalSettings: false,
      manageUsers: false,
    },
    doctor: {
      viewBookings: true,
      manageDoctors: false,
      manageReceptionists: false,
      manageTokens: false,
      viewReports: true,
      editHospitalSettings: false,
      manageUsers: false,
    },
  });

  const [hasUnsavedPermissions, setHasUnsavedPermissions] = useState(false);

  // Permission column definitions
  const permissionColumns = [
    { key: 'viewBookings', label: 'View Bookings' },
    { key: 'manageDoctors', label: 'Manage Doctors' },
    { key: 'manageReceptionists', label: 'Manage Receptionists' },
    { key: 'manageTokens', label: 'Manage Tokens' },
    { key: 'viewReports', label: 'View Reports' },
    { key: 'editHospitalSettings', label: 'Edit Hospital Settings' },
    { key: 'manageUsers', label: 'Manage Users' },
  ] as const;

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200', text: 'text-slate-400' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
    if (score <= 4) return { score: 65, label: 'Medium', color: 'bg-amber-500', text: 'text-amber-600' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const pwdStrength = calculatePasswordStrength(pwdNew);

  // Handlers
  const handleSaveUsername = () => {
    if (!tempUsername.trim()) {
      onShowToast('Username cannot be empty');
      return;
    }
    setUsername(tempUsername.trim());
    setIsEditingUsername(false);
    onShowToast(`Username updated to @${tempUsername.trim()}`);
  };

  const handleTogglePermission = (role: 'admin' | 'doctor' | 'receptionist', key: keyof RolePermissionState) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key],
      },
    }));
    setHasUnsavedPermissions(true);
  };

  const handleSavePermissions = () => {
    setHasUnsavedPermissions(false);
    onShowToast('Role permissions saved successfully across all portals!');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdCurrent !== currentPassword) {
      onShowToast('Current password does not match.');
      return;
    }
    if (pwdNew.length < 6) {
      onShowToast('New password must be at least 6 characters.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      onShowToast('New password and confirmation do not match.');
      return;
    }

    setCurrentPassword(pwdNew);
    updateAdminProfile({ password: pwdNew });
    setIsChangePasswordModalOpen(false);
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    onShowToast('Password updated successfully!');
  };

  const handleProfileModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdminProfile({
      name,
      email,
      phone,
      department,
    });
    setIsEditProfileModalOpen(false);
    onShowToast('Admin profile updated successfully!');
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    onShowToast(
      nextState
        ? 'Two-Factor Authentication (2FA) enabled with authenticator app security.'
        : 'Two-Factor Authentication has been disabled.'
    );
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300 max-w-6xl mx-auto pb-16">
      {/* ══════════════════════════════════════════════════════════════════
          1. PROFILE HEADER (TOP OF PAGE)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-50/60 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6 text-center sm:text-left">
            {/* Monogram Initials Avatar Badge */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-md ring-4 ring-teal-50 shrink-0 font-heading">
              {(name || 'A').charAt(0).toUpperCase()}
            </div>

            {/* Name & Metadata */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                  {name}
                </h1>
                <span className="bg-gradient-to-r from-[#0B5A54] to-teal-700 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs">
                  Super Admin
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 font-bold">
                {department} • Central Network Command
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-4 pt-1 text-xs font-semibold text-slate-600 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span className="font-bold">{email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span>{phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Outline CTA */}
          <button
            onClick={() => setIsEditProfileModalOpen(true)}
            className="px-5 py-2.5 rounded-xl border-2 border-[#0B5A54] text-[#0B5A54] hover:bg-teal-50 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer self-center md:self-start shrink-0 shadow-2xs active:scale-95"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. ACCOUNT CREDENTIALS CARD
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-200/80 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Account Credentials & Access
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Manage platform login credentials, authentication keys, and device sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Username & Password Fields */}
            <div className="space-y-4">
              {/* Username Field */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Super Admin Username
                </span>
                <div className="flex items-center justify-between gap-3">
                  {!isEditingUsername ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          @{username}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200">
                          Active
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempUsername(username);
                          setIsEditingUsername(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-xs font-bold text-slate-700 hover:text-[#0B5A54] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                        <input
                          type="text"
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-teal-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none ring-2 ring-teal-500/20"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveUsername}
                        className="px-3 py-1.5 rounded-xl bg-[#0B5A54] text-white font-bold text-xs hover:bg-[#084540] cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingUsername(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Account Password
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {showPasswordMask ? currentPassword : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordMask(!showPasswordMask)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showPasswordMask ? 'Mask Password' : 'Show Password'}
                    >
                      {showPasswordMask ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsChangePasswordModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Change Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Security Safeguards & 2FA */}
            <div className="space-y-4">
              {/* Two-Factor Authentication Toggle */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0B5A54]" />
                    <p className="text-sm font-black text-slate-900">Two-Factor Authentication (2FA)</p>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Secure administrator sign-in with authenticator app TOTP verification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggle2FA}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    twoFactorEnabled ? 'bg-[#0B5A54]' : 'bg-slate-300'
                  }`}
                  title="Toggle 2FA Security"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Last Login & Device Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Active Session Metadata
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Today, 9:42 AM</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span className="font-bold text-slate-800">Chennai, IN</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chrome / Windows 11</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. STAFF ROLE MATRIX
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Staff Role & Permission Matrix
              </h3>
              <span className="bg-teal-50 text-[#0B5A54] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
                Super Admin Configurable
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Define operational permission boundaries for Administrators, Doctors, and Front-Desk Receptionists.
            </p>
          </div>

          {hasUnsavedPermissions && (
            <button
              onClick={handleSavePermissions}
              className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer animate-in fade-in self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-3 px-4 min-w-[200px]">System Role</th>
                {permissionColumns.map((col) => (
                  <th key={col.key} className="py-3 px-3 text-center min-w-[120px]">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {/* Row 1: Super Administrator */}
              <tr className="hover:bg-teal-50/20 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#0B5A54]" />
                    <div>
                      <p className="font-black text-slate-900">Administrator</p>
                      <p className="text-[10px] text-slate-400 font-medium">Full Governance</p>
                    </div>
                  </div>
                </td>
                {permissionColumns.map((col) => {
                  const isGranted = permissions.admin[col.key];
                  return (
                    <td key={col.key} className="py-4 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission('admin', col.key)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          isGranted
                            ? 'bg-[#0B5A54] text-white shadow-2xs hover:bg-[#084540]'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={`Toggle ${col.label} for Admin`}
                      >
                        {isGranted ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Doctor */}
              <tr className="hover:bg-sky-50/20 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-sky-500" />
                    <div>
                      <p className="font-black text-slate-900">Doctor</p>
                      <p className="text-[10px] text-slate-400 font-medium">Clinical Care</p>
                    </div>
                  </div>
                </td>
                {permissionColumns.map((col) => {
                  const isGranted = permissions.doctor[col.key];
                  return (
                    <td key={col.key} className="py-4 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission('doctor', col.key)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          isGranted
                            ? 'bg-sky-600 text-white shadow-2xs hover:bg-sky-700'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={`Toggle ${col.label} for Doctor`}
                      >
                        {isGranted ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Receptionist */}
              <tr className="hover:bg-amber-50/20 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-black text-slate-900">Receptionist</p>
                      <p className="text-[10px] text-slate-400 font-medium">Front Desk & Queue</p>
                    </div>
                  </div>
                </td>
                {permissionColumns.map((col) => {
                  const isGranted = permissions.receptionist[col.key];
                  return (
                    <td key={col.key} className="py-4 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission('receptionist', col.key)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          isGranted
                            ? 'bg-amber-500 text-white shadow-2xs hover:bg-amber-600'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={`Toggle ${col.label} for Receptionist`}
                      >
                        {isGranted ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. PROJECT TEAM / CREDITS CARD (TASTEFUL FOOTER)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-50/80 rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-heading">
              Project Contributors & Core Engineering Team
            </h4>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              CarePulse Multi-Portal Healthcare Guidance & Hospital Scheduling System
            </p>
          </div>
          <span className="text-[10px] font-black text-teal-800 bg-teal-100/60 px-2.5 py-0.5 rounded-full border border-teal-200">
            S5 Project Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
          {/* Contributor 1: Frontend */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-100/70 text-[#0B5A54] border border-teal-200/90 flex items-center justify-center font-black text-sm shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-900 font-heading">Sivanagu E</p>
              <div className="inline-block bg-teal-50 text-[#0B5A54] text-[10px] font-black px-2 py-0.2 rounded border border-teal-200/80">
                Frontend Engineering
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                UI/UX Design Systems & Client Portals
              </p>
            </div>
          </div>

          {/* Contributor 2: Backend & Database */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-sky-100/70 text-sky-700 border border-sky-200/90 flex items-center justify-center font-black text-sm shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-900 font-heading">Abinandhan K</p>
              <div className="inline-block bg-sky-50 text-sky-800 text-[10px] font-black px-2 py-0.2 rounded border border-sky-200/80">
                Backend & Database
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                REST APIs, Schema & Cloud Sync
              </p>
            </div>
          </div>

          {/* Contributor 3: AI & Clinical Intelligence */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-purple-100/70 text-purple-700 border border-purple-200/90 flex items-center justify-center font-black text-sm shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-900 font-heading">Monish JB</p>
              <div className="inline-block bg-purple-50 text-purple-800 text-[10px] font-black px-2 py-0.2 rounded border border-purple-200/80">
                AI Engineering
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Symptom Checker & Clinical Triage
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 1: EDIT PROFILE
      ══════════════════════════════════════════════════════════════════ */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B5A54]">
                <Edit2 className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Edit Administrator Profile
                </h3>
              </div>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProfileModalSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block mb-1">Administrative Title / Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 2: CHANGE PASSWORD WITH STRENGTH METER
      ══════════════════════════════════════════════════════════════════ */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B5A54]">
                <Lock className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Change Account Password
                </h3>
              </div>
              <button
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPwdNew ? 'text' : 'password'}
                    required
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdNew(!showPwdNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPwdNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {pwdNew && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={pwdStrength.text}>{pwdStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pwdStrength.score}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${pwdStrength.color}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1">Confirm New Password</label>
                <input
                  type={showPwdNew ? 'text' : 'password'}
                  required
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsProfile;
