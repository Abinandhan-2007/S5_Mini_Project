import React, { useState } from 'react';
import { X, Stethoscope, User, Phone, Mail, MapPin, DollarSign, Upload, CheckCircle2, FileText, ChevronDown, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface CreateDoctorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateDoctor: React.FC<CreateDoctorProps> = ({ isOpen, onClose, onSuccess }) => {
  const createDoctor = useStaffStore((s) => s.createDoctor);

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [department, setDepartment] = useState('');
  const [experienceYears, setExperienceYears] = useState<string>('');
  const [consultationFee, setConsultationFee] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [about, setAbout] = useState('');
  const [photo, setPhoto] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhoto(result);
        setFilePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const expNum = parseInt(experienceYears, 10) || 1;
    const feeNum = parseFloat(consultationFee) || 500;
    const selectedSpecialty = specialty || 'General Physician';
    const selectedDept = department || selectedSpecialty;
    const assignedUsername = username.trim() || email.split('@')[0] || name.toLowerCase().replace(/\s+/g, '.');
    const assignedPassword = password.trim() || 'doc123';

    setIsSubmitting(true);
    await createDoctor({
      name,
      specialty: selectedSpecialty,
      department: selectedDept,
      experienceYears: expNum,
      consultationFee: feeNum,
      phone: phone || '+91 98765 00000',
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@carepulse.com`,
      username: assignedUsername,
      password: assignedPassword,
      roomNumber: roomNumber || 'Cabin 101 - 1st Floor',
      about: about || `Senior ${selectedSpecialty} with clinical experience in medical consultations and patient care.`,
      photo: photo || '/doctor_default.jpg',
      isAvailable: true,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slotCapacities: [],
    });

    // Reset form fields
    setName('');
    setSpecialty('');
    setDepartment('');
    setExperienceYears('');
    setConsultationFee('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setRoomNumber('');
    setAbout('');
    setPhoto('');
    setFilePreview(null);

    setIsSubmitting(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Staff Onboarding
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2 font-heading">Add New Doctor Record</h2>
          <p className="text-xs text-slate-500">Register doctor profile and assign department & room details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Dr. Alexander Wright"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Portal Login Credentials */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#0B5A54] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B5A54]" />
                Doctor Portal Login Credentials
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Username / Login ID</label>
                <input
                  type="text"
                  placeholder="e.g. alexander.w"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="e.g. doc123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specialty</label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  required
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setDepartment(e.target.value);
                  }}
                  className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer appearance-none ${
                    !specialty ? 'text-slate-400 font-normal' : 'text-slate-900 font-semibold'
                  }`}
                >
                  <option value="" disabled>Select Specialty...</option>
                  <option value="Cardiologist">Cardiologist</option>
                  <option value="Dermatologist">Dermatologist</option>
                  <option value="Pediatrician">Pediatrician</option>
                  <option value="Neurologist">Neurologist</option>
                  <option value="General Physician">General Physician</option>
                  <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                  <option value="Gynecologist">Gynecologist</option>
                  <option value="ENT Specialist">ENT Specialist</option>
                  <option value="Ophthalmologist">Ophthalmologist</option>
                  <option value="Psychiatrist">Psychiatrist</option>
                  <option value="Oncologist">Oncologist</option>
                  <option value="Radiologist">Radiologist</option>
                  <option value="Urologist">Urologist</option>
                  <option value="Endocrinologist">Endocrinologist</option>
                  <option value="Gastroenterologist">Gastroenterologist</option>
                  <option value="Dentist">Dentist</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
              <input
                type="number"
                min={1}
                max={50}
                placeholder="e.g. 5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee (₹)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  placeholder="e.g. 750"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Cabin</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Cabin 105 - 1st Floor"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 11000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="e.g. doctor@carepulse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">About Doctor (Biography & Summary)</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows={3}
                placeholder="Senior specialist with clinical experience in advanced medical care, consultations, and patient wellness..."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] resize-none"
              />
            </div>
          </div>


          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Doctor Photo (From Computer)</label>
            {filePreview ? (
              <div className="flex items-center gap-4 p-3 bg-teal-50/70 border border-teal-200 rounded-2xl">
                <img
                  src={filePreview}
                  alt="Doctor Upload Preview"
                  className="w-14 h-14 rounded-2xl object-cover border border-teal-200 shadow-xs"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5A54]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Photo Uploaded Successfully</span>
                  </div>
                  <label className="inline-block text-[11px] font-bold text-[#0B5A54] hover:underline cursor-pointer">
                    Change Photo from Computer
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => { setPhoto(''); setFilePreview(null); }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100/60 rounded-xl transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#0B5A54] bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-4 cursor-pointer transition-all text-center space-y-1.5 group">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-[#0B5A54] group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Click to upload doctor photo from computer</span>
                  <span className="text-[10.5px] font-medium text-slate-400">Supports JPG, PNG, WEBP files</span>
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>


          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 text-xs uppercase tracking-wider hover:scale-[1.01]"
          >
            {isSubmitting ? 'Saving Doctor Record...' : 'Save Doctor Record'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDoctor;
