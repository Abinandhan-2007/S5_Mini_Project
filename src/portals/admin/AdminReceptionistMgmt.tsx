import React, { useState } from 'react';
import {
  Search,
  Plus,
  UserCheck,
  Edit2,
  Trash2,
  X,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { ReceptionistRecord } from '../../types/staff';

interface AdminReceptionistMgmtProps {
  onShowToast: (msg: string) => void;
  autoOpenAdd?: boolean;
  onCloseAutoOpen?: () => void;
}

export const AdminReceptionistMgmt: React.FC<AdminReceptionistMgmtProps> = ({
  onShowToast,
  autoOpenAdd,
  onCloseAutoOpen,
}) => {
  const receptionists = useStaffStore((s) => s.receptionists);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const createReceptionist = useStaffStore((s) => s.createReceptionist);
  const updateReceptionist = useStaffStore((s) => s.updateReceptionist);
  const deleteReceptionist = useStaffStore((s) => s.deleteReceptionist);
  const toggleReceptionistStatus = useStaffStore((s) => s.toggleReceptionistStatus);

  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(autoOpenAdd || false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState<ReceptionistRecord | null>(null);

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
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    permissions: {
      walkInBooking: true,
      doctorToggle: true,
      slotOverride: false,
    },
  });

  const filteredReceptionists = receptionists.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deskNumber.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: 'password123',
      phone: '+1 (555) 735-4300',
      department: 'Main Reception',
      deskNumber: 'Desk A-1 (Ground Floor)',
      shift: 'Morning',
      assignedDoctorsCount: 3,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      permissions: {
        walkInBooking: true,
        doctorToggle: true,
        slotOverride: false,
      },
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rec: ReceptionistRecord) => {
    setSelectedRec(rec);
    setFormData({
      name: rec.name,
      email: rec.email,
      password: rec.password || 'password123',
      phone: rec.phone,
      department: rec.department,
      deskNumber: rec.deskNumber,
      shift: rec.shift || 'Morning',
      assignedDoctorsCount: rec.assignedDoctorsCount || 2,
      avatarUrl: rec.avatarUrl,
      permissions: {
        walkInBooking: true,
        doctorToggle: true,
        slotOverride: false,
      },
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReceptionist(formData);
    setIsAddModalOpen(false);
    onShowToast(`Receptionist ${formData.name} account created successfully!`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;
    await updateReceptionist(selectedRec.id, formData);
    setIsEditModalOpen(false);
    onShowToast(`Receptionist record for ${formData.name} updated!`);
  };

  const handleToggleStatus = async (id: string, name: string) => {
    await toggleReceptionistStatus(id);
    onShowToast(`Duty status updated for ${name}`);
  };

  const handleDelete = async (rec: ReceptionistRecord) => {
    if (confirm(`Are you sure you want to remove ${rec.name} from hospital receptionist staff?`)) {
      await deleteReceptionist(rec.id);
      onShowToast(`${rec.name} removed from receptionist roster.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Receptionists
            </h2>
            <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {receptionists.length} Staff
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Assign desks, login credentials, and permission capabilities for front desk operations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Receptionist</span>
        </button>
      </div>

      {/* ── Search Bar (No Shifts) ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receptionist name, desk, department, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>
      </div>

      {/* ── Receptionist Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Staff Name</th>
                <th className="py-3.5 px-4">Hospital Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Username & Password</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredReceptionists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No receptionists found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredReceptionists.map((rec) => (
                  <tr key={rec.id} className="hover:bg-teal-50/30 transition-colors group">
                    {/* Column 1: Staff Name */}
                    <td className="py-3.5 px-5">
                      <div>
                        <p className="text-sm font-black text-slate-900 font-heading">{rec.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{rec.deskNumber}</p>
                      </div>
                    </td>

                    {/* Column 2: Hospital Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200/80 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{rec.hospitalName || hospitalSettings.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{rec.department}</p>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Contact Info */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{rec.phone}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Joined: {rec.joinDate}</p>
                    </td>

                    {/* Column 4: Username & Password */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">User:</span>
                          <span>{rec.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pass:</span>
                          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-200/70">
                            {showPasswords[rec.id] ? (rec.password || 'password123') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(rec.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                            title={showPasswords[rec.id] ? 'Hide Password' : 'Show Password'}
                          >
                            {showPasswords[rec.id] ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Column 5: Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(rec.id, rec.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer ${
                          rec.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-2 h-2 rounded-full ${rec.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{rec.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Column 6: Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="w-8 h-8 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0B5A54] flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Receptionist"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec)}
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
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

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: ADD RECEPTIONIST
      ══════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B5A54]">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Add Receptionist Staff
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  onCloseAutoOpen?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Emily Watson"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              {/* Dedicated Email ID and Password Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Email ID (Username)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="emily.w@carepulse.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Login Password</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Desk Station</label>
                  <input
                    type="text"
                    value={formData.deskNumber}
                    onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Permissions Checklist
                </label>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.walkInBooking}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, walkInBooking: e.target.checked }
                      })}
                      className="accent-[#0B5A54]"
                    />
                    <span>Walk-In Patient Check-In & Token Issuance</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.doctorToggle}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, doctorToggle: e.target.checked }
                      })}
                      className="accent-[#0B5A54]"
                    />
                    <span>Doctor Duty Availability Status Toggle</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.slotOverride}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, slotOverride: e.target.checked }
                      })}
                      className="accent-[#0B5A54]"
                    />
                    <span>Emergency Slot Seat Capacity Adjustments</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    onCloseAutoOpen?.();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: EDIT RECEPTIONIST WITH EMAIL ID & PASSWORD
      ══════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedRec && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B5A54]">
                <Edit2 className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Edit Receptionist: {selectedRec.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              {/* Dedicated Two Rows: Email ID and Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Email ID (Login Username)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Login Password</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Desk Station</label>
                  <input
                    type="text"
                    value={formData.deskNumber}
                    onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReceptionistMgmt;
