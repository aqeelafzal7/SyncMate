import React, { useState, useEffect } from 'react';
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
  ChevronRight
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

  // Update real-time clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // 24 Hours Array [0..23]
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Helper to check if a prayer falls into a specific hour slot
  const getPrayerForHour = (hour: number) => {
    if (!prayerTimings || userProfile.religion !== 'Muslim') return null;

    const parseHour = (timeStr?: string) => {
      if (!timeStr) return -1;
      const parts = timeStr.split(':');
      return parseInt(parts[0], 10);
    };

    const fajrH = parseHour(prayerTimings.Fajr);
    const dhuhrH = parseHour(prayerTimings.Dhuhr);
    const asrH = parseHour(prayerTimings.Asr);
    const maghribH = parseHour(prayerTimings.Maghrib);
    const ishaH = parseHour(prayerTimings.Isha);

    if (hour === fajrH) return { name: 'Fajr Prayer', time: prayerTimings.Fajr, icon: Sunrise, bg: 'from-indigo-900/60 to-purple-900/60 border-indigo-700/80' };
    if (hour === dhuhrH) return { name: 'Dhuhr Prayer', time: prayerTimings.Dhuhr, icon: Sun, bg: 'from-amber-900/60 to-yellow-900/60 border-amber-700/80' };
    if (hour === asrH) return { name: 'Asr Prayer', time: prayerTimings.Asr, icon: Sun, bg: 'from-orange-900/60 to-amber-900/60 border-orange-700/80' };
    if (hour === maghribH) return { name: 'Maghrib Prayer', time: prayerTimings.Maghrib, icon: Sunset, bg: 'from-rose-900/60 to-pink-900/60 border-rose-700/80' };
    if (hour === ishaH) return { name: 'Isha Prayer', time: prayerTimings.Isha, icon: MoonStar, bg: 'from-blue-950/70 to-slate-900/70 border-blue-800/80' };

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

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Context Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {userProfile.name || 'User'}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              SyncMate has synchronized your timeline. {userProfile.religion === 'Muslim' ? 'Your 5 daily prayer anchors are strictly locked to protect your spiritual focus.' : 'Your daily deep-work focus slots are optimized.'}
            </p>
          </div>

          {/* Quick Context Chips */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {prayerTimings?.dateHijri && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-purple-300" />
                <div>
                  <span className="block text-[10px] text-indigo-200">Hijri Date</span>
                  <span className="font-bold">{prayerTimings.dateHijri}</span>
                </div>
              </div>
            )}

            {weather && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2">
                <CloudSun className="w-4 h-4 text-amber-300" />
                <div>
                  <span className="block text-[10px] text-indigo-200">Local Weather</span>
                  <span className="font-bold">{weather.temperature}°C, {weather.condition}</span>
                </div>
              </div>
            )}

            {userProfile.location?.city && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-300" />
                <div>
                  <span className="block text-[10px] text-indigo-200">Coordinates</span>
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
            <span>Realtime Timeline: <strong className="text-slate-900 dark:text-white">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </div>
          {userProfile.religion === 'Muslim' && (
            <span className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold">
              <Lock className="w-3 h-3 text-purple-500" />
              <span>5 Fixed Prayer Anchors Locked</span>
            </span>
          )}
        </div>

        <button
          onClick={() => onAddTaskClick()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Task</span>
        </button>
      </div>

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
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                    style={{ top: `${(currentMinute / 60) * 100}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-ping -ml-1.5 shrink-0" />
                    <div className="h-0.5 bg-red-500 flex-1 shadow-sm shadow-red-500/50" />
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ml-2">
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                              <prayerAnchor.icon className="w-5 h-5 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-sm tracking-wide text-white">
                                  {prayerAnchor.name}
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center space-x-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Fixed Anchor</span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5">
                                Spiritual schedule anchor strictly reserved around {prayerAnchor.time}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold px-3 py-1 bg-black/30 rounded-lg border border-white/10">
                            {prayerAnchor.time}
                          </span>
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
                              <h4 className={`text-xs sm:text-sm font-bold ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {t.title}
                              </h4>
                              {t.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
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
