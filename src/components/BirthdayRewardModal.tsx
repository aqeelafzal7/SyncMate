import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { Cake, Sparkles, Gift } from 'lucide-react';

interface BirthdayRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export const BirthdayRewardModal: React.FC<BirthdayRewardModalProps> = ({
  isOpen,
  onClose,
  userProfile,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        // Trigger multi-stage festive confetti explosion
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        const timer1 = setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.6 }
          });
        }, 300);
        const timer2 = setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.6 }
          });
        }, 600);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } catch (e) {
        console.warn('Confetti burst error in BirthdayRewardModal:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen || !userProfile) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-2xl shadow-purple-950/60 text-center space-y-6 overflow-hidden">
        
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          
          {/* Animated Cake Icon Anchor */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 p-0.5 shadow-xl mb-4 animate-bounce">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Cake className="w-8 h-8 text-amber-300" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300">
            🎂 Happy Birthday, {userProfile.name || 'Friend'}!
          </h2>

          {/* Message */}
          <p className="mt-3 text-sm text-slate-300 font-medium leading-relaxed">
            SyncMate gifted you <span className="font-extrabold text-amber-300">+10 Extra AI Credits</span> for your special day! Enjoy your productivity boost.
          </p>

          {/* Credit Badge Confirmation */}
          <div className="mt-4 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 font-bold flex items-center justify-center space-x-2 w-full">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Bonus added directly to your Daily Balance!</span>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Gift className="w-4 h-4" />
            <span>🎁 Claim Gift &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
