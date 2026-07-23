import { UserLocation, PrayerTimings, WeatherData } from '../types';

// Default coordinates: Mecca / London fallback if permission denied
const DEFAULT_LAT = 21.4225;
const DEFAULT_LNG = 39.8262;

export async function getUserCurrentCoordinates(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        city: 'Default Location',
        updatedAt: new Date().toISOString()
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let cityName = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        
        try {
          // Reverse geocoding using free Nominatim or BigDataCloud
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
          if (res.ok) {
            const geoData = await res.json();
            cityName = geoData.city || geoData.locality || geoData.principalSubdivision || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
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
      (error) => {
        console.warn('Geolocation permission denied or error:', error.message);
        resolve({
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          city: 'Mecca (Default)',
          updatedAt: new Date().toISOString()
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

// Fetch Islamic Prayer Timings from Aladhan API
export async function fetchPrayerTimings(lat: number, lng: number): Promise<PrayerTimings | null> {
  try {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch prayer timings');
    const data = await res.json();
    
    if (data.code === 200 && data.data) {
      const timings = data.data.timings;
      const gDate = data.data.date?.readable || today.toLocaleDateString();
      const hDate = data.data.date?.hijri ? `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year} AH` : undefined;

      return {
        Fajr: timings.Fajr,
        Sunrise: timings.Sunrise,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
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

// Fetch Weather Data from Open-Meteo
export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url);
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
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        80: 'Rain Showers',
        95: 'Thunderstorm'
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
