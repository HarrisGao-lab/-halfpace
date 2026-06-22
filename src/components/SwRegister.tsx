'use client';
import { useEffect } from 'react';
import { loadNotifPrefs, checkAndScheduleReminder } from '@/lib/notifications';

export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(() => {
      // Check reminders after SW is ready
      const prefs = loadNotifPrefs();
      const todayKey = new Date().toISOString().slice(0, 10);
      const runs = (() => {
        try { return JSON.parse(localStorage.getItem('runs_v1') || '[]'); } catch { return []; }
      })();
      const hasRunToday = runs.some((r: { date: string }) => r.date === todayKey);
      checkAndScheduleReminder(prefs, hasRunToday);
    }).catch(() => {/* SW registration failed silently */});
  }, []);

  return null;
}
