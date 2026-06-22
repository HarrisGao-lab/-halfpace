export interface NotifPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const KEY = 'notif_prefs_v1';
const LAST_NOTIF_KEY = 'notif_last_shown';

export function loadNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return { enabled: false, hour: 7, minute: 0 };
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { enabled: false, hour: 7, minute: 0 };
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

async function showViaServiceWorker(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'run-reminder',
      data: { url: '/' },
    });
  } catch {
    // Fallback to basic Notification
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
}

// Call this on app load — fires notification if past reminder time and no run logged today
export function checkAndScheduleReminder(prefs: NotifPrefs, hasRunToday: boolean) {
  if (typeof window === 'undefined') return;
  if (!prefs.enabled || Notification.permission !== 'granted') return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const lastShown = localStorage.getItem(LAST_NOTIF_KEY);

  // Already showed today
  if (lastShown === todayKey) return;

  const reminderTime = new Date();
  reminderTime.setHours(prefs.hour, prefs.minute, 0, 0);

  const msUntilReminder = reminderTime.getTime() - now.getTime();

  if (msUntilReminder <= 0 && !hasRunToday) {
    // Past reminder time, no run yet → fire now
    localStorage.setItem(LAST_NOTIF_KEY, todayKey);
    showViaServiceWorker("Time to run! 🏃", "You have a workout scheduled today. Let's go!");
  } else if (msUntilReminder > 0 && msUntilReminder < 24 * 60 * 60 * 1000) {
    // Schedule for later today
    setTimeout(() => {
      const latestRuns = (() => {
        try { return JSON.parse(localStorage.getItem('runs_v1') || '[]'); } catch { return []; }
      })();
      const ranToday = latestRuns.some((r: { date: string }) => r.date === todayKey);
      if (!ranToday) {
        localStorage.setItem(LAST_NOTIF_KEY, todayKey);
        showViaServiceWorker("Time to run! 🏃", "You have a workout scheduled today. Let's go!");
      }
    }, msUntilReminder);
  }
}
