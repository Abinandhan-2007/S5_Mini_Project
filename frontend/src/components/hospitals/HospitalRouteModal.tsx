import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Car,
  Footprints,
  Phone,
  Copy,
  Check,
  X,
  Compass,
  Sparkles,
  ShieldCheck,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { requestNativeLocation, getCachedLocation } from '../../lib/locationService';

export interface HospitalRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalName: string;
  facilityAddress: string;
  facilityPhone?: string;
  department?: string;
  coordinates?: { lat: number; lng: number };
}

// Authoritative hospital GPS coordinates (KMCH Peelamedu, Coimbatore campus)
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  kmch: { lat: 11.0264, lng: 77.0270 },
  kovai: { lat: 11.0264, lng: 77.0270 },
  psg: { lat: 11.0267, lng: 77.0028 },
  gknm: { lat: 11.0118, lng: 76.9856 },
  royal: { lat: 11.0664, lng: 77.0691 },
  ramakrishna: { lat: 11.0205, lng: 76.9821 },
  ganga: { lat: 11.0193, lng: 76.9511 },
  carepulse: { lat: 11.0264, lng: 77.0270 },
  default: { lat: 11.0264, lng: 77.0270 },
};

function resolveHospitalCoords(name: string, fallback?: { lat: number; lng: number }): { lat: number; lng: number } {
  // If coordinates provided, filter out the old buggy Kalapatti residential coordinates
  if (fallback && fallback.lat && fallback.lng && fallback.lat !== 0 && fallback.lng !== 0) {
    if (Math.abs(fallback.lat - 11.0505) < 0.002 && Math.abs(fallback.lng - 77.0373) < 0.002) {
      return KNOWN_COORDINATES.kmch;
    }
    return fallback;
  }
  const lower = (name || '').toLowerCase();
  for (const [k, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (lower.includes(k)) return coords;
  }
  return KNOWN_COORDINATES.default;
}

// Great-circle Haversine distance in kilometers
function calculateStraightDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Realistic road distance with highway/terrain route winding factor (~1.32x for intercity)
export function estimateRoadDistanceKm(straightKm: number): number {
  if (straightKm <= 2) return Math.round(straightKm * 1.15 * 10) / 10;
  if (straightKm <= 10) return Math.round(straightKm * 1.25 * 10) / 10;
  return Math.round(straightKm * 1.32 * 10) / 10;
}

// Human readable duration formatting (e.g. 99 min -> "1 hr 39 min", 900 min -> "15 hr")
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (remMins === 0) return `~${hrs} hr`;
  return `~${hrs} hr ${remMins} min`;
}

