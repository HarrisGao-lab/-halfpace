import { type RunEntry } from './runLog';
import { type PR, type PRDistance } from './prs';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  rarity: Rarity;
  check: (data: AchievementInput) => boolean;
}

export interface AchievementInput {
  runs: RunEntry[];
  prs: Partial<Record<PRDistance, PR>>;
  completedWorkouts: Record<string, boolean>;
  streakWeeks: number;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#8e8e93',
  rare:      '#32ade6',
  epic:      '#bf5af2',
  legendary: '#FF6B35',
};

export const ACHIEVEMENTS: Achievement[] = [
  // Mileage
  {
    id: 'first_run',
    title: 'First Step',
    description: 'Log your first run',
    icon: 'Footprints',
    rarity: 'common',
    check: ({ runs }) => runs.length >= 1,
  },
  {
    id: 'ten_runs',
    title: 'Getting Consistent',
    description: 'Log 10 runs',
    icon: 'Calendar',
    rarity: 'common',
    check: ({ runs }) => runs.length >= 10,
  },
  {
    id: 'fifty_runs',
    title: 'Dedicated Runner',
    description: 'Log 50 runs',
    icon: 'Activity',
    rarity: 'rare',
    check: ({ runs }) => runs.length >= 50,
  },
  {
    id: 'hundred_km',
    title: '100km Club',
    description: 'Run a total of 100 km',
    icon: 'Target',
    rarity: 'common',
    check: ({ runs }) => runs.reduce((s, r) => s + r.distanceKm, 0) >= 100,
  },
  {
    id: 'five_hundred_km',
    title: '500km Warrior',
    description: 'Run a total of 500 km',
    icon: 'Zap',
    rarity: 'rare',
    check: ({ runs }) => runs.reduce((s, r) => s + r.distanceKm, 0) >= 500,
  },
  {
    id: 'thousand_km',
    title: '1000km Legend',
    description: 'Run a total of 1000 km',
    icon: 'Globe',
    rarity: 'legendary',
    check: ({ runs }) => runs.reduce((s, r) => s + r.distanceKm, 0) >= 1000,
  },
  // Distance milestones
  {
    id: 'first_5k',
    title: 'First 5K',
    description: 'Log a run of at least 5 km',
    icon: 'MapPin',
    rarity: 'common',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 5),
  },
  {
    id: 'first_10k',
    title: 'First 10K',
    description: 'Log a run of at least 10 km',
    icon: 'TrendingUp',
    rarity: 'common',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 10),
  },
  {
    id: 'first_half',
    title: 'Half the Battle',
    description: 'Log a run of at least 21 km',
    icon: 'Medal',
    rarity: 'rare',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 21),
  },
  {
    id: 'first_full',
    title: 'Marathon Finisher',
    description: 'Log a run of at least 42 km',
    icon: 'Trophy',
    rarity: 'legendary',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 42),
  },
  // Speed
  {
    id: 'sub_30_5k',
    title: 'Sub-30 5K',
    description: 'Log a 5K in under 30 minutes',
    icon: 'Timer',
    rarity: 'common',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 4.8 && r.distanceKm <= 5.3 && r.durationMin < 30),
  },
  {
    id: 'sub_60_10k',
    title: 'Sub-60 10K',
    description: 'Log a 10K in under 60 minutes',
    icon: 'Rocket',
    rarity: 'rare',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 9.5 && r.distanceKm <= 10.5 && r.durationMin < 60),
  },
  {
    id: 'sub_2_half',
    title: 'Sub-2:00 Half',
    description: 'Log a half marathon under 2 hours',
    icon: 'Crosshair',
    rarity: 'epic',
    check: ({ runs }) => runs.some(r => r.distanceKm >= 20.5 && r.distanceKm <= 21.5 && r.durationMin < 120),
  },
  // PRs
  {
    id: 'first_pr',
    title: 'Personal Best',
    description: 'Set your first PR',
    icon: 'Award',
    rarity: 'common',
    check: ({ prs }) => Object.keys(prs).length >= 1,
  },
  {
    id: 'all_prs',
    title: 'PR Machine',
    description: 'Set PRs for all 4 distances',
    icon: 'Crown',
    rarity: 'epic',
    check: ({ prs }) => ['5K','10K','Half','Full'].every(d => prs[d as PRDistance]),
  },
  // Consistency
  {
    id: 'streak_4',
    title: '4-Week Streak',
    description: 'Train consistently for 4 weeks',
    icon: 'Flame',
    rarity: 'common',
    check: ({ streakWeeks }) => streakWeeks >= 4,
  },
  {
    id: 'streak_8',
    title: '8-Week Streak',
    description: 'Train consistently for 8 weeks',
    icon: 'Dumbbell',
    rarity: 'rare',
    check: ({ streakWeeks }) => streakWeeks >= 8,
  },
  {
    id: 'streak_20',
    title: 'Iron Commitment',
    description: 'Complete the full 20-week plan',
    icon: 'Shield',
    rarity: 'legendary',
    check: ({ streakWeeks }) => streakWeeks >= 20,
  },
  // Perfect weeks
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete all workouts in a week',
    icon: 'CheckCircle',
    rarity: 'rare',
    check: ({ completedWorkouts }) => {
      // Check if any week has all 4 run days done (days 0-6 for some week)
      for (let w = 1; w <= 20; w++) {
        const keys = [0,1,2,3,4,5,6].map(d => `${w}-${d}`);
        const doneCount = keys.filter(k => completedWorkouts[k]).length;
        if (doneCount >= 4) return true;
      }
      return false;
    },
  },
  // Early bird
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Log 5 runs before 7am (notes must include "am" or "morning")',
    icon: 'Sunrise',
    rarity: 'rare',
    check: ({ runs }) => runs.filter(r => r.notes?.toLowerCase().includes('morn') || r.notes?.toLowerCase().includes('early')).length >= 3,
  },
];

export function getUnlocked(input: AchievementInput): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(input));
}

export function getLocked(input: AchievementInput): Achievement[] {
  return ACHIEVEMENTS.filter(a => !a.check(input));
}
