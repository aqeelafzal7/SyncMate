import { UserProfile, SubscriptionTier } from './types';

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
 * Combined helper to process both credit reset and subscription expiration checks in sequence.
 */
export function processUserSubscriptionLifecycle(user: UserProfile): UserProfile {
  const afterExpirationCheck = checkSubscriptionExpiration(user);
  return checkAndResetDailyCredits(afterExpirationCheck);
}
