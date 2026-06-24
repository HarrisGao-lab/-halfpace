export type FeelScore = 1 | 2 | 3 | 4 | 5;

export interface BodyFeel {
  date: string; // YYYY-MM-DD
  score: FeelScore;
  note: string;
}

const KEY = 'body_feel_v1';

export const FEEL_META: Record<FeelScore, { label: string; icon: string; color: string }> = {
  1: { label: 'Terrible', icon: 'FrownOpen', color: '#ef4444' },
  2: { label: 'Tired',    icon: 'Frown',     color: '#f97316' },
  3: { label: 'Okay',     icon: 'Meh',       color: '#eab308' },
  4: { label: 'Good',     icon: 'Smile',     color: '#84cc16' },
  5: { label: 'Great',    icon: 'SmilePlus', color: '#22c55e' },
};

export function loadFeels(): BodyFeel[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveFeel(feel: BodyFeel): void {
  const feels = loadFeels().filter(f => f.date !== feel.date);
  feels.unshift(feel);
  localStorage.setItem(KEY, JSON.stringify(feels.slice(0, 60)));
}

export function getTodayFeel(): BodyFeel | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadFeels().find(f => f.date === today) ?? null;
}
