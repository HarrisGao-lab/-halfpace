/**
 * Race Time Prediction Engine
 * Uses Riegel formula: T2 = T1 × (D2/D1)^1.06
 * Also estimates VO2max from recent run data.
 */
import { type RunEntry } from './runLog';

export interface Prediction {
  distance: string;
  distanceKm: number;
  predictedMin: number;    // total minutes
  predictedFormatted: string; // "1:52:34"
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;         // "your 10K run on Jun 12"
}

export interface VO2maxEstimate {
  value: number;
  label: string; // "Good", "Excellent" etc.
}

// ── Riegel formula ─────────────────────────────────────────────────────────

function riegel(sourceMin: number, sourceKm: number, targetKm: number): number {
  return sourceMin * Math.pow(targetKm / sourceKm, 1.06);
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  const s = Math.round((min % 1) * 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Find best recent effort for a distance range ───────────────────────────

function bestEffort(
  runs: RunEntry[],
  minKm: number,
  maxKm: number,
  maxAgeDays = 90,
): RunEntry | null {
  const cutoff = Date.now() - maxAgeDays * 86400000;
  const candidates = runs.filter(
    r => r.distanceKm >= minKm && r.distanceKm <= maxKm &&
      new Date(r.date).getTime() > cutoff,
  );
  if (candidates.length === 0) return null;
  // Best = fastest pace
  return candidates.reduce((best, r) =>
    (r.durationMin / r.distanceKm) < (best.durationMin / best.distanceKm) ? r : best,
  );
}

// ── VO2max estimation (Daniels formula from pace) ──────────────────────────

export function estimateVO2max(runs: RunEntry[]): VO2maxEstimate | null {
  // Use best effort between 5–10km for most accurate estimate
  const effort = bestEffort(runs, 4.5, 10.5);
  if (!effort) return null;

  const paceSecPerKm = (effort.durationMin * 60) / effort.distanceKm;
  const speedMs = 1000 / paceSecPerKm;
  // VO2max = 0.000104 × speed^2 + 0.182258 × speed - 4.6
  // (Cooper approximation using metres per minute)
  const speedMpm = speedMs * 60;
  const vo2 = -4.6 + 0.182258 * speedMpm + 0.000104 * speedMpm * speedMpm;
  const value = Math.round(Math.max(20, Math.min(85, vo2)));

  let label = 'Fair';
  if (value >= 60) label = 'Elite';
  else if (value >= 52) label = 'Excellent';
  else if (value >= 44) label = 'Good';
  else if (value >= 36) label = 'Average';

  return { value, label };
}

// ── Main prediction function ───────────────────────────────────────────────

export function predictRaceTimes(runs: RunEntry[]): Prediction[] {
  const predictions: Prediction[] = [];

  const TARGETS = [
    { label: '5K',   km: 5.0 },
    { label: '10K',  km: 10.0 },
    { label: 'Half', km: 21.0975 },
    { label: 'Full', km: 42.195 },
  ];

  // Source priority: use longest recent effort that's not the target itself
  const SOURCES = [
    { min: 8.5,  max: 11.5,  label: '10K',   ageDays: 90  },
    { min: 4.5,  max: 5.5,   label: '5K',    ageDays: 60  },
    { min: 19.0, max: 22.5,  label: 'half',  ageDays: 120 },
    { min: 13.0, max: 17.0,  label: '15K/16K', ageDays: 90 },
  ];

  for (const target of TARGETS) {
    // Find best source effort (not the same distance)
    for (const src of SOURCES) {
      if (Math.abs(src.min + (src.max - src.min) / 2 - target.km) < 1) continue;
      const effort = bestEffort(runs, src.min, src.max, src.ageDays);
      if (!effort) continue;

      const predictedMin = riegel(effort.durationMin, effort.distanceKm, target.km);
      const ageDays = Math.round((Date.now() - new Date(effort.date).getTime()) / 86400000);
      const confidence: 'high' | 'medium' | 'low' =
        ageDays <= 21 ? 'high' : ageDays <= 60 ? 'medium' : 'low';

      const dateStr = new Date(effort.date).toLocaleDateString('en', { month: 'short', day: 'numeric' });

      predictions.push({
        distance: target.label,
        distanceKm: target.km,
        predictedMin,
        predictedFormatted: formatMinutes(predictedMin),
        confidence,
        basedOn: `${src.label} on ${dateStr}`,
      });
      break; // use first valid source
    }
  }

  return predictions;
}

// ── Compare prediction to goal ─────────────────────────────────────────────

export function predictionVsGoal(
  predictedMin: number,
  goalMin: number,
): { diffMin: number; ahead: boolean; label: string } {
  const diffMin = Math.abs(predictedMin - goalMin);
  const ahead = predictedMin <= goalMin;
  const diffStr = diffMin < 1
    ? `${Math.round(diffMin * 60)}s`
    : `${Math.floor(diffMin)}m ${Math.round((diffMin % 1) * 60)}s`;
  return {
    diffMin,
    ahead,
    label: ahead ? `${diffStr} ahead of goal` : `${diffStr} behind goal`,
  };
}
