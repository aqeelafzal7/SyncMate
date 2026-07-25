import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, MoonStar, HeartHandshake } from 'lucide-react';
import { getEmotionalIslamicInsight, QuranAyahData, HadithData } from '../lib/islamicApiService';
import { getDecryptedApiKey } from '../lib/cryptoStorage';

interface IslamicInsightModalProps {
  prayerName: string;
  isOpen: boolean;
  onClose: () => void;
  activeMood?: string;
  onResetMood?: () => void;
  isBirthday?: boolean;
}

export const IslamicInsightModal: React.FC<IslamicInsightModalProps> = ({
  prayerName,
  isOpen,
  onClose,
  activeMood,
  onResetMood,
  isBirthday,
}) => {
  const [step, setStep] = useState<'quran' | 'hadith'>('quran');
  const [loading, setLoading] = useState<boolean>(false);

  const [quranData, setQuranData] = useState<QuranAyahData | null>(null);
  const [hadithData, setHadithData] = useState<HadithData | null>(null);
  const [contextHeading, setContextHeading] = useState<string>('');
  const [userMood, setUserMood] = useState<string>('Neutral');
  const fetchingRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep('quran');
      setQuranData(null);
      setHadithData(null);
      setContextHeading('');
      loadInsightData();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadInsightData = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const activeApiKey = (await getDecryptedApiKey()) || undefined;
      const currentMood = activeMood || localStorage.getItem('syncmate_current_mood') || 'neutral';
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
      fetchingRef.current = false;
    }
  };

  const handleNextToHadith = () => {
    setStep('hadith');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn overflow-y-auto overflow-x-hidden">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 max-w-3xl w-full shadow-2xl shadow-emerald-950/60 text-white relative my-6 sm:my-10">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-12 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-emerald-500/20 mb-8 gap-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shrink-0">
              <MoonStar className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-amber-400 tracking-wider uppercase block">
                {prayerName} Marked Complete
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center space-x-2 flex-wrap gap-1 mt-0.5">
                <span>Sacred Knowledge Reflection</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold">
                  Verified Authentic API
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-950/80 px-4 py-2 rounded-full border border-emerald-500/30 text-xs text-emerald-300 font-extrabold self-start sm:self-auto shrink-0 shadow-md">
            <span>Step {step === 'quran' ? '1 of 2: Quran' : '2 of 2: Hadith'}</span>
          </div>
        </div>

        {/* STEP 1: QURAN INSIGHT MODAL */}
        {step === 'quran' && (
          <div className="space-y-8 relative z-10">
            
            {/* Dynamic Emotional Sub-heading Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-start space-x-4 shadow-lg">
              <HeartHandshake className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                    Contextual Comfort
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    Active Mood: {userMood}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-200 font-medium leading-relaxed italic">
                  "{contextHeading || `Selected with perspective for your current state of mind...`}"
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-emerald-200 font-medium">
                  Routing emotional context & retrieving authentic Quranic text from Al Quran Cloud API...
                </p>
              </div>
            ) : quranData ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Arabic Ayah - Large Prominent Card */}
                <div className="p-3 sm:p-5 rounded-3xl bg-slate-950/90 border border-amber-500/40 text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <p 
                    className="text-xl sm:text-3xl leading-[2.2] sm:leading-loose px-2 sm:px-6 text-amber-200 font-serif tracking-wide py-4 break-words whitespace-normal text-center w-full"
                    dir="rtl"
                  >
                    « {quranData.arabic} »
                  </p>
                  
                  {/* Surah Reference Badge */}
                  <div className="inline-flex items-center space-x-2 px-4 py-1.5 mt-4 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold shadow-md">
                    <span>{quranData.surahNameAr}</span>
                    <span>•</span>
                    <span>Surah {quranData.surahNameEn} ({quranData.surahNum}:{quranData.ayahNumInSurah})</span>
                  </div>
                </div>

                {/* Translation Grid / Cards */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Urdu Translation */}
                  {quranData.urdu && (
                    <div className="p-6 sm:p-8 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-right space-y-3 shadow-md" dir="rtl">
                      <div className="flex items-center justify-end">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                          اردو ترجمہ (فتح محمد جالندھری)
                        </span>
                      </div>
                      <p className="text-base sm:text-lg lg:text-xl text-amber-100/90 font-medium leading-relaxed font-sans pt-1">
                        {quranData.urdu}
                      </p>
                    </div>
                  )}

                  {/* English Translation */}
                  {quranData.english && (
                    <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 shadow-md">
                      <div className="flex items-center">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                          English Translation (Muhammad Asad)
                        </span>
                      </div>
                      <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 italic leading-relaxed pt-1">
                        "{quranData.english}"
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-red-400 text-sm">
                Could not load Ayah. Please try again.
              </div>
            )}

            {/* Next Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleNextToHadith}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-3 transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                <span>OK, Next ➔ Hadith Insight</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: HADITH INSIGHT MODAL */}
        {step === 'hadith' && (
          <div className="space-y-8 relative z-10">
            <div className="flex items-center space-x-3 text-amber-300 text-xs sm:text-sm font-extrabold bg-amber-950/40 p-4 rounded-2xl border border-amber-500/30 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Authentic Prophetic Sunnah • Verified Reference</span>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-amber-200 font-medium">
                  Retrieving authentic Hadith from verified Bukhari / Muslim database...
                </p>
              </div>
            ) : hadithData ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Arabic Hadith if available */}
                {hadithData.arabic && (
                  <div className="p-3 sm:p-5 rounded-3xl bg-slate-950/90 border border-amber-500/40 text-center shadow-2xl">
                    <p 
                      className="text-xl sm:text-3xl leading-[2.2] sm:leading-loose px-2 sm:px-6 text-amber-200 font-serif py-2 break-words whitespace-normal text-center w-full"
                      dir="rtl"
                    >
                      « {hadithData.arabic} »
                    </p>
                  </div>
                )}

                {/* Translation Cards */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Urdu Translation */}
                  {hadithData.urdu && (
                    <div className="p-6 sm:p-8 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-right space-y-3 shadow-md" dir="rtl">
                      <div className="flex items-center justify-end">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                          اردو ترجمہ
                        </span>
                      </div>
                      <p className="text-base sm:text-lg lg:text-xl text-amber-100/90 font-medium leading-relaxed font-sans pt-1">
                        {hadithData.urdu}
                      </p>
                    </div>
                  )}

                  {/* English Translation */}
                  {hadithData.english && (
                    <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 shadow-md">
                      <div className="flex items-center">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                          English Translation
                        </span>
                      </div>
                      <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 leading-relaxed pt-1">
                        "{hadithData.english}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Hadith Strict Reference */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-amber-300 font-extrabold gap-3 shadow-md">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Reference: {hadithData.reference}</span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs">
                    {hadithData.book}
                  </span>
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-red-400 text-sm">
                Could not load Hadith. Please try again.
              </div>
            )}

            {/* Done / Read & Reflected Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  onResetMood?.();
                  onClose();
                }}
                disabled={loading}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-3 transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Read & Reflected • Return to Timeline</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
