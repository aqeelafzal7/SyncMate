import React from 'react';
import { Capacitor } from '@capacitor/core';
import { MapPin, AlertTriangle } from 'lucide-react';

interface GeolocationAlertProps {
  onRetry?: () => void;
  onDismiss?: () => void;
  message?: string;
}

export const GeolocationAlert: React.FC<GeolocationAlertProps> = ({
  onRetry,
  onDismiss,
  message
}) => {
  const isNative = Capacitor.isNativePlatform();
  const alertText = message || (
    isNative
      ? '⚠️ GPS Permission Required. Please enable Location in your Android Device Settings.'
      : '⚠️ GPS Permission Required for accurate location. Please enable location access in your device settings.'
  );

  return (
    <div className="bg-amber-950/80 border border-amber-500/40 text-amber-200 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <p className="font-semibold">{alertText}</p>
      </div>
      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-all active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Enable GPS</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default GeolocationAlert;
