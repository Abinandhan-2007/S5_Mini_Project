import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  Search,
  Star,
  ChevronRight,
  LocateFixed,
  Loader2,
  X,
  Bell,
  ArrowUpDown,
  ChevronDown,
  Check,
  ArrowDownAZ,
  Navigation,
  MessageSquareText,
} from 'lucide-react';
import { clsx } from 'clsx';

import { BottomNav } from '../../components/ui/BottomNav';
import { requestNativeLocation } from '../../lib/locationService';
import { hospitalService } from '../../services/hospitalService';
import { doctorService } from '../../services/doctorService';
import type { Hospital, Doctor } from '../../lib/types';

type HospitalSortOption = 'rating' | 'distance' | 'reviews' | 'name';

const SORT_OPTIONS: { key: HospitalSortOption; label: string; icon: React.ReactNode }[] = [
  {
    key: 'rating',
    label: 'Top Rated',
    icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />,
  },
  {
    key: 'distance',
    label: 'Nearest First',
    icon: <Navigation className="w-4 h-4 text-[#0B5A54]" />,
  },
  {
    key: 'reviews',
    label: 'Most Reviewed',
    icon: <MessageSquareText className="w-4 h-4 text-sky-600" />,
  },
  {
    key: 'name',
    label: 'Name (A to Z)',
    icon: <ArrowDownAZ className="w-4 h-4 text-indigo-600" />,
  },
];

const sortLabelMap: Record<HospitalSortOption, string> = {
  rating: 'Top Rated',
  distance: 'Nearest',
  reviews: 'Most Reviewed',
  name: 'Name (A-Z)',
};

