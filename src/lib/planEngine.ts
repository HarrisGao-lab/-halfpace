/**
 * Plan Engine — generates a fully personalized training plan.
 *
 * Algorithm:
 * 1. Classify races as A / B / C based on proximity and order
 * 2. Calculate target peak weekly volume from race distance + experience
 * 3. Ramp from current fitness to peak using 10% Rule + recovery weeks
 * 4. Overlay A-race taper (3 weeks) and B-race mini-tapers (2 weeks)
 * 5. Assign daily workout types & distances from weekly volume
 */

import type { RaceConfig } from './raceConfig';
import type { UserProfile, WeeklyKm, Experience } from './userProfile';
import type { WorkoutType, Phase } from './trainingPlan';

// ── Output types ─────────────────────────────────────────────────────────────

export interface GeneratedWorkout {
  day: number;          // 0=Mon … 6=Sun
  type: WorkoutType;
  distanceKm: number;
  description: string;
  paceZone: string;
}

export interface GeneratedWeek {
  week: number;
  startDate: string;    // ISO "YYYY-MM-DD" of Monday
  phase: Phase | 'recovery';
  totalKm: number;
  workouts: GeneratedWorkout[];
  weeklyGoal: string;
  raceWeek: boolean;
  raceName?: string;
  raceTier?: RaceTier;
}

export type RaceTier = 'A' | 'B' | 'C';

