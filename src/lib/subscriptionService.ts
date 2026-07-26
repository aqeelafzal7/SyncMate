import { UserProfile, SubscriptionTier } from './types';
import { checkIsBirthday } from './birthdayUtils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Gets the default daily credits allocated for a specific tier.
 */
export function getTierDefaultCredits(tier?: SubscriptionTier, customValue?: number): number {
  switch (tier) {
    case 'spark':
      return 10;
    case 'premium':
      return 150;
    case 'extra_premium':
      return typeof customValue === 'number' && customValue > 0 ? customValue : 500;
    case 'free':
    default:
      return 6;
  }
}

/**
 * Checks if current date is past user's lastResetDate.
 * If so, resets dailyCredits based on tier and resets chatMessageCount to 0.
 */
export function checkAndResetDailyCredits(user: UserProfile): UserProfile {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastReset = user.lastResetDate ? user.lastResetDate.split('T')[0] : '';

  if (!lastReset || todayStr > lastReset) {
    const credits = getTierDefaultCredits(user.tier, user.dailyCredits);
    return {
      ...user,
      dailyCredits: credits,
      chatMessageCount: 0,
      lastResetDate: todayStr,
      updatedAt: new Date().toISOString()
    };
  }

  return user;
}

/**
 * Compares current timestamp with subscriptionEndDate.
 * If expired, demotes tier to 'free', locks BYOK access, resets credits to 6, and clears subscriptionEndDate.
 */
export function checkSubscriptionExpiration(user: UserProfile): UserProfile {
  if (!user.subscriptionEndDate) {
    return user;
  }

  const now = new Date();
  const endDate = new Date(user.subscriptionEndDate);

  if (now.getTime() > endDate.getTime()) {
    return {
      ...user,
      tier: 'free',
      byokUnlocked: false,
      dailyCredits: 6,
      subscriptionEndDate: null,
      updatedAt: new Date().toISOString()
    };
  }

  return user;
}

/**
 * Calculates activation date + X months, explicitly setting the target end time to 23:59:59 (Midnight) on the final day.
 */
export function calculateExpirationDate(months: number, startDate: Date = new Date()): string {
  const expDate = new Date(startDate);
  expDate.setMonth(expDate.getMonth() + months);
  expDate.setHours(23, 59, 59, 999);
  return expDate.toISOString();
}

/**
 * Checks if today is user's birthday and grants +10 Bonus Credits if not already granted this year.
 */
export function checkAndApplyBirthdayBonus(user: UserProfile): {
  updatedProfile: UserProfile;
  bonusApplied: boolean;
} {
  if (!user) return { updatedProfile: user, bonusApplied: false };

  const dobStr = user.dateOfBirth || user.dob;
  if (!dobStr) return { updatedProfile: user, bonusApplied: false };

  const isBday = checkIsBirthday(dobStr);
  if (!isBday) return { updatedProfile: user, bonusApplied: false };

  const currentYear = new Date().getFullYear();
  if (user.lastBirthdayBonusYear === currentYear) {
    return { updatedProfile: user, bonusApplied: false };
  }

  const newCredits = (user.dailyCredits ?? 6) + 10;
  const updatedProfile: UserProfile = {
    ...user,
    dailyCredits: newCredits,
    lastBirthdayBonusYear: currentYear,
    updatedAt: new Date().toISOString()
  };

  return { updatedProfile, bonusApplied: true };
}

/**
 * Async helper that applies birthday bonus and persists changes to Firestore & localStorage.
 */
export async function processBirthdayBonusAsync(user: UserProfile): Promise<{
  updatedProfile: UserProfile;
  bonusApplied: boolean;
}> {
  const result = checkAndApplyBirthdayBonus(user);
  if (result.bonusApplied) {
    if (user.uid) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          dailyCredits: result.updatedProfile.dailyCredits,
          lastBirthdayBonusYear: result.updatedProfile.lastBirthdayBonusYear,
          updatedAt: result.updatedProfile.updatedAt
        });
      } catch (err) {
        console.warn('Failed to sync birthday bonus to Firestore:', err);
      }
      const key = `syncmate_user_${user.uid}`;
      localStorage.setItem(key, JSON.stringify(result.updatedProfile));
    } else {
      localStorage.setItem('syncmate_user_profile', JSON.stringify(result.updatedProfile));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('syncmate_profile_updated', { detail: result.updatedProfile }));
    }
  }

  return result;
}

/**
 * Combined helper to process both credit reset and subscription expiration checks in sequence.
 */
export function processUserSubscriptionLifecycle(user: UserProfile): UserProfile {
  const afterExpirationCheck = checkSubscriptionExpiration(user);
  const afterCreditReset = checkAndResetDailyCredits(afterExpirationCheck);
  const birthdayResult = checkAndApplyBirthdayBonus(afterCreditReset);
  return birthdayResult.updatedProfile;
}
