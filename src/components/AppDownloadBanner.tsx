import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';

const APK_DOWNLOAD_URL = "https://github.com/syncmate/app/releases/latest/download/syncmate.apk";

export const AppDownloadBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('syncmate_apk_banner_dismissed') === 'true';
    
    // Check if running in mobile browser and NOT in native Capacitor app
    const userAgent = navigator.userAgent || '';
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(userAgent);
    const isNativeApp = Capacitor.isNativePlatform();

    if (isMobileBrowser && !isNativeApp && !isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('syncmate_apk_banner_dismissed', 'true');
  };

  const handleDownload = () => {
    window.open(APK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-b border-indigo-500/30 text-white shadow-2xl backdrop-blur-md px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        {/* Left Side: Icon & Copy */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-sm text-indigo-300">
            <Smartphone className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-indigo-100 flex items-center gap-1.5 truncate">
              <span>Official SyncMate Android App</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-400/30 hidden sm:inline-block">
                APK Available
              </span>
            </p>
            <p className="text-[11px] text-slate-300 truncate hidden xs:block sm:block">
              For live push notifications, widget support & 2x speed, switch to the official SyncMate Android App!
            </p>
            <p className="text-[10px] text-slate-300 block sm:hidden">
              Push notifications & 2x speed on Android!
            </p>
          </div>
        </div>

        {/* Right Side: CTA Button & Close */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-[11px] shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="whitespace-nowrap">⚡ Download App (APK)</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
            title="Dismiss banner"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
