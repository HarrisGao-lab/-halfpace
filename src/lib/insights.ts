/**
 * AI Coaching Insights Engine
 * Generates personalized coaching messages from run data + plan compliance.
 */
import { type RunEntry, paceStr } from './runLog';
import { type GeneratedWeek } from './planEngine';
import { getCurrentLoad, formLabel } from './trainingLoad';
import { predictRaceTimes } from './predictions';
import { getDaysUntilRace, type RaceConfig } from './raceConfig';

export interface Insight {
  id: string;
  category: 'form' | 'progression' | 'warning' | 'milestone' | 'race' | 'recovery';
  title: string;
  body: string;
  color: string;
  icon: string; // Lucide icon name
  priority: number; // 1 = highest
}

// ── Helper: runs in last N days ────────────────────────────────────────────

function recentRuns(runs: RunEntry[], days: number): RunEntry[] {
  const cutoff = Date.now() - days * 86400000;
  return runs.filter(r => new Date(r.date).getTime() > cutoff);
}

function avgPaceSecPerKm(runs: RunEntry[]): number {
  const validRuns = runs.filter(r => r.distanceKm > 0 && r.durationMin > 0);
  if (validRuns.length === 0) return 0;
  const total = validRuns.reduce((s, r) => s + (r.durationMin * 60) / r.distanceKm, 0);
  return total / validRuns.length;
}

function totalKm(runs: RunEntry[]): number {
  return runs.reduce((s, r) => s + r.distanceKm, 0);
}

function weekKm(runs: RunEntry[], weeksAgo: number): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1 - weeksAgo * 7); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return runs
    .filter(r => {
      const d = new Date(r.date);
      return d >= weekStart && d < weekEnd;
    })
    .reduce((s, r) => s + r.distanceKm, 0);
}

// ── Pace trend over last 4 weeks ───────────────────────────────────────────

function paceTrendPct(runs: RunEntry[]): number | null {
  const recent4 = recentRuns(runs, 28).filter(r => r.distanceKm >= 3);
  const older4 = runs
    .filter(r => {
      const d = new Date(r.date).getTime();
      const cutoff28 = Date.now() - 28 * 86400000;
      const cutoff56 = Date.now() - 56 * 86400000;
      return d > cutoff56 && d <= cutoff28 && r.distanceKm >= 3;
    });
  if (recent4.length < 2 || older4.length < 2) return null;
  const recentAvg = avgPaceSecPerKm(recent4);
  const olderAvg = avgPaceSecPerKm(older4);
  if (olderAvg === 0) return null;
  return ((olderAvg - recentAvg) / olderAvg) * 100; // positive = getting faster
}

// ── Main insights generator ────────────────────────────────────────────────

