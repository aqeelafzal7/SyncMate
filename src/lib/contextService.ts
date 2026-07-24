import { UserLocation, PrayerTimings, WeatherData } from '../types';

// Default coordinates: Mecca fallback
const DEFAULT_LAT = 21.4225;
const DEFAULT_LNG = 39.8262;

/**
 * IP-based geolocation fallback using free endpoints
 */
async function getLocationFromIP(): Promise<UserLocation | null> {
  // Try ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const cityParts = [];
        if (data.city) cityParts.push(data.city);
        if (data.country_name) cityParts.push(data.country_name);
        const cityName = cityParts.length > 0 ? cityParts.join(', ') : 'IP Location';

        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: cityName,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('ipapi.co failed, trying ip-api.com:', err);
  }

  // Secondary fallback: ip-api.com
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,country,city,lat,lon', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.lat && data.lon) {
        const cityParts = [];
        if (data.city) cityParts.push(data.city);
        if (data.country) cityParts.push(data.country);
        const cityName = cityParts.length > 0 ? cityParts.join(', ') : 'IP Location';

        return {
          latitude: data.lat,
          longitude: data.lon,
          city: cityName,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('ip-api.com failed:', err);
  }

  return null;
}

/**
 * Dual-Location Engine: Primary Browser GPS -> Fallback IP Geolocation -> Graceful Default
 */
export async function getUserCurrentCoordinates(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      getLocationFromIP().then((ipLoc) => {
        resolve(ipLoc || {
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          city: 'Mecca (Default)',
          updatedAt: new Date().toISOString()
        });
      });
      return;
    }

    let resolved = false;

    // Set a safety timeout to trigger IP fallback quickly if GPS hangs
    const safetyTimer = setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        console.warn('Geolocation timed out, switching to IP location...');
        const ipLoc = await getLocationFromIP();
        resolve(ipLoc || {
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          city: 'Mecca (Default)',
          updatedAt: new Date().toISOString()
        });
      }
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let cityName = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        
        try {
          // Reverse geocoding
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const geoData = await res.json();
            const city = geoData.city || geoData.locality || geoData.principalSubdivision;
            const country = geoData.countryName;
            if (city) {
              cityName = country ? `${city}, ${country}` : city;
            }
          }
        } catch {
          // Ignore reverse geocode failure
        }

        resolve({
          latitude: lat,
          longitude: lng,
          city: cityName,
          updatedAt: new Date().toISOString()
        });
      },
      async (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);

        console.warn('Geolocation permission denied or error:', error.message);
        const ipLoc = await getLocationFromIP();
        resolve(ipLoc || {
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          city: 'Mecca (Default)',
          updatedAt: new Date().toISOString()
        });
      },
      { timeout: 4500, enableHighAccuracy: true }
    );
  });
}

/**
 * Fetch Islamic Prayer Timings from Aladhan API (Method 1: ISNA / Method 2: MWL)
 */
export async function fetchPrayerTimings(lat: number, lng: number): Promise<PrayerTimings | null> {
  try {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=1`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('Failed to fetch prayer timings');
    const data = await res.json();
    
    if (data.code === 200 && data.data) {
      const timings = data.data.timings;
      const cleanTime = (t?: string) => t ? t.split(' ')[0] : '00:00';

      const gDate = data.data.date?.readable || today.toLocaleDateString();
      const hDate = data.data.date?.hijri 
        ? `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year} AH` 
        : undefined;

      return {
        Fajr: cleanTime(timings.Fajr),
        Sunrise: cleanTime(timings.Sunrise),
        Dhuhr: cleanTime(timings.Dhuhr),
        Asr: cleanTime(timings.Asr),
        Maghrib: cleanTime(timings.Maghrib),
        Isha: cleanTime(timings.Isha),
        dateGregorian: gDate,
        dateHijri: hDate
      };
    }
    return null;
  } catch (err) {
    console.warn('Aladhan API error, using default estimates:', err);
    return {
      Fajr: "05:15",
      Sunrise: "06:35",
      Dhuhr: "12:30",
      Asr: "15:45",
      Maghrib: "18:20",
      Isha: "19:40",
      dateGregorian: new Date().toLocaleDateString(),
      dateHijri: "1447 AH"
    };
  }
}

/**
 * Fetch Weather Data from Open-Meteo
 */
export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('Failed to fetch weather data');
    const data = await res.json();
    
    if (data.current_weather) {
      const cw = data.current_weather;
      const codeMap: Record<number, string> = {
        0: 'Clear Sky',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing Rime Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Dense Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        80: 'Rain Showers',
        81: 'Moderate Rain Showers',
        82: 'Violent Rain Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with Hail'
      };
      return {
        temperature: Math.round(cw.temperature),
        weatherCode: cw.weathercode,
        condition: codeMap[cw.weathercode] || 'Fair',
        isDay: cw.is_day === 1
      };
    }
    return null;
  } catch (err) {
    console.warn('Weather API error:', err);
    return {
      temperature: 24,
      weatherCode: 0,
      condition: 'Clear',
      isDay: true
    };
  }
}

