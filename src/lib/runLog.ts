export interface RunEntry {
  id: string;
  date: string;          // "YYYY-MM-DD"
  startTime?: string;    // ISO 8601 — for Apple Health / Google Fit
  distanceKm: number;
  durationMin: number;
  notes: string;
  rpe: number;           // 1–10
  heartRateAvg?: number; // bpm — optional, for Health API
  caloriesKcal?: number; // kcal — optional, estimated or from device
  source?: 'manual' | 'strava';
  stravaId?: number;
}

const KEY = 'runs_v1';

function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadRuns(): RunEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('run_log') || '[]';
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveRun(entry: Omit<RunEntry, 'id'>): RunEntry {
  const runs = loadRuns();
  const newRun: RunEntry = { ...entry, id: id() };
  runs.unshift(newRun);
  localStorage.setItem(KEY, JSON.stringify(runs));
  return newRun;
}

export function deleteRun(runId: string): void {
  const runs = loadRuns().filter(r => r.id !== runId);
  localStorage.setItem(KEY, JSON.stringify(runs));
}

export function saveRunsDirect(runs: RunEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(runs));
}

export function paceStr(distanceKm: number, durationMin: number): string {
  if (!distanceKm || !durationMin) return '—';
  const secPerKm = (durationMin * 60) / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

export function durationStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Estimated calories (MET × weight × hours) — weight default 70kg, MET ~10 for running
export function estimateCalories(distanceKm: number, durationMin: number): number {
  const met = 9.8;
  const weightKg = 70;
  return Math.round(met * weightKg * (durationMin / 60));
}

// Group by week for chart
export function weeklyStats(runs: RunEntry[]): { week: string; km: number; runs: number }[] {
  const map: Record<string, { km: number; runs: number }> = {};
  runs.forEach(r => {
    const d = new Date(r.date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = monday.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    if (!map[key]) map[key] = { km: 0, runs: 0 };
    map[key].km += r.distanceKm;
    map[key].runs += 1;
  });
  return Object.entries(map)
    .map(([week, v]) => ({ week, km: Math.round(v.km * 10) / 10, runs: v.runs }))
    .slice(0, 8)
    .reverse();
}

// ── Health API export ────────────────────────────────────────────────────────

// Convert a run to Google Fit / Apple Health compatible workout session format.
// Each run maps to one WorkoutSession. Fields match:
//   Apple HealthKit  → HKWorkout (activityType=HKWorkoutActivityTypeRunning)
//   Google Fit       → sessions.insert body
export function toHealthSession(r: RunEntry) {
  const startISO = r.startTime ?? `${r.date}T07:00:00`;
  const startMs = new Date(startISO).getTime();
  const endMs = startMs + r.durationMin * 60 * 1000;
  return {
    id: r.id,
    activityType: 'running',           // HKWorkoutActivityTypeRunning / com.google.activity.segment
    startTimeMillis: startMs,          // Google Fit
    endTimeMillis: endMs,              // Google Fit
    startDate: new Date(startMs).toISOString(), // Apple Health
    endDate: new Date(endMs).toISOString(),     // Apple Health
    totalDistance: {
      value: r.distanceKm * 1000,      // metres
      unit: 'm',
    },
    totalEnergyBurned: {
      value: r.caloriesKcal ?? estimateCalories(r.distanceKm, r.durationMin),
      unit: 'kcal',
    },
    averageHeartRate: r.heartRateAvg ?? null,  // bpm, null if not recorded
    perceivedExertion: r.rpe,          // custom field
    notes: r.notes,
    source: 'HalfPace',
  };
}

// Full app export — all localStorage keys
export function exportAllData(): string {
  const keys = [
    'runs_v1', 'run_log',
    'races_v2', 'active_race_id',
    'personal_records_v1',
    'race_results_v1',
    'injuries_v1',
    'body_feel_v1',
    'completed_workouts',
    'notif_prefs_v1',
    'race_checklist',
  ];
  const data: Record<string, unknown> = {
    _version: 2,
    _exportedAt: new Date().toISOString(),
    _app: 'HalfPace',
  };
  keys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) {
      try { data[k] = JSON.parse(v); } catch { data[k] = v; }
    }
  });
  // Include health-compatible workout sessions
  data._healthSessions = loadRuns().map(toHealthSession);
  return JSON.stringify(data, null, 2);
}

// Restore from exported JSON — returns number of keys restored
export function importAllData(json: string): number {
  const data = JSON.parse(json);
  const restorableKeys = [
    'runs_v1', 'races_v2', 'active_race_id',
    'personal_records_v1', 'race_results_v1',
    'injuries_v1', 'body_feel_v1',
    'completed_workouts', 'notif_prefs_v1', 'race_checklist',
  ];
  let restored = 0;
  restorableKeys.forEach(k => {
    if (data[k] !== undefined) {
      localStorage.setItem(k, JSON.stringify(data[k]));
      restored++;
    }
  });
  return restored;
}
