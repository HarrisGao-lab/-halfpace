import { TRAINING_PLAN, type TrainingWeek, type Workout } from './trainingPlan';

export type WeeklyKm = 'zero' | 'low' | 'medium' | 'high';
export type DaysPerWeek = 3 | 4 | 5;
export type Experience = 'beginner' | 'intermediate' | 'experienced';

export interface UserProfile {
  weeklyKm: WeeklyKm;       // current base mileage
  daysPerWeek: DaysPerWeek; // how many days available to train
  experience: Experience;    // running background
}

const KEY = 'user_profile_v1';

export const DEFAULT_PROFILE: UserProfile = {
  weeklyKm: 'medium',
  daysPerWeek: 4,
  experience: 'beginner',
};

export function saveProfile(p: UserProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function loadProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch { return DEFAULT_PROFILE; }
}

export function hasProfile(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(KEY);
}

// ── Volume multiplier ────────────────────────────────────────────────────────
// Scales every workout's km and week totalKm
const VOLUME_SCALE: Record<WeeklyKm, number> = {
  zero:   0.65,  // ~13 km week 1  — pure beginner
  low:    0.82,  // ~16 km week 1  — occasional runner
  medium: 1.00,  // 20 km week 1   — standard plan
  high:   1.20,  // 24 km week 1   — already running consistently
};

// ── Days-per-week adjustments ────────────────────────────────────────────────
// Which workout days to convert to rest for 3-day and 4-day plans
// Standard plan has runs on: 0(Mon) 2(Wed) 4(Fri) 5(Sat) — plus cross on Thu
// 3-day: keep long(5) + 2 easies(0,2), rest everything else
// 4-day: keep long(5) + 3 runs(0,2,4), rest cross
// 5-day: standard (all 5 active days)
function adjustDays(workouts: Workout[], days: DaysPerWeek): Workout[] {
  if (days === 5) return workouts;

  return workouts.map(w => {
    if (w.type === 'rest') return w;
    if (w.type === 'long') return w; // always keep long run

    // 3-day: only keep Mon(0) and Wed(2) easy runs
    if (days === 3 && w.type === 'cross') {
      return { ...w, type: 'rest' as const, distanceKm: 0, description: 'Rest', paceZone: 'rest' };
    }
    if (days === 3 && w.day === 4) {
      return { ...w, type: 'rest' as const, distanceKm: 0, description: 'Rest', paceZone: 'rest' };
    }

    // 4-day: convert cross to rest
    if (days === 4 && w.type === 'cross') {
      return { ...w, type: 'rest' as const, distanceKm: 0, description: 'Rest', paceZone: 'rest' };
    }

    return w;
  });
}

// ── Beginner pace description softening ─────────────────────────────────────
function softenForBeginner(workouts: Workout[], exp: Experience): Workout[] {
  if (exp !== 'beginner') return workouts;
  return workouts.map(w => {
    if (w.type === 'interval') {
      // Downgrade intervals to tempo for beginners
      return { ...w, type: 'tempo' as const, description: w.description + ' (modified: tempo effort for your level)', paceZone: 'tempo' };
    }
    return w;
  });
}

// ── Main adapter ─────────────────────────────────────────────────────────────
export function getAdaptedPlan(profile: UserProfile): TrainingWeek[] {
  const scale = VOLUME_SCALE[profile.weeklyKm];

  return TRAINING_PLAN.map(week => {
    const scaledWorkouts = week.workouts.map(w => ({
      ...w,
      distanceKm: w.distanceKm > 0 ? Math.round(w.distanceKm * scale * 10) / 10 : 0,
    }));

    const dayAdjusted = adjustDays(scaledWorkouts, profile.daysPerWeek);
    const expAdjusted = softenForBeginner(dayAdjusted, profile.experience);

    const totalKm = Math.round(expAdjusted.reduce((s, w) => s + w.distanceKm, 0) * 10) / 10;

    return { ...week, totalKm, workouts: expAdjusted };
  });
}

// Human-readable labels for UI
export const WEEKLY_KM_LABELS: Record<WeeklyKm, string> = {
  zero:   'Just starting out (0–10 km/week)',
  low:    'Occasional runner (10–20 km/week)',
  medium: 'Regular runner (20–30 km/week)',
  high:   'Experienced (30+ km/week)',
};

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner:     'First race ever',
  intermediate: 'Finished a 5K or 10K',
  experienced:  'Done a half or full marathon',
};
