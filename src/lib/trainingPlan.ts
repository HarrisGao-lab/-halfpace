// Periodized training plan engine
// Race config is loaded dynamically from raceConfig.ts

export type Phase = 'base' | 'build' | 'peak' | 'taper';
export type WorkoutType = 'easy' | 'tempo' | 'interval' | 'long' | 'rest' | 'cross';

export interface PaceZone {
  name: string;
  label: string;
  paceRange: string; // e.g. "6:30–7:00"
  color: string;
  description: string;
}

export interface Workout {
  day: number; // 0=Mon … 6=Sun
  type: WorkoutType;
  distanceKm: number;
  description: string;
  paceZone: string;
}

export interface TrainingWeek {
  week: number;
  phase: Phase;
  totalKm: number;
  workouts: Workout[];
  weeklyGoal: string;
}

// Target finish: 1:59:59 → 5:41/km race pace
export const PACE_ZONES: Record<string, PaceZone> = {
  easy: {
    name: 'easy',
    label: 'Easy Run',
    paceRange: '6:30–7:00/km',
    color: '#22c55e',
    description: 'Conversational pace. You can hold a full sentence.',
  },
  tempo: {
    name: 'tempo',
    label: 'Tempo',
    paceRange: '5:50–6:05/km',
    color: '#f97316',
    description: 'Comfortably hard. Can speak only short phrases.',
  },
  interval: {
    name: 'interval',
    label: 'Interval',
    paceRange: '5:05–5:20/km',
    color: '#ef4444',
    description: 'Hard effort. 400–800m repeats with recovery jogs.',
  },
  long: {
    name: 'long',
    label: 'Long Run',
    paceRange: '6:30–7:00/km',
    color: '#8b5cf6',
    description: 'Easy effort, building endurance.',
  },
  race: {
    name: 'race',
    label: 'Race Pace',
    paceRange: '5:38–5:44/km',
    color: '#FF6B35',
    description: 'Your goal half marathon pace.',
  },
  rest: {
    name: 'rest',
    label: 'Rest',
    paceRange: '—',
    color: '#94a3b8',
    description: 'Full rest or light stretching.',
  },
  cross: {
    name: 'cross',
    label: 'Cross Training',
    paceRange: '—',
    color: '#06b6d4',
    description: 'Cycling, swimming, yoga — low impact.',
  },
};

const RACE_DATE = new Date('2026-11-08');
const PLAN_START = new Date(RACE_DATE);
PLAN_START.setDate(PLAN_START.getDate() - 19 * 7); // 20 weeks before race

export function getPlanStartDate(): Date {
  return new Date(PLAN_START);
}

