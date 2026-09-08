import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  HeartPulse,
  Activity,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Clock,
  Building2,
  Copy,
  Check,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { NurseRecord } from '../../types/staff';

interface AdminNurseManagementProps {
  onShowToast: (msg: string) => void;
  autoOpenAdd?: boolean;
}

const DEPARTMENTS = [
  'Triage & Vitals',
  'OPD Pre-Check',
  'Emergency & ICU',
  'General Inpatient Ward',
  'Pediatrics Care',
  'Day Surgery Pre-Op',
];

const SHIFTS = [
  'Morning (07:00 AM - 03:30 PM)',
  'Evening (03:00 PM - 11:30 PM)',
  'Night (11:00 PM - 07:30 AM)',
  'Rotational (12-hr Duty)',
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813588-4663c6c06346?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
];

export const AdminNurseManagement: React.FC<AdminNurseManagementProps> = ({
  onShowToast,
  autoOpenAdd,
}) => {
  const nurses = useStaffStore((s) => s.nurses);
  const fetchNurses = useStaffStore((s) => s.fetchNurses);
  const createNurse = useStaffStore((s) => s.createNurse);
  const updateNurse = useStaffStore((s) => s.updateNurse);
  const deleteNurse = useStaffStore((s) => s.deleteNurse);
  const toggleNurseStatus = useStaffStore((s) => s.toggleNurseStatus);
  const currentStaff = useStaffStore((s) => s.currentStaff);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<NurseRecord | null>(null);
  const [nurseToDelete, setNurseToDelete] = useState<NurseRecord | null>(null);
  const [resetPasswordNurse, setResetPasswordNurse] = useState<NurseRecord | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNurses();
  }, [fetchNurses]);

  useEffect(() => {
    if (autoOpenAdd) {
      setIsAddModalOpen(true);
    }
  }, [autoOpenAdd]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '+91 98765 00000',
    department: 'Triage & Vitals',
    shift: 'Morning (07:00 AM - 03:30 PM)',
    avatarUrl: AVATAR_PRESETS[0],
  });

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCredentials = (nurse: NurseRecord) => {
    const credText = `CarePulse Hospital Nurse Portal Access\nStaff Code: ${nurse.staff_code || nurse.staffCode || 'N/A'}\nUsername: ${nurse.username || nurse.email.split('@')[0]}\nEmail: ${nurse.email}\nInitial Password: ${nurse.password || 'Nurse@123'}\nDepartment: ${nurse.department}\nPortal URL: ${window.location.origin}/staff/login`;
    navigator.clipboard.writeText(credText);
    setCopiedId(nurse.id);
    onShowToast?.(`Credentials for ${nurse.name} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Nurse@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res + '2026';
  };

  const filteredNurses = nurses.filter((n) => {
    const matchesSearch =
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.username && n.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (n.staff_code && n.staff_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (n.staffCode && n.staffCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      n.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && n.isActive) ||
      (statusFilter === 'Inactive' && !n.isActive);

    const matchesDepartment =
      departmentFilter === 'All' || n.department.toLowerCase().includes(departmentFilter.toLowerCase());

    const matchesShift =
      shiftFilter === 'All' || (n.shift && n.shift.toLowerCase().includes(shiftFilter.toLowerCase()));

    return matchesSearch && matchesStatus && matchesDepartment && matchesShift;
  });

  // KPI Metrics
  const totalNurses = nurses.length;
  const activeNurses = nurses.filter((n) => n.isActive).length;
  const triageNurses = nurses.filter((n) => (n.department || '').toLowerCase().includes('triage') || (n.department || '').toLowerCase().includes('vitals')).length;
  const shiftsCovered = new Set(nurses.map((n) => n.shift || 'Morning')).size;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: generateRandomPassword(),
      phone: '+91 98765 00000',
      department: 'Triage & Vitals',
      shift: 'Morning (07:00 AM - 03:30 PM)',
      avatarUrl: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (nurse: NurseRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedNurse(nurse);
    setFormData({
      name: nurse.name,
      email: nurse.email,
      username: nurse.username || nurse.email.split('@')[0],
      password: nurse.password || '',
      phone: nurse.phone || '+91 98765 00000',
      department: nurse.department || 'Triage & Vitals',
      shift: nurse.shift || 'Morning (07:00 AM - 03:30 PM)',
      avatarUrl: nurse.avatarUrl || AVATAR_PRESETS[0],
    });
    setIsEditModalOpen(true);
  };

  const handleOpenResetPassword = (nurse: NurseRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setResetPasswordNurse(nurse);
    setNewResetPassword(generateRandomPassword());
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordNurse || !newResetPassword.trim()) {
      onShowToast?.('Please enter a valid new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateNurse(resetPasswordNurse.id, {
        password: newResetPassword.trim(),
      });
      onShowToast?.(`Password for ${resetPasswordNurse.name} reset to: ${newResetPassword.trim()}`);
      setResetPasswordNurse(null);
      setNewResetPassword('');
    } catch {
      onShowToast?.('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      onShowToast?.('Please provide full name and email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const derivedUsername = formData.username.trim() || formData.email.split('@')[0].trim().toLowerCase();
      const created = await createNurse({
        ...formData,
        username: derivedUsername,
        hospital_id: currentStaff?.hospitalId || currentStaff?.hospital_id,
        hospitalId: currentStaff?.hospitalId || currentStaff?.hospital_id,
      });
      setIsAddModalOpen(false);
      const code = created?.staff_code || created?.staffCode || '';
      onShowToast?.(`Nurse ${formData.name} successfully provisioned with Staff Code ${code || 'assigned'}!`);
    } catch {
      onShowToast?.('Could not create nurse profile. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNurse) return;

    setIsSubmitting(true);
    try {
      await updateNurse(selectedNurse.id, {
        name: formData.name,
        fullName: formData.name,
        email: formData.email,
        username: formData.username,
        phone: formData.phone,
        department: formData.department,
        shift: formData.shift,
        avatarUrl: formData.avatarUrl,
      });
      setIsEditModalOpen(false);
      setSelectedNurse(null);
      onShowToast?.(`Nurse record for ${formData.name} updated successfully!`);
    } catch {
      onShowToast?.('Could not update nurse record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (nurse: NurseRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleNurseStatus(nurse.id);
    onShowToast?.(`Duty status updated for ${nurse.name}`);
  };

  const handleDeleteConfirm = async () => {
    if (!nurseToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteNurse(nurseToDelete.id);
      onShowToast?.(`${nurseToDelete.name} removed from nursing team roster.`);
      setNurseToDelete(null);
      if (selectedNurse?.id === nurseToDelete.id) setSelectedNurse(null);
    } catch {
      onShowToast?.('Failed to remove nurse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── 1. Page Header with Title and Add Action ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54] shadow-xs">
              <HeartPulse className="w-5 h-5 text-[#0B5A54]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading flex items-center gap-2">
                Nursing Team Management
                <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {nurses.length} Nurses
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Provision nurse credentials, assign triage & vitals stations, and enable real-time pre-consultation handoffs to doctors.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-teal-950/20 active:scale-95 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Nurse</span>
        </button>
      </div>

      {/* ── 2. KPI Summary Ribbon ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-200 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Nurses</p>
            <h3 className="text-xl font-black text-slate-900 font-heading">{totalNurses}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active On Duty</p>
            <h3 className="text-xl font-black text-emerald-700 font-heading">{activeNurses}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Triage Specialists</p>
            <h3 className="text-xl font-black text-sky-700 font-heading">{triageNurses}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shifts Active</p>
            <h3 className="text-xl font-black text-purple-700 font-heading">{shiftsCovered} Covered</h3>
          </div>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by nurse name, staff code (N007101), username, email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold shrink-0">
            {(['All', 'Active', 'Inactive'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters for Department & Shift */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs font-medium">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filter by:</span>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
          >
            <option value="All">All Clinical Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
          >
            <option value="All">All Duty Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
            <option value="Rotational">Rotational</option>
          </select>

          {(departmentFilter !== 'All' || shiftFilter !== 'All' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter('All');
                setShiftFilter('All');
                setSearchTerm('');
              }}
              className="text-[11px] text-teal-700 font-bold hover:underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Nurse Roster Grid ── */}
      {filteredNurses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center shadow-xs">
          <HeartPulse className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h4 className="text-base font-bold text-slate-800">No Nurses Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {searchTerm || departmentFilter !== 'All' || statusFilter !== 'All'
              ? 'No nurse records match your current search and filter criteria.'
              : 'No nurses have been provisioned for this hospital branch yet.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-[#0B5A54] text-white rounded-xl text-xs font-bold hover:bg-[#084540] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Nurse</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNurses.map((nurse) => {
            const isPasswordVisible = !!showPasswords[nurse.id];
            const displayCode = nurse.staff_code || nurse.staffCode || 'Pending Code';
            const displayUsername = nurse.username || (nurse.email ? nurse.email.split('@')[0] : 'nurse');

            return (
              <div
                key={nurse.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-teal-300 transition-all duration-200 p-5 flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                {/* Header: Avatar, Name, Staff Code, Duty Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={nurse.avatarUrl || AVATAR_PRESETS[0]}
                          alt={nurse.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = AVATAR_PRESETS[0];
                          }}
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            nurse.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={nurse.isActive ? 'Active On Duty' : 'Off Duty'}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate font-heading group-hover:text-[#0B5A54] transition-colors">
                            {nurse.name}
                          </h4>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 font-semibold truncate flex items-center gap-1">
                          <span>@{displayUsername}</span>
                        </p>
                      </div>
                    </div>

                    {/* Staff Code & Status */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200 shadow-2xs">
                        {displayCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(nurse, e)}
                        className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                          nurse.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Click to toggle duty status"
                      >
                        {nurse.isActive ? 'Active Duty' : 'On Leave'}
                      </button>
                    </div>
                  </div>

                  {/* Badges: Department & Shift */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-sky-600" />
                      <span>{nurse.department || 'Triage & Vitals'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{nurse.shift || 'Morning Shift'}</span>
                    </span>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 font-medium">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{nurse.email}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{nurse.phone || '+91 98765 00000'}</span>
                    </div>
                  </div>
                </div>

                {/* Credentials Handover Box */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="min-w-0">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Handover Password
                      </span>
                      <p className="font-mono text-xs font-black text-slate-900 truncate">
                        {isPasswordVisible ? (nurse.password || 'Nurse@123') : '••••••••••••'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(nurse.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                        title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(nurse)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          copiedId === nurse.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Copy full credentials card for physical handover"
                      >
                        {copiedId === nurse.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <button
                      type="button"
                      onClick={(e) => handleOpenResetPassword(nurse, e)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/60 text-slate-600 hover:text-[#0B5A54] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Reset or re-issue login credentials"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0B5A54]" />
                      <span>Reset Pass</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(nurse, e)}
                        className="p-1.5 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/60 text-slate-600 hover:text-[#0B5A54] transition-all cursor-pointer shadow-2xs"
                        title="Edit Nurse details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNurseToDelete(nurse);
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                        title="Remove nurse from roster"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. MODAL: ADD NURSE ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">Provision New Nurse</h3>
                  <p className="text-xs text-slate-400">Generate unique credentials with automatic N-series staff code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoUsername = val.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
                    setFormData((prev) => ({
                      ...prev,
                      name: val,
                      username: prev.username || autoUsername,
                    }));
                  }}
                  placeholder="e.g. Nurse Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="s.jenkins@carepulse.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Username (Login ID) *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="nurse_sarah"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                    className="text-[10px] text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#0B5A54]" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nurse@123"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Clinical Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Shift *</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              {/* Avatar Preset Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Avatar Image</label>
                <div className="flex items-center gap-2.5">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatarUrl: url })}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        formData.avatarUrl === url
                          ? 'border-[#0B5A54] ring-2 ring-[#0B5A54]/30 scale-105'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL: EDIT NURSE ── */}
      {isEditModalOpen && selectedNurse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">Edit Nurse Record</h3>
                  <p className="text-xs text-slate-400">
                    {selectedNurse.staff_code || selectedNurse.staffCode || 'Nurse'} · {selectedNurse.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Clinical Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duty Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. MODAL: RESET PASSWORD & HANDOVER ── */}
      {resetPasswordNurse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">Reset Nurse Credentials</h3>
                  <p className="text-xs text-slate-400">{resetPasswordNurse.name} ({resetPasswordNurse.staff_code || resetPasswordNurse.staffCode || 'N/A'})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordNurse(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-medium">
              <p className="text-xs text-slate-600">
                Enter a new password for <strong className="text-slate-900">{resetPasswordNurse.name}</strong>. Passwords will be securely hashed upon save.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">New Password</label>
                  <button
                    type="button"
                    onClick={() => setNewResetPassword(generateRandomPassword())}
                    className="text-[10px] text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordNurse(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL: DELETE CONFIRMATION ── */}
      {nurseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 font-heading">Remove Nurse from Roster?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800">{nurseToDelete.name}</strong> ({nurseToDelete.staff_code || nurseToDelete.staffCode || 'N/A'})? This will revoke portal access.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNurseToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
