import React, { useState } from 'react';
import { Cake, Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface DobCollectionModalProps {
  userProfile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
}

export const DobCollectionModal: React.FC<DobCollectionModalProps> = ({
  userProfile,
  onSaveProfile,
}) => {
  const [dob, setDob] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) return;

    setLoading(true);
    const updated: UserProfile = {
      ...userProfile,
      dob: dob,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserProfile(updated);
      onSaveProfile(updated);
    } catch (err) {
      console.warn('Failed to save DOB:', err);
      // Fallback
      onSaveProfile(updated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Header Icon */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-500 flex items-center justify-center shrink-0">
            <Cake className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>🎂 Complete Your Profile</span>
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              SyncMate Birthday Engine
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Please enter your Date of Birth to unlock custom anniversary reflections and personalized lifestyle insights.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !dob}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-40 text-slate-950 dark:text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
          >
            <span>{loading ? 'Saving Profile...' : 'Save & Unlock Birthday Mode'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
