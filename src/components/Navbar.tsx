import React, { useState } from 'react';
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  LogOut, 
  User as UserIcon, 
  Compass, 
  MapPin, 
  CloudSun,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { UserProfile, ThemeMode, WeatherData } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  weather: WeatherData | null;
  locationName?: string;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  theme,
  onThemeChange,
  weather,
  locationName,
  onSignOut,
  onOpenOnboarding,
  onToggleAssistant,
  isAssistantOpen,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                Sync<span className="text-indigo-600 dark:text-indigo-400">Mate</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Autonomous AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Your Autonomous Secretary
            </p>
          </div>
        </div>

        {/* Center - Weather & Location badge */}
        <div className="hidden md:flex items-center space-x-4">
          {locationName && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>{locationName}</span>
            </div>
          )}
          {weather && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
              <CloudSun className="w-4 h-4 text-amber-500" />
              <span>{weather.temperature}°C, {weather.condition}</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Theme Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => onThemeChange('light')}
              title="Light Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              title="Dark Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-700 text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('system')}
              title="System Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Talk to Secretary Floating Toggle */}
          <button
            onClick={onToggleAssistant}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isAssistantOpen
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Talk to SyncMate</span>
          </button>

          {/* User Menu */}
          {userProfile ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate hidden sm:inline">
                  {userProfile.name || userProfile.email}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {userProfile.name || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {userProfile.email}
                    </p>
                    {userProfile.religion && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {userProfile.religion} Schedule Rules
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenOnboarding();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2"
                  >
                    <Compass className="w-4 h-4 text-indigo-500" />
                    <span>Re-run Secretary Onboarding</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}

        </div>

      </div>
    </header>
  );
};