export function getWeekStartDate(week: number): Date {
  const d = new Date(PLAN_START);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

export function getWorkoutDate(week: number, dayOffset: number): Date {
  const d = getWeekStartDate(week);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

function w(
  day: number,
  type: WorkoutType,
  km: number,
  desc: string,
  zone: string
): Workout {
  return { day, type, distanceKm: km, description: desc, paceZone: zone };
}

export const TRAINING_PLAN: TrainingWeek[] = [
  // ─── BASE PHASE: weeks 1–6 ─────────────────────────────────────────────────
  {
    week: 1, phase: 'base', totalKm: 20,
    weeklyGoal: 'Establish routine. All runs easy. Listen to your body.',
    workouts: [
      w(0, 'easy', 5, 'Easy run — settle in, slow pace', 'easy'),
      w(1, 'rest', 0, 'Rest / light stretching', 'rest'),
      w(2, 'easy', 5, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training 30–45 min', 'cross'),
      w(4, 'easy', 4, 'Easy run', 'easy'),
      w(5, 'long', 6, 'Long run — easy effort', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 2, phase: 'base', totalKm: 22,
    weeklyGoal: 'Add 2km. Keep all runs conversational.',
    workouts: [
      w(0, 'easy', 5, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 6, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training 30–45 min', 'cross'),
      w(4, 'easy', 4, 'Easy run', 'easy'),
      w(5, 'long', 7, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 3, phase: 'base', totalKm: 24,
    weeklyGoal: 'Building aerobic base. Focus on time on feet.',
    workouts: [
      w(0, 'easy', 6, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 6, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training 45 min', 'cross'),
      w(4, 'easy', 4, 'Easy run', 'easy'),
      w(5, 'long', 8, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 4, phase: 'base', totalKm: 21,
    weeklyGoal: '⚠️ Recovery week — drop ~10% mileage. Let adaptations set in.',
    workouts: [
      w(0, 'easy', 5, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 5, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 4, 'Easy run', 'easy'),
      w(5, 'long', 7, 'Long run — easy', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 5, phase: 'base', totalKm: 26,
    weeklyGoal: 'Introduce strides — 4×100m fast at end of easy runs.',
    workouts: [
      w(0, 'easy', 6, 'Easy run + 4 strides', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 7, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training 45 min', 'cross'),
      w(4, 'easy', 5, 'Easy run + 4 strides', 'easy'),
      w(5, 'long', 8, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 6, phase: 'base', totalKm: 28,
    weeklyGoal: 'Last base week — solid foundation before introducing quality work.',
    workouts: [
      w(0, 'easy', 6, 'Easy run + 4 strides', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 8, 'Easy run', 'easy'),
      w(3, 'cross', 0, 'Cross training 45 min', 'cross'),
      w(4, 'easy', 5, 'Easy run', 'easy'),
      w(5, 'long', 9, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },

  // ─── BUILD PHASE: weeks 7–13 ───────────────────────────────────────────────
  {
    week: 7, phase: 'build', totalKm: 30,
    weeklyGoal: 'First tempo run! Keep it controlled — not a race effort.',
    workouts: [
      w(0, 'easy', 6, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 7, '2km warm-up + 3km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 6, 'Easy run', 'easy'),
      w(5, 'long', 11, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 8, phase: 'build', totalKm: 33,
    weeklyGoal: 'Extend tempo. Getting comfortable with race-adjacent pace.',
    workouts: [
      w(0, 'easy', 7, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 8, '2km warm-up + 4km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Cross training 45 min', 'cross'),
      w(4, 'easy', 6, 'Easy run', 'easy'),
      w(5, 'long', 12, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 9, phase: 'build', totalKm: 28,
    weeklyGoal: '⚠️ Recovery week. Absorb the last 3 weeks of quality work.',
    workouts: [
      w(0, 'easy', 6, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 7, 'Easy run + strides', 'easy'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 5, 'Easy run', 'easy'),
      w(5, 'long', 10, 'Long run — easy effort', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 10, phase: 'build', totalKm: 35,
    weeklyGoal: 'First interval session! Focus on form, not speed.',
    workouts: [
      w(0, 'easy', 7, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'interval', 8, '2km warm-up + 5×800m (90s rest) + cool-down', 'interval'),
      w(3, 'cross', 0, 'Cross training 45 min', 'cross'),
      w(4, 'easy', 7, 'Easy run', 'easy'),
      w(5, 'long', 13, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 11, phase: 'build', totalKm: 37,
    weeklyGoal: 'Alternate tempo + intervals. Quality over quantity.',
    workouts: [
      w(0, 'easy', 7, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 9, '2km warm-up + 5km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 7, 'Easy run', 'easy'),
      w(5, 'long', 14, 'Long run', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 12, phase: 'build', totalKm: 39,
    weeklyGoal: 'Race pace miles in your long run — feel the goal.',
    workouts: [
      w(0, 'easy', 8, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'interval', 9, '2km warm-up + 6×800m (90s rest) + cool-down', 'interval'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 7, 'Easy run', 'easy'),
      w(5, 'long', 15, 'Long run — last 3km at race pace (5:41/km)', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 13, phase: 'build', totalKm: 32,
    weeklyGoal: '⚠️ Recovery week. Your body is adapting — protect it.',
    workouts: [
      w(0, 'easy', 7, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 8, 'Easy run + strides', 'easy'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 6, 'Easy run', 'easy'),
      w(5, 'long', 11, 'Long run — easy', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },

  // ─── PEAK PHASE: weeks 14–17 ───────────────────────────────────────────────
  {
    week: 14, phase: 'peak', totalKm: 42,
    weeklyGoal: 'Peak training block begins. Highest quality work.',
    workouts: [
      w(0, 'easy', 8, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 10, '2km warm-up + 6km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 8, 'Easy run', 'easy'),
      w(5, 'long', 16, 'Long run — last 5km at race pace', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 15, phase: 'peak', totalKm: 44,
    weeklyGoal: 'Confidence week — strongest long run. You are ready.',
    workouts: [
      w(0, 'easy', 8, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'interval', 10, '2km warm-up + 8×600m (75s rest) + cool-down', 'interval'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 8, 'Easy run', 'easy'),
      w(5, 'long', 18, '🏆 Peak long run — last 8km at race pace', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 16, phase: 'peak', totalKm: 40,
    weeklyGoal: 'Maintain quality, start to reduce volume slightly.',
    workouts: [
      w(0, 'easy', 8, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 9, '2km warm-up + 5km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 7, 'Easy run', 'easy'),
      w(5, 'long', 16, 'Long run — last 5km at race pace', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 17, phase: 'peak', totalKm: 34,
    weeklyGoal: '⚠️ Last recovery week before taper. Sleep, eat, rest.',
    workouts: [
      w(0, 'easy', 7, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 8, 'Easy run + strides', 'easy'),
      w(3, 'cross', 0, 'Cross training', 'cross'),
      w(4, 'easy', 6, 'Easy run', 'easy'),
      w(5, 'long', 13, 'Long run — easy', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },

  // ─── TAPER PHASE: weeks 18–20 ──────────────────────────────────────────────
  {
    week: 18, phase: 'taper', totalKm: 28,
    weeklyGoal: 'Taper begins — 30% volume cut. Feel fresh, not lazy.',
    workouts: [
      w(0, 'easy', 6, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'tempo', 7, '2km warm-up + 3km tempo + 2km cool-down', 'tempo'),
      w(3, 'cross', 0, 'Light cross training', 'cross'),
      w(4, 'easy', 5, 'Easy run + strides', 'easy'),
      w(5, 'long', 10, 'Long run — easy', 'long'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 19, phase: 'taper', totalKm: 20,
    weeklyGoal: 'Near-race week — trust your training. Short & sharp.',
    workouts: [
      w(0, 'easy', 5, 'Easy run', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'interval', 6, '2km warm-up + 4×400m (2 min rest) + cool-down', 'interval'),
      w(3, 'cross', 0, 'Light cross training', 'cross'),
      w(4, 'easy', 4, 'Easy run + 4 strides', 'easy'),
      w(5, 'easy', 5, 'Easy run — feel the legs turn over', 'easy'),
      w(6, 'rest', 0, 'Rest', 'rest'),
    ],
  },
  {
    week: 20, phase: 'taper', totalKm: 12,
    weeklyGoal: '🏁 Race week! Stay calm, stay rested. You\'ve done the work.',
    workouts: [
      w(0, 'easy', 4, 'Easy run — shake out the legs', 'easy'),
      w(1, 'rest', 0, 'Rest', 'rest'),
      w(2, 'easy', 3, '3km easy + 4 race-pace strides', 'easy'),
      w(3, 'rest', 0, 'Rest — hydrate, lay out gear', 'rest'),
      w(4, 'easy', 2, '2km very easy shakeout', 'easy'),
      w(5, 'rest', 0, 'Rest — early to bed!', 'rest'),
      w(6, 'rest', 0, '🏁 RACE DAY — Half Marathon!', 'rest'),
    ],
  },
];

export function getCurrentWeek(): number {
  const today = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const week = Math.floor((today.getTime() - PLAN_START.getTime()) / msPerWeek) + 1;
  return Math.max(1, Math.min(week, 20));
}

export function getDaysUntilRace(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(RACE_DATE);
  race.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getTodayWorkout(): Workout | null {
  const week = getCurrentWeek();
  if (week < 1 || week > 20) return null;
  const weekData = TRAINING_PLAN[week - 1];
  const today = new Date();
  const weekStart = getWeekStartDate(week);
  const dayOfWeek = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  return weekData.workouts.find(w => w.day === dayOfWeek) ?? null;
}

// Pace calculator helpers
export function secondsToMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculatePaces(targetFinishMinutes: number, distanceKm = 21.0975) {
  const racePaceSecPerKm = (targetFinishMinutes * 60) / distanceKm;
  return {
    race: secondsToMMSS(racePaceSecPerKm),
    easy: secondsToMMSS(racePaceSecPerKm * 1.2),
    tempo: secondsToMMSS(racePaceSecPerKm * 1.05),
    interval: secondsToMMSS(racePaceSecPerKm * 0.93),
    long: secondsToMMSS(racePaceSecPerKm * 1.2),
  };
}
