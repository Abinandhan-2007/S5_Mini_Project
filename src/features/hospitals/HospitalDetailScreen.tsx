import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, Bell, SlidersHorizontal, ChevronRight, Award } from 'lucide-react';

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
    <div className="min-h-screen bg-[#EEF1F6] pb-24 w-full relative">
      {/* Full-bleed Hero Image Header */}
      <div className="relative h-56 sm:h-64 w-full bg-slate-800">
        <img src={hospital.imageUrl} alt={hospital.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />

        {/* Floating Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#111827] hover:bg-white transition-transform active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-[#0B5A54]" />
          </button>
          <button
            onClick={() => alert('Notifications')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#111827] hover:bg-white transition-transform active:scale-95 shadow-sm"
          >
            <Bell className="w-4.5 h-4.5 text-[#0B5A54]" />
          </button>
        </div>

        {/* Over Hero Badges */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
          <span className="bg-[#0B5A54] text-white text-[10px] sm:text-xs font-extrabold uppercase px-3 py-1 rounded-pill tracking-wider shadow-sm">
            Multi-Specialty
          </span>
          <Badge variant="rating">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {hospital.rating} ({hospital.reviewsCount} reviews)
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* Facility Info */}
        <div className="space-y-1.5 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-[#E4E7EC]">
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-[#111827]">{hospital.name}</h1>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6B7280]">
            <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0" />
            <span>{hospital.address} • {hospital.distanceMiles} miles away</span>
          </div>
        </div>

        {/* Specialists Section Header */}
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-[#111827]">Our Specialists</h2>
            <p className="text-xs sm:text-sm text-[#6B7280]">Select a physician to view availability</p>
          </div>
          <button className="p-2.5 rounded-xl bg-white border border-[#E4E7EC] text-[#0B5A54] hover:bg-[#E3F3F1] shadow-xs">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Specialist Responsive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleSelectDoctor(doc)}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md border border-[#E4E7EC] flex items-center justify-between cursor-pointer hover:border-[#0B5A54] transition-all duration-200 card-left-accent active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <Avatar src={doc.photoUrl} alt={doc.name} size="lg" />
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-[#111827]">{doc.name}</h3>
                  <p className="text-[11px] sm:text-xs font-bold text-[#0B5A54] uppercase tracking-wider">{doc.specialty}</p>

                  <div className="flex items-center gap-2.5 text-xs text-[#6B7280] pt-1">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#14B8A6]" /> {doc.experienceYears} yrs exp
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-700 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doc.rating} ({doc.reviewsCount})
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
