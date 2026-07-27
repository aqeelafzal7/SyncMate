import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Share2, Download, Cake, Award, PartyPopper } from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { UserProfile, Task } from '../types';
import { callGeminiWithFallback } from '../lib/geminiService';
import { deductUserCredits } from '../lib/creditService';

interface BirthdayCardProps {
  userProfile: UserProfile;
  tasks: Task[];
}

// Helper function to sanitize raw profile traits and remove first-person declarations
const sanitizeTrait = (text: string | undefined | null): string => {
  if (!text) return '';
  let cleaned = String(text).trim();

  // Remove leading first-person declarations like "I'm a", "I'm", "I am a", "I am", "My", etc.
  cleaned = cleaned.replace(/^I'm\s+a\s+/i, '');
  cleaned = cleaned.replace(/^I'm\s+/i, '');
  cleaned = cleaned.replace(/^I\s+am\s+a\s+/i, '');
  cleaned = cleaned.replace(/^I\s+am\s+/i, '');
  cleaned = cleaned.replace(/^My\s+/i, '');
  cleaned = cleaned.replace(/^I\s+/i, '');

  // Replace internal first-person phrases with third-person / natural terms
  cleaned = cleaned.replace(/\bI'm\b/gi, 'being');
  cleaned = cleaned.replace(/\bI am\b/gi, 'being');
  cleaned = cleaned.replace(/\bmy\b/gi, 'their');
  cleaned = cleaned.replace(/\bme\b/gi, 'them');
  cleaned = cleaned.replace(/\bmine\b/gi, 'theirs');

  return cleaned.trim();
};

export const BirthdayCard: React.FC<BirthdayCardProps> = ({ userProfile, tasks }) => {
  const [wish, setWish] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sharedToast, setSharedToast] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef<boolean>(false);

  // Calculate year in review stat
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const focusSessionsText = completedTasksCount > 0 
    ? `🏆 ${completedTasksCount} Focus Tasks Completed This Year!` 
    : `🏆 100+ Productivity Milestone Sessions Accomplished!`;

  // Synthesize dynamic AI birthday wish based on user's actual profile fields
  const fetchWish = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    const currentYear = new Date().getFullYear();
    const cacheKey = `syncmate_birthday_wish_locked_${currentYear}`;

    // Extract and sanitize dynamic traits safely from userProfile
    const userName = sanitizeTrait(userProfile.name) || userProfile.name || 'Friend';
    const userOccupation = sanitizeTrait(userProfile.occupation);
    const userGoals = Array.isArray(userProfile.goals) 
      ? userProfile.goals.map(sanitizeTrait).filter(Boolean).join(', ') 
      : sanitizeTrait(userProfile.goals);
    const userBio = sanitizeTrait(userProfile.bio);
    const userInterests = Array.isArray(userProfile.interests)
      ? userProfile.interests.map(sanitizeTrait).filter(Boolean).join(', ')
      : sanitizeTrait(userProfile.interests);

    const userContextData = JSON.stringify({
      name: userName,
      occupation: userOccupation || undefined,
      goals: userGoals || undefined,
      bio: userBio || undefined,
      interests: userInterests || undefined,
      recentCompletedTasks: tasks.filter(t => t.status === 'completed').slice(-5).map(t => sanitizeTrait(t.title)),
      activeProjects: tasks.filter(t => t.status !== 'completed').slice(-5).map(t => sanitizeTrait(t.title))
    }, null, 2);

    // Dynamic fallback wish using natural phrasing without raw template blanks or first-person clutter
    const fallbackDomain = userOccupation ? `in ${userOccupation}` : 'in all your ambitious pursuits';
    const fallbackGoalText = userGoals ? `closer to your goals of ${userGoals}` : 'closer to your growth and success';
    const fallbackWish = `Happy Birthday, ${userName}! May this year bring extraordinary breakthroughs and milestone achievements ${fallbackDomain}. May every project and habit move you ${fallbackGoalText}. Wishing you health, boundless energy, and continuous success! — From your Autonomous Assistant, SyncMate ⚡`;

    const aiPrompt = `You are SyncMate's warm, witty, and inspiring AI Assistant. Craft an inspiring, personalized birthday message for ${userName}.

User Context Traits (Degree, Occupation, Goals, Bio, Passions, Recent Tasks):
${userContextData}

STRICT WRITING RULES:
1. READ TRAITS AS CONTEXT ONLY: Treat degree, roles, occupation, goals, bio, and passions as contextual background only. DO NOT paste raw trait strings verbatim into template blanks or output raw key-value labels.
2. NATURAL PROSE: Smoothly weave their background into natural, fluid English (for example, transform 'BS Biotechnology Student' into 'your journey in Biotechnology', and 'I'm vibe coder' or 'vibe coder' into 'your creative coding projects').
3. ORIGINAL METAPHOR: Connect their field, goals, and daily progress into an original, inspiring metaphor intrinsic to their specific background and pursuits.
4. LENGTH & TONE: Keep the overall length strictly between 50 to 80 words. Tone should be warm, energetic, encouraging, and professional. Avoid generic birthday clichés.
5. SIGNATURE: Conclude with "— From your Autonomous Assistant, SyncMate ⚡". Do NOT wrap output in quotes or markdown headers.`;

    try {
      // Direct client-side call to Gemini engine passing profile context
      const responseText = await callGeminiWithFallback(aiPrompt, { userProfile });

      if (responseText && responseText.trim().length > 15) {
        const cleanWish = responseText.trim().replace(/^["']|["']$/g, '');
        localStorage.setItem(cacheKey, cleanWish);
        setWish(cleanWish);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch AI birthday wish (using cached fallback):', err);
    }

    // Save dynamic fallback to localStorage so it stays locked permanently for the year
    try {
      localStorage.setItem(cacheKey, fallbackWish);
    } catch (e) {
      console.warn('Failed to save fallback wish to localStorage:', e);
    }
    setWish(fallbackWish);
    setLoading(false);
    fetchingRef.current = false;
  };

  const handleRegenerate = async () => {
    if (loading) return;

    const isAdmin = userProfile?.isAdmin || userProfile?.role === 'admin';
    const isByok = !!(userProfile?.customApiKey);
    const currentCredits = userProfile?.dailyCredits ?? 6;

    if (!isAdmin && !isByok && currentCredits < 7) {
      window.dispatchEvent(
        new CustomEvent('syncmate_toast', {
          detail: {
            message: '⚡ Insufficient Daily Credits! Regenerating a full AI profile deep-analysis wish costs 7 Credits.',
            type: 'warning'
          }
        })
      );
      return;
    }

    if (!isAdmin && !isByok) {
      const success = await deductUserCredits(7);
      if (!success) return;
    }

    // Purge all legacy/locked birthday wish items from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.includes('syncmate_birthday_wish')) {
        localStorage.removeItem(key);
      }
    });

    fetchingRef.current = false;
    await fetchWish();

    window.dispatchEvent(
      new CustomEvent('syncmate_toast', {
        detail: {
          message: '🎉 Fresh AI wish generated! (-7 Credits)',
          type: 'success'
        }
      })
    );
  };

  useEffect(() => {
    // Trigger festive confetti burst on mount
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    const currentYear = new Date().getFullYear();
    const cacheKey = `syncmate_birthday_wish_locked_${currentYear}`;
    const cachedWish = localStorage.getItem(cacheKey);

    // 1. If wish already exists in cache, lock it and NEVER re-fetch!
    if (cachedWish) {
      setWish(cachedWish);
      setLoading(false);
      return;
    }

    fetchWish();
  }, [userProfile]);

  const handleShare = async () => {
    const shareText = `Just got the most personalized birthday wish from my AI Assistant, SyncMate! ⚡ Proud of my Year in Review stats (${focusSessionsText}). Building better habits one day at a time! #SyncMate #AutonomousAssistant`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SyncMate Birthday Celebration for ${userProfile.name}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 3500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        },
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('birthday-action-buttons')) {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `SyncMate_Birthday_Card_${(userProfile.name || 'User').replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate card image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative my-6 animate-fadeIn">
      {/* Toast Notification */}
      {sharedToast && (
        <div className="fixed top-20 right-6 z-[9999] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center space-x-2 animate-bounce">
          <PartyPopper className="w-4 h-4" />
          <span>Copied birthday post text to clipboard! Ready to paste!</span>
        </div>
      )}

      {/* Birthday Card Container */}
      <div 
        id="syncmate-birthday-card"
        ref={cardRef}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 border-2 border-amber-400/50 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Background Glows & Festive Accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Bar: Official Logo & Birthday Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-amber-400/20">
            <div className="flex items-center space-x-3">
              <img 
                src="https://i.ibb.co/PztwKQdM/Sync-Mate.png" 
                alt="SyncMate Logo" 
                className="w-10 h-10 object-contain rounded-xl shrink-0 shadow-md shadow-amber-500/20" 
              />
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-200 flex items-center space-x-2">
                  <span>SyncMate Birthday Experience</span>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                </h2>
                <p className="text-[10px] text-amber-300/80 font-medium">
                  Autonomous Assistant Special Reflection
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Cake className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Happy Birthday, {userProfile.name || 'Friend'}! 🎂</span>
            </div>
          </div>

          {/* Year in Review Stat Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-extrabold text-amber-100 shadow-inner">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{focusSessionsText}</span>
          </div>

          {/* Personalized AI Wish Body */}
          <div className="p-5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 text-slate-100 text-xs sm:text-sm leading-relaxed space-y-3">
            {loading ? (
              <div className="flex items-center space-x-3 text-amber-300 animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>SyncMate is synthesizing your personalized birthday wish...</span>
              </div>
            ) : (
              <p className="font-medium whitespace-pre-line tracking-wide">
                {wish}
              </p>
            )}
          </div>

          {/* Action Controls: Share & Download */}
          <div className="birthday-action-buttons flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 font-bold text-xs shadow-lg flex items-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>{loading ? 'Analyzing Profile...' : '🔄 Regenerate Wish (7 ⚡)'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>🎉 Share to Socials</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-md flex items-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Rendering Card...' : '⬇️ Download Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};