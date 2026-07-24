import { HabitStreak } from '../types';

const HABIT_STREAKS_KEY = 'syncmate_habit_streaks';

/**
 * Get all habit streaks from localStorage
 */
export function getHabitStreaks(): Record<string, HabitStreak> {
  try {
    const saved = localStorage.getItem(HABIT_STREAKS_KEY);
    return saved ? JSON.parse(saved) : {
      'Hydration Reset': { name: 'Hydration Reset', count: 3, lastCompletedDate: getYesterdayDateStr() },
      '20-20-20 Eye Relief': { name: '20-20-20 Eye Relief', count: 2, lastCompletedDate: getYesterdayDateStr() },
      'Spine & Posture Stretch': { name: 'Spine & Posture Stretch', count: 4, lastCompletedDate: getYesterdayDateStr() },
      'Deep Mindful Breathing': { name: 'Deep Mindful Breathing', count: 1, lastCompletedDate: getYesterdayDateStr() },
      'Plank Exercise': { name: 'Plank Exercise', count: 5, lastCompletedDate: getYesterdayDateStr() },
    };
  } catch {
    return {};
  }
}

export function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getYesterdayDateStr(): string {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Increment streak for a habit upon completion
 */
export function incrementHabitStreak(habitName: string): { name: string; count: number; isExtendedToday: boolean } {
  const streaks = getHabitStreaks();
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  const existing = streaks[habitName] || { name: habitName, count: 0, lastCompletedDate: '' };

  let newCount = existing.count;
  let isExtendedToday = false;

  if (existing.lastCompletedDate === today) {
    // Already extended today
    isExtendedToday = false;
  } else if (existing.lastCompletedDate === yesterday) {
    // Consecutive day completion
    newCount = existing.count + 1;
    isExtendedToday = true;
  } else {
    // Streak broke or brand new, start/reset at 1
    newCount = 1;
    isExtendedToday = true;
  }

  streaks[habitName] = {
    name: habitName,
    count: newCount,
    lastCompletedDate: today,
  };

  try {
    localStorage.setItem(HABIT_STREAKS_KEY, JSON.stringify(streaks));
  } catch (err) {
    console.warn('Failed to save habit streak:', err);
  }

  return { name: habitName, count: newCount, isExtendedToday };
}

/**
 * Detect all streaks that are in danger of breaking today.
 * Danger condition:
 * - Active streak count > 0
 * - Not completed today (lastCompletedDate !== today)
 * - Current local time is 6:00 PM (18:00) or later
 */
export function getDangerousHabitStreaks(): HabitStreak[] {
  const streaks = getHabitStreaks();
  const today = getTodayDateStr();
  const currentHour = new Date().getHours();

  // If before 6 PM (18:00), no imminent warning yet unless specified
  if (currentHour < 18) {
    return [];
  }

  return Object.values(streaks).filter((s) => {
    return s.count > 0 && s.lastCompletedDate !== today;
  });
}
