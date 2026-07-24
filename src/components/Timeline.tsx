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
  Target
} from 'lucide-react';
import { UserProfile, Task, PrayerTimings, WeatherData } from '../types';

interface TimelineProps {
  userProfile: UserProfile;
  tasks: Task[];
  prayerTimings: PrayerTimings | null;
  weather: WeatherData | null;
  onAddTaskClick: (hourSlot?: string) => void;
  onToggleTaskStatus: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  userProfile,
  tasks,
  prayerTimings,
  weather,
  onAddTaskClick,
  onToggleTaskStatus,
  onDeleteTask,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const nowLineRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToNow, setHasScrolledToNow] = useState(false);

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

  // Helper to filter user tasks for a given hour
  const getTasksForHour = (hour: number) => {
    return tasks.filter((t) => {
      if (!t.startTime) return false;
      const tHour = parseInt(t.startTime.split(':')[0], 10);
      return tHour === hour;
    });
  };

  const gregorianDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Context Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {userProfile.name || 'User'}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              SyncMate has synchronized your timeline. {userProfile.religion === 'Muslim' || !userProfile.religion || userProfile.religion === 'None' ? 'Your 5 daily prayer anchors are strictly locked to protect your spiritual focus.' : 'Your daily deep-work focus slots are optimized.'}
            </p>
          </div>

          {/* Quick Context Chips */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Dual Calendar Pill: Gregorian + Hijri */}
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2.5">
              <CalendarIcon className="w-4 h-4 text-purple-300 shrink-0" />
              <div>
                <span className="block text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">Dual Calendar</span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  {gregorianDateFormatted}{prayerTimings?.dateHijri ? ` | ${prayerTimings.dateHijri}` : ''}
                </span>
              </div>
            </div>

            {weather && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2">
                <CloudSun className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <span className="block text-[10px] text-indigo-200">Local Weather</span>
                  <span className="font-bold">{weather.temperature}°C, {weather.condition}</span>
                </div>
              </div>
            )}

            {userProfile.location?.city && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                <div>
                  <span className="block text-[10px] text-indigo-200">Location</span>
                  <span className="font-bold">{userProfile.location.city}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Control Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Task</span>
        </button>
      </div>

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative">
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
                    {prayerAnchor && (
                      <div className={`p-4 rounded-2xl bg-gradient-to-r ${prayerAnchor.bg} border text-white shadow-lg relative overflow-hidden`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                              <prayerAnchor.icon className="w-5 h-5 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap gap-1">
                                <h3 className="font-bold text-sm tracking-wide text-white">
                                  {prayerAnchor.name}
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center space-x-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Fixed Anchor</span>
                                </span>
                                {prayerAnchor.isCustom && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                                    Mosque Jamat Custom
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5">
                                Spiritual schedule anchor strictly reserved around {prayerAnchor.time}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            <span className="font-mono text-xs font-bold px-3 py-1 bg-black/40 rounded-xl border border-white/15">
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
                    )}

                    {/* Task Cards in this slot */}
                    {hourTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 ${
                          t.status === 'completed'
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
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
                              <div className="flex items-center space-x-2 flex-wrap gap-1 mb-1">
                                <h4 className={`text-xs sm:text-sm font-bold ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                  {t.title}
                                </h4>
                                {t.projectId && (
                                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-bold flex items-center space-x-1">
                                    <Target className="w-2.5 h-2.5 text-purple-500" />
                                    <span>🎯 Project Milestone</span>
                                  </span>
                                )}
                              </div>
                              {t.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {t.description}
                                </p>
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

                          <div className="flex items-center space-x-2 shrink-0">
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
                    ))}

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

    </div>
  );
};

