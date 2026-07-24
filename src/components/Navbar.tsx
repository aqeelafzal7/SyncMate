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
  onOpenCitySearch?: () => void;
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
  onOpenCitySearch,
  onSignOut,
  onOpenOnboarding,
  onToggleAssistant,
  isAssistantOpen,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left - Weather & Location badge */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenCitySearch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-200/80 dark:border-slate-700/80 group"
            title="Search or change city location"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-bold">{locationName || 'Set Location'}</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold ml-1 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">✏️ Edit</span>
          </button>
          {weather && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
              <CloudSun className="w-4 h-4 text-amber-500" />
              <span>{weather.temperature}°C, {weather.condition}</span>
            </div>
          )}
        </div>

        {/* Right Controls - Theme Switcher */}
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

        </div>

      </div>
    </header>
  );
};
