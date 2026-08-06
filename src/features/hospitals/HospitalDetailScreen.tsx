import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, SlidersHorizontal, ArrowRight, Award, Clock, ShieldCheck } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { MOCK_HOSPITALS, MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';

export const HospitalDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const hospital = MOCK_HOSPITALS.find((h) => h.id === id) || MOCK_HOSPITALS[0];
  const doctors = MOCK_DOCTORS.filter((d) => d.hospitalId === hospital.id || d.hospitalId === 'hosp-1');

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

        {/* Top Navigation - Back Button ONLY (Notification Bell removed as requested) */}
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

        {/* Specialists Section Header */}
        <div className="flex justify-between items-center text-left px-1">
          <div>
            <h2 className="text-base font-extrabold font-heading text-[#111827]">Our Specialists</h2>
            <p className="text-xs text-[#6B7280]">Select a physician to view schedule & book</p>
          </div>
          <button
            onClick={() => alert('Filter options: All Specialists, Cardiology, Pediatrics')}
            className="p-2 rounded-xl bg-white border border-[#E4E7EC] text-[#0B5A54] hover:bg-[#E3F3F1] transition-all shadow-2xs"
            title="Filter Specialists"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Doctor Specialists List */}
        <div className="space-y-3 text-left">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleSelectDoctor(doc)}
              className="bg-white rounded-2xl p-4 shadow-xs hover:shadow-md border border-[#E4E7EC] hover:border-[#0B5A54] transition-all duration-200 cursor-pointer active:scale-[0.99] space-y-3"
            >
              <div className="flex items-start gap-3.5">
                <Avatar src={doc.photoUrl} alt={doc.name} size="lg" />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-bold text-[#111827] truncate">{doc.name}</h3>
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
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
