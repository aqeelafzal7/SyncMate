import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';

export function useNativePermissions(): void {
  useEffect(() => {
    async function requestPermissionsOnStartup() {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        await Promise.allSettled([
          LocalNotifications.requestPermissions(),
          Geolocation.requestPermissions()
        ]);
      } catch (err) {
        console.warn('[useNativePermissions] Startup permissions error:', err);
      }
    }

    requestPermissionsOnStartup();
  }, []);
}

