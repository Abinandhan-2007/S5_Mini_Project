import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, ArrowUpRight, Clock, ShieldCheck, Check, Filter } from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { hospitalService } from '../../services/hospitalService';
import type { Hospital, Doctor } from '../../lib/types';
import { useCarePulseStore } from '../../lib/store';

export const HospitalDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'offduty'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live polling: Fetch hospital and affiliated doctors from backend database in real-time
  const fetchLiveHospitalData = React.useCallback(() => {
    if (!id) return;
    hospitalService.getHospitalById(id).then((res) => {
      setLoading(false);
      if (res && res.hospital) {
        setHospital(res.hospital);
        setDoctors(res.doctors || []);
      } else {
        setHospital(null);
      }
    }).catch(() => {
      setLoading(false);
      setHospital(null);
    });
  }, [id]);

  useEffect(() => {
    fetchLiveHospitalData();

    // Fast 3-second live sync interval for real-time receptionist updates
    const interval = setInterval(fetchLiveHospitalData, 3000);
    const handleFocus = () => fetchLiveHospitalData();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchLiveHospitalData]);

  // Extract available specialty options for this hospital
  const specialtyOptions = Array.from(new Set(doctors.map((d) => d.specialty)));

  // Availability statistics
  const availableCount = doctors.filter((d) => d.isAvailable !== false && d.is_available !== false).length;
  const offDutyCount = doctors.length - availableCount;

  // Multi-select specialty toggle
  const toggleSpecialty = (spec: string) => {
    if (spec === 'All') {
      setSelectedSpecialties([]);
      return;
    }
    if (selectedSpecialties.includes(spec)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec));
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  };

  // Filter doctors based on selected specialties AND live availability filter
  const filteredDoctors = doctors.filter((d) => {
    const isOffDuty = d.isAvailable === false || d.is_available === false;
    if (availabilityFilter === 'available' && isOffDuty) return false;
    if (availabilityFilter === 'offduty' && !isOffDuty) return false;

    if (selectedSpecialties.length === 0) return true;
    return selectedSpecialties.some((spec) => spec.toLowerCase() === d.specialty.toLowerCase());
  });

  const handleSelectDoctor = (doctor: Doctor) => {
    const isOffDuty = doctor.isAvailable === false || doctor.is_available === false;
    if (isOffDuty) {
      const reasonText = doctor.availabilityReason ? ` (${doctor.availabilityReason})` : '';
      const timeText = doctor.unavailableUntil ? ` Expected back in ${doctor.unavailableUntil}.` : '';
      setToastMessage(`Dr. ${doctor.name} is currently off-duty${reasonText}.${timeText} Please choose an active specialist.`);
      setTimeout(() => setToastMessage(null), 4500);
      return;
    }
    setBookingDoctor(doctor);
    navigate(`/appointments/book/${doctor.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#0B5A54] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading hospital details...</p>
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-28 flex flex-col justify-between">
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/hospitals')}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] shadow-sm border border-slate-200"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#0B5A54]" />
          </button>
          <span className="font-bold text-slate-800 text-sm">Hospital Details</span>
        </div>
        <div className="max-w-sm mx-auto text-center space-y-4 px-4 my-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-[#0B5A54] mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Hospital Not Found</h3>
            <p className="text-xs text-slate-500">
              The requested hospital facility does not exist or has been removed from the database.
            </p>
          </div>
          <button
            onClick={() => navigate('/hospitals')}
            className="w-full bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-bold py-3 px-4 rounded-full shadow-sm transition-all"
          >
            Browse All Hospitals
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* Full-bleed Hero Image Header */}
      <div className="relative h-60 sm:h-72 w-full bg-slate-900 overflow-hidden">
        <img
          src={hospital.imageUrl || '/hospital_default.jpg'}
          alt={hospital.name}
          onError={(e) => { e.currentTarget.src = '/hospital_default.jpg'; }}
          className="w-full h-full object-cover opacity-90 scale-105 transition-transform duration-500 hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-900/30" />

        {/* Top Navigation - Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-[#111827] hover:bg-white transition-all active:scale-95 shadow-md border border-white/20"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#0B5A54]" />
          </button>
        </div>

        {/* Hero Badges Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
          <span className="bg-[#0B5A54] text-white text-[10px] sm:text-xs font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-md border border-white/20">
            Multi-Specialty Center
          </span>
          <Badge variant="rating" className="bg-white/95 backdrop-blur-md px-3 py-1 shadow-md text-slate-900 font-extrabold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {hospital.rating} ({hospital.reviewsCount} reviews)
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-5 max-w-7xl mx-auto w-full">
        {/* Facility Info Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E4E7EC] text-left space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0B5A54]">
              <ShieldCheck className="w-4 h-4 text-[#0B5A54]" />
              <span>NABH Accredited Hospital</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold font-heading text-[#111827] leading-tight">
              {hospital.name}
            </h1>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#6B7280]">
            <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
            <span className="leading-snug">{hospital.address} • <strong className="text-[#111827]">{hospital.distanceMiles} miles away</strong></span>
          </div>

          <div className="pt-2 border-t border-[#E4E7EC] flex items-center justify-between text-[11px] font-semibold text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Open 24/7 Emergency Care</span>
            </div>
            <span className="text-[#0B5A54] font-bold">Verified Center</span>
          </div>
        </div>

        {/* Specialists Section Header & Normal Filter Chips Strip */}
        <div className="space-y-3 text-left">
          <div className="flex justify-between items-center px-1">
            <div>
              <h2 className="text-base font-extrabold font-heading text-[#111827]">Our Specialists</h2>
              <p className="text-xs text-[#6B7280]">Select a physician to view schedule & book</p>
            </div>
            {selectedSpecialties.length > 0 && (
              <button
                onClick={() => setSelectedSpecialties([])}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* STANDARD NORMAL MOBILE FILTER CHIPS ROW */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1">
            {/* All Option Chip */}
            <button
              type="button"
              onClick={() => toggleSpecialty('All')}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 border flex items-center gap-1.5 shadow-2xs',
                selectedSpecialties.length === 0
                  ? 'bg-[#0B5A54] text-white border-[#0B5A54]'
                  : 'bg-white text-slate-700 border-[#E4E7EC] hover:border-[#0B5A54]/50'
              )}
            >
              <Filter className="w-3 h-3" />
              <span>All</span>
            </button>

            {/* Department Specialty Chips */}
            {specialtyOptions.map((spec) => {
              const isActive = selectedSpecialties.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialty(spec)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 border flex items-center gap-1.5 shadow-2xs',
                    isActive
                      ? 'bg-[#0B5A54] text-white border-[#0B5A54]'
                      : 'bg-white text-slate-700 border-[#E4E7EC] hover:border-[#0B5A54]/50'
                  )}
                >
                  {isActive && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  <span>{spec}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOAST ALERT NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-20 inset-x-4 max-w-md mx-auto z-50 animate-bounce">
            <div className="bg-rose-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-rose-700 flex items-center gap-3 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 animate-ping" />
              <p className="text-xs font-bold leading-tight flex-1">{toastMessage}</p>
              <button onClick={() => setToastMessage(null)} className="text-rose-300 hover:text-white text-xs font-black">✕</button>
            </div>
          </div>
        )}

        {/* Doctor Specialists Header + Live Filter */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight">
                  Hospital Specialists
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Synced" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Real-time status synced with reception</p>
            </div>

            {/* Live Availability Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  availabilityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All ({doctors.length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  availabilityFilter === 'available'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Available ({availableCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('offduty')}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  availabilityFilter === 'offduty'
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Off-Duty ({offDutyCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Doctor Specialists List - 2-COLUMN PREMIUM CARD GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => {
              const isSelected = selectedDoctorId === doc.id;
              const isOffDuty = doc.isAvailable === false || doc.is_available === false;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctorId(doc.id);
                    handleSelectDoctor(doc);
                  }}
                  className={clsx(
                    'rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-4 border relative overflow-hidden',
                    isSelected
                      ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md scale-[1.02]'
                      : isOffDuty
                      ? 'bg-slate-50/90 text-slate-600 border-dashed border-rose-200/80 hover:border-rose-300'
                      : 'bg-white text-slate-900 border-slate-200/80 hover:border-[#0B5A54]/50'
                  )}
                >
                  {/* Top Block: Avatar + Name + Specialty + Live Status */}
                  <div className="space-y-3">
                    {/* Live Availability Pill */}
                    <div className="flex items-center justify-between gap-1">
                      {isOffDuty ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1 max-w-[80%] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <span className="truncate">Off-Duty {doc.availabilityReason ? `(${doc.availabilityReason})` : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available
                        </span>
                      )}

                      {(doc.staff_code || doc.staffCode) && (
                        <span className="text-[9px] font-mono font-bold text-slate-400">
                          {doc.staff_code || doc.staffCode}
                        </span>
                      )}
                    </div>

                    {/* Avatar + Doctor Name */}
                    <div className="flex items-start gap-3">
                      <img
                        src={doc.photoUrl || (doc as any).photo || '/doctor_default.jpg'}
                        alt={doc.name}
                        onError={(e) => { e.currentTarget.src = '/doctor_default.jpg'; }}
                        className={clsx(
                          'w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shrink-0 shadow-2xs group-hover:scale-105 transition-transform',
                          isSelected ? 'ring-2 ring-teal-200' : isOffDuty ? 'ring-2 ring-rose-200 grayscale-30' : 'ring-2 ring-slate-100'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className={clsx(
                          'text-xs sm:text-sm font-black leading-tight tracking-tight multiline-clamp-2',
                          isSelected ? 'text-white' : isOffDuty ? 'text-slate-700' : 'text-[#111827] group-hover:text-[#0B5A54] transition-colors'
                        )}>
                          {doc.name}
                        </h3>
                      </div>
                    </div>

                    {/* Specialty Text */}
                    <p className={clsx(
                      'text-[11px] sm:text-xs font-bold truncate',
                      isSelected ? 'text-teal-100' : 'text-slate-400'
                    )}>
                      {doc.specialty}
                    </p>
                  </div>

                  {/* Bottom Block: Star Rating & Review Count | Action */}
                  <div className="flex items-end justify-between gap-2 pt-2">
                    <div>
                      <div className="flex items-center gap-1 text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className={isSelected ? 'text-white' : 'text-slate-900'}>
                          {doc.rating || 4.5}
                        </span>
                      </div>
                      <span className={clsx(
                        'text-[10px] font-bold block mt-0.5',
                        isSelected ? 'text-teal-100' : 'text-slate-400'
                      )}>
                        {doc.reviewsCount || 85} Reviews
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className={clsx(
                      'px-3 py-1.5 rounded-full flex items-center justify-center transition-all group-hover:scale-105 shadow-2xs shrink-0',
                      isSelected
                        ? 'bg-[#E3F3F1] text-[#0B5A54]'
                        : isOffDuty
                        ? 'bg-rose-100/80 text-rose-700 text-[10px] font-extrabold'
                        : 'bg-slate-100 text-[#0B5A54] group-hover:bg-[#0B5A54] group-hover:text-white'
                    )}>
                      {isOffDuty ? (
                        <span>Off-Duty</span>
                      ) : (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white border border-[#E4E7EC] rounded-3xl p-8 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">No specialists match the selected criteria</p>
              <button
                onClick={() => {
                  setSelectedSpecialties([]);
                  setAvailabilityFilter('all');
                }}
                className="text-xs font-bold text-[#0B5A54] underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
