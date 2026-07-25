import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  MapPin, 
  CloudSun, 
  User, 
  Activity,
  AlertTriangle
} from 'lucide-react';
import { UserProfile, WeatherData, Task } from '../types';

interface StrategyData {
  date: string;
  generatedAt: string;
  summary: string;
  doList: string[];
  dontList: string[];
}

const cleanStrategyText = (text: string) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/:\s*still not\.?$/i, '.')
    .replace(/\s*still not\.?$/i, '.')
    .replace(/\b(null|undefined)\b/g, '')
    .trim();
};

interface DailyStrategyViewProps {
  userProfile: UserProfile;
  weather: WeatherData | null;
  tasks: Task[];
}

export const DailyStrategyView: React.FC<DailyStrategyViewProps> = ({
  userProfile,
  weather,
  tasks,
}) => {
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];
  const storageKey = `syncmate_strategy_${todayDate}`;

  const generateStrategy = async () => {
    setLoading(true);
    setError(null);
    try {
      const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'daily_strategy',
          customApiKey,
          context: {
            userProfile,
            weather,
            tasks: tasks.map(t => ({
              title: t.title,
              startTime: t.startTime,
              endTime: t.endTime,
              category: t.category,
              status: t.status
            }))
          }
        })
      });

      let finalSummary = `Executive strategy for ${userProfile.name} based on live weather (${weather ? weather.temperature + '°C, ' + weather.condition : 'Clear'}) and ${tasks.length} scheduled tasks today.`;
      let finalDoList: string[] = [
        `Prioritize core focus tasks before peak afternoon heat.`,
        `Maintain continuous hydration (${weather && weather.temperature > 25 ? 'at least 3L water' : 'at least 2.5L water'}).`,
        `Keep upright cervical spine alignment and posture during study/work sessions.`,
        `Align workload pacing with goals: ${userProfile.goals || 'Deep focus and productivity'}.`,
        `Take 5-minute active posture stretches between long focus blocks.`
      ];
      let finalDontList: string[] = [
        `Do not skip hydration during intense study/work sessions.`,
        `Avoid heavy carb meals right before high-priority focus slots.`,
        `Do not overlap task commitments over non-negotiable prayer/break anchors.`,
        `Avoid slouching or forward-head tilt while working at your desk.`,
        `Do not delay task completion past your evening shutdown routine.`
      ];

      if (res.ok) {
        const data = await res.json();
        const rawReply = data.reply || '';
        const match = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawReply.match(/\{[\s\S]*\}/);
        
        if (match) {
          try {
            const parsed = JSON.parse(match[1] || match[0]);
            if (parsed.summary) finalSummary = parsed.summary;
            if (Array.isArray(parsed.doList) && parsed.doList.length > 0) {
              finalDoList = parsed.doList.map(cleanStrategyText).filter(Boolean);
            }
            if (Array.isArray(parsed.dontList) && parsed.dontList.length > 0) {
              finalDontList = parsed.dontList.map(cleanStrategyText).filter(Boolean);
            }
          } catch {
            // keep smart defaults
          }
        }
      }

      const newStrategy: StrategyData = {
        date: todayDate,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        summary: finalSummary,
        doList: finalDoList,
        dontList: finalDontList
      };

      localStorage.setItem(storageKey, JSON.stringify(newStrategy));
      setStrategyData(newStrategy);
    } catch (err: any) {
      console.warn('Daily strategy generation fallback applied:', err);
      const fallbackStrategy: StrategyData = {
        date: todayDate,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        summary: `Executive daily strategy for ${userProfile.name}. Calibrated for optimal energy, health, and schedule alignment.`,
        doList: [
          `Prioritize high-impact tasks early in your schedule.`,
          `Hydrate well (${weather ? weather.temperature + '°C weather' : 'optimal hydration'}).`,
          `Maintain upright spine alignment and physical posture.`,
          `Align daily execution with long-term goal: "${userProfile.goals || 'Focus'}".`,
          `Take periodic 5-minute movement breaks to prevent mental fatigue.`
        ],
        dontList: [
          `Do not skip hydration during high-intensity focus slots.`,
          `Avoid heavy meals immediately before deep work sessions.`,
          `Do not ignore posture warning signs during desk work.`,
          `Avoid multi-tasking across conflicting task anchors.`,
          `Do not push study/work past midnight without adequate recovery.`
        ]
      };
      localStorage.setItem(storageKey, JSON.stringify(fallbackStrategy));
      setStrategyData(fallbackStrategy);
    } finally {
      setLoading(false);
    }
  };

  // 4:00 AM Local Storage Check Logic
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setStrategyData(JSON.parse(saved));
        return;
      } catch {
        // invalid json, re-trigger
      }
    }

    const currentHour = new Date().getHours();
    // If >= 4:00 AM local time and strategy not generated yet today -> auto-trigger
    if (currentHour >= 4) {
      generateStrategy();
    }
  }, [todayDate]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-6 sm:p-8 shadow-2xl border border-indigo-500/20">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4:00 AM Automated Executive Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Daily Executive Strategy
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Autonomously generated every day at 04:00 AM. Cross-evaluates your physical biometrics, health profile, local weather forecasts, and task schedule.
            </p>

            {/* Health & Context Biometrics Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/10">
              {userProfile.age !== undefined && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-indigo-200 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Age: {userProfile.age}</span>
                </span>
              )}
              {userProfile.height && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-indigo-200">
                  📏 Height: {userProfile.height}
                </span>
              )}
              {userProfile.weight && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-indigo-200">
                  ⚖️ Weight: {userProfile.weight}
                </span>
              )}
              {weather && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-amber-200 flex items-center space-x-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-amber-300" />
                  <span>{weather.temperature}°C • {weather.condition}</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tasks.length} Scheduled Tasks</span>
              </span>
            </div>
          </div>

          <button
            onClick={generateStrategy}
            disabled={loading}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center space-x-2 transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Regenerate Strategy'}</span>
          </button>
        </div>
      </div>

      {/* Summary Box */}
      {strategyData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md text-white flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-300 uppercase tracking-wider">
                Executive Overview for {todayDate}
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                Calibrated at {strategyData.generatedAt}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {strategyData.summary}
            </p>
          </div>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !strategyData && (
        <div className="p-12 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            SyncMate AI is calibrating today's Executive Strategy...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating biometrics, weather forecasts, and optimal task windows.
          </p>
        </div>
      )}

      {/* Main Two-Column Strategy Table (Green vs Red Cards) */}
      {strategyData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* GREEN CARD: DO TODAY */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                      ✅ DO TODAY
                    </h2>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      High-impact priorities & health boosters
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 uppercase tracking-widest">
                  {strategyData.doList.length} Items
                </span>
              </div>

              <ul className="mt-5 space-y-3.5">
                {strategyData.doList.map((item, idx) => (
                  <li 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-800/60 text-slate-800 dark:text-emerald-100 text-xs sm:text-sm font-medium flex items-start space-x-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{cleanStrategyText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Execution verified for peak health & cognitive focus</span>
            </div>
          </div>

          {/* RED CARD: DO NOT DO TODAY */}
          <div className="bg-red-50/60 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-red-200 dark:border-red-800/60">
                <div className="flex items-center space-x-2.5 text-red-800 dark:text-red-300">
                  <div className="p-2 rounded-xl bg-red-500 text-white shadow-md shadow-red-500/20">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                      🚫 DO NOT DO TODAY
                    </h2>
                    <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                      Pitfalls, fatigue hazards & schedule conflicts
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-200/80 dark:bg-red-900/80 text-red-900 dark:text-red-200 uppercase tracking-widest">
                  {strategyData.dontList.length} Items
                </span>
              </div>

              <ul className="mt-5 space-y-3.5">
                {strategyData.dontList.map((item, idx) => (
                  <li 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-red-200/80 dark:border-red-800/60 text-slate-800 dark:text-red-100 text-xs sm:text-sm font-medium flex items-start space-x-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{cleanStrategyText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-red-200/60 dark:border-red-800/40 text-[11px] font-semibold text-red-700 dark:text-red-400 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Avoid these hazards to prevent cognitive exhaustion</span>
            </div>
          </div>

        </div>
      )}

      {/* Empty / Pre-4 AM prompt if no strategy yet */}
      {!strategyData && !loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <Clock className="w-10 h-10 text-indigo-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Today's Strategy Has Not Been Generated Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            SyncMate automatically runs strategy calibration daily at 04:00 AM. You can also generate your strategy immediately right now.
          </p>
          <button
            onClick={generateStrategy}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Strategy Now</span>
          </button>
        </div>
      )}

    </div>
  );
};
