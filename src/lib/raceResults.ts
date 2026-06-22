export type ResultDistance = '5K' | '10K' | 'Half' | 'Full' | 'Other';

export interface RaceResult {
  id: string;
  name: string;
  date: string;
  distance: ResultDistance;
  durationMin: number;
  placement: string;
  notes: string;
}

const KEY = 'race_results_v1';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export function loadResults(): RaceResult[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveResult(r: Omit<RaceResult, 'id'>): RaceResult {
  const result: RaceResult = { ...r, id: uid() };
  const all = loadResults();
  all.unshift(result);
  localStorage.setItem(KEY, JSON.stringify(all));
  return result;
}

export function updateResult(updated: RaceResult): void {
  localStorage.setItem(KEY, JSON.stringify(loadResults().map(r => r.id === updated.id ? updated : r)));
}

export function deleteResult(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadResults().filter(r => r.id !== id)));
}

export function formatResultTime(durationMin: number): string {
  const h = Math.floor(durationMin / 60);
  const m = Math.floor(durationMin % 60);
  const s = Math.round((durationMin % 1) * 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

export const DISTANCE_KM: Record<ResultDistance, number> = {
  '5K': 5, '10K': 10, 'Half': 21.0975, 'Full': 42.195, 'Other': 0,
};
