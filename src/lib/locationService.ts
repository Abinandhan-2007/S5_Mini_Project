import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
  placeName?: string;
  error?: string;
}

export const requestNativeLocation = async (): Promise<LocationResult> => {
  try {
    // Check or request native mobile OS system location permissions
    let permStatus = await Geolocation.checkPermissions();

    if (permStatus.location !== 'granted') {
      permStatus = await Geolocation.requestPermissions();
    }

    if (permStatus.location === 'granted') {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get city / suburb name
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        const addr = data.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
        const city = addr.city || addr.town || addr.village || addr.county || addr.state || 'Your City';

        const placeName = area ? `${area}, ${city}` : city;
        return { latitude, longitude, placeName };
      } catch {
        return {
          latitude,
          longitude,
          placeName: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
        };
      }
    } else {
      return {
        latitude: 0,
        longitude: 0,
        error: 'Location permission denied by user.',
      };
    }
  } catch (err: any) {
    // Fallback to standard W3C Web Geolocation API
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
              const city = addr.city || addr.town || addr.village || addr.county || addr.state || 'Your City';
              const placeName = area ? `${area}, ${city}` : city;
              resolve({ latitude, longitude, placeName });
            } catch {
              resolve({ latitude, longitude, placeName: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°` });
            }
          },
          (error) => {
            resolve({
              latitude: 0,
              longitude: 0,
              error: error.code === 1 ? 'Location permission denied.' : 'Unable to retrieve location.',
            });
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        resolve({ latitude: 0, longitude: 0, error: 'Geolocation not supported.' });
      }
    });
  }
};
