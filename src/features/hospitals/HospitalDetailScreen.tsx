import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, ArrowUpRight, Clock, ShieldCheck, Check, Filter } from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { MOCK_HOSPITALS, MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';

export const HospitalDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const hospital = MOCK_HOSPITALS.find((h) => h.id === id) || MOCK_HOSPITALS[0];
  const doctors = MOCK_DOCTORS.filter((d) => d.hospitalId === hospital.id || d.hospitalId === 'hosp-1');

  // Extract available specialty options for this hospital
  const specialtyOptions = Array.from(new Set(doctors.map((d) => d.specialty)));

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

  // Filter doctors based on selected specialties (supports multi-selection)
  const filteredDoctors = doctors.filter((d) => {
    if (selectedSpecialties.length === 0) return true;
    return selectedSpecialties.some((spec) => spec.toLowerCase() === d.specialty.toLowerCase());
  });

  const handleSelectDoctor = (doctor: typeof MOCK_DOCTORS[0]) => {
    setBookingDoctor(doctor);
    navigate(`/appointments/book/${doctor.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* Full-bleed Hero Image Header */}
      <div className="relative h-60 sm:h-72 w-full bg-slate-900 overflow-hidden">
        <img
          src={hospital.imageUrl}
          alt={hospital.name}
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

        {/* Doctor Specialists List - 2-COLUMN PREMIUM CARD GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => {
              // Turn green ONLY when selected by the user! (Default is clean white)
              const isSelected = selectedDoctorId === doc.id;

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
                      : 'bg-white text-slate-900 border-slate-200/80 hover:border-[#0B5A54]/50'
                  )}
                >
                  {/* Top Block: Avatar + Name + Specialty */}
                  <div className="space-y-3">
                    {/* Avatar + Doctor Name */}
                    <div className="flex items-start gap-3">
                      <img
                        src={doc.photoUrl}
                        alt={doc.name}
                        className={clsx(
                          'w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shrink-0 shadow-2xs group-hover:scale-105 transition-transform',
                          isSelected ? 'ring-2 ring-teal-200' : 'ring-2 ring-slate-100'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className={clsx(
                          'text-xs sm:text-sm font-black leading-tight tracking-tight multiline-clamp-2',
                          isSelected ? 'text-white' : 'text-[#111827] group-hover:text-[#0B5A54] transition-colors'
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

                  {/* Bottom Block: Star Rating & Review Count | Circular Arrow Action */}
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

                    {/* Circular Action Button with Arrow Icon */}
                    <div className={clsx(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 shadow-2xs shrink-0',
                      isSelected
                        ? 'bg-[#E3F3F1] text-[#0B5A54]'
                        : 'bg-slate-100 text-[#0B5A54] group-hover:bg-[#0B5A54] group-hover:text-white'
                    )}>
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white border border-[#E4E7EC] rounded-3xl p-8 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">No specialists found for selected departments</p>
              <button
                onClick={() => setSelectedSpecialties([])}
                className="text-xs font-bold text-[#0B5A54] underline cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
