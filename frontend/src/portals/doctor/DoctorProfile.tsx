import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Lock,
  Save,
  CheckCircle2,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DoctorProfile: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const doctors = useStaffStore((s) => s.doctors);
  const updateDoctor = useStaffStore((s) => s.updateDoctor);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);

  // Match doctor record in store
  const currentDocRecord = doctors.find((d) => d.id === currentStaff?.id) || doctors[0] || {
    id: 'doc-1',
    name: currentStaff?.name || 'Dr. Olivia Wilson',
    specialty: 'Cardiologist',
    department: 'Cardiology',
    experienceYears: 12,
    consultationFee: 850,
    photo: '/doctor_default.jpg',
    phone: '+91 98765 11001',
    email: currentStaff?.email || 'olivia.w@carepulse.com',
    roomNumber: 'Cabin 102 - 1st Floor',
    isAvailable: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    about: 'Senior Consultant Interventional Cardiologist specializing in adult preventive cardiology, hypertension, and non-invasive diagnostics.',
  };

  const [formData, setFormData] = useState({
    name: currentDocRecord.name || '',
    specialty: currentDocRecord.specialty || '',
    department: currentDocRecord.department || '',
    experienceYears: currentDocRecord.experienceYears || 10,
    consultationFee: currentDocRecord.consultationFee || 800,
    phone: currentDocRecord.phone || '',
    email: currentDocRecord.email || '',
    roomNumber: currentDocRecord.roomNumber || 'Cabin 102',
    about: currentDocRecord.about || '',
    availableDays: currentDocRecord.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    isAvailable: currentDocRecord.isAvailable ?? true,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentDocRecord) {
      setFormData({
        name: currentDocRecord.name,
        specialty: currentDocRecord.specialty,
        department: currentDocRecord.department,
        experienceYears: currentDocRecord.experienceYears,
        consultationFee: currentDocRecord.consultationFee,
        phone: currentDocRecord.phone,
        email: currentDocRecord.email,
        roomNumber: currentDocRecord.roomNumber,
        about: currentDocRecord.about || '',
        availableDays: currentDocRecord.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        isAvailable: currentDocRecord.isAvailable ?? true,
      });
    }
  }, [currentDocRecord.id, currentDocRecord.isAvailable]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const days = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: days };
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateDoctor(currentDocRecord.id, {
        name: formData.name,
        specialty: formData.specialty,
        department: formData.department,
        experienceYears: Number(formData.experienceYears),
        consultationFee: Number(formData.consultationFee),
        phone: formData.phone,
        email: formData.email,
        roomNumber: formData.roomNumber,
        about: formData.about,
        availableDays: formData.availableDays,
        isAvailable: formData.isAvailable,
      });

      // Handle Password change if filled
      if (newPassword.trim()) {
        if (newPassword !== confirmPassword) {
          showToast('New passwords do not match!');
          setIsSaving(false);
          return;
        }
        await updateDoctor(currentDocRecord.id, { password: newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Profile and Cabin Password updated successfully!');
      } else {
        showToast('Doctor Profile & Cabin settings saved successfully.');
      }
    } catch {
      showToast('Error updating profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDuty = async () => {
    await toggleDoctorAvailability(currentDocRecord.id);
    setFormData((prev) => ({ ...prev, isAvailable: !prev.isAvailable }));
    showToast(`Cabin Duty Status switched to ${!formData.isAvailable ? 'Active / On-Duty' : 'Offline / Away'}`);
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            {formData.name.charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">{formData.name}</h1>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                {currentStaff?.staff_code || 'D001101'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {formData.specialty} · {formData.department} · {formData.roomNumber}
            </p>
          </div>
        </div>

        {/* On-Duty Availability Toggle Widget */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cabin Duty Status</span>
            <span className={`text-xs font-black ${formData.isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
              {formData.isAvailable ? 'Active & Receiving Patients' : 'Offline / In Procedure'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleDuty}
            className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              formData.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                formData.isAvailable ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Main Form ──────────────────────────────────────────────── */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Clinical Profile Information */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="w-5 h-5 text-[#0B5A54]" />
            <h2 className="text-sm font-black text-slate-900">Physician & Cabin Credentials</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name & Title</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Specialty</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
              <input
                type="number"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cabin / Room Designation</label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Physician Bio & Clinical Focus</label>
              <textarea
                rows={3}
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                placeholder="Professional summary, fellowship background, diagnostic focus..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>
        </div>

        {/* Schedule & Availability Days */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-[#0B5A54]" />
            <h2 className="text-sm font-black text-slate-900">Weekly OPD Cabin Schedule</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Available Consultation Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B5A54] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Password & Security */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0B5A54]" />
              <h2 className="text-sm font-black text-slate-900">Cabin Security & Password</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPasswords ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Cabin Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-teal-900/20 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile & Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default DoctorProfile;
