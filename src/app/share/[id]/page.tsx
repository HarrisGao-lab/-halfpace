'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { loadRuns, paceStr, durationStr, type RunEntry } from '@/lib/runLog';
import { getActiveRace } from '@/lib/raceConfig';
import Link from 'next/link';
import { ChevronLeft, Share2 } from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function classify(r: RunEntry): { label: string; color: string } {
  const pace = r.durationMin / r.distanceKm;
  if (r.distanceKm >= 18) return { label: 'Long Run', color: '#bf5af2' };
  if (pace < 4.5)          return { label: 'Interval', color: '#ff453a' };
  if (pace < 5.2)          return { label: 'Tempo',    color: '#ff9f0a' };
  return                          { label: 'Easy Run',  color: '#30d158' };
}

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunEntry | null>(null);
  const [raceName, setRaceName] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runs = loadRuns();
    const found = runs.find(r => r.id === id);
    setRun(found ?? null);
    const race = getActiveRace();
    if (race) setRaceName(race.name);
  }, [id]);

  async function handleShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: run ? `${run.distanceKm}km — HalfPace` : 'My Run',
        text: run
          ? `Just ran ${run.distanceKm}km at ${paceStr(run.distanceKm, run.durationMin)} — training for ${raceName || 'my race'} with HalfPace`
          : '',
        url: window.location.href,
      });
    } catch {}
  }

  if (!run) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ color: '#555' }}>
        Run not found.
      </div>
    );
  }

  const { label, color } = classify(run);
  const pace = paceStr(run.distanceKm, run.durationMin);
  const dur = durationStr(run.durationMin);
  const kcal = run.caloriesKcal ?? Math.round(9.8 * 70 * (run.durationMin / 60));

  // Elevation-like decoration — derived from pace + distance for visual interest
  const bars = Array.from({ length: 24 }, (_, i) => {
    const seed = (run.distanceKm * 13 + i * 7.3 + run.durationMin * 0.4) % 1;
    const h = 8 + Math.sin(i * 0.8 + seed * 10) * 12 + Math.cos(i * 1.3) * 8;
    return Math.max(6, Math.round(h));
  });
  const maxBar = Math.max(...bars);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: '#000', color: '#fff' }}>

      <div className="w-full max-w-sm">
        {/* Back */}
        <Link href="/log" className="flex items-center gap-1 text-xs mb-6" style={{ color: 'rgba(255,255,255,0.32)' }}>
          <ChevronLeft size={14} /> Back to Log
        </Link>

        {/* Card — screenshot-friendly */}
        <div ref={cardRef} className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #0d0d0d 0%, #111 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            aspectRatio: '4/5',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          }}>

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

          {/* Brand */}
          <div className="absolute top-5 right-5 text-[10px] tracking-[0.25em] uppercase font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>
            HalfPace
          </div>

          <div className="px-7 pt-8 pb-6 flex flex-col h-full">
            {/* Type pill */}
            <div className="inline-flex self-start items-center px-3 py-1 rounded-full mb-5"
              style={{ background: `${color}18`, border: `1px solid ${color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ background: color }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color }}>{label}</span>
            </div>

            {/* Distance — hero number */}
            <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.9, color: '#fff' }}>
              {run.distanceKm}
              <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>km</span>
            </div>

            {/* Pace */}
            <div className="mt-3 flex items-baseline gap-2">
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color }}>{pace}</span>
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { val: dur,          lbl: 'Time'     },
                { val: `${run.rpe}`, lbl: 'RPE'      },
                { val: `${kcal}`,    lbl: 'kcal'     },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* Elevation bars decoration */}
            <div className="mt-auto flex items-end gap-0.5 h-10 opacity-25">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-sm"
                  style={{ height: `${(h / maxBar) * 100}%`, background: color }} />
              ))}
            </div>

            {/* Date + race */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{formatDate(run.date)}</div>
              {raceName && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                  Training for {raceName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-3">
          {'share' in navigator && (
            <button onClick={handleShare}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
              style={{ background: '#FF6B35', color: '#000' }}>
              <Share2 size={16} /> Share
            </button>
          )}
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Screenshot this card to share on Instagram Stories
          </p>
        </div>
      </div>
    </div>
  );
}
