import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  User, 
  MapPin, 
  Save, 
  Check, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Compass,
  CompassIcon
} from 'lucide-react';
import { UserProfile, ThemeMode, UserLocation } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenCitySearch: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  theme,
  onThemeChange,
  onOpenCitySearch,
  onUpdateProfile
}) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('syncmate_gemini_api_key') || '');
  const [keySaved, setKeySaved] = useState(false);

  const [name, setName] = useState(userProfile?.name || '');
  const [occupation, setOccupation] = useState(userProfile?.occupation || '');
  const [goals, setGoals] = useState(userProfile?.goals || '');
  const [religion, setReligion] = useState(userProfile?.religion || 'Muslim');
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('syncmate_gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('syncmate_gemini_api_key');
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const updatedProf: UserProfile = {
      ...userProfile,
      name: name.trim() || userProfile.name,
      occupation: occupation.trim() || userProfile.occupation,
      goals: goals.trim() || userProfile.goals,
      religion: religion as any,
      updatedAt: new Date().toISOString()
    };

    await saveUserProfile(updatedProf);
    onUpdateProfile(updatedProf);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex items-center space-x-4">
        <div className="p-3.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            System & Executive Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure custom API Keys, theme appearance, and location anchor synchronization.
          </p>
        </div>
      </div>

      {/* GEMINI API KEY CARD */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Key className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Custom Gemini API Key
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Provide your custom Gemini API key to override system defaults for unrestricted rate limits on AI Chat, Vision Auto-Tagging, and AI Stylist.
        </p>

        <form onSubmit={handleSaveApiKey} className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center justify-between">
            {keySaved ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>API Key saved securely to localStorage!</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">
                Saved locally on your device. Never shared.
              </span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save API Key</span>
            </button>
          </div>
        </form>
      </div>

      {/* EXECUTIVE PROFILE & LOCATION CARD */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Executive Profile & Anchors
            </h3>
          </div>

          <button
            onClick={onOpenCitySearch}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center space-x-1 border border-slate-200 dark:border-slate-700"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{userProfile?.location?.city || 'Search City'} ✏️</span>
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Occupation / Academic Field
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Long Term Focus & Goals
            </label>
            <input
              type="text"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Religion Logic (5 Daily Prayer Anchors)
            </label>
            <select
              value={religion}
              onChange={(e) => setReligion(e.target.value as any)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Muslim">Muslim (Locks Fajr, Dhuhr, Asr, Maghrib, Isha)</option>
              <option value="Non-Muslim">Non-Muslim / General Productivity</option>
              <option value="Christian">Christian</option>
              <option value="Jewish">Jewish</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            {profileSaved && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </span>
            )}

            <button
              type="submit"
              className="ml-auto px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Update Profile</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
