import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, ArrowRight, Award, Clock, ShieldCheck, Check, Filter } from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { MOCK_HOSPITALS, MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';

export const HospitalDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

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
      <main className="px-4 sm:px-6 py-4 space-y-5 max-w-md mx-auto w-full">
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

        {/* Doctor Specialists List */}
        <div className="space-y-3 text-left">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDoctor(doc)}
                className="bg-white rounded-2xl p-4 shadow-xs hover:shadow-md border border-[#E4E7EC] hover:border-[#0B5A54] transition-all duration-200 cursor-pointer active:scale-[0.99] space-y-3 group"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar src={doc.photoUrl} alt={doc.name} size="lg" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-bold text-[#111827] truncate group-hover:text-[#0B5A54]">{doc.name}</h3>
                      <Badge variant="tint" size="sm" className="bg-[#E3F3F1] text-[#0B5A54] font-bold text-[10px] uppercase">
                        {doc.specialty}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#6B7280] line-clamp-1">{doc.about || 'Consultant Specialist'}</p>

                    <div className="flex items-center gap-3 text-xs text-[#6B7280] pt-1">
                      <span className="flex items-center gap-1 font-medium text-[#111827]">
                        <Award className="w-3.5 h-3.5 text-[#0B5A54]" /> {doc.experienceYears} yrs exp
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doc.rating} ({doc.reviewsCount})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Book Appointment CTA Button */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Available Today
                  </span>
                  <span className="text-xs font-bold text-[#0B5A54] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Book Consultation <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">No specialists found for selected departments</p>
              <button
                onClick={() => setSelectedSpecialties([])}
                className="text-xs font-bold text-[#0B5A54] underline"
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
