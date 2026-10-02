import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
  placeName?: string;
  isLiveGps?: boolean;
  error?: string;
}

/**
 * Get previously saved user coordinates from localStorage for instant, zero-delay rendering.
 */
export const getCachedLocation = (): LocationResult | null => {
  try {
    const latStr = localStorage.getItem('carepulse_user_lat');
    const lngStr = localStorage.getItem('carepulse_user_lng');
    const placeName =
      localStorage.getItem('carepulse_user_location') ||
      sessionStorage.getItem('current_user_location') ||
      undefined;

    if (latStr && lngStr) {
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lngStr);
      if (!isNaN(latitude) && !isNaN(longitude) && (latitude !== 0 || longitude !== 0)) {
        return {
          latitude,
          longitude,
          placeName: placeName || `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
          isLiveGps: false,
        };
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
};

/**
 * Persist user coordinates to localStorage/sessionStorage.
 */
export const persistUserLocation = (latitude: number, longitude: number, placeName?: string) => {
  try {
    if (latitude && longitude) {
      localStorage.setItem('carepulse_user_lat', String(latitude));
      localStorage.setItem('carepulse_user_lng', String(longitude));
      if (placeName) {
        localStorage.setItem('carepulse_user_location', placeName);
        sessionStorage.setItem('current_user_location', placeName);
      }
    }
  } catch {
    // Ignore storage access errors
  }
};

/**
 * Non-blocking reverse geocoding via OpenStreetMap Nominatim with 3.5s timeout.
 */
const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.subdistrict || '';
      const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
      if (area && city) return `${area}, ${city}`;
      if (area || city) return area || city;
    }
  } catch {
    // Ignore network / timeout errors
  }
  return `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
};

/**
 * Live Dynamic Android & iOS Mobile Location Service.
 * Uses high accuracy with generous timeout (10s) and 5-min cache age so Android/iOS mobile GPS
 * can acquire satellite fix without premature timeout, falling back smoothly to cell/Wi-Fi or cached location.
 */
export const requestNativeLocation = async (): Promise<LocationResult> => {
  try {
    // 1. Check & request native Android/Capacitor location permissions
    let permStatus = await Geolocation.checkPermissions();

    if (permStatus.location !== 'granted') {
      permStatus = await Geolocation.requestPermissions();
    }

    if (permStatus.location === 'granted') {
      let position;
      try {
        // High accuracy with 5-minute cache age so recently fixed positions return in <100ms
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      } catch {
        // Fallback to network/cell tower triangulation
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000,
        });
      }

      const { latitude, longitude } = position.coords;
      const placeName = await reverseGeocode(latitude, longitude);
      persistUserLocation(latitude, longitude, placeName);

      return { latitude, longitude, placeName, isLiveGps: true };
    } else {
      const cached = getCachedLocation();
      if (cached) return cached;
      return {
        latitude: 0,
        longitude: 0,
        error: 'Location permission denied by user.',
      };
    }
  } catch {
    // 2. Fallback: Standard W3C HTML5 Geolocation API (for mobile Chrome/browser)
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const placeName = await reverseGeocode(latitude, longitude);
            persistUserLocation(latitude, longitude, placeName);
            resolve({ latitude, longitude, placeName, isLiveGps: true });
          },
          () => {
            // Secondary attempt with low accuracy / network triangulation
            navigator.geolocation.getCurrentPosition(
              async (pos2) => {
                const { latitude, longitude } = pos2.coords;
                const placeName = await reverseGeocode(latitude, longitude);
                persistUserLocation(latitude, longitude, placeName);
                resolve({ latitude, longitude, placeName, isLiveGps: true });
              },
              (error) => {
                const cached = getCachedLocation();
                if (cached) {
                  resolve(cached);
                } else {
                  resolve({
                    latitude: 0,
                    longitude: 0,
                    error: error.message || 'GPS location detection timed out.',
                  });
                }
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        const cached = getCachedLocation();
        if (cached) {
          resolve(cached);
        } else {
          resolve({ latitude: 0, longitude: 0, error: 'Geolocation unsupported.' });
        }
      }
    });
  }
};

