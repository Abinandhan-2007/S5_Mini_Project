import React, { useState } from 'react';
import {
  Search,
  Plus,
  UserCheck,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { ReceptionistRecord } from '../../types/staff';

interface AdminReceptionistMgmtProps {
  onShowToast: (msg: string) => void;
  autoOpenAdd?: boolean;
}

export const AdminReceptionistMgmt: React.FC<AdminReceptionistMgmtProps> = ({
  onShowToast,
  autoOpenAdd,
}) => {
  const receptionists = useStaffStore((s) => s.receptionists);
  const departments = useStaffStore((s) => s.departments);
  const createReceptionist = useStaffStore((s) => s.createReceptionist);
  const updateReceptionist = useStaffStore((s) => s.updateReceptionist);
  const deleteReceptionist = useStaffStore((s) => s.deleteReceptionist);
  const toggleReceptionistStatus = useStaffStore((s) => s.toggleReceptionistStatus);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState<ReceptionistRecord | null>(null);
  const [recToDelete, setRecToDelete] = useState<ReceptionistRecord | null>(null);
  const [resetPasswordRec, setResetPasswordRec] = useState<ReceptionistRecord | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  React.useEffect(() => {
    if (autoOpenAdd) {
      setIsAddModalOpen(true);
    }
  }, [autoOpenAdd]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    phone: '',
    department: 'Main Reception',
    deskNumber: 'Desk A-1 (Ground Floor)',
    shift: 'Morning' as 'Morning' | 'Evening' | 'Night' | 'Full Day',
    assignedDoctorsCount: 3,
    avatarUrl: '',
  });

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredReceptionists = receptionists.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deskNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && r.isActive) ||
      (statusFilter === 'Inactive' && !r.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: 'password123',
      phone: '+91 98765 43220',
      department: 'Main Reception',
      deskNumber: 'Desk A-1 (Ground Floor)',
      shift: 'Morning',
      assignedDoctorsCount: 3,
      avatarUrl: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rec: ReceptionistRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRec(rec);
    setFormData({
      name: rec.name,
      email: rec.email,
      password: rec.password || 'password123',
      phone: rec.phone,
      department: rec.department,
      deskNumber: rec.deskNumber,
      shift: rec.shift || 'Morning',
      assignedDoctorsCount: rec.assignedDoctorsCount || 3,
      avatarUrl: rec.avatarUrl,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenResetPasswordModal = (rec: ReceptionistRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setResetPasswordRec(rec);
    setNewResetPassword('');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordRec || !newResetPassword.trim()) {
      onShowToast('Please enter a valid new password.');
      return;
    }

    await updateReceptionist(resetPasswordRec.id, {
      password: newResetPassword.trim(),
    });

    onShowToast(`Password for ${resetPasswordRec.name} has been reset successfully!`);
    setResetPasswordRec(null);
    setNewResetPassword('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      onShowToast('Please provide name and email address.');
      return;
    }

    await createReceptionist(formData);
    setIsAddModalOpen(false);
    onShowToast(`Receptionist ${formData.name} successfully registered to ${formData.deskNumber}!`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;

    await updateReceptionist(selectedRec.id, formData);
    setIsEditModalOpen(false);
    setSelectedRec(null);
    onShowToast(`Receptionist record for ${formData.name} updated!`);
  };

  const handleToggleStatus = async (rec: ReceptionistRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleReceptionistStatus(rec.id);
    onShowToast(`Duty status toggled for ${rec.name}`);
  };

  const handleDeleteConfirm = async () => {
    if (!recToDelete) return;
    await deleteReceptionist(recToDelete.id);
    setRecToDelete(null);
    if (selectedRec?.id === recToDelete.id) setSelectedRec(null);
    onShowToast(`${recToDelete.name} removed from receptionist roster.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Receptionist Management
            </h2>
            <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {receptionists.length} Front-Desk Desks
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Assign front-desk stations, manage login credentials, monitor token throughput, and configure queue permissions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Receptionist</span>
        </button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receptionist name, desk number, department, or login username..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>

        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
          {(['All', 'Active', 'Inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-[#0B5A54] shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ── Receptionist Roster Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Staff Member</th>
                <th className="py-3.5 px-4">Assigned Desk & Wing</th>
                <th className="py-3.5 px-4">Tokens Issued (Today)</th>
                <th className="py-3.5 px-4">Credentials & Login</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredReceptionists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No receptionists match the search criteria. Click "+ Add Receptionist" to create a station.
                  </td>
                </tr>
              ) : (
                filteredReceptionists.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRec(rec)}
                    className="hover:bg-teal-50/20 transition-colors cursor-pointer"
                  >
                    {/* Monogram Avatar & Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-800 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-heading">
                          {rec.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{rec.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{rec.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Desk & Wing */}
                    <td className="py-4 px-4">
                      <p className="font-black text-slate-900">{rec.deskNumber}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{rec.department}</p>
                    </td>

                    {/* Tokens Issued Today */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                          18 Tokens
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Shift: {rec.shift || 'Morning'}</span>
                      </div>
                    </td>

                    {/* Username & Password (reveal/mask) */}
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                          <span className="text-slate-400 text-[10px]">User:</span>
                          <span className="font-mono text-[#0B5A54] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/70 text-[11px]">
                            {rec.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">Pass:</span>
                          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-200/70">
                            {showPasswords[rec.id] ? (rec.password || 'password123') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(rec.id)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                            title={showPasswords[rec.id] ? 'Hide Password' : 'Show Password'}
                          >
                            {showPasswords[rec.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleStatus(rec, e)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                          rec.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {rec.isActive ? 'Active Duty' : 'Station Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleOpenResetPasswordModal(rec, e)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Reset Receptionist Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(rec, e)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54] transition-colors cursor-pointer"
                          title="Edit Station"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecToDelete(rec);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove Receptionist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Receptionist Detail Panel / Modal ── */}
      {selectedRec && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-xs font-heading">
                  {selectedRec.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    {selectedRec.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedRec.deskNumber}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRec(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              {/* Credentials & Password Card */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Receptionist Portal Credentials
                  </span>
                  <button
                    onClick={() => {
                      setResetPasswordRec(selectedRec);
                      setNewResetPassword('');
                    }}
                    className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Login Email</span>
                    <span className="font-mono font-black text-slate-900">{selectedRec.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Station Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                        {showPasswords[selectedRec.id] ? (selectedRec.password || 'password123') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(selectedRec.id)}
                        className="text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        {showPasswords[selectedRec.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Assigned Wing</span>
                  <span className="text-slate-900">{selectedRec.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Contact Phone</span>
                  <span className="text-slate-900">{selectedRec.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Shift Schedule</span>
                  <span className="text-slate-900">{selectedRec.shift || 'Morning Shift'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Station Status</span>
                  <span className={selectedRec.isActive ? 'text-emerald-700' : 'text-rose-700'}>
                    {selectedRec.isActive ? 'Active Duty' : 'Station Closed'}
                  </span>
                </div>
              </div>

              {/* Station Activity Log */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Today's Station Activity Log
                </span>
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                  <p>• Logged into station at 08:30 AM (Chrome / Windows 11)</p>
                  <p>• Issued 18 walk-in queue tokens across Cardiology & OPD</p>
                  <p>• Toggled Dr. Olivia Wilson availability to Active</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setRecToDelete(selectedRec)}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Desk</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRec(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedRec)}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Desk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetPasswordRec && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-sky-700">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-black text-slate-900 font-heading">
                Reset Receptionist Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Set a new login password for <strong>{resetPasswordRec.name}</strong> ({resetPasswordRec.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password (e.g. rec2026!)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordRec(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Receptionist Modal ── */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[#0B5A54]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  {isAddModalOpen ? 'Assign Front-Desk Station' : 'Edit Receptionist Desk'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
              className="space-y-4 text-xs font-bold text-slate-700"
            >
              <div>
                <label className="block mb-1">Receptionist Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Emily Watson"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Login Email / Username</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="receptionist@carepulse.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Station Password</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Assigned Department Wing</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer"
                  >
                    <option value="Main Reception">Main Reception & Triage</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} Reception
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Desk Identifier</label>
                  <input
                    type="text"
                    required
                    value={formData.deskNumber}
                    onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                    placeholder="e.g. Desk A-1 (Ground Floor)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Operating Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer"
                  >
                    <option value="Morning">Morning Shift (07:00 AM - 03:00 PM)</option>
                    <option value="Evening">Evening Shift (03:00 PM - 11:00 PM)</option>
                    <option value="Night">Night Shift (11:00 PM - 07:00 AM)</option>
                    <option value="Full Day">Full Day Coverage</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  {isAddModalOpen ? 'Activate Station' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {recToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Remove {recToDelete.name}?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              This will deactivate this front-desk station and revoke token issuing access.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReceptionistMgmt;