export interface ClassifiedRace extends RaceConfig {
  tier: RaceTier;
  daysFromPrev: number;
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

// Peak weekly km targets — the highest volume week before taper
const PEAK_KM: Record<'half' | 'full', Record<Experience, number>> = {
  half: { beginner: 40, intermediate: 52, experienced: 62 },
  full: { beginner: 58, intermediate: 75, experienced: 90 },
};

// Current weekly km by profile bucket
const CURRENT_KM: Record<WeeklyKm, number> = {
  zero: 5, low: 14, medium: 24, high: 36,
};

// Max single easy-run distance by experience + phase (prevents "first run 6km" for beginners)
const MAX_EASY_RUN: Record<WeeklyKm, number> = {
  zero: 3.5, low: 6, medium: 10, high: 14,
};

// Max weekly ramp rate by experience
const RAMP_RATE: Record<Experience, number> = {
  beginner: 0.08, intermediate: 0.10, experienced: 0.12,
};

// Taper volume fractions (weeks before race, outermost first)
const A_TAPER_FRACTIONS = [0.80, 0.60, 0.40]; // 3-week A taper
const B_TAPER_FRACTIONS = [0.72, 0.52];         // 2-week B taper

// ── Step 1: classify races ────────────────────────────────────────────────────

export function classifyRaces(races: RaceConfig[], today: Date): ClassifiedRace[] {
  const upcoming = [...races]
    .filter(r => new Date(r.date) > today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return upcoming.map((race, i) => {
    const daysFromPrev = i === 0
      ? 0
      : Math.round(
          (new Date(race.date).getTime() - new Date(upcoming[i - 1].date).getTime())
          / (1000 * 60 * 60 * 24),
        );

    let tier: RaceTier;
    if (i === upcoming.length - 1) {
      tier = 'A'; // last race is always the A race
    } else if (daysFromPrev >= 84) {
      tier = 'A'; // 12+ weeks gap → its own full training block
    } else if (daysFromPrev >= 28) {
      tier = 'B'; // 4–11 weeks → tune-up with mini taper
    } else {
      tier = 'C'; // < 4 weeks → training race, no taper
    }

    return { ...race, tier, daysFromPrev };
  });
}

// ── Step 2: build weekly volume schedule ─────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

interface WeekSlot {
  startDate: Date;
  km: number;
  phase: Phase | 'recovery';
  raceWeek: boolean;
  raceName?: string;
  raceTier?: RaceTier;
}

function buildSchedule(
  profile: UserProfile,
  races: ClassifiedRace[],
  today: Date,
): WeekSlot[] {
  if (races.length === 0) return [];

  const aRace = [...races].reverse().find(r => r.tier === 'A')!;
  const aRaceDate = new Date(aRace.date);
  const planStart = getMondayOf(today);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.max(
    Math.ceil((aRaceDate.getTime() - planStart.getTime()) / msPerWeek),
    1,
  );

  const peakKm = PEAK_KM[aRace.distance][profile.experience];
  const startKm = Math.min(CURRENT_KM[profile.weeklyKm], peakKm * 0.85);
  const rampRate = RAMP_RATE[profile.experience];
  const aTaperWeeks = A_TAPER_FRACTIONS.length;
  const buildWeeks = totalWeeks - aTaperWeeks;

  // Build volume array for build phase
  const rawVolumes: number[] = [];
  let current = startKm;
  for (let w = 0; w < buildWeeks; w++) {
    if (w > 0 && w % 4 === 3) {
      // Recovery week: pull back 20%
      rawVolumes.push(Math.round(current * 0.80));
    } else {
      const next = Math.min(current * (1 + rampRate), peakKm);
      rawVolumes.push(Math.round(next * 10) / 10);
      if (w % 4 !== 3) current = next; // don't update after recovery
    }
  }

  // Taper weeks
  const peakActual = Math.max(...rawVolumes, startKm);
  for (const frac of A_TAPER_FRACTIONS) {
    rawVolumes.push(Math.round(peakActual * frac * 10) / 10);
  }

  // Convert to WeekSlot[]
  const slots: WeekSlot[] = rawVolumes.map((km, i) => {
    const startDate = addWeeks(planStart, i);
    const progressFraction = buildWeeks > 1 ? i / (buildWeeks - 1) : 1;
    const isRecoveryWeek = i > 0 && i % 4 === 3 && i < buildWeeks;
    const isTaper = i >= buildWeeks;

    let phase: Phase | 'recovery';
    if (isTaper) phase = 'taper';
    else if (isRecoveryWeek) phase = 'recovery';
    else if (progressFraction < 0.30) phase = 'base';
    else if (progressFraction < 0.65) phase = 'build';
    else phase = 'peak';

    return { startDate, km, phase, raceWeek: false };
  });

  // Mark race weeks and apply B-race tapers
  races.forEach(race => {
    const raceDate = new Date(race.date);
    const raceMonday = getMondayOf(raceDate);

    // Mark race week
    const slot = slots.find(s => s.startDate.toDateString() === raceMonday.toDateString());
    if (slot) {
      slot.raceWeek = true;
      slot.raceName = race.name;
      slot.raceTier = race.tier;
    }

    // Apply B-race taper to the 2 weeks before B race
    if (race.tier === 'B') {
      B_TAPER_FRACTIONS.forEach((frac, idx) => {
        const weeksBefore = B_TAPER_FRACTIONS.length - idx;
        const taperMonday = addWeeks(raceMonday, -weeksBefore);
        const taperSlot = slots.find(s => s.startDate.toDateString() === taperMonday.toDateString());
        if (taperSlot) {
          taperSlot.km = Math.round(taperSlot.km * frac * 10) / 10;
          taperSlot.phase = 'taper';
        }
      });
    }
  });

  return slots;
}

// ── Step 3: workout assignment ─────────────────────────────────────────────

// Long run = 30–40% of weekly km, capped by race distance
function calcLongRun(weekKm: number, phase: Phase | 'recovery', raceDistance: 'half' | 'full', weeklyKm: WeeklyKm): number {
  const max = raceDistance === 'half' ? 22 : 36;
  // Zero-base runners: long run capped at 4km in base phase, grows slowly
  const zeroMax = phase === 'base' ? 4 : phase === 'build' ? 8 : 14;
  const frac = phase === 'peak' ? 0.38 : phase === 'build' ? 0.34 : 0.30;
  const raw = Math.round(weekKm * frac * 10) / 10;
  return Math.min(raw, weeklyKm === 'zero' ? zeroMax : max);
}

// Running days per week setting → which days of the week are active
function getRunDays(daysPerWeek: 3 | 4 | 5): number[] {
  // Long run always Sat (5), never run consecutive Sun+Mon at same intensity
  if (daysPerWeek === 3) return [0, 2, 5];      // Mon Wed Sat
  if (daysPerWeek === 4) return [0, 2, 4, 5];   // Mon Wed Fri Sat
  return [0, 1, 3, 4, 5];                        // Mon Tue Thu Fri Sat
}

// Workout descriptions pool
const DESCS: Record<WorkoutType, string[]> = {
  easy: [
    'Easy run — go slow enough to hold a conversation',
    'Short easy run — no pressure, any pace is fine',
    'Easy jog — if you need to walk, walk. That\'s okay.',
  ],
  tempo: [
    '10 min easy warm-up + 20 min tempo + 10 min cool-down',
    'Tempo run — comfortably hard, can only speak short phrases',
    '5 min easy + 3 × 8 min tempo (2 min jog recovery) + 5 min easy',
  ],
  interval: [
    '2 km easy warm-up + 5 × 800 m @ interval pace (90 s jog recovery) + 1 km cool-down',
    '2 km easy + 8 × 400 m hard (60 s walk recovery) + 1 km cool-down',
    '2 km easy + 3 × 1600 m @ interval pace (2 min recovery) + 1 km cool-down',
  ],
  long: [
    'Long run — easy effort the entire way, no racing',
    'Long run — first 60% easy, last 40% moderate',
    'Long slow distance — time on feet, stay conversational',
  ],
  rest: ['Rest / light stretching or yoga', 'Rest — full recovery', 'Active recovery: 20 min walk or foam rolling'],
  cross: ['Cross-training 30–45 min — cycling, swimming, or yoga', 'Low-impact cardio 30 min', 'Strength & mobility work'],
  race: ['Race Day 🏁 — warm up 15 min, race your plan, cool down 10 min'],
};

function desc(type: WorkoutType, seed: number): string {
  const pool = DESCS[type];
  return pool[seed % pool.length];
}

function assignWorkouts(
  weekKm: number,
  phase: Phase | 'recovery',
  profile: UserProfile,
  weekNum: number,
  aRaceDistance: 'half' | 'full',
  isRaceWeek: boolean,
  raceDayIndex?: number, // 0=Mon
): GeneratedWorkout[] {
  const runDays = getRunDays(profile.daysPerWeek);
  const longKm = calcLongRun(weekKm, phase, aRaceDistance, profile.weeklyKm);

  // Decide which days get quality work
  const canInterval = (phase === 'build' || phase === 'peak') && profile.experience !== 'beginner';
  const canTempo = phase !== 'base' || weekNum > 4;

  // Quality days = non-long-run days, pick middle ones
  const qualityPool = runDays.filter(d => d !== 5);
  let intervalDay: number | null = null;
  let tempoDay: number | null = null;

  if (canInterval && qualityPool.length >= 2) {
    intervalDay = qualityPool[1]; // second quality day
  }
  if (canTempo && qualityPool.length >= 1) {
    // Last quality day before long run that isn't interval day
    const remaining = qualityPool.filter(d => d !== intervalDay);
    tempoDay = remaining[remaining.length - 1] ?? null;
  }

  // Assign workouts day by day
  const out: GeneratedWorkout[] = [];
  let allocatedKm = 0;

  for (let day = 0; day < 7; day++) {
    if (!runDays.includes(day)) {
      out.push({ day, type: 'rest', distanceKm: 0, description: desc('rest', day + weekNum), paceZone: 'rest' });
      continue;
    }

    // Race day override
    if (isRaceWeek && day === (raceDayIndex ?? 6)) {
      const raceKm = aRaceDistance === 'half' ? 21.1 : 42.2;
      out.push({ day, type: 'race', distanceKm: raceKm, description: desc('race', 0), paceZone: 'race' });
      allocatedKm += raceKm;
      continue;
    }

    // Long run Saturday
    if (day === 5) {
      out.push({ day, type: 'long', distanceKm: longKm, description: desc('long', weekNum), paceZone: 'long' });
      allocatedKm += longKm;
      continue;
    }

    // Interval day
    if (day === intervalDay) {
      const km = Math.max(Math.round(weekKm * 0.14 * 10) / 10, 6);
      out.push({ day, type: 'interval', distanceKm: km, description: desc('interval', weekNum), paceZone: 'interval' });
      allocatedKm += km;
      continue;
    }

    // Tempo day
    if (day === tempoDay) {
      const km = Math.max(Math.round(weekKm * 0.17 * 10) / 10, 6);
      out.push({ day, type: 'tempo', distanceKm: km, description: desc('tempo', weekNum), paceZone: 'tempo' });
      allocatedKm += km;
      continue;
    }

    // Easy run — distribute remaining km evenly across remaining easy days, capped for beginners
    const easyDaysLeft = runDays.filter(d => d >= day && d !== 5 && d !== intervalDay && d !== tempoDay && !(isRaceWeek && d === (raceDayIndex ?? 6))).length;
    const remainingKm = Math.max(weekKm - allocatedKm - longKm, 0);
    const rawEasyKm = easyDaysLeft > 0
      ? Math.max(Math.round(remainingKm / easyDaysLeft * 10) / 10, profile.weeklyKm === 'zero' ? 1.5 : 3)
      : Math.max(Math.round(remainingKm * 10) / 10, profile.weeklyKm === 'zero' ? 1.5 : 3);
    const easyKm = Math.min(rawEasyKm, MAX_EASY_RUN[profile.weeklyKm]);

    out.push({ day, type: 'easy', distanceKm: easyKm, description: desc('easy', day + weekNum), paceZone: 'easy' });
    allocatedKm += easyKm;
  }

  return out;
}

// ── Step 4: weekly goal copy ───────────────────────────────────────────────

const GOAL_COPY: Record<Phase | 'recovery', string[]> = {
  base: [
    'Build the habit. Every run easy. Consistency over intensity.',
    'Base building — your aerobic engine is forming. Stay patient.',
    'Easy weeks now = fast weeks later. Run slow to race fast.',
  ],
  build: [
    'Quality work begins. Nail the hard days, protect the easy ones.',
    'Tempo and intervals start here. Hard days hard, easy days easy.',
    'You\'re building race-specific fitness. Trust the process.',
  ],
  peak: [
    'Peak training — your hardest weeks. Embrace the fatigue.',
    'Maximum volume. Every session counts. Sleep and eat well.',
    'You\'re earning the taper. Push through, the finish line is loading.',
  ],
  taper: [
    'Volume drops — keep the snap. Your fitness is locked in.',
    'Trust your training. Less running, more rest. You\'re ready.',
    'Final prep. Short snappy runs. Sleep. Hydrate. Believe.',
  ],
  recovery: [
    'Recovery week — absorb the training. Go easy, sleep extra.',
    'Pull back and let your body adapt. Active rest is still progress.',
  ],
};

function weeklyGoal(phase: Phase | 'recovery', raceWeek: boolean, weekNum: number): string {
  if (raceWeek) return 'Race week — stay loose, trust your training. You\'ve earned this. 🏁';
  const pool = GOAL_COPY[phase] ?? GOAL_COPY.base;
  return pool[weekNum % pool.length];
}

// ── Main export ────────────────────────────────────────────────────────────

const PLAN_CACHE_KEY = 'generated_plan_v1';
const PLAN_CACHE_META_KEY = 'generated_plan_meta_v1';

interface PlanMeta {
  generatedAt: string;
  profileHash: string;
  raceHash: string;
}

function hashObj(o: unknown): string {
  return JSON.stringify(o).split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
}

function loadCachedPlan(profile: UserProfile, races: RaceConfig[]): GeneratedWeek[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const meta: PlanMeta = JSON.parse(localStorage.getItem(PLAN_CACHE_META_KEY) || 'null');
    if (!meta) return null;
    // Invalidate if profile or races changed, or if it's a new day
    const today = new Date().toISOString().slice(0, 10);
    if (
      meta.profileHash !== hashObj(profile) ||
      meta.raceHash !== hashObj(races) ||
      meta.generatedAt < today
    ) return null;
    return JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || 'null');
  } catch { return null; }
}

