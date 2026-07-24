export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  occupation: string;
  goals: string;
  religion: 'Muslim' | 'Christian' | 'Jewish' | 'Hindu' | 'Buddhist' | 'None' | 'Other';
  location?: UserLocation;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  dateGregorian?: string;
  dateHijri?: string;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm 24-hr format e.g. "14:00"
  endTime: string;   // HH:mm 24-hr format e.g. "15:00"
  category: 'work' | 'study' | 'personal' | 'prayer_anchor' | 'health' | 'meeting';
  status: TaskStatus;
  isFixedAnchor?: boolean;
  aiTip?: string;
  projectId?: string;
  date?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  goals: string[];
  status: 'active' | 'completed' | 'on_hold';
  pacingStrategy?: 'balanced' | 'steady' | 'intensive';
  createdAt: string;
}

export interface HabitStreak {
  name: string;
  count: number;
  lastCompletedDate: string; // YYYY-MM-DD
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionData?: {
    action: 'CREATE_TASK' | 'CREATE_PROJECT' | 'UPDATE_PROFILE' | 'CREATE_FITNESS_PLAN';
    data: any;
  };
}
