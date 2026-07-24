import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Bell, Droplets, Eye, Activity, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { playCompletionChime } from '../lib/audioService';

interface ActiveTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle?: string;
  initialMinutes?: number;
}

export const ActiveTimerModal: React.FC<ActiveTimerModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  initialMinutes = 5,
}) => {
  const [totalMins, setTotalMins] = useState(initialMinutes);
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<'hydration' | 'eye' | 'stretch' | 'breathing' | 'custom'>('hydration');
  const [activeHabitLabel, setActiveHabitLabel] = useState<string>('Hydration Reset');

  // Custom Habit Inputs
  const [customHabitName, setCustomHabitName] = useState('');
  const [customHabitMins, setCustomHabitMins] = useState('');

  useEffect(() => {
    setTotalMins(initialMinutes);
    setSecondsLeft(initialMinutes * 60);
    setIsRunning(false);
    setIsFinished(false);
  }, [initialMinutes, isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsFinished(true);
      playCompletionChime();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SyncMate Micro-Habit Complete!', {
          body: `Great job completing your ${activeHabitLabel} session!`,
        });
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, activeHabitLabel]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((totalMins * 60 - secondsLeft) / (totalMins * 60)) * 100;

  const setTimerPreset = (mins: number, label?: string) => {
    setTotalMins(mins);
    setSecondsLeft(mins * 60);
    setIsRunning(false);
    setIsFinished(false);
    if (label) setActiveHabitLabel(label);
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
    setIsRunning(true);
  };

  const habits = [
    { id: 'hydration', label: 'Hydration Reset', time: '2 mins', icon: Droplets, desc: 'Drink 250ml of clean room-temperature water.', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' },
    { id: 'eye', label: '20-20-20 Eye Relief', time: '3 mins', icon: Eye, desc: 'Look 20 feet away for 20 seconds to ease digital eye fatigue.', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' },
    { id: 'stretch', label: 'Spine & Posture Stretch', time: '5 mins', icon: Activity, desc: 'Roll shoulders back, stretch wrists, and align posture.', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' },
    { id: 'breathing', label: 'Deep Mindful Breathing', time: '3 mins', icon: Heart, desc: 'Inhale for 4s, hold for 4s, exhale slowly for 6s.', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 to-purple-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>SyncMate Micro-Habit Injector</span>
          </div>
          <h2 className="text-xl font-bold">
            {taskTitle ? `Great work on "${taskTitle}"!` : 'Micro-Habit & Active Rest'}
          </h2>
          <p className="text-xs text-indigo-200 mt-1">
            Boost long-term energy with short, scientifically aligned focus recovery habits.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Habit Selector Grid */}
          <div className="grid grid-cols-2 gap-3">
            {habits.map((h) => {
              const Icon = h.icon;
              const isSelected = selectedHabit === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHabit(h.id as any);
                    if (h.id === 'hydration') setTimerPreset(2, 'Hydration Reset');
                    if (h.id === 'eye') setTimerPreset(3, '20-20-20 Eye Relief');
                    if (h.id === 'stretch') setTimerPreset(5, 'Spine & Posture Stretch');
                    if (h.id === 'breathing') setTimerPreset(3, 'Deep Mindful Breathing');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-xl border ${h.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                      {h.time}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {h.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {h.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom Focus/Habit Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Custom Focus/Habit</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={customHabitName}
                onChange={(e) => setCustomHabitName(e.target.value)}
                placeholder="Habit Name (e.g., Read biology notes)"
                className="sm:col-span-2 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="number"
                min="1"
                max="180"
                value={customHabitMins}
                onChange={(e) => setCustomHabitMins(e.target.value)}
                placeholder="Minutes"
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={handleStartCustomHabit}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>+ Start Custom Habit</span>
            </button>
          </div>

          {/* Countdown Clock Display */}
          <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
            
            {/* Progress Bar Top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {isFinished ? (
              <div className="py-4 space-y-2 animate-bounce">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Habit Completed!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You finished "{activeHabitLabel}". You are refreshed and ready for your next focus session.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 mb-2">
                  {activeHabitLabel}
                </div>
                <div>
                  <span className="text-5xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRunning ? 'Timer active — stay focused' : 'Ready to begin your session'}
                </p>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center justify-center space-x-2 mt-4">
              {[2, 3, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimerPreset(m)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-all"
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Timer Actions */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                onClick={() => {
                  setSecondsLeft(initialMinutes * 60);
                  setIsRunning(false);
                  setIsFinished(false);
                }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all"
                title="Reset Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center space-x-2 transition-all ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Timer</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
