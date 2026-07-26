import { UserLocation, PrayerTimings, WeatherData } from '../types';
import { getExactDeviceLocation } from './locationService';

// Default coordinates: Mecca fallback
const DEFAULT_LAT = 21.4225;
const DEFAULT_LNG = 39.8262;

/**
 * IP-based geolocation fallback using free endpoints (ipwho.is, ipapi.co, ip-api.com)
 */
export async function getLocationFromIP(): Promise<UserLocation | null> {
  // Try ipwho.is first (fast & reliable)
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        const cityParts = [];
        if (data.city) cityParts.push(data.city);
        if (data.country) cityParts.push(data.country);
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
    console.warn('ipwho.is failed, trying ipapi.co:', err);
  }

  // Fallback 1: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
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

  // Fallback 2: ip-api.com
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,country,city,lat,lon', { signal: AbortSignal.timeout(3000) });
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
 * High-Accuracy GPS Location Engine with OpenStreetMap Geocoding & IP Fallback
 */
export async function getUserCurrentCoordinates(): Promise<UserLocation> {
  try {
    // Try exact HTML5 GPS hardware location with OpenStreetMap reverse geocoding
    const exactLoc = await getExactDeviceLocation();
    if (exactLoc && exactLoc.latitude && exactLoc.longitude) {
      return exactLoc;
    }
  } catch (err) {
    console.warn('HTML5 GPS positioning failed or denied, using IP location fallback:', err);
  }

  // IP Location Fallback
  const ipLoc = await getLocationFromIP();
  if (ipLoc) {
    return ipLoc;
  }

  // Hardcoded default fallback (Faisalabad, Pakistan)
  return {
    latitude: 31.4187,
    longitude: 73.0791,
    city: "Faisalabad, Pakistan",
    areaLabel: "Faisalabad, Pakistan",
    updatedAt: new Date().toISOString()
  };
}

/**
 * Search city coordinates using OpenStreetMap Nominatim free geocoding API
 */
export async function searchCityCoordinates(cityName: string): Promise<UserLocation | null> {
  if (!cityName || cityName.trim().length === 0) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName.trim())}&limit=5`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SyncMate-App' },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        
        // Clean display name (e.g. "Faisalabad, Punjab, Pakistan" -> "Faisalabad, Pakistan")
        const nameParts = (item.display_name || item.name || cityName).split(',').map((s: string) => s.trim());
        let formattedCity = nameParts[0];
        if (nameParts.length > 1) {
          formattedCity = `${nameParts[0]}, ${nameParts[nameParts.length - 1]}`;
        }

        return {
          latitude: lat,
          longitude: lon,
          city: formattedCity,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('City geocoding search error:', err);
  }

  return null;
}


/**
 * Format complete Hijri Date string (e.g. "11 Safar 1448 AH")
 */
export function getFormattedHijriDate(date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic-uma', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    let day = '', month = '', year = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
    }
    if (day && month && year) {
      return `${day} ${month} ${year} AH`;
    }
  } catch {
    // Ignore and use fallback
  }
  return "11 Safar 1448 AH";
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
        : getFormattedHijriDate(today);

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
      dateHijri: getFormattedHijriDate()
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

