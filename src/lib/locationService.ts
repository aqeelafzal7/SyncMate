import { UserLocation } from './types';
import { db, saveUserProfile, getUserProfile } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Reverse-geocode latitude & longitude to exact neighbourhood/suburb & city name using OpenStreetMap Nominatim
 * https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  areaLabel: string;
  city: string;
  country: string;
  suburb?: string;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP error ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    // Extract specific address components: suburb, neighbourhood, city_district, city, town, village
    const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.residential || addr.village;
    const mainCity = addr.city || addr.town || addr.municipality || addr.county || addr.state_district || addr.state;
    const country = addr.country || '';

    let areaLabel = '';
    if (suburb && mainCity && suburb.toLowerCase() !== mainCity.toLowerCase()) {
      areaLabel = `${suburb}, ${mainCity}`;
    } else if (mainCity) {
      areaLabel = mainCity;
    } else if (suburb) {
      areaLabel = suburb;
    } else if (data.display_name) {
      const parts = data.display_name.split(',');
      areaLabel = parts.slice(0, 2).join(',').trim();
    } else {
      areaLabel = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    }

    return {
      areaLabel,
      city: mainCity || areaLabel,
      country,
      suburb
    };
  } catch (err) {
    console.warn('Reverse geocoding with OpenStreetMap Nominatim failed:', err);
    return {
      areaLabel: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      city: 'Device Location',
      country: ''
    };
  }
}

/**
 * Helper to trigger toast notification for location permission or error
 */
export function triggerLocationPermissionToast(msg?: string) {
  const defaultMsg = Capacitor.isNativePlatform()
    ? '⚠️ GPS Permission Required. Please enable Location in your Android Device Settings.'
    : '⚠️ GPS Permission Required for accurate location. Please enable location access in your device settings.';
  const toastMsg = msg || defaultMsg;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('syncmate_toast', {
        detail: { message: toastMsg, type: 'warning' }
      })
    );
  }
}

/**
 * Request high-accuracy GPS hardware positioning via @capacitor/geolocation on native or navigator.geolocation on web
 */
export async function getExactDeviceLocation(): Promise<UserLocation> {
  if (Capacitor.isNativePlatform()) {
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
          triggerLocationPermissionToast(
            '⚠️ GPS Permission Required. Please enable Location in your Android Device Settings.'
          );
          throw new Error('Location permission denied on Android device');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const geocoded = await reverseGeocode(latitude, longitude);
        return {
          latitude,
          longitude,
          areaLabel: geocoded.areaLabel,
          city: geocoded.areaLabel || geocoded.city,
          country: geocoded.country,
          updatedAt: new Date().toISOString()
        };
      } catch (err) {
        return {
          latitude,
          longitude,
          areaLabel: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
          city: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Capacitor Geolocation error:', err);
      triggerLocationPermissionToast(
        '⚠️ GPS Permission Required. Please enable Location in your Android Device Settings.'
      );
      throw err;
    }
  }

  // Fallback for Web platform
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    triggerLocationPermissionToast(
      '⚠️ GPS Permission Required for accurate location. Please enable location access in your device settings.'
    );
    throw new Error('Geolocation is not supported by your device');
  }

  const options: PositionOptions = {
    enableHighAccuracy: true, // Forces GPS & Wi-Fi triangulation over IP lookup
    timeout: 15000,           // 15 seconds max wait
    maximumAge: 0             // Do not use cached/stale positions
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const geocoded = await reverseGeocode(latitude, longitude);

          const locationResult: UserLocation = {
            latitude,
            longitude,
            areaLabel: geocoded.areaLabel,
            city: geocoded.areaLabel || geocoded.city,
            country: geocoded.country,
            updatedAt: new Date().toISOString()
          };

          resolve(locationResult);
        } catch (err) {
          console.warn('Geocoding failed after GPS fix:', err);
          resolve({
            latitude,
            longitude,
            areaLabel: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            city: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            updatedAt: new Date().toISOString()
          });
        }
      },
      (error) => {
        console.warn('GPS position acquisition error or denied:', error);
        triggerLocationPermissionToast(
          '⚠️ GPS Permission Required for accurate location. Please enable location access in your device settings.'
        );
        reject(error);
      },
      options
    );
  });
}

/**
 * Save exact user location telemetry into Firestore under users/${userId}
 */
export async function updateUserLocationInFirestore(
  userId: string,
  location: UserLocation
): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        areaLabel: location.areaLabel || location.city || '',
        city: location.city || location.areaLabel || '',
        country: location.country || '',
        updatedAt: location.updatedAt || new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to updateDoc for location in Firestore, using saveUserProfile fallback:', err);
    const existing = await getUserProfile(userId);
    if (existing) {
      await saveUserProfile({
        ...existing,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          areaLabel: location.areaLabel || location.city || '',
          city: location.city || location.areaLabel || '',
          country: location.country || '',
          updatedAt: location.updatedAt || new Date().toISOString()
        }
      });
    }
  }
}

/**
 * High-level helper: fetch exact GPS device location and automatically sync telemetry to Firestore
 */
export async function fetchAndSyncUserLocation(userId?: string): Promise<UserLocation> {
  try {
    const location = await getExactDeviceLocation();
    if (userId) {
      await updateUserLocationInFirestore(userId, location).catch(console.warn);
    }
    return location;
  } catch (err) {
    console.warn('fetchAndSyncUserLocation failed:', err);
    throw err;
  }
}
