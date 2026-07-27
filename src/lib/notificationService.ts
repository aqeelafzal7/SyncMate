import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { callGeminiWithFallback } from './geminiService';

/**
 * Initializes notification permissions on native platforms.
 */
export async function initNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    } catch (err) {
      console.warn('LocalNotifications.requestPermissions error:', err);
      return false;
    }
  }
  return requestNotificationPermissions();
}

/**
 * Requests local notification permissions on app startup if running natively or web
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        return result === 'granted';
      } catch (err) {
        console.warn('Web notification permission request error:', err);
      }
    }
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('Failed to request Capacitor LocalNotifications permissions:', err);
    return false;
  }
}

/**
 * Automatically schedule a push notification 5 minutes prior to the task time.
 * Supports flexible parameters: scheduleTaskReminder(taskId, title, scheduledTime) or scheduleTaskReminder(taskTitle, taskTime).
 */
export async function scheduleTaskReminder(
  arg1: string,
  arg2: string | Date,
  arg3?: Date
): Promise<void> {
  let taskTitle = arg1;
  let targetDate: Date;

  if (arg3 instanceof Date) {
    taskTitle = String(arg2);
    targetDate = arg3;
  } else {
    taskTitle = arg1;
    targetDate = new Date(arg2);
  }

  const triggerDate = new Date(targetDate.getTime() - 5 * 60 * 1000); // 5 minutes prior

  if (triggerDate.getTime() <= Date.now()) {
    console.log(`[NotificationService] Task reminder trigger time is in the past (${triggerDate.toISOString()}), skipping.`);
    return;
  }

  const id = Math.floor(Math.abs(Math.sin(taskTitle.length + triggerDate.getTime()) * 100000)) + 1;
  const title = `🎯 Task Reminder: ${taskTitle}`;
  const body = `Starting in 5 minutes! Get ready for ${taskTitle}.`;

  if (Capacitor.isNativePlatform()) {
    try {
      const permitted = await requestNotificationPermissions();
      if (!permitted) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: triggerDate },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: null
          }
        ]
      });
      console.log(`[Capacitor] Scheduled task reminder for "${taskTitle}" at ${triggerDate.toLocaleString()}`);
    } catch (err) {
      console.warn('Capacitor LocalNotifications task schedule error:', err);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const delay = triggerDate.getTime() - Date.now();
    setTimeout(() => {
      new Notification(title, { body, icon: '/icon.png' });
    }, delay);
  }
}

/**
 * Schedule a respectful notification 5 minutes before each Namaz / prayer
 */
export async function schedulePrayerReminder(prayerName: string, prayerTime: Date | string): Promise<void> {
  const dateObj = new Date(prayerTime);
  const triggerDate = new Date(dateObj.getTime() - 5 * 60000); // 5 minutes prior (5 * 60000 ms)

  if (triggerDate.getTime() <= Date.now()) {
    return;
  }

  const id = Math.floor(Math.abs(Math.cos(prayerName.length + triggerDate.getTime()) * 100000)) + 100000;
  const title = 'Prayer Time';
  const body = `It is almost time for ${prayerName} prayer.`;

  if (Capacitor.isNativePlatform()) {
    try {
      const permitted = await requestNotificationPermissions();
      if (!permitted) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: triggerDate },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: null
          }
        ]
      });
      console.log(`[Capacitor] Scheduled prayer reminder for "${prayerName}" at ${triggerDate.toLocaleString()}`);
    } catch (err) {
      console.warn('Capacitor LocalNotifications prayer schedule error:', err);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const delay = triggerDate.getTime() - Date.now();
    setTimeout(() => {
      new Notification(title, { body, icon: '/icon.png' });
    }, delay);
  }
}

/**
 * Call Gemini with strict output limits: Title (max 5 words), Body (max 10 words)
 */
export async function generateAiNudgeCopy(
  userProfile: any,
  nudgeType: 'habit' | 'water' | 'streak' | 'break' | 'focus'
): Promise<{ title: string; body: string }> {
  const userName = userProfile?.name || 'Friend';

  const defaultCopies: Record<string, { title: string; body: string }> = {
    habit: {
      title: '✨ Daily Habit Nudge',
      body: `Time for your focus routine, ${userName}! Stay consistent.`
    },
    water: {
      title: '💧 Hydration Time',
      body: 'Grab a quick glass of water to keep your energy high.'
    },
    streak: {
      title: '🔥 Keep the Streak Alive!',
      body: 'Log your daily habits to protect your progress.'
    },
    focus: {
      title: '🎯 Deep Focus Block',
      body: 'Lock in for a 25-minute productive deep work session.'
    },
    break: {
      title: '🌿 Mindful Break',
      body: 'Take 5 minutes to reset your mind and recharge.'
    }
  };

  const defaultCopy = defaultCopies[nudgeType] || defaultCopies.habit;

  const prompt = `Act as SyncMate's AI Micro-Copy Generator.
Generate a motivating push notification nudge for user: ${userName}.
Nudge Type: ${nudgeType}.

STRICT OUTPUT REQUIREMENTS:
- Output ONLY valid JSON: {"title": "Title here", "body": "Body text here"}
- "title" limit: maximum 5 words.
- "body" limit: maximum 10 words.
- Examples:
  Water: {"title": "💧 Hydration Time", "body": "Grab a quick glass of water to keep your energy high."}
  Streak: {"title": "🔥 Keep the Streak Alive!", "body": "Log your daily habits to protect your progress."}`;

  try {
    const rawResponse = await callGeminiWithFallback(prompt, { userProfile });
    if (rawResponse) {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.title && parsed.body) {
        return {
          title: String(parsed.title).trim(),
          body: String(parsed.body).trim()
        };
      }
    }
  } catch (err) {
    console.warn('AI Micro-copy generation error, using default copy:', err);
  }

  return defaultCopy;
}

/**
 * Triggers an immediate or scheduled AI-powered micro-copy nudge notification natively or on web
 */
export async function triggerAiNudge(
  nudgeType: 'water' | 'streak' | 'focus' | 'habit' | 'break',
  userProfile: any
): Promise<void> {
  const { title, body } = await generateAiNudgeCopy(userProfile, nudgeType);
  const id = Math.floor(Math.random() * 899999) + 100000;

  if (Capacitor.isNativePlatform()) {
    try {
      const permitted = await requestNotificationPermissions();
      if (!permitted) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'beep.wav'
          }
        ]
      });
      console.log(`[Capacitor] Triggered AI Nudge (${nudgeType}): "${title}" - "${body}"`);
    } catch (err) {
      console.warn('Capacitor LocalNotifications triggerAiNudge error:', err);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.png' });
  } else if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('syncmate_toast', {
        detail: { message: `${title} | ${body}`, type: 'info' }
      })
    );
  }
}

