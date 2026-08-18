import React, { useState } from 'react';
import {
  Search,
  Stethoscope,
  LayoutGrid,
  List,
  Plus,
  Edit2,
  Trash2,
  X,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useStaffStore, createSplitSlot } from '../../store/staffStore';
import type { DoctorRecord } from '../../types/receptionist';

interface AdminDoctorManagementProps {
  onShowToast: (msg: string) => void;
  autoOpenAddModal?: boolean;
}

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const AdminDoctorManagement: React.FC<AdminDoctorManagementProps> = ({
  onShowToast,
  autoOpenAddModal = false,
}) => {
  const doctors = useStaffStore((s) => s.doctors);
  const departments = useStaffStore((s) => s.departments);
  const createDoctor = useStaffStore((s) => s.createDoctor);
  const updateDoctor = useStaffStore((s) => s.updateDoctor);
  const deleteDoctor = useStaffStore((s) => s.deleteDoctor);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Not Available'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Password visibility map
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(autoOpenAddModal);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorRecord | null>(null);
  const [resetPasswordDoc, setResetPasswordDoc] = useState<DoctorRecord | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('Cardiologist');
  const [formDepartment, setFormDepartment] = useState('Cardiology');
  const [formFee, setFormFee] = useState(800);
  const [formExperience, setFormExperience] = useState(10);
  const [formPhone, setFormPhone] = useState('+91 98765 00000');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('doc123');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formRoom, setFormRoom] = useState('Cabin 101 - 1st Floor');
  const [formDays, setFormDays] = useState<string[]>(DEFAULT_DAYS);

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.username && doc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.email && doc.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = departmentFilter === 'All' || doc.department === departmentFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Available' && doc.isAvailable) ||
      (statusFilter === 'Not Available' && !doc.isAvailable);

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormName('');
    setFormSpecialty('Cardiologist');
    setFormDepartment('Cardiology');
    setFormFee(800);
    setFormExperience(10);
    setFormPhone('+91 98765 11000');
    setFormEmail('doctor@carepulse.com');
    setFormUsername('doctor.carepulse');
    setFormPassword('doc123');
    setShowFormPassword(false);
    setFormRoom('Cabin 101 - 1st Floor');
    setFormDays(DEFAULT_DAYS);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (doc: DoctorRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDoctor(doc);
    setFormName(doc.name);
    setFormSpecialty(doc.specialty);
    setFormDepartment(doc.department);
    setFormFee(doc.consultationFee);
    setFormExperience(doc.experienceYears);
    setFormPhone(doc.phone || '+91 98765 11000');
    setFormEmail(doc.email || 'doctor@carepulse.com');
    setFormUsername(doc.username || doc.email.split('@')[0] || 'doctor');
    setFormPassword(doc.password || 'doc123');
    setShowFormPassword(false);
    setFormRoom(doc.roomNumber);
    setFormDays(doc.availableDays || DEFAULT_DAYS);
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('Please provide the doctor’s full name.');
      return;
    }

    const calculatedUsername = formUsername.trim() || formEmail.split('@')[0] || 'doctor';

    await createDoctor({
      name: formName.trim(),
      specialty: formSpecialty,
      department: formDepartment,
      consultationFee: Number(formFee) || 500,
      experienceYears: Number(formExperience) || 5,
      phone: formPhone.trim(),
      email: formEmail.trim(),
      username: calculatedUsername,
      password: formPassword.trim() || 'doc123',
      roomNumber: formRoom.trim(),
      availableDays: formDays,
      isAvailable: true,
      slotCapacities: [
        createSplitSlot('slot-1', '09:00 AM - 10:00 AM', 6, 0, 0, true),
        createSplitSlot('slot-2', '10:00 AM - 11:00 AM', 6, 0, 0, true),
        createSplitSlot('slot-3', '11:00 AM - 12:00 PM', 6, 0, 0, true),
        createSplitSlot('slot-4', '02:00 PM - 03:00 PM', 6, 0, 0, true),
        createSplitSlot('slot-5', '03:00 PM - 04:00 PM', 6, 0, 0, true),
        createSplitSlot('slot-6', '04:00 PM - 05:00 PM', 6, 0, 0, true),
      ],
    });

    setIsAddModalOpen(false);
    onShowToast(`Dr. ${formName} added to the hospital directory! Credentials: ${calculatedUsername}`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    await updateDoctor(selectedDoctor.id, {
      name: formName.trim(),
      specialty: formSpecialty,
      department: formDepartment,
      consultationFee: Number(formFee),
      experienceYears: Number(formExperience),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      username: formUsername.trim() || selectedDoctor.username || formEmail.split('@')[0],
      password: formPassword.trim() || selectedDoctor.password || 'doc123',
      roomNumber: formRoom.trim(),
      availableDays: formDays,
    });

    setIsEditModalOpen(false);
    setSelectedDoctor(null);
    onShowToast(`Credentials and profile for ${formName} updated!`);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordDoc || !newResetPassword.trim()) {
      onShowToast('Please enter a valid new password.');
      return;
    }

    await updateDoctor(resetPasswordDoc.id, {
      password: newResetPassword.trim(),
    });

    onShowToast(`Password for ${resetPasswordDoc.name} has been reset successfully!`);
    setResetPasswordDoc(null);
    setNewResetPassword('');
  };

  const handleDeleteConfirm = async () => {
    if (!doctorToDelete) return;
    await deleteDoctor(doctorToDelete.id);
    setDoctorToDelete(null);
    if (selectedDoctor?.id === doctorToDelete.id) setSelectedDoctor(null);
    onShowToast(`${doctorToDelete.name} has been removed from the registry.`);
  };

  const handleToggleDay = (day: string) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleToggleAvailability = async (doc: DoctorRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleDoctorAvailability(doc.id);
    onShowToast(
      `${doc.name} marked as ${!doc.isAvailable ? 'Available' : 'Unavailable'}.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Doctor Management
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {doctors.length} Physicians
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage physician credentials, login passwords for the doctor portal, clinical departments, and consultation schedules.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Doctor</span>
        </button>
      </div>

      {/* ── Filter Bar & View Mode Toggle ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by physician name, username, specialty, department, or cabin..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>

        {/* Filter Chips & Department Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['All', 'Available', 'Not Available'] as const).map((status) => (
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

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0B5A54] shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#0B5A54] shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── View 1: Table View ── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Physician</th>
                  <th className="py-3.5 px-4">Department & Specialty</th>
                  <th className="py-3.5 px-4">Consultation Cabin</th>
                  <th className="py-3.5 px-4">Fee / Experience</th>
                  <th className="py-3.5 px-4">Portal Credentials</th>
                  <th className="py-3.5 px-4 text-center">Availability Status</th>
                  <th className="py-3.5 px-4 text-center">Weekly Load</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No physicians found matching your search criteria. Click "+ Add Doctor" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => {
                    const totalSlotsThisWeek = 28;
                    const usernameDisplay = doc.username || doc.email.split('@')[0] || 'doctor';
                    const isPasswordRevealed = !!showPasswords[doc.id];

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc)}
                        className="hover:bg-teal-50/20 transition-colors cursor-pointer"
                      >
                        {/* Doctor Monogram Avatar & Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-heading">
                              {doc.name.replace('Dr. ', '').charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{doc.email || 'doctor@carepulse.com'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department & Specialty */}
                        <td className="py-4 px-4">
                          <span className="inline-block bg-teal-50 text-[#0B5A54] text-[10px] font-black px-2 py-0.5 rounded border border-teal-200 mb-0.5">
                            {doc.department}
                          </span>
                          <p className="text-[11px] text-slate-600 font-semibold">{doc.specialty}</p>
                        </td>

                        {/* Room / Cabin */}
                        <td className="py-4 px-4 text-slate-600 font-semibold">{doc.roomNumber}</td>

                        {/* Fee / Exp */}
                        <td className="py-4 px-4">
                          <p className="text-slate-900 font-black">₹{doc.consultationFee}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.experienceYears} Years Exp.</p>
                        </td>

                        {/* Portal Credentials (Username & Masked Password) */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                              <span className="text-slate-400 text-[10px]">User:</span>
                              <span className="font-mono text-[#0B5A54] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[11px]">
                                {usernameDisplay}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-[10px]">Pass:</span>
                              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-200/70">
                                {isPasswordRevealed ? (doc.password || 'doc123') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleShowPassword(doc.id)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                                title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Availability Toggle */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleToggleAvailability(doc, e)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                              doc.isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {doc.isAvailable ? 'Available (On Duty)' : 'Off Duty'}
                          </button>
                        </td>

                        {/* Weekly Load */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {totalSlotsThisWeek} Appts
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResetPasswordDoc(doc);
                                setNewResetPassword('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Reset Doctor Portal Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleOpenEdit(doc, e)}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54] transition-colors cursor-pointer"
                              title="Edit Doctor Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDoctorToDelete(doc);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Doctor"
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

      {/* ── View 2: Card Grid View ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => {
            const usernameDisplay = doc.username || doc.email.split('@')[0] || 'doctor';
            const isPasswordRevealed = !!showPasswords[doc.id];

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoctor(doc)}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0 font-heading">
                      {doc.name.replace('Dr. ', '').charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{doc.specialty}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                      doc.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {doc.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                {/* Info Pills */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cabin</span>
                    <span className="font-black text-slate-800 truncate block">{doc.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Fee / Exp</span>
                    <span className="font-black text-slate-800">
                      ₹{doc.consultationFee} • {doc.experienceYears}y
                    </span>
                  </div>
                </div>

                {/* Portal Credentials Pill */}
                <div
                  className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Doctor Portal Login</span>
                    <span className="font-mono text-[11px] font-black text-[#0B5A54]">{usernameDisplay}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded text-[11px] font-bold border border-teal-200">
                      {isPasswordRevealed ? (doc.password || 'doc123') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(doc.id)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-500">
                  <span className="text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 text-[11px]">
                    {doc.department}
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-slate-900 transition-colors">
                    View Schedule & Stats
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Doctor Detail Modal ── */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-md font-heading">
                  {selectedDoctor.name.replace('Dr. ', '').charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    {selectedDoctor.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {selectedDoctor.specialty} • {selectedDoctor.department}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Doctor Credentials & Portal Login Info */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Doctor Portal Login Credentials
                </span>
                <button
                  onClick={() => {
                    setResetPasswordDoc(selectedDoctor);
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
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Portal Username / ID</span>
                  <span className="font-mono font-black text-slate-900">
                    {selectedDoctor.username || selectedDoctor.email.split('@')[0] || 'doctor'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Portal Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                      {showPasswords[selectedDoctor.id] ? (selectedDoctor.password || 'doc123') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(selectedDoctor.id)}
                      className="text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {showPasswords[selectedDoctor.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics & Performance Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xl font-black text-slate-900">128</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed Appts</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100">
                <p className="text-xl font-black text-[#0B5A54]">96.4%</p>
                <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">Patient Satisfaction</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-xl font-black text-emerald-700">₹{selectedDoctor.consultationFee}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Consultation Fee</p>
              </div>
            </div>

            {/* Weekly Consultation Schedule Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Weekly Consultation Days & Cabin
                </h4>
                <span className="text-xs font-bold text-slate-700">{selectedDoctor.roomNumber}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const isAvailableDay = (selectedDoctor.availableDays || DEFAULT_DAYS).includes(day);
                    return (
                      <div
                        key={day}
                        className={`p-2.5 rounded-xl border ${
                          isAvailableDay
                            ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                            : 'bg-white text-slate-300 border-slate-200/60'
                        }`}
                      >
                        <span className="block text-[11px] font-black">{day}</span>
                        <span className="text-[9px] font-medium block mt-0.5">
                          {isAvailableDay ? 'On Duty' : 'Off'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setDoctorToDelete(selectedDoctor)}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Doctor</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedDoctor)}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Doctor Modal ── */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[#0B5A54]">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  {isAddModalOpen ? 'Onboard New Physician' : 'Edit Physician Credentials'}
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
                <label className="block mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Alexander King"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              {/* Portal Login Credentials Section */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Doctor Portal Login Credentials
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-[11px]">Portal Username</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. alexander.k"
                      className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px]">Portal Password</label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Clinical Specialty</label>
                  <input
                    type="text"
                    required
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    placeholder="e.g. Cardiologist"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Assigned Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formFee}
                    onChange={(e) => setFormFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formExperience}
                    onChange={(e) => setFormExperience(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Cabin Location</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="e.g. Cabin 104 - 1st Floor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              {/* Weekly Availability Days */}
              <div>
                <label className="block mb-1.5">Consultation Duty Days</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const isChecked = formDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
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
                  {isAddModalOpen ? 'Add Physician' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetPasswordDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#0B5A54]">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-black text-slate-900 font-heading">
                Reset Doctor Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Set a new doctor portal login password for <strong>{resetPasswordDoc.name}</strong> ({resetPasswordDoc.username || resetPasswordDoc.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password (e.g. doc2026!)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordDoc(null)}
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

      {/* ── Delete Confirmation Modal ── */}
      {doctorToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Remove {doctorToDelete.name}?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              This will remove the doctor from active consultations and online booking slots.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDoctorToDelete(null)}
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

export default AdminDoctorManagement;
