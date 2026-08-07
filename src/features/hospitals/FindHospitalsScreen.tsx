import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, Star, ChevronRight, LocateFixed, Loader2, X, Bell } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Chip } from '../../components/ui/Chip';
import { requestNativeLocation } from '../../lib/locationService';
import { MOCK_HOSPITALS, MOCK_DOCTORS } from '../../lib/mockApi';

export const FindHospitalsScreen: React.FC = () => {
  const navigate = useNavigate();
  const locationRoute = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Facilities');
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const categories = ['All Facilities', 'Cardiology', 'General', 'Pediatrics', 'Specialty Clinic'];

  // Handle auto-redirected search parameter
  useEffect(() => {
    if (locationRoute.state?.initialSearch) {
      setSearchQuery(locationRoute.state.initialSearch);
    }
  }, [locationRoute.state]);

  // Prompt native mobile OS system location permission on startup if needed
  useEffect(() => {
    const promptNativeLocationOnStartup = async () => {
      const hasPrompted = sessionStorage.getItem('location_hospitals_prompted');
      const locationState = locationRoute.state?.initialSearch;
      if (!hasPrompted && !locationState) {
        sessionStorage.setItem('location_hospitals_prompted', 'true');
        runGeolocationDetection();
      }
    };
    promptNativeLocationOnStartup();
  }, [locationRoute.state]);

  const runGeolocationDetection = async () => {
    setIsLocating(true);
    setLocationStatus(null);

    const res = await requestNativeLocation();
    setIsLocating(false);

    if (res.placeName) {
      setSearchQuery(res.placeName);
      setLocationStatus(`📍 Detected: ${res.placeName}`);
    } else if (res.error) {
      setLocationStatus(`⚠️ ${res.error}`);
    }
  };

  const filteredHospitals = MOCK_HOSPITALS.filter((hosp) => {
    const matchesCategory =
      activeCategory === 'All Facilities' ||
      hosp.facilityType.toLowerCase() === activeCategory.toLowerCase() ||
      hosp.specialties.some((s) => s.toLowerCase() === activeCategory.toLowerCase());

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = hosp.name.toLowerCase().includes(q);
    const matchesAddress = hosp.address.toLowerCase().includes(q);
    const matchesFacility = hosp.facilityType.toLowerCase().includes(q);
    const matchesSpecialty = hosp.specialties.some((s) => s.toLowerCase().includes(q));

    const matchesDoctor = MOCK_DOCTORS.some(
      (doc) => (doc.hospitalId === hosp.id || hosp.id === 'hosp-1') &&
        (doc.name.toLowerCase().includes(q) || doc.specialty.toLowerCase().includes(q))
    );

    return matchesCategory && (matchesName || matchesAddress || matchesFacility || matchesSpecialty || matchesDoctor);
  }).sort((a, b) => (locationStatus ? a.distanceMiles - b.distanceMiles : 0));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      <main className="px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {/* Page Heading & Notification Button */}
        <div className="flex justify-between items-center pt-1 text-left">
          <div className="space-y-0.5">
            <h1 className="text-xl font-black font-heading text-slate-900 tracking-tight">Find Hospitals</h1>
            <p className="text-xs text-slate-500 font-medium">Browse verified medical facilities & top specialists</p>
          </div>

          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm shrink-0"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#111827]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        {/* SEARCH BAR WITH GEOLOCATION DETECTION */}
        <div className="space-y-2">
          <div className="relative flex items-center bg-white border border-slate-200/90 rounded-2xl px-3.5 py-3 shadow-xs focus-within:border-[#0B5A54] focus-within:ring-2 focus-within:ring-[#0B5A54]/15 transition-all">
            <Search className="w-4.5 h-4.5 text-[#0B5A54] shrink-0 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (locationStatus) setLocationStatus(null);
              }}
              placeholder="Search hospitals, doctors, specialties, city..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 mr-1"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={runGeolocationDetection}
              disabled={isLocating}
              className="p-2 rounded-xl bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white transition-all shrink-0 active:scale-95"
              title="Detect Current Location"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-[#0B5A54]" /> : <LocateFixed className="w-4 h-4" />}
            </button>
          </div>

          {locationStatus && (
            <div className="text-[11px] font-bold text-[#0B5A54] text-left px-1 flex items-center gap-1">
              <span>{locationStatus}</span>
            </div>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-left">
          {categories.map((cat) => (
            <Chip
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Chip>
          ))}
        </div>

        {/* Active Search Term Filter Header (No "4 Facilities Found" text) */}
        {searchQuery && (
          <div className="flex justify-between items-center text-xs font-extrabold text-[#0B5A54] px-1 pt-0.5">
            <span>Showing results for "{searchQuery}"</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-bold text-slate-500 hover:text-[#0B5A54] underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* ULTRA-PREMIUM HOSPITAL FACILITY CARDS */}
        <div className="space-y-4 text-left">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hosp) => (
              <div
                key={hosp.id}
                onClick={() => navigate(`/hospitals/${hosp.id}`)}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group active:scale-[0.99]"
              >
                {/* Hero Image Section */}
                <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={hosp.imageUrl}
                    alt={hosp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 via-55% to-transparent" />

                  {/* Top Left Facility Badge */}
                  <div className="absolute top-3.5 left-3.5">
                    <span className="bg-[#0B5A54]/90 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-white/20 tracking-wider shadow-sm">
                      {hosp.facilityType}
                    </span>
                  </div>

                  {/* Top Right Rating Glass Badge */}
                  <div className="absolute top-3.5 right-3.5">
                    <div className="bg-slate-950/60 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{hosp.rating}</span>
                      <span className="text-slate-300 font-normal text-[10px]">({hosp.reviewsCount})</span>
                    </div>
                  </div>

                  {/* Title & Location Overlay */}
                  <div className="absolute bottom-3.5 left-4 right-4 text-white space-y-1">
                    <h3 className="text-lg font-black font-heading text-white line-clamp-1 tracking-tight drop-shadow-xs">
                      {hosp.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                        <span className="truncate">{hosp.address}</span>
                      </div>
                      <span className="bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] text-white font-bold shrink-0">
                        {hosp.distanceMiles} mi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specialties Tags & Full Width View Details CTA Button */}
                <div className="p-4 bg-white space-y-3">
                  {/* Specialty Chips Row */}
                  <div className="flex gap-1.5 flex-wrap">
                    {hosp.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="text-[11px] font-bold text-[#0B5A54] bg-[#E3F3F1] border border-[#0B5A54]/15 px-3 py-1 rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Compact Pill View Details Button Down Below */}
                  <div className="flex justify-end pt-0.5">
                    <button className="bg-gradient-to-r from-[#0B5A54] via-[#0D6B64] to-[#08453F] text-white text-xs font-extrabold py-1.5 px-4 rounded-full shadow-2xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1 group-hover:from-[#08453F] group-hover:to-[#0B5A54]">
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">No matching facilities found</h3>
                <p className="text-xs text-slate-500">Try searching for a different doctor, specialty, or location.</p>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-4 py-2 rounded-full hover:bg-[#0B5A54] hover:text-white transition-all inline-block"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
