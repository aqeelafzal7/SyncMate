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
  gender?: 'male' | 'female' | 'other' | string;
  occupation: string;
  goals: string;
  religion: 'Muslim' | 'Christian' | 'Jewish' | 'Hindu' | 'Buddhist' | 'None' | 'Other';
  dob?: string; // YYYY-MM-DD
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

export type ActiveTab = 'dashboard' | 'today_wear' | 'my_look' | 'projects' | 'habits' | 'settings';

export type WardrobeCategory = 'Tops' | 'Bottoms' | 'Traditional' | 'Footwear' | 'Watches' | 'Glasses' | 'Custom' | string;

export interface WardrobeItemTags {
  color?: string;
  formalityLevel?: 'Casual' | 'Smart Casual' | 'Formal' | 'Traditional' | 'Athletic';
  season?: 'All Season' | 'Summer' | 'Winter' | 'Spring/Autumn';
  recommendedCategory?: string;
  description?: string;
  targetGender?: 'male' | 'female' | 'unisex' | string;
}

export interface WardrobeItem {
  id: string;
  userId: string;
  name: string;
  category: WardrobeCategory;
  imageUrl: string;
  status: 'clean' | 'in_laundry';
  tags?: WardrobeItemTags;
  createdAt: string;
}

export interface StylistOutfitOption {
  id: string;
  title: string; // e.g. "Option A: Executive Sharp"
  vibe: string;  // e.g. "Best Fit for High Impact Meetings"
  itemIds: string[];
  styleNotes: string;
}

export interface StyleLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  outfitTitle: string;
  vibe: string;
  styleNotes: string;
  itemIds: string[];
  createdAt: string;
}

export interface MyLookReport {
  id: string;
  userId: string;
  imageUrl: string;
  faceShape: string;
  groomingFeedback: string;
  suggestedHaircut: string;
  suggestedBeard: string;
  fitnessPosture: string;
  overallScore: number;
  progressSummary?: string;
  createdAt: string;
}

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
