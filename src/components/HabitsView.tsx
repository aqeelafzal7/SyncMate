import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  CheckCircle, 
  CheckCircle2, 
  Flame, 
  Droplets, 
  Eye, 
  Activity, 
  Heart, 
  Plus, 
  Trophy, 
  Clock 
} from 'lucide-react';
import { HabitStreak, UserProfile } from '../types';
import { playCompletionChime } from '../lib/audioService';
import { incrementHabitStreak } from '../lib/habitService';
import { 
  subscribeUserHabits, 
  addHabitToFirestore, 
  updateHabitInFirestore 
} from '../lib/firebase';

interface HabitsViewProps {
  userProfile: UserProfile | null;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ userProfile }) => {
  // Timer State
  const [totalMins, setTotalMins] = useState<number>(3);
  const [secondsLeft, setSecondsLeft] = useState<number>(3 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [selectedHabit, setSelectedHabit] = useState<'hydration' | 'eye' | 'stretch' | 'breathing' | 'custom'>('hydration');
  const [activeHabitLabel, setActiveHabitLabel] = useState<string>('Hydration Reset');
  const [streakResult, setStreakResult] = useState<{ count: number; isExtendedToday: boolean } | null>(null);

  // Custom Habit Inputs
  const [customHabitName, setCustomHabitName] = useState<string>('');
  const [customHabitMins, setCustomHabitMins] = useState<string>('');

  // Daily Habits List State - Pure Firestore State
  const [habits, setHabits] = useState<any[]>([]);
  const [newHabitName, setNewHabitName] = useState<string>('');

  // Subscribe to real-time Firestore habits
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsubscribe = subscribeUserHabits(userProfile.uid, (firestoreHabits) => {
      setHabits(firestoreHabits || []);
    });
    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Timer Interval Effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      handleFinishHabit(activeHabitLabel);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, activeHabitLabel]);

  const setTimerPreset = (mins: number, label?: string) => {
    setTotalMins(mins);
    setSecondsLeft(mins * 60);
    setIsRunning(false);
    setIsFinished(false);
    setStreakResult(null);
    if (label) setActiveHabitLabel(label);
  };

  const handleFinishHabit = async (habitName: string) => {
    setIsRunning(false);
    setIsFinished(true);
    playCompletionChime();

    // Increment streak in habitService
    const res = incrementHabitStreak(habitName);
    setStreakResult({ count: res.count, isExtendedToday: res.isExtendedToday });

    // Update or add habit in Firestore
    const today = new Date().toISOString().split('T')[0];
    if (userProfile?.uid) {
      const existing = habits.find(h => (h.name || '').toLowerCase().includes(habitName.toLowerCase()) || habitName.toLowerCase().includes((h.name || '').toLowerCase()));
      if (existing?.id) {
        await updateHabitInFirestore(existing.id, userProfile.uid, {
          count: res.count,
          lastCompletedDate: today
        });
      } else {
        await addHabitToFirestore(userProfile.uid, {
          name: habitName,
          count: res.count,
          lastCompletedDate: today
        });
      }
    }
  };

  const handleStartCustomHabit = () => {
    const name = customHabitName.trim() || 'Custom Focus Session';
    const parsed = parseInt(customHabitMins, 10);
    const mins = !isNaN(parsed) && parsed > 0 ? parsed : 5;

    setActiveHabitLabel(name);
    setTotalMins(mins);
    setSecondsLeft(mins * 60);
    setSelectedHabit('custom');
    setIsFinished(false);
    setStreakResult(null);
    setIsRunning(true);
  };

  const handleToggleHabit = async (habit: any) => {
    if (!userProfile?.uid || !habit?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = habit.lastCompletedDate === today;

    const newCount = isCompletedToday ? Math.max(0, (habit.count || 0) - 1) : (habit.count || 0) + 1;
    const newDate = isCompletedToday ? '' : today;

    await updateHabitInFirestore(habit.id, userProfile.uid, {
      count: newCount,
      lastCompletedDate: newDate
    });
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !userProfile?.uid) return;

    await addHabitToFirestore(userProfile.uid, {
      name: newHabitName.trim(),
      count: 0,
      lastCompletedDate: ''
    });
    setNewHabitName('');
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((totalMins * 60 - secondsLeft) / (totalMins * 60)) * 100;
  const todayStr = new Date().toISOString().split('T')[0];

  const presetHabits = [
    { 
      id: 'hydration', 
      label: 'Hydration Reset', 
      time: '2 mins', 
      mins: 2,
      icon: Droplets, 
      desc: 'Drink 250ml of clean room-temperature water.', 
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800' 
    },
    { 
      id: 'eye', 
      label: '20-20-20 Eye Relief', 
      time: '3 mins', 
      mins: 3,
      icon: Eye, 
      desc: 'Look 20 feet away for 20 seconds to ease digital eye fatigue.', 
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800' 
    },
    { 
      id: 'stretch', 
      label: 'Spine & Posture Stretch', 
      time: '5 mins', 
      mins: 5,
      icon: Activity, 
      desc: 'Roll shoulders back, stretch wrists, and align posture.', 
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800' 
    },
    { 
      id: 'breathing', 
      label: 'Deep Mindful Breathing', 
      time: '3 mins', 
      mins: 3,
      icon: Heart, 
      desc: 'Inhale for 4s, hold for 4s, exhale slowly for 6s.', 
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800' 
    },
  ];

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      
      {/* 1. Page Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start space-x-4 relative z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Focus Recovery & Wellness
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Micro-Habits & Active Rest
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Boost long-term energy with short, scientifically aligned focus recovery habits.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-800/90 px-4 py-3 rounded-2xl border border-slate-700/80 shrink-0 relative z-10">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Streaks</span>
            <span className="text-sm font-black text-white">
              {habits.reduce((acc, h) => acc + h.count, 0)} Completed Rituals
            </span>
          </div>
        </div>
      </div>

      {/* 2. Preset Habits Grid (4 Cards) */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Scientifically Formulated Presets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presetHabits.map((h) => {
            const Icon = h.icon;
            const isSelected = selectedHabit === h.id;
            return (
              <button
                key={h.id}
                onClick={() => {
                  setSelectedHabit(h.id as any);
                  setTimerPreset(h.mins, h.label);
                }}
                className={`p-5 rounded-3xl border text-left transition-all relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/80 ring-2 ring-indigo-500/30 shadow-lg'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-2xl border ${h.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {h.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {h.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {h.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>{isSelected ? 'Active Selection' : 'Select Preset'}</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Live Countdown Timer & Custom Habit Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Countdown Clock Display */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          
          {/* Progress Bar Top */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="text-center py-4 space-y-4">
            {isFinished ? (
              <div className="py-6 space-y-3 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-800 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Habit Session Complete!</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  You finished <span className="font-bold text-slate-900 dark:text-white">"{activeHabitLabel}"</span>. Your mind is refreshed and ready for executive focus.
                </p>

                {streakResult && (
                  <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 text-xs font-black animate-pulse">
                    <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span>🔥 {streakResult.count} Day Streak {streakResult.isExtendedToday ? 'Extended Today!' : 'Active!'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeHabitLabel}</span>
                </div>
                <div>
                  <span className="text-6xl sm:text-7xl font-black tracking-tight font-mono text-slate-900 dark:text-white">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {isRunning ? 'Session running — focus on rest and recovery' : 'Ready to begin your session'}
                </p>
              </div>
            )}

            {/* Quick Presets Bar */}
            <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Duration:</span>
              {[2, 3, 5, 10, 15, 20].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimerPreset(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                    totalMins === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Timer Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSecondsLeft(totalMins * 60);
                    setIsRunning(false);
                    setIsFinished(false);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-8 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl flex items-center space-x-2 transition-all ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>Pause Timer</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Start Session</span>
                    </>
                  )}
                </button>
              </div>

              {!isFinished && (
                <button
                  onClick={() => handleFinishHabit(activeHabitLabel)}
                  className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete & Record Streak 🔥</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Right Column (1 col): Custom Focus/Habit Input */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Custom Focus / Habit</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configure a custom habit or study block with a tailored countdown timer.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Habit Title
                </label>
                <input
                  type="text"
                  value={customHabitName}
                  onChange={(e) => setCustomHabitName(e.target.value)}
                  placeholder="e.g., Read Biology Notes, Quran Recitation"
                  className="w-full px-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customHabitMins}
                  onChange={(e) => setCustomHabitMins(e.target.value)}
                  placeholder="e.g., 10"
                  className="w-full px-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleStartCustomHabit}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>+ Start Custom Habit Session</span>
          </button>
        </div>

      </div>

      {/* 4. Daily Executive Habits Consistency Tracker */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Executive Routine & Habit Streaks</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Check off your daily core rituals to maintain continuous productivity momentum.
            </p>
          </div>

          <form onSubmit={handleAddHabit} className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Add habit..."
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 w-full sm:w-48"
            />
            <button
              type="submit"
              disabled={!newHabitName.trim()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {habits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Flame className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No active habits yet. Add a habit above to build your daily streak.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit, idx) => {
              const isDoneToday = habit.lastCompletedDate === todayStr;

              return (
                <div
                  key={habit.id || idx}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isDoneToday
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleHabit(habit)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isDoneToday
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div>
                      <h4 className={`text-xs sm:text-sm font-bold ${isDoneToday ? 'text-emerald-900 dark:text-emerald-200 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {habit.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isDoneToday ? 'Completed today! Streak increased.' : 'Pending completion today.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{habit.count || 0}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
