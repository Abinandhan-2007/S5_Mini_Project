import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, Star, ChevronRight, LocateFixed, Loader2, CheckCircle2, Bell } from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { requestNativeLocation } from '../../lib/locationService';
import { MOCK_HOSPITALS } from '../../lib/mockApi';

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
      setLocationStatus(`📍 Auto-filled: ${locationRoute.state.initialSearch}`);
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

    const matchesSearch =
      !searchQuery ||
      locationStatus !== null ||
      hosp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hosp.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hosp.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  }).sort((a, b) => (locationStatus ? a.distanceMiles - b.distanceMiles : 0));

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      <main className="px-4 py-4 space-y-4">
        {/* Page Heading & Notification Button (No TopBar) */}
        <div className="flex justify-between items-start pt-1">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold font-heading text-[#111827]">Find hospitals near you</h1>
            <p className="text-xs text-[#6B7280]">Browse verified medical facilities & specialists</p>
          </div>

          <button
            onClick={() => alert('Notifications: You have 1 upcoming appointment!')}
            className="w-9 h-9 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#111827] hover:bg-gray-50 transition-all relative active:scale-95 shadow-2xs shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#111827]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        {/* Search Bar + Location Detection */}
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-[#0B5A54] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter city or area..."
                className="w-full bg-white border border-[#E4E7EC] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs"
              />
              <button
                type="button"
                onClick={runGeolocationDetection}
                disabled={isLocating}
                className="absolute right-2.5 p-1 rounded-full text-[#0B5A54] hover:bg-[#E3F3F1] transition-colors focus:outline-none"
                title="Detect Current Location"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-[#0B5A54]" /> : <LocateFixed className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="md"
              onClick={() => {}}
              leftIcon={<Search className="w-4 h-4" />}
              className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold"
            >
              Search
            </Button>
          </div>

          <div className="flex justify-between items-center px-0.5">
            <button
              type="button"
              onClick={runGeolocationDetection}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B5A54] bg-[#E3F3F1] hover:bg-[#0B5A54] hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <LocateFixed className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>Use My Location</span>
                </>
              )}
            </button>

            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setLocationStatus(null); }}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#DC2626]"
              >
                Clear Search
              </button>
            )}
          </div>

          {locationStatus && (
            <div className="bg-[#E3F3F1] border border-[#14B8A6]/40 text-[#0B5A54] rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
              <span>{locationStatus}</span>
            </div>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
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

        {/* Hospital Cards List */}
        <div className="space-y-4 pt-1">
          {filteredHospitals.map((hosp, index) => (
            <div
              key={hosp.id}
              className="bg-[#F8FAFC] rounded-2xl shadow-xs border border-[#E4E7EC] overflow-hidden transition-all duration-150 card-left-accent relative"
            >
              {/* Image Banner */}
              <div className="relative h-40 w-full bg-slate-200">
                <img src={hosp.imageUrl} alt={hosp.name} className="w-full h-full object-cover" />
                
                {locationStatus && index === 0 && (
                  <div className="absolute top-3 left-3 bg-[#0B5A54] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-pill uppercase tracking-wider shadow-xs flex items-center gap-1 border border-[#14B8A6]">
                    <LocateFixed className="w-3 h-3 text-[#14B8A6] animate-pulse" /> NEAREST
                  </div>
                )}

                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                  <Badge variant="rating">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {hosp.rating} ({hosp.reviewsCount})
                  </Badge>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-heading text-[#111827]">{hosp.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-[#6B7280] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                    <span className="truncate">{hosp.address}</span>
                  </div>
                </div>

                {/* Specialties Tag Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {hosp.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="bg-[#E3F3F1] text-[#0B5A54] text-[10px] font-bold px-2.5 py-0.5 rounded-pill"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <Button
                  fullWidth
                  variant="primary"
                  size="md"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => navigate(`/hospitals/${hosp.id}`)}
                  className="py-2.5 text-xs font-bold"
                >
                  View Specialists & Book
                </Button>
              </div>
            </div>
          ))}

          {filteredHospitals.length === 0 && (
            <Card padding="md" className="text-center py-8">
              <p className="text-xs font-bold text-[#6B7280]">No facilities match your search criteria.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setActiveCategory('All Facilities'); }}>
                Reset Filters
              </Button>
            </Card>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