export function generateInsights(
  runs: RunEntry[],
  activeRace: RaceConfig | null,
  currentWeekPlan: GeneratedWeek | null,
): Insight[] {
  const insights: Insight[] = [];

  const daysUntil = activeRace ? getDaysUntilRace(activeRace) : null;
  const load = getCurrentLoad(runs);
  const form = formLabel(load.tsb);

  // ── 1. Training Form ──────────────────────────────────────────────────────
  if (runs.length >= 5) {
    insights.push({
      id: 'form',
      category: 'form',
      title: `Form: ${form.label}`,
      body: form.tip,
      color: form.color,
      icon: 'Activity',
      priority: 2,
    });
  }

  // ── 2. Overreaching warning ───────────────────────────────────────────────
  if (load.tsb < -30) {
    insights.push({
      id: 'overreach',
      category: 'warning',
      title: 'Recovery needed',
      body: 'Your training load is very high. Add an extra rest day this week to avoid injury.',
      color: '#ef4444',
      icon: 'AlertTriangle',
      priority: 1,
    });
  }

  // ── 3. Pace trend ─────────────────────────────────────────────────────────
  const pctImproved = paceTrendPct(runs);
  if (pctImproved !== null) {
    if (pctImproved > 2) {
      insights.push({
        id: 'pace_trend',
        category: 'progression',
        title: `${pctImproved.toFixed(1)}% faster this month`,
        body: `Your average pace improved vs the previous 4 weeks. Training is working.`,
        color: '#30d158',
        icon: 'TrendingUp',
        priority: 3,
      });
    } else if (pctImproved < -3) {
      insights.push({
        id: 'pace_slow',
        category: 'recovery',
        title: 'Pace slowing down',
        body: 'You\'re running slower than 4 weeks ago. This could be fatigue — consider a recovery week.',
        color: '#ff9f0a',
        icon: 'TrendingDown',
        priority: 2,
      });
    }
  }

  // ── 4. Weekly volume comparison ───────────────────────────────────────────
  const thisWeek = weekKm(runs, 0);
  const lastWeek = weekKm(runs, 1);
  if (currentWeekPlan && thisWeek > 0 && lastWeek > 0) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (pct > 15) {
      insights.push({
        id: 'volume_jump',
        category: 'warning',
        title: `Volume up ${pct}% from last week`,
        body: 'Jumping volume too fast increases injury risk. Aim for ≤10% increase per week.',
        color: '#ff9f0a',
        icon: 'TrendingUp',
        priority: 1,
      });
    }
  }

  // ── 5. This week vs plan ──────────────────────────────────────────────────
  if (currentWeekPlan && thisWeek > 0) {
    const planned = currentWeekPlan.totalKm;
    const pct = Math.round((thisWeek / planned) * 100);
    if (pct >= 90) {
      insights.push({
        id: 'on_plan',
        category: 'milestone',
        title: 'On target this week',
        body: `You've hit ${pct}% of your ${planned}km weekly goal. Finish strong.`,
        color: '#30d158',
        icon: 'CheckCircle',
        priority: 3,
      });
    } else if (pct < 50 && new Date().getDay() >= 4) { // Thursday or later
      const remaining = Math.round(planned - thisWeek);
      insights.push({
        id: 'behind_plan',
        category: 'warning',
        title: `${remaining}km still to run this week`,
        body: `You're at ${pct}% of your plan with the weekend ahead. An easy run tomorrow keeps you on track.`,
        color: '#ff9f0a',
        icon: 'AlertCircle',
        priority: 2,
      });
    }
  }

  // ── 6. Race countdown insights ─────────────────────────────────────────────
  if (daysUntil !== null && daysUntil > 0) {
    if (daysUntil <= 7) {
      insights.push({
        id: 'race_week',
        category: 'race',
        title: 'Race week — trust your training',
        body: 'Nothing you do this week will make you fitter. Focus on sleep, hydration, and staying calm.',
        color: '#FF6B35',
        icon: 'Flag',
        priority: 1,
      });
    } else if (daysUntil <= 21) {
      insights.push({
        id: 'taper_phase',
        category: 'race',
        title: `${daysUntil} days to race — taper phase`,
        body: 'Reduce volume but keep intensity. Your body is absorbing all the training you\'ve done.',
        color: '#bf5af2',
        icon: 'Zap',
        priority: 2,
      });
    } else if (daysUntil <= 42) {
      // Predict vs goal
      const preds = predictRaceTimes(runs);
      const raceDist = activeRace?.distance === 'full' ? 'Full' : 'Half';
      const pred = preds.find(p => p.distance === raceDist);
      if (pred && activeRace) {
        const goalMin = (activeRace.targetHours ?? 1) * 60 + (activeRace.targetMinutes ?? 59);
        const diff = goalMin - pred.predictedMin;
        if (diff > 5) {
          insights.push({
            id: 'ahead_of_goal',
            category: 'race',
            title: `On pace for ${pred.predictedFormatted}`,
            body: `Your current fitness suggests ${Math.floor(diff)}m ahead of your goal. Stay consistent.`,
            color: '#30d158',
            icon: 'Target',
            priority: 2,
          });
        } else if (diff < -5) {
          const gap = Math.abs(Math.floor(diff));
          insights.push({
            id: 'behind_goal',
            category: 'race',
            title: 'Adjust your goal time',
            body: `Projected ${pred.predictedFormatted} — about ${gap}m slower than goal. Consider refining your target.`,
            color: '#ff9f0a',
            icon: 'Target',
            priority: 2,
          });
        }
      }
    }
  }

  // ── 7. Consistency streak ─────────────────────────────────────────────────
  const last14 = recentRuns(runs, 14);
  if (last14.length >= 8) {
    insights.push({
      id: 'consistency',
      category: 'milestone',
      title: 'Excellent consistency',
      body: `${last14.length} runs in the last 2 weeks. Consistent training is the #1 predictor of race performance.`,
      color: '#FF6B35',
      icon: 'Flame',
      priority: 4,
    });
  }

  // ── 8. Long run check ─────────────────────────────────────────────────────
  if (currentWeekPlan) {
    const longRun = currentWeekPlan.workouts.find(w => w.type === 'long');
    const hasLongRun = longRun && recentRuns(runs, 7).some(r => r.distanceKm >= (longRun.distanceKm * 0.85));
    if (longRun && !hasLongRun && new Date().getDay() >= 5) { // Fri-Sun
      insights.push({
        id: 'missing_long',
        category: 'warning',
        title: `Long run: ${longRun.distanceKm}km this weekend`,
        body: 'Your long run is the most important workout of the week for endurance. Don\'t skip it.',
        color: '#bf5af2',
        icon: 'MapPin',
        priority: 1,
      });
    }
  }

  // ── 9. High RPE warning ───────────────────────────────────────────────────
  const recentHigh = recentRuns(runs, 7).filter(r => r.rpe >= 8);
  if (recentHigh.length >= 3) {
    insights.push({
      id: 'high_rpe',
      category: 'recovery',
      title: 'Too many hard efforts',
      body: `${recentHigh.length} runs at RPE 8+ this week. 80% of your running should feel easy.`,
      color: '#ef4444',
      icon: 'Heart',
      priority: 2,
    });
  }

  // ── 10. Milestone: first 100km ────────────────────────────────────────────
  const lifetimeKm = Math.round(totalKm(runs));
  const milestones = [100, 250, 500, 1000];
  for (const m of milestones) {
    const prev = runs.slice(1); // check if we just crossed it
    if (lifetimeKm >= m && totalKm(prev) < m) {
      insights.push({
        id: `milestone_${m}`,
        category: 'milestone',
        title: `${m}km Club — unlocked!`,
        body: `You've now run a total of ${lifetimeKm}km. That's incredible consistency.`,
        color: '#FF6B35',
        icon: 'Trophy',
        priority: 1,
      });
    }
  }

  // Sort by priority then return top 6
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);
}