export const FindHospitalsScreen: React.FC = () => {
  const navigate = useNavigate();
  const locationRoute = useLocation();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<HospitalSortOption>('rating');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Load hospitals & doctors from database
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      hospitalService.getHospitals(),
      doctorService.getDoctors(),
    ]).then(([hospData, docData]) => {
      if (isMounted) {
        if (Array.isArray(hospData)) setHospitals(hospData);
        if (Array.isArray(docData)) setDoctors(docData);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const filteredHospitals = useMemo(() => {
    const list = hospitals.filter((hosp) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const matchesName = hosp.name.toLowerCase().includes(q);
      const matchesAddress = hosp.address.toLowerCase().includes(q);
      const matchesFacility = hosp.facilityType.toLowerCase().includes(q);
      const matchesSpecialty = hosp.specialties.some((s) => s.toLowerCase().includes(q));

      const matchesDoctor = doctors.some(
        (doc) => (doc.hospitalId === hosp.id || hosp.id === 'hosp-1') &&
          (doc.name.toLowerCase().includes(q) || doc.specialty.toLowerCase().includes(q))
      );

      return matchesName || matchesAddress || matchesFacility || matchesSpecialty || matchesDoctor;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distanceMiles || 0) - (b.distanceMiles || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'reviews') {
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [hospitals, doctors, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#FAFCFD] pb-28 w-full relative select-none">
      {/* 1. LIGHTER LUMINOUS CYAN TOPBAR */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#22B3BD] via-[#28BAC4] to-[#35C6D0] px-4 sm:px-6 pt-4 pb-4 w-full shadow-sm text-left sm:rounded-t-3xl transition-all">
        <div className="max-w-7xl mx-auto space-y-3.5">
          {/* Top Row: Title + Notification Bell */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl font-black font-heading text-white tracking-tight">Find Hospitals</h1>
            </div>

            <button
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm shrink-0 cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#111827]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            </button>
          </div>

          {/* SEARCH BAR WITH GEOLOCATION DETECTION */}
          <div className="space-y-1.5">
            <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-3.5 py-2 shadow-sm focus-within:ring-2 focus-within:ring-white/80 transition-all">
              <Search className="w-4.5 h-4.5 text-[#0B5A54] shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (locationStatus) setLocationStatus(null);
                }}
                placeholder="Search hospitals, doctors, specialties, city..."
                className="w-full bg-transparent border-none text-xs sm:text-sm text-[#111827] font-semibold focus:outline-none placeholder:text-[#9CA3AF]"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={runGeolocationDetection}
                disabled={isLocating}
                className="w-8 h-8 rounded-full bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white transition-all shrink-0 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                title="Detect Current Location"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-[#0B5A54]" /> : <LocateFixed className="w-4 h-4" />}
              </button>
            </div>

            {locationStatus && (
              <div className="text-[11px] font-bold text-teal-100 text-left px-2 flex items-center gap-1">
                <span>{locationStatus}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-7xl mx-auto w-full">

        {/* Active Search Term Filter Header */}
        {searchQuery && (
          <div className="flex justify-between items-center text-xs font-extrabold text-[#0B5A54] px-1 pt-0.5">
            <span>Showing results for "{searchQuery}"</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-bold text-slate-500 hover:text-[#0B5A54] underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* TOP TOOLBAR: HOSPITAL COUNT & SORT BUTTON */}
        <div className="flex items-center justify-between px-1 relative z-20">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-800 tracking-tight">
              Hospital Facilities
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              ({filteredHospitals.length})
            </span>
          </div>

          {/* Interactive Sort Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#0B5A54] border border-slate-200/90 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>Sort: {sortLabelMap[sortBy]}</span>
              <ChevronDown className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', isSortOpen && 'rotate-180')} />
            </button>

            {/* Sort Popover Dropdown */}
            {isSortOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsSortOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Sort Hospitals By
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.key);
                        setIsSortOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer',
                        sortBy === opt.key
                          ? 'bg-[#E3F3F1] text-[#0B5A54]'
                          : 'hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                      {sortBy === opt.key && (
                        <Check className="w-3.5 h-3.5 text-[#0B5A54] stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ULTRA-PREMIUM HOSPITAL FACILITY CARDS - RESPONSIVE RESOLUTION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 text-left">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hosp) => (
              <div
                key={hosp.id}
                onClick={() => navigate(`/hospitals/${hosp.id}`)}
                className="bg-white rounded-[26px] border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(11,90,84,0.14)] hover:border-[#14B8A6]/40 transition-all duration-300 cursor-pointer overflow-hidden group active:scale-[0.99] flex flex-col justify-between"
              >
                <div>
                  {/* Hero Image Section with Cinematic Framing */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={hosp.imageUrl || '/hospital_default.jpg'}
                      alt={hosp.name}
                      onError={(e) => { e.currentTarget.src = '/hospital_default.jpg'; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />



                    {/* Top Right Rating Glass Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="bg-slate-950/70 backdrop-blur-md border border-white/15 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black">{hosp.rating}</span>
                        <span className="text-slate-300 text-[10px]">({hosp.reviewsCount})</span>
                      </div>
                    </div>

                    {/* Bottom Right Distance Pill Overlay */}
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/95 backdrop-blur-md text-[#0B5A54] font-black text-[10.5px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white/60">
                        <MapPin className="w-3 h-3 text-[#0B5A54]" />
                        <span>{hosp.distanceMiles} mi</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    {/* Hospital Name & Code Row */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black font-heading text-slate-900 line-clamp-1 tracking-tight group-hover:text-[#0B5A54] transition-colors">
                        {hosp.name}
                      </h3>
                      {(hosp.hospital_code || hosp.hospitalCode) && (
                        <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          {hosp.hospital_code || hosp.hospitalCode}
                        </span>
                      )}
                    </div>

                    {/* Address Line */}
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <span className="truncate">{hosp.address}</span>
                    </p>

                    {/* Specialty Chips Row */}
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {hosp.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="text-[10.5px] font-bold text-slate-700 bg-slate-50 border border-slate-200/80 group-hover:border-teal-200 group-hover:bg-teal-50/50 group-hover:text-[#0B5A54] px-2.5 py-0.5 rounded-full transition-colors"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action Strip */}
                <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0B5A54]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>OPD Open Today</span>
                  </div>

                  <button className="bg-[#0B5A54] group-hover:bg-[#08423D] text-white text-xs font-black py-1.5 px-3.5 rounded-full shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center gap-1">
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {searchQuery ? 'No matching facilities found' : 'No hospital facilities available'}
                </h3>
                <p className="text-xs text-slate-500">
                  {searchQuery
                    ? 'Try searching for a different doctor, specialty, or location.'
                    : 'There are currently no hospitals registered in the database.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-4 py-2 rounded-full hover:bg-[#0B5A54] hover:text-white transition-all inline-block"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