function cachePlan(plan: GeneratedWeek[], profile: UserProfile, races: RaceConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(plan));
  const meta: PlanMeta = {
    generatedAt: new Date().toISOString().slice(0, 10),
    profileHash: hashObj(profile),
    raceHash: hashObj(races),
  };
  localStorage.setItem(PLAN_CACHE_META_KEY, JSON.stringify(meta));
}

export function generatePlan(
  profile: UserProfile,
  races: RaceConfig[],
  today: Date = new Date(),
): GeneratedWeek[] {
  // Return cached plan if inputs haven't changed
  const cached = loadCachedPlan(profile, races);
  if (cached) return cached;

  const classified = classifyRaces(races, today);
  if (classified.length === 0) return [];

  const aRace = [...classified].reverse().find(r => r.tier === 'A')!;
  const schedule = buildSchedule(profile, classified, today);

  const plan: GeneratedWeek[] = schedule.map((slot, i) => {
    // Find if a race falls in this week and which day
    const raceInWeek = classified.find(r => {
      const rd = getMondayOf(new Date(r.date));
      return rd.toDateString() === slot.startDate.toDateString();
    });

    const raceDayIndex = raceInWeek
      ? (() => {
          const d = new Date(raceInWeek.date).getDay();
          return d === 0 ? 6 : d - 1;
        })()
      : undefined;

    const workouts = assignWorkouts(
      slot.km,
      slot.phase,
      profile,
      i + 1,
      aRace.distance,
      slot.raceWeek,
      raceDayIndex,
    );

    // Recalculate real total from assigned workouts
    const realTotal = Math.round(workouts.reduce((s, w) => s + w.distanceKm, 0) * 10) / 10;

    return {
      week: i + 1,
      startDate: slot.startDate.toISOString().slice(0, 10),
      phase: slot.phase,
      totalKm: realTotal,
      workouts,
      weeklyGoal: weeklyGoal(slot.phase, slot.raceWeek, i + 1),
      raceWeek: slot.raceWeek,
      raceName: slot.raceName,
      raceTier: slot.raceTier,
    };
  });

  cachePlan(plan, profile, races);
  return plan;
}

// ── Page helpers ───────────────────────────────────────────────────────────

export function getCurrentWeekData(plan: GeneratedWeek[]): GeneratedWeek | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    plan.find(w => {
      const start = new Date(w.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return today >= start && today <= end;
    }) ?? plan[0] ?? null
  );
}

export function getTodayWorkoutFromPlan(plan: GeneratedWeek[]): GeneratedWorkout | null {
  const week = getCurrentWeekData(plan);
  if (!week) return null;
  const d = new Date().getDay();
  const dayIdx = d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
  return week.workouts.find(w => w.day === dayIdx) ?? null;
}

// Summary of race tiers for UI display
export function getRaceSummary(races: RaceConfig[], today: Date = new Date()): ClassifiedRace[] {
  return classifyRaces(races, today);
}
