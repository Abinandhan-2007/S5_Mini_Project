import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Clock,
  HeartPulse,
  Sparkles,
  Baby,
  Brain,
  Activity,
  Stethoscope,
  X,
  Edit2,
  Trash2,
  Layers,
  Check,
  ShieldAlert,
  BedDouble,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DepartmentRecord } from '../../types/staff';

interface AdminDepartmentManagementProps {
  onShowToast: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  HeartPulse,
  Sparkles,
  Baby,
  Brain,
  Activity,
  Stethoscope,
  Building2,
  Layers,
};

export const AdminDepartmentManagement: React.FC<AdminDepartmentManagementProps> = ({
  onShowToast,
}) => {
  const departments = useStaffStore((s) => s.departments);
  const doctors = useStaffStore((s) => s.doctors);
  const addDepartment = useStaffStore((s) => s.addDepartment);
  const updateDepartment = useStaffStore((s) => s.updateDepartment);
  const deleteDepartment = useStaffStore((s) => s.deleteDepartment);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<DepartmentRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentRecord | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);

  // Form State
  const [formName, setFormName] = useState('');
  const [formHead, setFormHead] = useState('');
  const [formIcon, setFormIcon] = useState('HeartPulse');
  const [formColor, setFormColor] = useState('#0B5A54');
  const [formHours, setFormHours] = useState('08:00 AM - 08:00 PM');
  const [formDescription, setFormDescription] = useState('');
  const [formEmergency, setFormEmergency] = useState(true);
  const [formBeds, setFormBeds] = useState(24);
  const [formSelectedDoctors, setFormSelectedDoctors] = useState<string[]>([]);

  // Filtered Departments
  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.headDoctor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setFormName('');
    setFormHead('Dr. Olivia Wilson');
    setFormIcon('HeartPulse');
    setFormColor('#0B5A54');
    setFormHours('08:00 AM - 08:00 PM');
    setFormDescription('');
    setFormEmergency(true);
    setFormBeds(24);
    setFormSelectedDoctors([]);
    setModalStep(1);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDept(dept);
    setFormName(dept.name);
    setFormHead(dept.headDoctor);
    setFormIcon(dept.iconName || 'HeartPulse');
    setFormColor(dept.color || '#0B5A54');
    setFormHours(dept.operatingHours);
    setFormDescription(dept.description);
    setFormEmergency(dept.emergencyCoverage ?? true);
    setFormBeds(dept.totalBeds || 24);
    setFormSelectedDoctors(dept.doctorIds || []);
    setModalStep(1);
    setIsEditModalOpen(true);
  };

  const toggleDoctorSelection = (docId: string) => {
    setFormSelectedDoctors((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDoctors = () => {
    setFormSelectedDoctors(doctors.map((d) => d.id));
  };

  const handleClearDoctors = () => {
    setFormSelectedDoctors([]);
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('Please enter a department name before proceeding.');
      return;
    }
    setModalStep(2);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('Please enter a department name.');
      return;
    }

    await addDepartment({
      name: formName.trim(),
      headDoctor: formHead.trim() || 'Dr. Assigned Lead',
      iconName: formIcon,
      color: formColor || '#0B5A54',
      operatingHours: formHours.trim() || '08:00 AM - 08:00 PM',
      description: formDescription.trim() || 'Clinical care and specialized treatments.',
      emergencyCoverage: formEmergency,
      totalBeds: Number(formBeds) || 20,
      doctorIds: formSelectedDoctors,
    });

    setIsCreateModalOpen(false);
    setModalStep(1);
    onShowToast(`Department "${formName}" created successfully!`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !formName.trim()) return;

    await updateDepartment(selectedDept.id, {
      name: formName.trim(),
      headDoctor: formHead.trim(),
      iconName: formIcon,
      color: formColor,
      operatingHours: formHours.trim(),
      description: formDescription.trim(),
      emergencyCoverage: formEmergency,
      totalBeds: Number(formBeds),
      doctorIds: formSelectedDoctors,
    });

    setIsEditModalOpen(false);
    setSelectedDept(null);
    setModalStep(1);
    onShowToast(`Department "${formName}" updated successfully!`);
  };

  const handleDeleteConfirm = async () => {
    if (!deptToDelete) return;
    await deleteDepartment(deptToDelete.id);
    setDeptToDelete(null);
    if (selectedDept?.id === deptToDelete.id) setSelectedDept(null);
    onShowToast(`Department "${deptToDelete.name}" deleted.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Department Management
            </h2>
            <span className="bg-teal-50 text-[#0B5A54] text-xs font-black px-2.5 py-0.5 rounded-full border border-teal-200">
              {departments.length} Specialties
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure clinical wings, inpatient bed capacities, operating shifts, and physician assignments.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Department</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name, specialty, or department lead..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
          />
        </div>
      </div>

      {/* ── Department Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepartments.map((dept) => {
          const IconComp = ICON_MAP[dept.iconName || 'HeartPulse'] || HeartPulse;
          const assignedDocs = doctors.filter(
            (d) =>
              dept.doctorIds?.includes(d.id) ||
              d.department?.toLowerCase() === dept.name.toLowerCase()
          );

          return (
            <div
              key={dept.id}
              onClick={() => setSelectedDept(dept)}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer space-y-4 group flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: `${dept.color || '#0B5A54'}15`, color: dept.color || '#0B5A54' }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                    >
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Head: {dept.headDoctor}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEdit(dept, e)}
                      className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-[#0B5A54] transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeptToDelete(dept);
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-3 leading-relaxed">
                  {dept.description}
                </p>
              </div>

              {/* Metrics & Badges */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">{dept.operatingHours}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#0B5A54]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{assignedDocs.length} Physicians</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    Beds: <strong className="text-slate-800">{dept.totalBeds || 24} Units</strong>
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      dept.emergencyCoverage
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {dept.emergencyCoverage ? '24/7 Emergency Active' : 'Regular Shift'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Department Detail Modal ── */}
      {selectedDept && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: `${selectedDept.color || '#0B5A54'}15`, color: selectedDept.color || '#0B5A54' }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs"
                >
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    {selectedDept.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Clinical Lead: {selectedDept.headDoctor}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDept(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Clinical Scope & Description
                </span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {selectedDept.description}
                </p>
              </div>

              {/* Department Statistics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100">
                  <p className="text-lg font-black text-[#0B5A54]">
                    {doctors.filter((d) => selectedDept.doctorIds?.includes(d.id) || d.department?.toLowerCase() === selectedDept.name.toLowerCase()).length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assigned Physicians</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-lg font-black text-slate-900">{selectedDept.totalBeds || 24}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Inpatient Beds</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-lg font-black text-emerald-700">
                    {selectedDept.emergencyCoverage ? 'Active' : 'Standard'}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Emergency Triage</p>
                </div>
              </div>

              {/* Assigned Doctors List */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Physicians in this Department
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                  {doctors
                    .filter(
                      (d) =>
                        selectedDept.doctorIds?.includes(d.id) ||
                        d.department?.toLowerCase() === selectedDept.name.toLowerCase()
                    )
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-xs">
                            {doc.name.replace('Dr. ', '').charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {doc.specialty} • {doc.roomNumber}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            doc.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {doc.isAvailable ? 'Available' : 'Off Duty'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setDeptToDelete(selectedDept)}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Department</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDept(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedDept)}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Department</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Department Modal (2-STEP WIZARD) ── */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-slate-200/80 shadow-2xl space-y-5 my-8">
            {/* Modal Header with Step Pill */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center shadow-xs">
                  {modalStep === 1 ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                      {isCreateModalOpen ? 'Create Department' : 'Edit Department'}
                    </h3>
                    <span className="bg-teal-50 text-[#0B5A54] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200">
                      {modalStep === 1 ? 'Step 1: Details' : 'Step 2: Assign Staff'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {modalStep === 1
                      ? 'Configure clinical specialty, department lead, and bed capacity.'
                      : `Assign doctors to the ${formName || 'department'} clinical wing.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
              className="space-y-4 text-xs font-bold text-slate-700"
            >
              {/* ══════════════════════════════════════════════════
                  STEP 1: CLINICAL DETAILS & CONFIGURATION
              ══════════════════════════════════════════════════ */}
              {modalStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Department Name */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Department Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Cardiology & Cardiovascular Sciences"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#0B5A54]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Department Head & Inpatient Bed Capacity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                        Department Head
                      </label>
                      <div className="relative">
                        <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={formHead}
                          onChange={(e) => setFormHead(e.target.value)}
                          placeholder="e.g. Dr. Olivia Wilson"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#0B5A54]/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                        Inpatient Bed Capacity
                      </label>
                      <div className="relative">
                        <BedDouble className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          min="0"
                          value={formBeds}
                          onChange={(e) => setFormBeds(Number(e.target.value))}
                          placeholder="24"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#0B5A54]/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Operating Hours
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="08:00 AM - 08:00 PM"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#0B5A54]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Clinical Description */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Clinical Description
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Overview of diagnostics, therapeutic procedures, and patient care focus..."
                        className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#0B5A54]/10 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* 24/7 Emergency Switch Toggle Card */}
                  <div
                    onClick={() => setFormEmergency(!formEmergency)}
                    className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">24/7 Emergency & Rapid Triage</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Enable round-the-clock emergency response coverage
                        </p>
                      </div>
                    </div>

                    {/* Switch */}
                    <div
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formEmergency ? 'bg-[#0B5A54]' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formEmergency ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Step 1 Footer: Cancel & Next Button */}
                  <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <span>Next: Assign Physicians</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════
                  STEP 2: ASSIGN PHYSICIANS & SAVE CHANGES
              ══════════════════════════════════════════════════ */}
              {modalStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Assign Physicians
                      </label>
                      <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        {formSelectedDoctors.length} of {doctors.length} Assigned
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-black">
                      <button
                        type="button"
                        onClick={handleSelectAllDoctors}
                        className="text-[#0B5A54] hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleClearDoctors}
                        className="text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto p-2.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 no-scrollbar">
                    {doctors.map((doc) => {
                      const isSelected = formSelectedDoctors.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDoctorSelection(doc.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-white border-[#0B5A54] shadow-xs ring-1 ring-[#0B5A54]/25'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Selection Checkmark */}
                            <div className="shrink-0">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center shadow-xs ring-2 ring-teal-500/20">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-slate-400 transition-colors" />
                              )}
                            </div>

                            {/* Doctor Avatar Monogram with Online Dot */}
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-xs font-heading shadow-2xs">
                                {doc.name.replace('Dr. ', '').charAt(0)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white" />
                            </div>

                            {/* Doctor Details */}
                            <div className="min-w-0 truncate">
                              <p className="text-xs font-black text-slate-900 leading-tight truncate group-hover:text-[#0B5A54] transition-colors">
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                                <span className="text-slate-600">{doc.roomNumber || 'Room 101'}</span>
                                <span>•</span>
                                <span className={doc.isAvailable ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                                  {doc.isAvailable ? 'Available Today' : 'Shift Off Duty'}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Specialty Pill Badge */}
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-2xs shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#0B5A54] text-white border-[#0B5A54]'
                                : 'bg-teal-50/80 text-[#0B5A54] border-teal-200/80'
                            }`}
                          >
                            {doc.specialty}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 2 Footer: Back & Save Changes Button */}
                  <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Details</span>
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{isCreateModalOpen ? 'Create Department' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deptToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Delete "{deptToDelete.name}" Department?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              This will remove the department definition. Existing doctor records and appointments will remain preserved.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeptToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDepartmentManagement;
