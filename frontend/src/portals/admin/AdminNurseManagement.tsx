import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  HeartPulse,
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
  Sparkles,
  ShieldCheck,
  ChevronDown,
  List,
  LayoutGrid,
  UserPlus,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { NurseRecord } from '../../types/staff';
import { adminService, type NurseRequestRecord } from '../../services/adminService';

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
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

  // Receptionist Nurse Requests state
  const [adminTab, setAdminTab] = useState<'directory' | 'requests'>('directory');
  const [nurseRequests, setNurseRequests] = useState<NurseRequestRecord[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadNurseRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const list = await adminService.getNurseRequests();
      setNurseRequests(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchNurses();
    loadNurseRequests();
  }, [fetchNurses]);

  const handleApproveRequest = async (reqId: string, nurseName: string) => {
    setActionLoadingId(reqId);
    try {
      await adminService.updateNurseRequestStatus(reqId, 'Approved');
      onShowToast?.(`Nurse ${nurseName} approved and created successfully! Account provisioned.`);
      await loadNurseRequests();
      await fetchNurses();
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to approve nurse request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (reqId: string, nurseName: string) => {
    setActionLoadingId(reqId);
    try {
      await adminService.updateNurseRequestStatus(reqId, 'Rejected');
      onShowToast?.(`Nurse request for ${nurseName} rejected.`);
      await loadNurseRequests();
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

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
      departmentFilter === 'All' || n.department === departmentFilter;

    const matchesShift =
      shiftFilter === 'All' || (n.shift && n.shift.includes(shiftFilter));

    return matchesSearch && matchesStatus && matchesDepartment && matchesShift;
  });

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
      username: nurse.username || (nurse.email ? nurse.email.split('@')[0] : 'nurse'),
      password: nurse.password || 'Nurse@123',
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
      onShowToast?.('Please enter a valid password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateNurse(resetPasswordNurse.id, {
        password: newResetPassword.trim(),
      });
      onShowToast?.(`Credentials reset successfully for ${resetPasswordNurse.name}`);
      setResetPasswordNurse(null);
      setNewResetPassword('');
    } catch {
      onShowToast?.('Failed to reset credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      onShowToast?.('Please provide nurse full name and email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createNurse({
        name: formData.name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim() || formData.email.split('@')[0],
        password: formData.password.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        shift: formData.shift,
        avatarUrl: formData.avatarUrl,
        hospital_id: currentStaff?.hospitalId || currentStaff?.hospital_id,
        hospitalId: currentStaff?.hospitalId || currentStaff?.hospital_id,
      });
      setIsAddModalOpen(false);
      onShowToast?.(`Nurse ${formData.name} successfully registered to ${formData.department}!`);
    } catch {
      onShowToast?.('Could not create nurse record.');
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
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Nurse Management
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {nurses.length} Nurses
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage nursing staff credentials, clinical stations, duty shifts, and pre-consultation vitals handoffs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#0B5A54] hover:bg-[#084540] text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Nurse</span>
        </button>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setAdminTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              adminTab === 'directory'
                ? 'bg-white text-[#0B5A54] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Nurse Directory & Rosters ({nurses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminTab('requests');
              loadNurseRequests();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              adminTab === 'requests'
                ? 'bg-white text-[#0B5A54] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Receptionist Nurse Requests</span>
            {nurseRequests.filter((r) => r.status === 'Pending').length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {nurseRequests.filter((r) => r.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>

        {adminTab === 'requests' && (
          <button
            type="button"
            onClick={loadNurseRequests}
            disabled={isLoadingRequests}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-[#0B5A54] rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
            <span>Refresh Requests</span>
          </button>
        )}
      </div>

      {adminTab === 'directory' && (
        <>
      {/* ── Search & Filter Toolbar ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by nurse name, staff code (N007101), username, or station..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Shift Filter */}
          <div className="relative">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
            >
              <option value="All">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="Evening">Evening Shift</option>
              <option value="Night">Night Shift</option>
              <option value="Rotational">Rotational</option>
            </select>
            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Availability Filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            {(['All', 'Active', 'Inactive'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-[#0B5A54] shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0B5A54] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#0B5A54] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── View 1: Nurse Roster (Table View) ── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Nurse Staff</th>
                  <th className="py-3.5 px-4">Clinical Department</th>
                  <th className="py-3.5 px-4">Duty Shift & Contact</th>
                  <th className="py-3.5 px-4">Credentials & Login</th>
                  <th className="py-3.5 px-4 text-center">Duty Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredNurses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No nurses registered yet for this hospital. Click "+ Add Nurse" to provision a staff account.
                    </td>
                  </tr>
                ) : (
                  filteredNurses.map((nurse) => {
                    const isPasswordVisible = !!showPasswords[nurse.id];
                    const displayCode = nurse.staff_code || nurse.staffCode || 'N007101';
                    const displayUsername = nurse.username || (nurse.email ? nurse.email.split('@')[0] : 'nurse');

                    return (
                      <tr
                        key={nurse.id}
                        onClick={() => setSelectedNurse(nurse)}
                        className="hover:bg-teal-50/20 transition-colors cursor-pointer"
                      >
                        {/* Avatar & Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-heading">
                              {nurse.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-slate-900">{nurse.name}</p>
                                <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-black">
                                  {displayCode}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">{nurse.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-4 px-4">
                          <span className="text-[#0B5A54] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 text-[11px] font-black inline-block">
                            {nurse.department || 'Triage & Vitals'}
                          </span>
                        </td>

                        {/* Duty Shift & Contact */}
                        <td className="py-4 px-4">
                          <p className="font-black text-slate-900">{nurse.shift || 'Morning Shift'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{nurse.phone || '+91 98765 00000'}</p>
                        </td>

                        {/* Credentials & Login */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                              <span className="text-slate-400 text-[10px]">User:</span>
                              <span className="font-mono text-[#0B5A54] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/70 text-[11px]">
                                {displayUsername}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-[10px]">Pass:</span>
                              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-200/70">
                                {isPasswordVisible ? (nurse.password || 'Nurse@123') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleShowPassword(nurse.id)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                                title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                              >
                                {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(nurse)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                                title="Copy Credentials"
                              >
                                {copiedId === nurse.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Duty Status */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(nurse, e)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                              nurse.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {nurse.isActive ? 'Active Duty' : 'Station Inactive'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenResetPassword(nurse, e)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Reset Nurse Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(nurse, e)}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54] transition-colors cursor-pointer"
                              title="Edit Nurse Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNurseToDelete(nurse);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove Nurse"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View 2: Nurse Roster (Card Grid View) ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNurses.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center shadow-xs">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h4 className="text-base font-bold text-slate-800">No Nurses Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                No nurse records match your current search and filter criteria.
              </p>
            </div>
          ) : (
            filteredNurses.map((nurse) => {
              const isPasswordVisible = !!showPasswords[nurse.id];
              const displayCode = nurse.staff_code || nurse.staffCode || 'N007101';
              const displayUsername = nurse.username || (nurse.email ? nurse.email.split('@')[0] : 'nurse');

              return (
                <div
                  key={nurse.id}
                  onClick={() => setSelectedNurse(nurse)}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0 font-heading">
                        {nurse.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                            {nurse.name}
                          </h3>
                          <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-black">
                            {displayCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{nurse.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(nurse, e)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer shrink-0 ${
                        nurse.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {nurse.isActive ? 'Active Duty' : 'On Leave'}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Department</span>
                      <span className="font-black text-slate-800 truncate block">{nurse.department || 'Triage & Vitals'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Shift</span>
                      <span className="font-black text-slate-800 truncate block">
                        {nurse.shift ? nurse.shift.split(' ')[0] : 'Morning'}
                      </span>
                    </div>
                  </div>

                  {/* Portal Credentials Pill */}
                  <div
                    className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center justify-between text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Nurse Portal Login</span>
                      <span className="font-mono text-[11px] font-black text-[#0B5A54]">{displayUsername}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded text-[11px] font-bold border border-teal-200">
                        {isPasswordVisible ? (nurse.password || 'Nurse@123') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(nurse.id)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(nurse)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                        title="Copy Credentials"
                      >
                        {copiedId === nurse.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-500">
                    <span className="font-mono text-slate-400 text-[11px]">{nurse.phone || '+91 98765 00000'}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleOpenResetPassword(nurse, e)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(nurse, e)}
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54] transition-colors cursor-pointer"
                        title="Edit Nurse Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNurseToDelete(nurse);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Nurse"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
        </>
      )}

      {/* ── Receptionist Nurse Requisitions Tab ── */}
      {adminTab === 'requests' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Status summary pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Requisitions</p>
              <p className="text-xl font-black text-slate-900 mt-1">{nurseRequests.length}</p>
            </div>
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 shadow-2xs">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Approval</span>
              </p>
              <p className="text-xl font-black text-amber-900 mt-1">
                {nurseRequests.filter((r) => r.status === 'Pending').length}
              </p>
            </div>
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved & Added</span>
              </p>
              <p className="text-xl font-black text-emerald-900 mt-1">
                {nurseRequests.filter((r) => r.status === 'Approved').length}
              </p>
            </div>
            <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/80 shadow-2xs">
              <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected</span>
              </p>
              <p className="text-xl font-black text-rose-900 mt-1">
                {nurseRequests.filter((r) => r.status === 'Rejected').length}
              </p>
            </div>
          </div>

          {/* List or empty state */}
          {isLoadingRequests ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-[#0B5A54] animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading nurse onboarding applications...</p>
            </div>
          ) : nurseRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center mx-auto">
                <UserPlus className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-900 font-heading">No Nurse Applications Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When receptionists apply to onboard nursing staff for clinical duty, their submissions will appear here for administrative approval and automatic account creation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nurseRequests.map((req) => {
                const isPending = req.status === 'Pending';
                const isApproved = req.status === 'Approved';
                const isRejected = req.status === 'Rejected';
                const isActionBusy = actionLoadingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-black text-slate-900 font-heading">
                              {req.fullName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Candidate
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Requisition ID: <span className="font-mono">{req.id.slice(0, 8)}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black px-2.5 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved & Added
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-black px-2.5 py-1 rounded-full">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{req.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold">{req.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{req.department || 'Triage & Vitals'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{req.shift || 'Morning Shift'}</span>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-slate-600">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="italic text-[11px] leading-relaxed">
                              "{req.notes}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Origin Meta */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>
                          Applied by: <strong className="text-slate-600">{req.requestedByName || 'Receptionist'}</strong>
                        </span>
                        <span>
                          {new Date(req.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100">
                      {isPending ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id, req.fullName)}
                            disabled={isActionBusy}
                            className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.id, req.fullName)}
                            disabled={isActionBusy}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isActionBusy ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Create Nurse</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : isApproved ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200/80">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>Staff record provisioned. Nurse credentials dispatched.</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-400 italic">
                          This requisition was rejected.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Detail Modal (When Nurse Clicked) ── */}
      {selectedNurse && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 text-white flex items-center justify-center font-black text-xl shadow-md font-heading">
                  {selectedNurse.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 font-heading">
                      {selectedNurse.name}
                    </h3>
                    <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-black">
                      {selectedNurse.staff_code || selectedNurse.staffCode || 'N007101'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">
                    {selectedNurse.department || 'Triage & Vitals'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNurse(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nurse Credentials Card */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Nurse Portal Login Credentials
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(selectedNurse)}
                  className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === selectedNurse.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedNurse.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Portal Username / ID</span>
                  <span className="font-mono font-black text-slate-900 truncate block">
                    {selectedNurse.username || selectedNurse.email.split('@')[0] || 'nurse'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Station Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                      {showPasswords[selectedNurse.id] ? (selectedNurse.password || 'Nurse@123') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(selectedNurse.id)}
                      className="text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {showPasswords[selectedNurse.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Department & Shift Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Assigned Department</span>
                <span className="text-slate-900 font-bold">{selectedNurse.department || 'Triage & Vitals'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Assigned Duty Shift</span>
                <span className="text-slate-900 font-bold">{selectedNurse.shift || 'Morning Shift'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Email Address</span>
                <span className="text-slate-900 font-bold truncate block">{selectedNurse.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Contact Phone</span>
                <span className="text-slate-900 font-bold font-mono">{selectedNurse.phone || '+91 98765 00000'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Duty Status</span>
                <span className={`font-bold ${selectedNurse.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedNurse.isActive ? 'Active Duty' : 'On Leave / Off Duty'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNurseToDelete(selectedNurse)}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Nurse</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNurse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedNurse)}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL: ADD NURSE ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 my-8">
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

      {/* ── 7. MODAL: EDIT NURSE ── */}
      {isEditModalOpen && selectedNurse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 my-8">
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

      {/* ── 8. MODAL: RESET PASSWORD ── */}
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
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordNurse(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 9. MODAL: DELETE CONFIRMATION ── */}
      {nurseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">Remove Nurse?</h3>
                <p className="text-xs text-slate-400">This action will permanently revoke portal credentials.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs text-rose-900 font-medium">
              Are you sure you want to remove <strong className="font-black">{nurseToDelete.name}</strong> ({nurseToDelete.staff_code || nurseToDelete.staffCode}) from the roster?
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNurseToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNurseManagement;
