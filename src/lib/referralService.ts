import { db, getUserProfile } from './firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from './types';

const REFERRAL_SESSION_KEY = 'syncmate_referrer_uid';
const REFERRAL_PROCESSED_KEY = 'syncmate_referral_processed_for_user';

/**
 * Detects ?ref=REFERRER_UID in the URL upon landing and stores it in sessionStorage.
 */
export function captureReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('referrer') || params.get('refCode');

    if (refCode && refCode.trim().length > 0) {
      const cleanRef = refCode.trim();
      sessionStorage.setItem(REFERRAL_SESSION_KEY, cleanRef);
      console.log(`[ReferralService] Captured referrer code: ${cleanRef}`);
      return cleanRef;
    }
  } catch (err) {
    console.warn('Failed to capture referral code:', err);
  }

  return sessionStorage.getItem(REFERRAL_SESSION_KEY);
}

/**
 * Returns stored referrer UID if present.
 */
export function getReferrerUid(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REFERRAL_SESSION_KEY);
}

/**
 * Process referral reward upon account creation / sign in.
 * Grants +10 Daily Credits to both the new user and the referrer.
 */
export async function processReferralReward(currentUserId: string): Promise<boolean> {
  if (!currentUserId) return false;

  const referrerUid = getReferrerUid();
  if (!referrerUid || referrerUid === currentUserId) {
    return false;
  }

  const processedKey = `${REFERRAL_PROCESSED_KEY}_${currentUserId}`;
  if (localStorage.getItem(processedKey)) {
    return false;
  }

  try {
    // 1. Reward the referrer (+10 credits, +1 referralCount)
    const referrerProfile = await getUserProfile(referrerUid);
    if (referrerProfile) {
      const newReferrerCredits = (referrerProfile.dailyCredits ?? 6) + 10;
      const newReferrerCount = (referrerProfile.referralCount || 0) + 1;

      const referrerDocRef = doc(db, 'users', referrerUid);
      await updateDoc(referrerDocRef, {
        dailyCredits: newReferrerCredits,
        referralCount: newReferrerCount,
        updatedAt: new Date().toISOString()
      });

      // Update referrer local cache if same browser session
      const cachedReferrerStr = localStorage.getItem(`syncmate_user_${referrerUid}`);
      if (cachedReferrerStr) {
        try {
          const parsed = JSON.parse(cachedReferrerStr);
          parsed.dailyCredits = newReferrerCredits;
          parsed.referralCount = newReferrerCount;
          localStorage.setItem(`syncmate_user_${referrerUid}`, JSON.stringify(parsed));
        } catch {
          // pass
        }
      }
    }

    // 2. Reward the current (referred) new user (+10 credits)
    const currentUserProfile = await getUserProfile(currentUserId);
    const currentCredits = currentUserProfile?.dailyCredits ?? 6;
    const newCurrentCredits = currentCredits + 10;

    const userDocRef = doc(db, 'users', currentUserId);
    await updateDoc(userDocRef, {
      dailyCredits: newCurrentCredits,
      referredBy: referrerUid,
      updatedAt: new Date().toISOString()
    });

    const updatedUserObj = {
      ...(currentUserProfile || {}),
      dailyCredits: newCurrentCredits,
      referredBy: referrerUid
    };

    localStorage.setItem(`syncmate_user_${currentUserId}`, JSON.stringify(updatedUserObj));
    localStorage.setItem(processedKey, 'true');
    sessionStorage.removeItem(REFERRAL_SESSION_KEY);

    // Notify user via toast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('syncmate_toast', {
          detail: {
            message: '🎁 Welcome referral bonus applied! +10 Daily Credits added to your account.',
            type: 'success'
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('syncmate_profile_updated', { detail: updatedUserObj })
      );
    }

    console.log(`[ReferralService] Successfully processed referral bonus between ${referrerUid} and ${currentUserId}`);
    return true;
  } catch (err) {
    console.warn('[ReferralService] Error processing referral reward, applying local fallback:', err);
    
    // Local fallback
    try {
      const localProfileStr = localStorage.getItem('syncmate_user_profile');
      if (localProfileStr) {
        const parsed = JSON.parse(localProfileStr);
        parsed.dailyCredits = (parsed.dailyCredits ?? 6) + 10;
        parsed.referredBy = referrerUid;
        localStorage.setItem('syncmate_user_profile', JSON.stringify(parsed));
        localStorage.setItem(processedKey, 'true');
        sessionStorage.removeItem(REFERRAL_SESSION_KEY);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('syncmate_toast', {
              detail: {
                message: '🎁 Welcome referral bonus applied! +10 Daily Credits added.',
                type: 'success'
              }
            })
          );
          window.dispatchEvent(
            new CustomEvent('syncmate_profile_updated', { detail: parsed })
          );
        }
        return true;
      }
    } catch {
      // pass
    }
  }

  return false;
}

/**
 * Returns unique referral link, total referrals, and earned credits for a user.
 */
export function getUserReferralStats(userProfile: UserProfile | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://syncmate.app';
  const uid = userProfile?.uid || userProfile?.email || 'guest';
  const referralLink = `${origin}/?ref=${encodeURIComponent(uid)}`;
  const totalReferrals = userProfile?.referralCount || 0;
  const earnedCredits = totalReferrals * 10;

  return {
    referralLink,
    totalReferrals,
    earnedCredits
  };
}
