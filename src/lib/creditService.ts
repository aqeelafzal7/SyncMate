import { auth, db, getUserProfile } from './firebase';
import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { getTierDefaultCredits } from './subscriptionService';

export type FeatureType = 'todo' | 'project' | 'my_look' | 'today_wear' | 'prayer_quran_hadith';

export function getFeatureCreditCost(feature: FeatureType): number {
  switch (feature) {
    case 'todo':
      return 1;
    case 'project':
      return 2;
    case 'my_look':
      return 2;
    case 'today_wear':
      return 1;
    case 'prayer_quran_hadith':
      return 0;
    default:
      return 1;
  }
}

export function triggerCreditToast(msg?: string) {
  const toastMsg = msg || '⚡ Insufficient Daily Credits! Upgrade to Spark or wait until Midnight (00:00) reset.';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('syncmate_toast', {
        detail: { message: toastMsg, type: 'warning' }
      })
    );
  }
}

/**
 * Logs credit consumption to system_analytics/${todayDate} in Firestore
 */
async function logCreditConsumption(cost: number) {
  if (cost <= 0) return;
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    await setDoc(
      doc(db, 'system_analytics', todayDate),
      {
        totalCreditsConsumed: increment(cost),
        lastUpdated: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to update system analytics for credit consumption:', err);
  }
}

/**
 * Deducts user credits in Firestore & localStorage cache.
 * Returns true if deduction was successful, false if credits are insufficient.
 */
export async function deductUserCredits(cost: number, userId?: string): Promise<boolean> {
  if (cost <= 0) return true;

  const uid = userId || auth.currentUser?.uid;

  // Fallback if user ID is missing
  if (!uid) {
    const localStr = localStorage.getItem('syncmate_user_profile');
    if (localStr) {
      try {
        const localProf = JSON.parse(localStr);
        const currentCredits = localProf.dailyCredits ?? 6;
        if (currentCredits < cost) {
          triggerCreditToast();
          return false;
        }
        localProf.dailyCredits = currentCredits - cost;
        localStorage.setItem('syncmate_user_profile', JSON.stringify(localProf));
        window.dispatchEvent(new CustomEvent('syncmate_profile_updated', { detail: localProf }));
        logCreditConsumption(cost);
        return true;
      } catch {
        // pass
      }
    }
    logCreditConsumption(cost);
    return true;
  }

  try {
    const profile = await getUserProfile(uid);
    const currentCredits = profile?.dailyCredits ?? 6;

    if (currentCredits < cost) {
      triggerCreditToast();
      return false;
    }

    const newCredits = currentCredits - cost;
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      dailyCredits: newCredits,
      updatedAt: new Date().toISOString()
    });

    const updatedProfile = { ...(profile || {}), dailyCredits: newCredits };
    localStorage.setItem(`syncmate_user_${uid}`, JSON.stringify(updatedProfile));
    window.dispatchEvent(new CustomEvent('syncmate_profile_updated', { detail: updatedProfile }));

    logCreditConsumption(cost);
    return true;
  } catch (err) {
    console.warn('deductUserCredits Firestore error, using local fallback:', err);
    const local = localStorage.getItem(`syncmate_user_${uid}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const currentCredits = parsed.dailyCredits ?? 6;
        if (currentCredits < cost) {
          triggerCreditToast();
          return false;
        }
        parsed.dailyCredits = currentCredits - cost;
        localStorage.setItem(`syncmate_user_${uid}`, JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('syncmate_profile_updated', { detail: parsed }));
        logCreditConsumption(cost);
        return true;
      } catch {
        // pass
      }
    }
    logCreditConsumption(cost);
    return true;
  }
}
