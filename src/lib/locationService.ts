import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
  placeName?: string;
  isLiveGps?: boolean;
  error?: string;
}

/**
 * Live Dynamic Android & iOS Mobile Location Service
 * Accurately detects live mobile device GPS coordinates and reverse geocodes area/city name.
 */
export const requestNativeLocation = async (): Promise<LocationResult> => {
  try {
    // 1. Request native Android location permissions
    let permStatus = await Geolocation.checkPermissions();

    if (permStatus.location !== 'granted') {
      permStatus = await Geolocation.requestPermissions();
    }

    if (permStatus.location === 'granted') {
      let position;
      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
      } catch {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
        });
      }

      const { latitude, longitude } = position.coords;

      // 2. Perform live reverse geocoding via OpenStreetMap Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        const addr = data.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.subdistrict || '';
        const city = addr.city || addr.town || addr.village || addr.county || addr.state || 'Live Location';

        const placeName = area ? `${area}, ${city}` : city;
        sessionStorage.setItem('current_user_location', placeName);
        return { latitude, longitude, placeName, isLiveGps: true };
      } catch {
        const placeName = `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
        sessionStorage.setItem('current_user_location', placeName);
        return { latitude, longitude, placeName, isLiveGps: true };
      }
    } else {
      return {
        latitude: 0,
        longitude: 0,
        error: 'Location permission denied by user.',
      };
    }
  } catch (err: any) {
    // Fallback: Standard W3C HTML5 Geolocation API
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
              );
              const data = await res.json();
              const addr = data.address || {};
              const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
              const city = addr.city || addr.town || addr.village || addr.county || addr.state || 'Live Location';
              const placeName = area ? `${area}, ${city}` : city;
              sessionStorage.setItem('current_user_location', placeName);
              resolve({ latitude, longitude, placeName, isLiveGps: true });
            } catch {
              const placeName = `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
              sessionStorage.setItem('current_user_location', placeName);
              resolve({ latitude, longitude, placeName, isLiveGps: true });
            }
          },
          (error) => {
            resolve({
              latitude: 0,
              longitude: 0,
              error: error.message || 'GPS location detection timed out.',
            });
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        resolve({ latitude: 0, longitude: 0, error: 'Geolocation unsupported.' });
      }
    });
  }
};
