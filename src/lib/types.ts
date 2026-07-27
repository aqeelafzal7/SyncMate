export type ThemeMode = 'light' | 'dark' | 'system';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'rolled_over';
export type SubscriptionTier = 'free' | 'spark' | 'premium' | 'extra_premium';

export interface DeviceInfo {
  os: string;
  browser: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  areaLabel?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  gender?: 'male' | 'female' | 'other' | string;
  occupation?: string;
  goals?: string;
  religion?: 'Muslim' | 'Christian' | 'Jewish' | 'Hindu' | 'Buddhist' | 'None' | 'Other' | string;
  dob?: string; // YYYY-MM-DD
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  height?: string;
  weight?: string;
  location?: UserLocation | null;
  onboarded?: boolean;
  activeMood?: string;
  realtimeMood?: string;
  createdAt: string;
  updatedAt?: string;

  // Subscription & Tier extensions
  tier?: SubscriptionTier;
  dailyCredits?: number;
  lastResetDate?: string;
  chatMessageCount?: number;
  byokUnlocked?: boolean;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  whatsappNumber?: string;
  deviceInfo?: DeviceInfo;
  lastBirthdayBonusYear?: number;
  referralCount?: number;
  referredBy?: string;
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userGmail: string;
  planRequested: 'spark' | 'premium' | 'extra_premium';
  customRequirements?: string;
  whatsappNumber: string;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  createdAt: string;
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

export type ActiveTab = 'dashboard' | 'daily_strategy' | 'today_wear' | 'my_look' | 'projects' | 'habits' | 'prayer_hadith' | 'settings' | 'buy_subscription' | 'admin_queue' | 'admin_users' | 'admin_requests' | 'admin_vouchers';

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
  title: string;
  vibe: string;
  itemIds: string[];
  styleNotes: string;
}

export interface StyleLog {
  id: string;
  userId: string;
  date: string;
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
  startTime: string;
  endTime: string;
  category: 'work' | 'study' | 'personal' | 'prayer_anchor' | 'health' | 'meeting';
  status: TaskStatus;
  isFixedAnchor?: boolean;
  aiTip?: string;
  projectId?: string;
  date?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  goals: string[];
  status: 'active' | 'completed' | 'on_hold' | 'paused';
  pacingStrategy?: 'balanced' | 'steady' | 'intensive';
  platform?: string;
  timeCommitment?: string;
  totalDuration?: string;
  createdAt: string;
}

export interface HabitStreak {
  name: string;
  count: number;
  lastCompletedDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  actionData?: {
    action: 'CREATE_TASK' | 'CREATE_PROJECT' | 'UPDATE_PROFILE' | 'CREATE_FITNESS_PLAN';
    data: any;
  };
}
