/**
 * Training Load Calculator
 * ATL = Acute Training Load (7-day avg) = fatigue
 * CTL = Chronic Training Load (42-day avg) = fitness
 * TSB = CTL - ATL = form/freshness
 *
 * TSS per run = RPE × duration_min (simplified; professional apps use HR zones)
 */
import { type RunEntry } from './runLog';

export interface DayLoad {
  date: string; // YYYY-MM-DD
  tss: number;
}

export interface LoadSnapshot {
  atl: number;   // acute (7-day EMA)
  ctl: number;   // chronic (42-day EMA)
  tsb: number;   // form = ctl - atl
  tssToday: number;
}

export interface LoadHistory {
  date: string;
  atl: number;
  ctl: number;
  tsb: number;
}

// ── TSS per run ─────────────────────────────────────────────────────────────

export function runTSS(run: RunEntry): number {
  // Simplified Training Stress Score: RPE × duration in minutes
  // Scales: easy 3×30min = 90, tempo 7×45min = 315, long run 4×90min = 360
  return run.rpe * run.durationMin;
}

// ── Build daily TSS map ──────────────────────────────────────────────────────

function dailyTSSMap(runs: RunEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of runs) {
    const tss = runTSS(r);
    map.set(r.date, (map.get(r.date) ?? 0) + tss);
  }
  return map;
}

// ── Exponential Moving Average ───────────────────────────────────────────────

function emaUpdate(prev: number, tss: number, days: number): number {
  const k = 2 / (days + 1);
  return tss * k + prev * (1 - k);
}

// ── Compute load series over date range ─────────────────────────────────────

export function computeLoadHistory(runs: RunEntry[], daysBack = 84): LoadHistory[] {
  const dailyMap = dailyTSSMap(runs);

  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 86400000);

  let atl = 0;
  let ctl = 0;
  const history: LoadHistory[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const tss = dailyMap.get(key) ?? 0;
    atl = emaUpdate(atl, tss, 7);
    ctl = emaUpdate(ctl, tss, 42);
    const tsb = ctl - atl;
    history.push({ date: key, atl: Math.round(atl), ctl: Math.round(ctl), tsb: Math.round(tsb) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return history;
}

// ── Current snapshot ─────────────────────────────────────────────────────────

export function getCurrentLoad(runs: RunEntry[]): LoadSnapshot {
  const history = computeLoadHistory(runs, 84);
  const today = new Date().toISOString().slice(0, 10);
  const latest = history[history.length - 1] ?? { atl: 0, ctl: 0, tsb: 0 };
  const dailyMap = dailyTSSMap(runs);
  return {
    atl: latest.atl,
    ctl: latest.ctl,
    tsb: latest.tsb,
    tssToday: dailyMap.get(today) ?? 0,
  };
}

// ── Human-readable form label ─────────────────────────────────────────────────

export function formLabel(tsb: number): { label: string; color: string; tip: string } {
  if (tsb > 25)  return { label: 'Very Fresh', color: '#32ade6', tip: 'Rested — ready to race or add load.' };
  if (tsb > 5)   return { label: 'Fresh',      color: '#30d158', tip: 'Good form. Ideal for quality workouts.' };
  if (tsb >= -10) return { label: 'Optimal',   color: '#FF6B35', tip: 'In the training zone — keep going.' };
  if (tsb >= -25) return { label: 'Fatigued',  color: '#ff9f0a', tip: 'Build fatigue is normal. Prioritize sleep.' };
  return           { label: 'Overreaching',    color: '#ef4444', tip: 'Back off — injury risk is elevated.' };
}

// ── Weekly TSS summary ────────────────────────────────────────────────────────

export function weeklyTSS(runs: RunEntry[]): { week: string; tss: number }[] {
  const map: Record<string, number> = {};
  for (const r of runs) {
    const d = new Date(r.date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    const key = mon.toISOString().slice(0, 10);
    map[key] = (map[key] ?? 0) + runTSS(r);
  }
  return Object.entries(map)
    .map(([week, tss]) => ({ week, tss: Math.round(tss) }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);
}