export const HospitalRouteModal: React.FC<HospitalRouteModalProps> = ({
  isOpen,
  onClose,
  hospitalName,
  facilityAddress,
  facilityPhone = '+91 422 432 3800',
  department,
  coordinates,
}) => {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; placeName?: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [routeDriveMinutes, setRouteDriveMinutes] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [travelMode, setTravelMode] = useState<'drive' | 'bike' | 'walk'>('drive');
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('satellite');

  const hospCoords = resolveHospitalCoords(hospitalName, coordinates);

  // Background real road routing via OSRM
  const fetchOsrmRoute = async (uLat: number, uLng: number, hLat: number, hLng: number) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${hLng},${hLat}?overview=false`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const r = data.routes[0];
          const osrmKm = Math.round((r.distance / 1000) * 10) / 10;
          const osrmMinutes = Math.round(r.duration / 60);
          setDistanceKm(osrmKm);
          setRouteDriveMinutes(osrmMinutes);
        }
      }
    } catch {
      // Graceful fallback to accurate road estimation
    }
  };

  // Live GPS detection
  const detectLocation = async () => {
    setIsLocating(true);
    try {
      const res = await requestNativeLocation();
      if (res.latitude && res.longitude) {
        setUserLoc({ lat: res.latitude, lng: res.longitude, placeName: res.placeName });
        const straight = calculateStraightDistanceKm(res.latitude, res.longitude, hospCoords.lat, hospCoords.lng);
        const road = estimateRoadDistanceKm(straight);
        setDistanceKm(road);
        fetchOsrmRoute(res.latitude, res.longitude, hospCoords.lat, hospCoords.lng);
      }
    } catch (err) {
      console.warn('Location detection note:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Immediate initialize on open: check cached GPS fix first for zero lag, then refresh
  useEffect(() => {
    if (isOpen) {
      const cached = getCachedLocation();
      if (cached && cached.latitude && cached.longitude) {
        setUserLoc({ lat: cached.latitude, lng: cached.longitude, placeName: cached.placeName });
        const straight = calculateStraightDistanceKm(cached.latitude, cached.longitude, hospCoords.lat, hospCoords.lng);
        const road = estimateRoadDistanceKm(straight);
        setDistanceKm(road);
        fetchOsrmRoute(cached.latitude, cached.longitude, hospCoords.lat, hospCoords.lng);
      }
      detectLocation();
    }
  }, [isOpen, hospitalName, coordinates]);

  if (!isOpen) return null;

  // Realistic travel time calculations based on road distance
  const calculateDurations = (km: number | null) => {
    if (km === null) {
      return { drive: null, bike: null, walk: null };
    }
    // Driving speed curve: ~41 km/h highway for >25km, ~28 km/h city for <=25km
    const defaultDrive = km > 25 ? Math.round((km / 41) * 60) : Math.max(3, Math.round((km / 28) * 60));
    const drive = routeDriveMinutes !== null ? routeDriveMinutes : defaultDrive;
    // 2-Wheeler: ~41 km/h highway, ~32 km/h city
    const bike = km > 25 ? Math.round((km / 41) * 60) : Math.max(2, Math.round((km / 32) * 60));
    // Walking: ~4.5 km/h
    const walk = Math.max(5, Math.round((km / 4.5) * 60));

    return { drive, bike, walk };
  };

  const durations = calculateDurations(distanceKm);

  // Map Embed URLs (Satellite via Google Maps, Street via OpenStreetMap)
  const delta = 0.008;
  const bbox = `${hospCoords.lng - delta}%2C${hospCoords.lat - delta}%2C${hospCoords.lng + delta}%2C${hospCoords.lat + delta}`;
  const streetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${hospCoords.lat}%2C${hospCoords.lng}`;
  const satelliteMapUrl = `https://maps.google.com/maps?q=${hospCoords.lat},${hospCoords.lng}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
  const mapEmbedUrl = mapLayer === 'satellite' ? satelliteMapUrl : streetMapUrl;

  // Launch Google Maps GPS Turn-by-Turn Navigation directly
  const handleLaunchGoogleMaps = (mode?: 'drive' | 'bike' | 'walk') => {
    const selectedMode = mode || travelMode;
    const travelParam = selectedMode === 'bike' ? 'bicycling' : selectedMode === 'walk' ? 'walking' : 'driving';
    const originParam = userLoc?.lat && userLoc?.lng ? `&origin=${userLoc.lat},${userLoc.lng}` : '';
    // Use destination coordinates so Google Maps navigation pin lands precisely on hospital campus
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${hospCoords.lat},${hospCoords.lng}&travelmode=${travelParam}`;
    window.open(gmapsUrl, '_blank');
  };

  // Launch Apple Maps
  const handleLaunchAppleMaps = () => {
    const saddrParam = userLoc ? `saddr=${userLoc.lat},${userLoc.lng}&` : '';
    const appleUrl = `https://maps.apple.com/?${saddrParam}daddr=${hospCoords.lat},${hospCoords.lng}&dirflg=d`;
    window.open(appleUrl, '_blank');
  };

  // Copy Address & GPS
  const handleCopyAddress = () => {
    const fullText = `${hospitalName}\n${facilityAddress}\nGPS: ${hospCoords.lat}, ${hospCoords.lng}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'max-w-6xl h-[92vh]' : 'max-w-xl max-h-[90vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0B5A54] via-[#0E6C65] to-[#14B8A6] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-teal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hospital Navigation & GPS</span>
              </div>
              <h3 className="text-sm sm:text-base font-black truncate text-white">
                {hospitalName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 text-left">
          {/* Interactive Map Container */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-100 h-56 sm:h-72">
            <iframe
              title="Hospital Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={mapEmbedUrl}
              className="w-full h-full"
            />

            {/* Custom Overlay Pin & Badge */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-2 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-black text-slate-800">
                {department || 'Destination Hospital'}
              </span>
            </div>

            {/* Satellite / Road Map Toggle Pill */}
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1 z-10">
              <button
                type="button"
                onClick={() => setMapLayer('satellite')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'satellite'
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                🛰️ Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('street')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'street'
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                🗺️ Road Map
              </button>
            </div>

            {/* Open in Google Maps Floating Badge */}
            <button
              onClick={() => handleLaunchGoogleMaps(travelMode)}
              className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-[#0B5A54] border border-teal-300 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 z-10 transition-all"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#0B5A54]" />
            </button>
          </div>

          {/* Live GPS Distance & ETA Banner */}
          <div className="bg-[#F0FDF4] border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-950">
                    {distanceKm !== null ? `${distanceKm} km away` : isLocating ? 'Detecting GPS location...' : 'Calculating route...'}
                  </span>
                  {userLoc?.placeName && (
                    <span className="text-[10.5px] text-emerald-700 truncate font-medium max-w-[180px]">
                      • from {userLoc.placeName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  {durations.drive !== null
                    ? `Fastest route via highway (${formatDuration(durations.drive)})`
                    : isLocating
                    ? 'Acquiring satellite fix from your device...'
                    : 'Tap Open Directions to view live route in Google Maps'}
                </p>
              </div>
            </div>

            <button
              onClick={detectLocation}
              disabled={isLocating}
              className="p-2 rounded-xl bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              title="Refresh GPS"
            >
              <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Transport Mode & Estimated Time Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTravelMode('drive')}
              className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                travelMode === 'drive'
                  ? 'bg-teal-50 border-[#0B5A54] text-[#0B5A54] shadow-xs ring-1 ring-[#0B5A54]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-black">
                <Car className="w-3.5 h-3.5" />
                <span>Car / Cab</span>
              </div>
              <p className="text-[11px] font-extrabold mt-0.5">
                {durations.drive !== null ? formatDuration(durations.drive) : 'Auto route'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTravelMode('bike')}
              className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                travelMode === 'bike'
                  ? 'bg-teal-50 border-[#0B5A54] text-[#0B5A54] shadow-xs ring-1 ring-[#0B5A54]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2-Wheeler</span>
              </div>
              <p className="text-[11px] font-extrabold mt-0.5">
                {durations.bike !== null ? formatDuration(durations.bike) : 'Auto route'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTravelMode('walk')}
              className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                travelMode === 'walk'
                  ? 'bg-teal-50 border-[#0B5A54] text-[#0B5A54] shadow-xs ring-1 ring-[#0B5A54]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-black">
                <Footprints className="w-3.5 h-3.5" />
                <span>Walking</span>
              </div>
              <p className="text-[11px] font-extrabold mt-0.5">
                {durations.walk !== null ? formatDuration(durations.walk) : 'Auto route'}
              </p>
            </button>
          </div>

          {/* Hospital Address Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{hospitalName}</h4>
                  <p className="text-xs text-slate-600 leading-snug">{facilityAddress}</p>
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy Address"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">GPS: {hospCoords.lat}, {hospCoords.lng}</span>
              <a
                href={`tel:${facilityPhone}`}
                className="text-[#0B5A54] font-bold hover:underline flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>{facilityPhone}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 shrink-0">
          {/* Prominent Open Directions button opens Google Maps navigation */}
          <button
            type="button"
            onClick={() => handleLaunchGoogleMaps(travelMode)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0B5A54] via-[#0E6C65] to-[#14B8A6] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98"
            title="Open Turn-by-Turn GPS Navigation in Google Maps"
          >
            <Navigation className="w-4 h-4 fill-white/20" />
            <span>Open Directions</span>
          </button>

          {/* Google Maps button directly launches Google Maps */}
          <button
            type="button"
            onClick={() => handleLaunchGoogleMaps(travelMode)}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
            title="Open in Google Maps App or Web"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Google Maps</span>
          </button>

          <button
            type="button"
            onClick={handleLaunchAppleMaps}
            className="py-3 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Apple Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
};

