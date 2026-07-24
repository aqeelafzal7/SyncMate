import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, MoonStar, HeartHandshake } from 'lucide-react';
import { getEmotionalIslamicInsight, QuranAyahData, HadithData } from '../lib/islamicApiService';

interface IslamicInsightModalProps {
  prayerName: string;
  isOpen: boolean;
  onClose: () => void;
  isBirthday?: boolean;
}

export const IslamicInsightModal: React.FC<IslamicInsightModalProps> = ({
  prayerName,
  isOpen,
  onClose,
  isBirthday,
}) => {
  const [step, setStep] = useState<'quran' | 'hadith'>('quran');
  const [loading, setLoading] = useState<boolean>(false);

  const [quranData, setQuranData] = useState<QuranAyahData | null>(null);
  const [hadithData, setHadithData] = useState<HadithData | null>(null);
  const [contextHeading, setContextHeading] = useState<string>('');
  const [userMood, setUserMood] = useState<string>('Neutral');

  useEffect(() => {
    if (isOpen) {
      setStep('quran');
      setQuranData(null);
      setHadithData(null);
      setContextHeading('');
      loadInsightData();
    }
  }, [isOpen]);

  const loadInsightData = async () => {
    setLoading(true);
    try {
      const activeApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
      const currentMood = localStorage.getItem('syncmate_current_mood') || 'Neutral';
      setUserMood(currentMood);

      const result = await getEmotionalIslamicInsight(currentMood, activeApiKey, isBirthday);
      
      setQuranData(result.quran);
      setHadithData(result.hadith);
      setContextHeading(result.contextHeading);
      setUserMood(result.currentMood);
    } catch (err) {
      console.error('Failed to load emotional Islamic insight:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextToHadith = () => {
    setStep('hadith');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl shadow-emerald-950/50 text-white relative my-8">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-12 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-40 h-40 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <MoonStar className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-amber-400 tracking-wider uppercase block">
                {prayerName} Marked Complete
              </span>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5 flex-wrap gap-1">
                <span>Sacred Knowledge Reward</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold">
                  Verified Authentic API
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30 text-xs text-emerald-300 font-extrabold">
            <span>Step {step === 'quran' ? '1 of 2: Quran' : '2 of 2: Hadith'}</span>
          </div>
        </div>

        {/* STEP 1: QURAN INSIGHT MODAL */}
        {step === 'quran' && (
          <div className="space-y-6">
            
            {/* Dynamic Emotional Sub-heading Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 flex items-start space-x-3">
              <HeartHandshake className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                    Contextual Comfort
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    Mood: {userMood}
                  </span>
                </div>
                <p className="text-xs text-emerald-200 font-medium leading-relaxed italic">
                  "{contextHeading || `Selected with perspective for your current state of mind...`}"
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-emerald-200 font-medium">
                  Routing emotional context & retrieving authentic Quranic text from Al Quran Cloud API...
                </p>
              </div>
            ) : quranData ? (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Arabic Ayah */}
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-amber-500/30 text-center shadow-inner">
                  <p 
                    className="text-2xl sm:text-3xl text-amber-200 font-serif leading-loose tracking-wide py-2"
                    dir="rtl"
                  >
                    « {quranData.arabic} »
                  </p>
                  
                  {/* Surah Reference Badge */}
                  <div className="inline-flex items-center space-x-2 px-3 py-1 mt-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <span>{quranData.surahNameAr}</span>
                    <span>•</span>
                    <span>Surah {quranData.surahNameEn} ({quranData.surahNum}:{quranData.ayahNumInSurah})</span>
                  </div>
                </div>

                {/* Urdu Translation */}
                {quranData.urdu && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-right" dir="rtl">
                    <span className="text-[10px] font-bold text-amber-400 block mb-1">اردو ترجمہ (فتح محمد جالندھری):</span>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                      {quranData.urdu}
                    </p>
                  </div>
                )}

                {/* English Translation */}
                {quranData.english && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">English Translation (Muhammad Asad):</span>
                    <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                      "{quranData.english}"
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-6 text-red-400 text-xs">
                Could not load Ayah. Please try again.
              </div>
            )}

            {/* Next Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNextToHadith}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>OK, Next ➔ Hadith Insight</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: HADITH INSIGHT MODAL */}
        {step === 'hadith' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold bg-amber-900/30 p-2.5 rounded-xl border border-amber-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authentic Prophetic Sunnah • Verified Reference</span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-amber-200 font-medium">
                  Retrieving authentic Hadith from verified Bukhari / Muslim database...
                </p>
              </div>
            ) : hadithData ? (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Arabic Hadith if available */}
                {hadithData.arabic && (
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 text-center">
                    <p 
                      className="text-xl sm:text-2xl text-amber-200 font-serif leading-loose py-1"
                      dir="rtl"
                    >
                      « {hadithData.arabic} »
                    </p>
                  </div>
                )}

                {/* Urdu Translation */}
                {hadithData.urdu && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-right" dir="rtl">
                    <span className="text-[10px] font-bold text-amber-400 block mb-1">اردو ترجمہ:</span>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                      {hadithData.urdu}
                    </p>
                  </div>
                )}

                {/* English Translation */}
                {hadithData.english && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">English Translation:</span>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      "{hadithData.english}"
                    </p>
                  </div>
                )}

                {/* Hadith Strict Reference */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-extrabold">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Reference: {hadithData.reference}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-[10px]">
                    {hadithData.book}
                  </span>
                </div>

              </div>
            ) : (
              <div className="text-center py-6 text-red-400 text-xs">
                Could not load Hadith. Please try again.
              </div>
            )}

            {/* Done Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done • Return to Timeline</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
