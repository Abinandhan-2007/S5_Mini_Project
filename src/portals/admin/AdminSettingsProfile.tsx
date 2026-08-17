import React, { useState } from 'react';
import {
  Building2,
  User,
  ShieldCheck,
  Lock,
  Save,
  Sliders,
  KeyRound,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminSettingsProfileProps {
  onShowToast: (msg: string) => void;
}

export const AdminSettingsProfile: React.FC<AdminSettingsProfileProps> = ({ onShowToast }) => {
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const updateAdminProfile = useStaffStore((s) => s.updateAdminProfile);
  const updateHospitalSettings = useStaffStore((s) => s.updateHospitalSettings);

  const [activeTab, setActiveTab] = useState<'hospital' | 'profile' | 'security' | 'permissions'>('hospital');

  // Hospital settings form state
  const [hospitalForm, setHospitalForm] = useState({ ...hospitalSettings });

  // Admin profile form state
  const [profileForm, setProfileForm] = useState({ ...adminProfile });

  // Security password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHospitalSettings(hospitalForm);
    onShowToast('Hospital details and operational policies updated successfully!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAdminProfile(profileForm);
    onShowToast('Administrator profile updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onShowToast('Error: New password and confirm password do not match.');
      return;
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    onShowToast('Admin password changed successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
            Admin Profile & Hospital Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure hospital identification, clinical rules, administrator account, and staff permissions.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto">
          {[
            { id: 'hospital', label: 'Hospital Info', icon: Building2 },
            { id: 'profile', label: 'Admin Profile', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'permissions', label: 'Staff Roles', icon: ShieldCheck },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-white text-[#0B5A54] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: HOSPITAL INFORMATION & CLINICAL POLICIES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hospital' && (
        <form onSubmit={handleSaveHospital} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
            <h3 className="text-base font-black text-slate-900 font-heading border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0B5A54]" />
              <span>Facility Identity & Public Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block mb-1.5">Tagline / Mission</label>
                <input
                  type="text"
                  value={hospitalForm.tagline}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block mb-1.5">Main Contact Hotline</label>
                <input
                  type="text"
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block mb-1.5">24/7 Emergency Hotline</label>
                <input
                  type="text"
                  value={hospitalForm.emergencyHotline}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, emergencyHotline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1.5">Physical Campus Address</label>
                <input
                  type="text"
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>
            </div>
          </div>

          {/* Operational Rules */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <h3 className="text-base font-black text-slate-900 font-heading border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0B5A54]" />
              <span>Operational & Booking Policy Matrix</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">AI Clinical Triage Assistant</p>
                  <p className="text-[11px] text-slate-500 font-medium">Enable AI symptom assessment for patients</p>
                </div>
                <input
                  type="checkbox"
                  checked={hospitalForm.enableAiTriage}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, enableAiTriage: e.target.checked })}
                  className="w-5 h-5 accent-[#0B5A54] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">SMS & Email Reminders</p>
                  <p className="text-[11px] text-slate-500 font-medium">Auto-dispatch OTP and booking updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={hospitalForm.enableSmsReminders}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, enableSmsReminders: e.target.checked })}
                  className="w-5 h-5 accent-[#0B5A54] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Hospital Configuration</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: ADMIN PROFILE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <img
              src={profileForm.avatarUrl}
              alt={profileForm.name}
              className="w-18 h-18 rounded-3xl object-cover border-2 border-teal-100 shadow-md"
            />
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">{profileForm.name}</h3>
              <p className="text-xs font-bold text-[#0B5A54]">{profileForm.department}</p>
              <span className="inline-block mt-1 bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                Authorized Hospital Administrator
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block mb-1.5">Official Email</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block mb-1.5">Phone Number</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block mb-1.5">Department / Title</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-1.5">Avatar Image URL</label>
              <input
                type="url"
                value={profileForm.avatarUrl}
                onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Update Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: SECURITY & PASSWORD
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6 max-w-lg">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0B5A54]" />
              <span>Change Administrator Password</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ensure you use a strong password with letters, numbers, and symbols.
            </p>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1.5">Current Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block mb-1.5">New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block mb-1.5">Confirm New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPass"
                checked={showPass}
                onChange={(e) => setShowPass(e.target.checked)}
                className="accent-[#0B5A54]"
              />
              <label htmlFor="showPass" className="text-xs font-medium text-slate-600 cursor-pointer">
                Show Passwords
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all active:scale-95"
          >
            Update Password
          </button>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: ROLE & ACCESS PERMISSIONS MATRIX
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Hospital Staff Role & Permission Matrix
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure read/write capabilities across hospital operational portals.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4">Feature Module</th>
                  <th className="py-3 px-4 text-center">Administrator</th>
                  <th className="py-3 px-4 text-center">Receptionist</th>
                  <th className="py-3 px-4 text-center">Doctor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {[
                  { module: 'Doctor Registration & Deactivation', admin: true, rec: false, doc: false },
                  { module: 'Receptionist Account Creation', admin: true, rec: false, doc: false },
                  { module: 'Global Time Slot Capacity Override', admin: true, rec: false, doc: true },
                  { module: 'Walk-In Patient Check-In & Token Issuance', admin: true, rec: true, doc: false },
                  { module: 'Doctor Availability Status Toggle', admin: true, rec: true, doc: true },
                  { module: 'Clinical SOAP Notes & Prescriptions', admin: false, rec: false, doc: true },
                  { module: 'Hospital Financial Analytics & Export', admin: true, rec: false, doc: false },
                ].map((row) => (
                  <tr key={row.module} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900">{row.module}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block w-4 h-4 rounded-full ${row.admin ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} text-[10px] leading-4 text-center`}>
                        {row.admin ? '✓' : '–'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block w-4 h-4 rounded-full ${row.rec ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} text-[10px] leading-4 text-center`}>
                        {row.rec ? '✓' : '–'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block w-4 h-4 rounded-full ${row.doc ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} text-[10px] leading-4 text-center`}>
                        {row.doc ? '✓' : '–'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsProfile;
