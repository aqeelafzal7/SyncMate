import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Lock, 
  MapPin, 
  Calendar as CalendarIcon, 
  CloudSun, 
  AlertCircle,
  MoonStar,
  Sunrise,
  Sun,
  Sunset,
  Trash2,
  Tag,
  Check,
  ChevronRight,
  Edit2,
  RotateCcw,
  Target,
  Flame,
  Dumbbell,
  Play
} from 'lucide-react';
import { UserProfile, Task, PrayerTimings, WeatherData } from '../types';
import { getDangerousHabitStreaks } from '../lib/habitService';
import { getFormattedHijriDate } from '../lib/contextService';
import { IslamicInsightModal } from './IslamicInsightModal';
import { BirthdayCard } from './BirthdayCard';
import { checkIsBirthday, getMsUntilMidnight } from '../lib/birthdayUtils';
import { getTierDefaultCredits } from '../lib/subscriptionService';

interface TimelineProps {
  userProfile: UserProfile;
  tasks: Task[];
  prayerTimings: PrayerTimings | null;
  weather: WeatherData | null;
  locationName?: string;
  activeMood?: string;
  onResetMood?: () => void;
  onAddTaskClick: (hourSlot?: string) => void;
  onToggleTaskStatus: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTimerModal?: (taskTitle?: string, mins?: number) => void;
  onOpenCitySearch?: () => void;
  onOpenStrategy?: () => void;
  onIslamicModalChange?: (isOpen: boolean) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  userProfile,
  tasks,
  prayerTimings,
  weather,
  locationName,
  activeMood,
  onResetMood,
  onAddTaskClick,
  onToggleTaskStatus,
  onDeleteTask,
  onOpenTimerModal,
  onOpenCitySearch,
  onOpenStrategy,
  onIslamicModalChange,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const nowLineRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToNow, setHasScrolledToNow] = useState(false);

  // Strategy Notification Banner state
  const [hasTodayStrategy, setHasTodayStrategy] = useState<boolean>(() => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      return Boolean(localStorage.getItem(`syncmate_strategy_${todayDate}`));
    } catch {
      return false;
    }
  });

  const [hasViewedStrategy, setHasViewedStrategy] = useState<boolean>(() => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      return localStorage.getItem(`syncmate_strategy_viewed_${todayDate}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    const check = () => {
      setHasTodayStrategy(Boolean(localStorage.getItem(`syncmate_strategy_${todayDate}`)));
      setHasViewedStrategy(localStorage.getItem(`syncmate_strategy_viewed_${todayDate}`) === 'true');
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  // 24-Hour Birthday Mode State & Midnight Auto-Destruct Engine
  const [isBirthdayMode, setIsBirthdayMode] = useState<boolean>(() => checkIsBirthday(userProfile.dob));

  useEffect(() => {
    const isBday = checkIsBirthday(userProfile.dob);
    setIsBirthdayMode(isBday);

    if (isBday) {
      const msLeft = getMsUntilMidnight();
      const timer = setTimeout(() => {
        // Midnight Auto-Destruct: Unmount card and clear Birthday Mode without page reload!
        setIsBirthdayMode(false);
      }, msLeft);

      return () => clearTimeout(timer);
    }
  }, [userProfile.dob]);

  // Selected Timeline Date State (Default Today)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  const getUpcomingDates = () => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      list.push({ dateStr, label, dayNum: d.getDate(), monthStr: d.toLocaleDateString('en-US', { month: 'short' }) });
    }
    return list;
  };

  const upcomingDates = getUpcomingDates();

  // Strict Date Filtering
  const dateFilteredTasks = tasks.filter((t) => {
    if (!t.date) {
      return selectedDate === getTodayStr();
    }
    return t.date === selectedDate;
  });

  // Overcrowd Control Check
  const focusTaskCount = dateFilteredTasks.filter(
    (t) => t.projectId || t.category === 'study' || t.category === 'work'
  ).length;
  const isOvercrowded = focusTaskCount > 2;

  // Dangerous Habits Check
  const dangerousStreaks = getDangerousHabitStreaks();

  // Completed Prayers State (persisted in localStorage by date_prayerKey)
  const [completedPrayers, setCompletedPrayers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('syncmate_completed_prayers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Islamic Insight Modal State
  const [islamicModal, setIslamicModal] = useState<{
    isOpen: boolean;
    prayerName: string;
  }>({
    isOpen: false,
    prayerName: ''
  });

  useEffect(() => {
    onIslamicModalChange?.(islamicModal.isOpen);
  }, [islamicModal.isOpen, onIslamicModalChange]);

  const handleTogglePrayerComplete = (prayerKey: string, prayerName: string) => {
    const itemKey = `${selectedDate}_${prayerKey}`;
    const currentlyCompleted = Boolean(completedPrayers[itemKey]);
    const nextState = !currentlyCompleted;

    const updated = {
      ...completedPrayers,
      [itemKey]: nextState
    };
    setCompletedPrayers(updated);
    localStorage.setItem('syncmate_completed_prayers', JSON.stringify(updated));

    // If marked as complete, open Quran & Hadith Reward Modal!
    if (nextState) {
      setIslamicModal({
        isOpen: true,
        prayerName
      });
    }
  };

  // Manual Prayer Overrides state (persisted in localStorage)
  const [customPrayerTimes, setCustomPrayerTimes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('syncmate_custom_prayer_times');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal for editing a prayer time
  const [editingPrayer, setEditingPrayer] = useState<{
    name: string;
    key: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
    time: string;
  } | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  // Effective Prayer Timings: Custom Overrides take strict precedence over Aladhan API
  const effectivePrayerTimings = prayerTimings
    ? {
        ...prayerTimings,
        ...customPrayerTimes,
      }
    : null;

  const handleSavePrayerOverride = () => {
    if (!editingPrayer) return;
    const updated = {
      ...customPrayerTimes,
      [editingPrayer.key]: editTimeValue
    };
    setCustomPrayerTimes(updated);
    localStorage.setItem('syncmate_custom_prayer_times', JSON.stringify(updated));
    setEditingPrayer(null);
  };

  const handleResetPrayerOverride = () => {
    if (!editingPrayer) return;
    const updated = { ...customPrayerTimes };
    delete updated[editingPrayer.key];
    setCustomPrayerTimes(updated);
    localStorage.setItem('syncmate_custom_prayer_times', JSON.stringify(updated));
    setEditingPrayer(null);
  };

  // Update real-time clock every 20 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 20000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll timeline to current time indicator on initial render
  useEffect(() => {
    if (nowLineRef.current && !hasScrolledToNow) {
      setTimeout(() => {
        nowLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHasScrolledToNow(true);
      }, 400);
    }
  }, [hasScrolledToNow]);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // 24 Hours Array [0..23]
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Helper to check if a prayer falls into a specific hour slot
  const getPrayerForHour = (hour: number) => {
    if (!effectivePrayerTimings) return null;
    // Show prayer anchors for Muslim profile or if religion not non-Muslim
    if (userProfile.religion === 'Christian' || userProfile.religion === 'Jewish' || userProfile.religion === 'Other') return null;

    const parseHour = (timeStr?: string) => {
      if (!timeStr) return -1;
      const parts = timeStr.split(':');
      return parseInt(parts[0], 10);
    };

    const fajrH = parseHour(effectivePrayerTimings.Fajr);
    const dhuhrH = parseHour(effectivePrayerTimings.Dhuhr);
    const asrH = parseHour(effectivePrayerTimings.Asr);
    const maghribH = parseHour(effectivePrayerTimings.Maghrib);
    const ishaH = parseHour(effectivePrayerTimings.Isha);

    if (hour === fajrH) return { name: 'Fajr Prayer', key: 'Fajr' as const, time: effectivePrayerTimings.Fajr, icon: Sunrise, bg: 'from-indigo-900/80 via-purple-900/80 to-indigo-950/80 border-indigo-700/80', isCustom: Boolean(customPrayerTimes.Fajr) };
    if (hour === dhuhrH) return { name: 'Dhuhr Prayer', key: 'Dhuhr' as const, time: effectivePrayerTimings.Dhuhr, icon: Sun, bg: 'from-amber-900/80 via-yellow-900/80 to-amber-950/80 border-amber-700/80', isCustom: Boolean(customPrayerTimes.Dhuhr) };
    if (hour === asrH) return { name: 'Asr Prayer', key: 'Asr' as const, time: effectivePrayerTimings.Asr, icon: Sun, bg: 'from-orange-900/80 via-amber-900/80 to-orange-950/80 border-orange-700/80', isCustom: Boolean(customPrayerTimes.Asr) };
    if (hour === maghribH) return { name: 'Maghrib Prayer', key: 'Maghrib' as const, time: effectivePrayerTimings.Maghrib, icon: Sunset, bg: 'from-rose-900/80 via-pink-900/80 to-rose-950/80 border-rose-700/80', isCustom: Boolean(customPrayerTimes.Maghrib) };
    if (hour === ishaH) return { name: 'Isha Prayer', key: 'Isha' as const, time: effectivePrayerTimings.Isha, icon: MoonStar, bg: 'from-blue-950/80 via-slate-900/80 to-indigo-950/80 border-blue-800/80', isCustom: Boolean(customPrayerTimes.Isha) };

    return null;
  };

  // Helper to filter user tasks for a given hour on the selected date
  const getTasksForHour = (hour: number) => {
    return dateFilteredTasks.filter((t) => {
      if (!t.startTime) return false;
      const tHour = parseInt(t.startTime.split(':')[0], 10);
      return tHour === hour;
    });
  };

  const gregorianDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const hijriDateFormatted = prayerTimings?.dateHijri || getFormattedHijriDate();

  return (
    <div className="space-y-6">
      
      {/* 🔔 Daily Executive Strategy Notification Banner */}
      {hasTodayStrategy && !hasViewedStrategy && onOpenStrategy && (
        <div 
          onClick={() => {
            const todayStr = new Date().toISOString().split('T')[0];
            localStorage.setItem('syncmate_strategy_viewed_' + todayStr, 'true');
            setHasViewedStrategy(true);
            onOpenStrategy();
          }}
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between cursor-pointer hover:opacity-95 transition-all transform active:scale-[0.99] border border-emerald-400/30"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shrink-0">
              <Target className="w-5 h-5 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold leading-tight">
                🔔 SyncMate has generated your Daily Survival & Strategy List based on today's weather and schedule.
              </p>
              <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                Calibrated for health biometrics, hydration, & focus. Tap to view your DO & DO NOT list.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all shrink-0 ml-3">
            <span>View Strategy</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {userProfile.name || 'User'}!
            </h1>
          </div>

          {/* Quick Context Chips */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            
            {/* Glowing Credit Counter Widget */}
            <div className={`backdrop-blur-md px-3.5 py-2 rounded-2xl border text-xs flex items-center space-x-2.5 transition-all shadow-xs ${
              (userProfile?.dailyCredits ?? 6) === 0 
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}>
              <span className="text-base shrink-0">⚡</span>
              <div>
                <span className="block text-[10px] text-amber-300 font-extrabold uppercase tracking-wider">
                  Daily Credits: {userProfile?.dailyCredits ?? 6} / {getTierDefaultCredits(userProfile?.tier, userProfile?.dailyCredits)}
                </span>
                <span className="text-[10px] text-indigo-200 block font-semibold">
                  Resets at 00:00 Midnight
                </span>
              </div>
            </div>

            {/* Dual Calendar Pill: Gregorian + Hijri */}
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2.5">
              <CalendarIcon className="w-4 h-4 text-purple-300 shrink-0" />
              <div>
                <span className="block text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">Dual Calendar</span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  {gregorianDateFormatted} | {hijriDateFormatted}
                </span>
              </div>
            </div>

            {/* Location Button Chip */}
            <button
              onClick={onOpenCitySearch}
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2.5 text-left group cursor-pointer"
              title="Search or change city location"
            >
              <MapPin className="w-4 h-4 text-indigo-300 shrink-0" />
              <div>
                <span className="block text-[10px] text-indigo-200 font-semibold uppercase tracking-wider flex items-center space-x-1">
                  <span>Location</span>
                  <span className="text-[9px] text-indigo-200 bg-white/10 px-1 rounded">✏️ Edit</span>
                </span>
                <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[140px] block">
                  {locationName || userProfile.location?.city || 'Set Location'}
                </span>
              </div>
            </button>

            {/* Weather Chip */}
            {weather && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2.5">
                <CloudSun className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <span className="block text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">Live Weather</span>
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {weather.temperature}°C • {weather.condition}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Dynamic 24-Hour Birthday Experience Card */}
      {isBirthdayMode && (
        <BirthdayCard userProfile={userProfile} tasks={tasks} />
      )}

      {/* Dangerous Streak Warning Banner */}
      {dangerousStreaks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-2xl p-4 text-white shadow-xl border border-amber-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md shrink-0">
              <Flame className="w-6 h-6 text-amber-200 fill-amber-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider text-amber-100">
                  ⚠️ Imminent Streak Decay Warning
                </span>
              </div>
              <h4 className="font-extrabold text-sm sm:text-base mt-0.5">
                Your {dangerousStreaks[0].count}-day {dangerousStreaks[0].name} streak is about to break today!
              </h4>
              <p className="text-xs text-amber-100 mt-0.5">
                Tap below to launch the micro-habit timer and extend your streak before midnight.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenTimerModal?.(dangerousStreaks[0].name, 5)}
            className="px-4 py-2.5 rounded-xl bg-white text-amber-900 font-extrabold text-xs shadow-lg hover:bg-amber-100 transition-all shrink-0 flex items-center space-x-1.5 self-end sm:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-800" />
            <span>Tap to Complete Now 🔥</span>
          </button>
        </div>
      )}

      {/* Control Bar & Stats */}
      <div className="relative z-[50] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Realtime Timeline: <strong className="text-slate-900 dark:text-white font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
          </div>
          <span className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold">
            <Lock className="w-3 h-3 text-purple-500" />
            <span>5 Prayer Anchors Locked</span>
          </span>
        </div>

        <button
          onClick={() => onAddTaskClick()}
          className="relative z-[60] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Task</span>
        </button>
      </div>

      {/* Date Navigation Bar */}
      <div className="relative z-[50] bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2 min-w-max">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center space-x-1">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Schedule Date:</span>
          </div>
          {upcomingDates.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{item.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {item.monthStr} {item.dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overcrowd Control Warning */}
      {isOvercrowded && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 text-amber-900 dark:text-amber-200 text-xs shadow-md flex items-start space-x-3 animate-fadeIn">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0 font-extrabold">
            ⚠️
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-amber-900 dark:text-amber-100">
              Burnout Warning: Focus Limit Exceeded ({focusTaskCount} Focus Tasks on {selectedDate})
            </h4>
            <p className="mt-0.5 text-amber-800 dark:text-amber-200">
              SyncMate recommends keeping focus tasks under 2 hours daily for maximum consistency. Spreading this out produces better long-term retention!
            </p>
          </div>
        </div>
      )}

      {/* Manual Prayer Edit Modal */}
      {editingPrayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>Edit {editingPrayer.name} Time</span>
              </div>
              <button
                onClick={() => setEditingPrayer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust exact congregation or mosque jamat time. The context engine will re-anchor your tasks around this time.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exact Prayer Time (24-Hour)
              </label>
              <input
                type="time"
                value={editTimeValue}
                onChange={(e) => setEditTimeValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {customPrayerTimes[editingPrayer.key] ? (
                <button
                  onClick={handleResetPrayerOverride}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingPrayer(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrayerOverride}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Save Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Vertical Timeline */}
      <div className="relative z-[50] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="space-y-6 relative">
          
          {hours.map((hour) => {
            const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
            const prayerAnchor = getPrayerForHour(hour);
            const hourTasks = getTasksForHour(hour);
            const isCurrentHour = hour === currentHour;

            return (
              <div key={hour} className="relative group">
                
                {/* Current Time Red Progress Line */}
                {isCurrentHour && (
                  <div
                    ref={nowLineRef}
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none transition-all duration-500"
                    style={{ top: `${(currentMinute / 60) * 100}%` }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping -ml-1.5 shrink-0" />
                    <div className="h-0.5 bg-red-500 flex-1 shadow-sm shadow-red-500/50" />
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md ml-2 font-mono">
                      NOW ({currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>
                )}

                <div className="flex items-start space-x-4">
                  
                  {/* Hour Label */}
                  <div className="w-16 shrink-0 pt-1 text-right">
                    <span className={`text-xs font-bold ${isCurrentHour ? 'text-indigo-600 dark:text-indigo-400 font-extrabold scale-110 block' : 'text-slate-400 dark:text-slate-500'}`}>
                      {hourFormatted}
                    </span>
                  </div>

                  {/* Vertical Line Divider */}
                  <div className="flex flex-col items-center self-stretch shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 ${isCurrentHour ? 'border-indigo-600 bg-indigo-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'}`} />
                    <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 my-1" />
                  </div>

                  {/* Slot Content */}
                  <div className="flex-1 space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                    
                    {/* Fixed Prayer Anchor Block (if Muslim & prayer time) */}
                    {prayerAnchor && (() => {
                      const prayerItemKey = `${selectedDate}_${prayerAnchor.key}`;
                      const isPrayerDone = Boolean(completedPrayers[prayerItemKey]);

                      return (
                        <div className={`p-4 rounded-2xl bg-gradient-to-r ${isPrayerDone ? 'from-emerald-950 via-teal-950 to-slate-900 border-emerald-400/80 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-500/30' : prayerAnchor.bg} border text-white shadow-lg relative overflow-hidden transition-all duration-300`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2.5 rounded-xl ${isPrayerDone ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 backdrop-blur-md text-amber-300'}`}>
                                {isPrayerDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <prayerAnchor.icon className="w-5 h-5 text-amber-300 animate-pulse" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                                  <h3 className={`font-bold text-sm tracking-wide ${isPrayerDone ? 'text-emerald-200 line-through' : 'text-white'}`}>
                                    {prayerAnchor.name}
                                  </h3>
                                  
                                  {isPrayerDone ? (
                                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 flex items-center space-x-1 shadow-sm">
                                      <Check className="w-3 h-3 text-emerald-300" />
                                      <span>Offered / Complete</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center space-x-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>Fixed Anchor</span>
                                    </span>
                                  )}

                                  {prayerAnchor.isCustom && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                                      Mosque Jamat Custom
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-200 mt-0.5">
                                  {isPrayerDone ? 'May Allah accept your prayer and devotion.' : `Spiritual schedule anchor strictly reserved around ${prayerAnchor.time}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2.5 self-end sm:self-auto flex-wrap gap-2">
                              {/* Mark Complete Button */}
                              <button
                                onClick={() => handleTogglePrayerComplete(prayerAnchor.key, prayerAnchor.name)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center space-x-1.5 ${
                                  isPrayerDone
                                    ? 'bg-emerald-800/60 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-500/40'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/30 hover:scale-105 active:scale-95'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isPrayerDone ? '✓ Offered' : '✅ Mark Complete'}</span>
                              </button>

                              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-black/40 rounded-xl border border-white/15">
                                {prayerAnchor.time}
                              </span>

                              <button
                                onClick={() => {
                                  setEditingPrayer({
                                    name: prayerAnchor.name,
                                    key: prayerAnchor.key,
                                    time: prayerAnchor.time,
                                  });
                                  setEditTimeValue(prayerAnchor.time);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all flex items-center space-x-1"
                                title="Edit exact mosque jamat time"
                              >
                                <Edit2 className="w-3 h-3 text-amber-300" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Task Cards in this slot */}
                    {hourTasks.map((t) => {
                      const isFitnessTask =
                        t.category === 'health' ||
                        t.title.toLowerCase().includes('fitness') ||
                        t.title.toLowerCase().includes('workout') ||
                        t.title.toLowerCase().includes('stretch') ||
                        t.title.toLowerCase().includes('plank');

                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-2xl border transition-all duration-200 ${
                            t.status === 'completed'
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                              : isFitnessTask
                              ? 'bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-emerald-950/20 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-300 dark:border-emerald-700/60 shadow-md hover:shadow-lg'
                              : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start space-x-3">
                              <button
                                onClick={() => onToggleTaskStatus(t)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                              >
                                {t.status === 'completed' ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-1.5 mb-1">
                                  <h4 className={`text-xs sm:text-sm font-bold ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                    {t.title}
                                  </h4>

                                  {isFitnessTask && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold flex items-center space-x-1">
                                      <Dumbbell className="w-2.5 h-2.5 text-emerald-500" />
                                      <span>🏋️ Fitness Focus</span>
                                    </span>
                                  )}

                                  {t.projectId && (
                                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-bold flex items-center space-x-1">
                                      <Target className="w-2.5 h-2.5 text-purple-500" />
                                      <span>🎯 Project Milestone</span>
                                    </span>
                                  )}
                                </div>
                                {t.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    {t.description}
                                  </p>
                                )}

                                {isFitnessTask && t.status !== 'completed' && (
                                  <div className="mt-2.5">
                                    <button
                                      onClick={() => onOpenTimerModal?.(t.title, 15)}
                                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] shadow-sm flex items-center space-x-1.5 transition-all"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>Start Workout Timer ⏱️</span>
                                    </button>
                                  </div>
                                )}
                                
                                {/* AI Tip badge if present */}
                                {t.aiTip && (
                                  <div className="mt-2.5 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-start space-x-2">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                    <span><strong>SyncMate Tip:</strong> {t.aiTip}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-mono">
                                {t.startTime} - {t.endTime}
                              </span>
                              <button
                                onClick={() => onDeleteTask(t.id)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Button on Hover or Empty */}
                    {hourTasks.length === 0 && !prayerAnchor && (
                      <button
                        onClick={() => onAddTaskClick(hourFormatted)}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-medium flex items-center justify-center space-x-1 transition-all opacity-40 hover:opacity-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule task at {hourFormatted}</span>
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      </div>

      {/* Islamic Knowledge Reward Modal (Quran & Hadith Popups) */}
      <IslamicInsightModal
        prayerName={islamicModal.prayerName}
        isOpen={islamicModal.isOpen}
        activeMood={activeMood || userProfile.activeMood}
        onResetMood={onResetMood}
        onClose={() => setIslamicModal({ isOpen: false, prayerName: '' })}
        isBirthday={isBirthdayMode}
      />

    </div>
  );
};

