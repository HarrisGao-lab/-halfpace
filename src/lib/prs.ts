import { type RunEntry } from './runLog';

export type PRDistance = '5K' | '10K' | 'Half' | 'Full';

export interface PR {
  distance: PRDistance;
  durationMin: number;
  date: string;
  source: 'auto' | 'manual';
}

const KEY = 'personal_records_v1';

const BUCKETS: Record<PRDistance, { min: number; max: number }> = {
  '5K':   { min: 4.8,  max: 5.3  },
  '10K':  { min: 9.5,  max: 10.5 },
  'Half': { min: 20.5, max: 21.5 },
  'Full': { min: 41.5, max: 42.5 },
};

export function detectPRs(runs: RunEntry[]): Partial<Record<PRDistance, PR>> {
  const result: Partial<Record<PRDistance, PR>> = {};
  for (const [dist, range] of Object.entries(BUCKETS) as [PRDistance, { min: number; max: number }][]) {
    const matching = runs.filter(r => r.distanceKm >= range.min && r.distanceKm <= range.max);
    if (!matching.length) continue;
    const fastest = matching.reduce((best, r) =>
      r.durationMin / r.distanceKm < best.durationMin / best.distanceKm ? r : best
    );
    result[dist] = { distance: dist, durationMin: fastest.durationMin, date: fastest.date, source: 'auto' };
  }
  return result;
}

export function loadManualPRs(): Partial<Record<PRDistance, PR>> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function saveManualPR(pr: PR): void {
  const prs = loadManualPRs();
  prs[pr.distance] = { ...pr, source: 'manual' };
  localStorage.setItem(KEY, JSON.stringify(prs));
}

export function deleteManualPR(distance: PRDistance): void {
  const prs = loadManualPRs();
  delete prs[distance];
  localStorage.setItem(KEY, JSON.stringify(prs));
}

export function getMergedPRs(runs: RunEntry[]): Partial<Record<PRDistance, PR>> {
  const auto = detectPRs(runs);
  const manual = loadManualPRs();
  const merged = { ...auto };
  for (const [dist, pr] of Object.entries(manual) as [PRDistance, PR][]) {
    if (!merged[dist] || pr.durationMin < merged[dist]!.durationMin) {
      merged[dist] = pr;
    }
  }
  return merged;
}

export function formatDuration(durationMin: number): string {
  const h = Math.floor(durationMin / 60);
  const m = Math.floor(durationMin % 60);
  const s = Math.round((durationMin % 1) * 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}
