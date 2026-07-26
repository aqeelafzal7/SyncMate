import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Sparkles, 
  ShieldCheck, 
  Key, 
  Zap, 
  Gem, 
  Crown, 
  Save, 
  Check, 
  PartyPopper, 
  ExternalLink, 
  Activity, 
  Compass, 
  Plus, 
  Minus,
  RefreshCw
} from 'lucide-react';
import { UserProfile, SubscriptionTier } from '../types';
import { checkIsBirthday } from '../lib/birthdayUtils';
import { saveUserProfile } from '../lib/firebase';

interface UserInspectorModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUserSaved?: (updatedUser: UserProfile) => void;
}

export const UserInspectorModal: React.FC<UserInspectorModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserSaved
}) => {
  // Editable state
  const [tier, setTier] = useState<SubscriptionTier>(user?.tier || 'free');
  const [dailyCredits, setDailyCredits] = useState<number>(user?.dailyCredits ?? 6);
  const [byokUnlocked, setByokUnlocked] = useState<boolean>(user?.byokUnlocked ?? false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>(
    user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toISOString().slice(0, 16) : ''
  );
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(0);

  useEffect(() => {
    if (user) {
      setTier(user.tier || 'free');
      setDailyCredits(user.dailyCredits ?? 6);
      setByokUnlocked(user.byokUnlocked ?? false);
      setSubscriptionEndDate(
        user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toISOString().slice(0, 16) : ''
      );
      setCreditAdjustment(0);
      setSaveSuccess(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isTodayBirthday = checkIsBirthday(user.dateOfBirth || user.dob);

  const handleAdjustCredits = (delta: number) => {
    setDailyCredits(prev => Math.max(0, prev + delta));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedProfile: UserProfile = {
      ...user,
      tier,
      dailyCredits,
      byokUnlocked,
      subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate).toISOString() : null,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveUserProfile(updatedProfile);
      setSaveSuccess(true);
      if (onUserSaved) {
        onUserSaved(updatedProfile);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update user profile in admin inspector:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeMood = user.realtimeMood || user.activeMood || 'neutral';

  const getMoodBadgeColor = (m: string) => {
    switch (m.toLowerCase()) {
      case 'happy':
      case 'energetic':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'focused':
      case 'productive':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'stressed':
      case 'anxious':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'tired':
      case 'exhausted':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const lat = user.location?.latitude;
  const lng = user.location?.longitude;
  const hasGeo = typeof lat === 'number' && typeof lng === 'number';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto shadow-2xl flex flex-col justify-between animate-slideLeft">
        {/* Slide-Over Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center space-x-2">
                <span>User Telemetry & Inspector</span>
                {isTodayBirthday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center space-x-1">
                    <PartyPopper className="w-3 h-3 text-pink-400" />
                    <span>Birthday Today!</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                UID: {user.uid}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Identity Header Card */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {user.name || 'SyncMate User'}
                </h3>
                <p className="text-xs text-indigo-400 font-medium flex items-center space-x-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{user.email || 'No email provided'}</span>
                </p>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                user.tier === 'premium'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : user.tier === 'spark'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : user.tier === 'extra_premium'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {user.tier || 'free'} tier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-900 text-xs text-slate-300">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Birth</span>
                <span className="font-semibold text-slate-200">
                  {user.dateOfBirth || user.dob || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Created</span>
                <span className="font-semibold text-slate-200">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Telemetry Panel */}
          <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-4 shadow-md">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 border-b border-slate-800 pb-2">
              <Activity className="w-4 h-4 shrink-0" />
              <span>Real-Time Telemetry & Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Realtime Mood */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Realtime Mood</span>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border capitalize ${getMoodBadgeColor(activeMood)}`}>
                    {activeMood}
                  </span>
                </div>
              </div>

              {/* Device Info */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Device & OS</span>
                <div className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {user.deviceInfo ? `${user.deviceInfo.os} (${user.deviceInfo.browser})` : 'Web Browser'}
                  </span>
                </div>
              </div>

              {/* Geolocation Coordinates */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Geolocation Coordinates</span>
                {hasGeo ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Lat: {lat?.toFixed(5)}, Lng: {lng?.toFixed(5)} {user.location?.areaLabel || user.location?.city ? `(${user.location?.areaLabel || user.location?.city})` : ''}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-all w-fit"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>📍 View on Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-indigo-400" />
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">No geolocation data recorded for user</span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Override Controls */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-indigo-500/30 space-y-5 shadow-xl">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin Override Controls</span>
            </div>

            {/* Subscription Tier Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Subscription Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="free">Free Tier (6 Credits/day, BYOK locked)</option>
                <option value="spark">Spark Plan (10 Credits/day, BYOK unlocked)</option>
                <option value="premium">Premium Member (150 Credits/day, BYOK unlocked)</option>
                <option value="extra_premium">Extra Premium (Custom credits, BYOK unlocked)</option>
              </select>
            </div>

            {/* Daily Credits Adjustment */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Daily System AI Credits
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleAdjustCredits(-10)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min={0}
                  value={dailyCredits}
                  onChange={(e) => setDailyCredits(Number(e.target.value))}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={() => handleAdjustCredits(10)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                {[+50, +100, +250].map((bonus) => (
                  <button
                    key={bonus}
                    type="button"
                    onClick={() => handleAdjustCredits(bonus)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 text-[10px] font-bold text-indigo-300"
                  >
                    +{bonus} Credits
                  </button>
                ))}
              </div>
            </div>

            {/* BYOK Access Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">
                  BYOK (Bring Your Own Key) Access
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Allows user to enter personal Gemini API keys in Settings.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setByokUnlocked(!byokUnlocked)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  byokUnlocked
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {byokUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
              </button>
            </div>

            {/* Subscription Expiration Date Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Subscription Expiration Timestamp
              </label>
              <input
                type="datetime-local"
                value={subscriptionEndDate}
                onChange={(e) => setSubscriptionEndDate(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">
                Leave empty for standard non-expiring/free state.
              </p>
            </div>
          </div>
        </div>

        {/* Slide-Over Footer Save Button */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/90 sticky bottom-0 z-20 flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/30 hover:opacity-90 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Saving Overrides...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Overrides Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Save Admin Overrides</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
