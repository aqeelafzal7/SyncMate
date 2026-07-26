import React, { useState, useEffect } from 'react';
import { 
  MoonStar, 
  BookOpen, 
  Sunrise, 
  Sun, 
  Sunset, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Clock 
} from 'lucide-react';
import { UserProfile, PrayerTimings } from '../types';
import { getEmotionalIslamicInsight, QuranAyahData, HadithData } from '../lib/islamicApiService';
import { deductUserCredits, getFeatureCreditCost } from '../lib/creditService';
import { IslamicInsightModal } from './IslamicInsightModal';

interface PrayerHadithViewProps {
  userProfile: UserProfile | null;
  prayerTimings: PrayerTimings | null;
}

export const PrayerHadithView: React.FC<PrayerHadithViewProps> = ({
  userProfile,
  prayerTimings,
}) => {
  const [quranData, setQuranData] = useState<QuranAyahData | null>(null);
  const [hadithData, setHadithData] = useState<HadithData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Completed Prayers State (persisted in localStorage by date_prayerKey)
  const todayStr = new Date().toISOString().split('T')[0];
  const [completedPrayers, setCompletedPrayers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`syncmate_completed_prayers_${todayStr}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal State for Sacred Reflection
  const [insightModal, setInsightModal] = useState<{ isOpen: boolean; prayerName: string }>({
    isOpen: false,
    prayerName: '',
  });

  // Load Quran & Hadith on mount
  useEffect(() => {
    fetchVerseAndHadith();
  }, []);

  const fetchVerseAndHadith = async () => {
    // Strictly bypass credit check (0 credits)
    const canProceed = await deductUserCredits(getFeatureCreditCost('prayer_quran_hadith'), userProfile?.uid);
    if (!canProceed) return;

    setLoading(true);
    try {
      const mood = userProfile?.activeMood || 'neutral';
      const result = await getEmotionalIslamicInsight(mood);
      setQuranData(result.quran);
      setHadithData(result.hadith);
    } catch (err) {
      console.warn('Error fetching Quran/Hadith in PrayerHadithView:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrayerComplete = (prayerKey: string) => {
    const updated = {
      ...completedPrayers,
      [prayerKey]: !completedPrayers[prayerKey]
    };
    setCompletedPrayers(updated);
    try {
      localStorage.setItem(`syncmate_completed_prayers_${todayStr}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save prayer completion:', e);
    }
  };

  const prayerList = [
    { name: 'Fajr Prayer', key: 'Fajr', time: prayerTimings?.Fajr || '05:15 AM', icon: Sunrise, bg: 'from-indigo-900/80 via-purple-900/80 to-indigo-950/80 border-indigo-700/80' },
    { name: 'Dhuhr Prayer', key: 'Dhuhr', time: prayerTimings?.Dhuhr || '12:30 PM', icon: Sun, bg: 'from-amber-900/80 via-yellow-900/80 to-amber-950/80 border-amber-700/80' },
    { name: 'Asr Prayer', key: 'Asr', time: prayerTimings?.Asr || '04:15 PM', icon: Sun, bg: 'from-orange-900/80 via-amber-900/80 to-orange-950/80 border-orange-700/80' },
    { name: 'Maghrib Prayer', key: 'Maghrib', time: prayerTimings?.Maghrib || '07:05 PM', icon: Sunset, bg: 'from-rose-900/80 via-pink-900/80 to-rose-950/80 border-rose-700/80' },
    { name: 'Isha Prayer', key: 'Isha', time: prayerTimings?.Isha || '08:30 PM', icon: MoonStar, bg: 'from-blue-950/80 via-slate-900/80 to-indigo-950/80 border-blue-800/80' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      
      {/* Header Banner with Always Free Badge */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/30 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md">
                <MoonStar className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                5x Daily Prayer, Quran &amp; Hadith
              </h1>
              {/* Mandatory Green Badge */}
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs sm:text-sm font-extrabold flex items-center space-x-1.5 shadow-md">
                <span>🕌 Always Free (0 Credits)</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
              Spiritual anchors integrated seamlessly into your workflow. Bypasses daily credit limits.
            </p>
          </div>

          <button
            onClick={fetchVerseAndHadith}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold transition-all flex items-center space-x-2 shrink-0 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Daily Guidance</span>
          </button>
        </div>
      </div>

      {/* 5x Prayer Times Anchors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <span>Daily 5x Prayer Schedule Anchors</span>
          </h2>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            🕌 Always Free (0 Credits)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {prayerList.map((prayer) => {
            const isDone = Boolean(completedPrayers[prayer.key]);
            const Icon = prayer.icon;

            return (
              <div
                key={prayer.key}
                className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg ${
                  isDone
                    ? 'bg-gradient-to-br from-emerald-950/90 to-slate-900 border-emerald-500/50 text-white'
                    : `bg-gradient-to-br ${prayer.bg} text-white`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
                    <Icon className="w-5 h-5 text-amber-300" />
                  </div>
                  <button
                    onClick={() => handleTogglePrayerComplete(prayer.key)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    {isDone ? '✓ Offered' : 'Mark Complete'}
                  </button>
                </div>

                <div>
                  <h3 className={`font-bold text-sm ${isDone ? 'line-through text-emerald-300' : 'text-white'}`}>
                    {prayer.name}
                  </h3>
                  <p className="text-xs text-amber-200/90 font-mono font-semibold mt-0.5">
                    {prayer.time}
                  </p>
                </div>

                <button
                  onClick={() => setInsightModal({ isOpen: true, prayerName: prayer.name })}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all text-emerald-200 flex items-center justify-center space-x-1.5 border border-white/10 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>View Sacred Ayah</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Quranic Verse + Authentic Hadith */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Quranic Verse */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2.5">
              <BookOpen className="w-5 h-5 text-amber-300" />
              <h3 className="font-extrabold text-base text-white">Daily Quranic Verse</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold">
              🕌 Always Free (0 Credits)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-emerald-200 text-xs animate-pulse">
              Retrieving Quranic Ayah from Al Quran Cloud API...
            </div>
          ) : quranData ? (
            <div className="space-y-4">
              <p className="text-xl sm:text-2xl leading-loose font-serif text-amber-200 text-right" dir="rtl">
                « {quranData.arabic} »
              </p>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                "{quranData.english}"
              </p>
              <div className="pt-2 text-xs font-extrabold text-amber-400 flex items-center justify-between">
                <span>Surah {quranData.surahNameEn} ({quranData.surahNum}:{quranData.ayahNumInSurah})</span>
                <span className="text-emerald-300">Verified Authentic text</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Verse data unavailable.</p>
          )}
        </div>

        {/* Authentic Hadith of the Day */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="font-extrabold text-base text-white">Authentic Hadith of the Day</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold">
              🕌 Always Free (0 Credits)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-emerald-200 text-xs animate-pulse">
              Retrieving authentic Hadith...
            </div>
          ) : hadithData ? (
            <div className="space-y-4">
              {hadithData.arabic && (
                <p className="text-lg sm:text-xl leading-relaxed font-serif text-amber-200 text-right" dir="rtl">
                  « {hadithData.arabic} »
                </p>
              )}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                "{hadithData.english}"
              </p>
              <div className="pt-2 text-xs font-extrabold text-amber-400 flex items-center justify-between">
                <span>{hadithData.book}</span>
                <span className="text-emerald-300">{hadithData.reference}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Hadith data unavailable.</p>
          )}
        </div>

      </div>

      {/* Sacred Reflection Modal */}
      <IslamicInsightModal
        prayerName={insightModal.prayerName}
        isOpen={insightModal.isOpen}
        onClose={() => setInsightModal({ isOpen: false, prayerName: '' })}
        activeMood={userProfile?.activeMood}
      />
    </div>
  );
};
