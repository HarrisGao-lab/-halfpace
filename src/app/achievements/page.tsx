'use client';
import { useState, useEffect } from 'react';
import { loadRuns } from '@/lib/runLog';
import { getMergedPRs } from '@/lib/prs';
import {
  getUnlocked, getLocked, ACHIEVEMENTS, RARITY_COLOR,
  type Achievement, type AchievementInput,
} from '@/lib/achievements';
import Link from 'next/link';

const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

function buildInput(): AchievementInput {
  const runs = loadRuns();
  const prs = getMergedPRs(runs);
  const completedWorkouts: Record<string, boolean> = (() => {
    try { return JSON.parse(localStorage.getItem('completed_workouts') || '{}'); } catch { return {}; }
  })();

  // Calculate streak weeks (weeks with at least 1 run)
  const weekSet = new Set(runs.map(r => {
    const d = new Date(r.date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return `${d.getFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`;
  }));
  const streakWeeks = weekSet.size;

  return { runs, prs, completedWorkouts, streakWeeks };
}

export default function AchievementsPage() {
  const [input, setInput] = useState<AchievementInput | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => { setInput(buildInput()); }, []);

  if (!input) return null;

  const unlocked = getUnlocked(input);
  const locked = getLocked(input);
  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  const displayed: Achievement[] =
    filter === 'unlocked' ? unlocked :
    filter === 'locked'   ? locked   :
    [...unlocked, ...locked];

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-6">
        <Link href="/log" className="text-xs mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          ← Back
        </Link>
        <p className="label mb-1.5">Milestones</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Achievements</h1>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>{unlocked.length} / {ACHIEVEMENTS.length} unlocked</span>
            <span className="text-xs font-bold" style={{ color: '#FF6B35' }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF6B35, #ff9f0a)' }} />
          </div>
        </div>
      </header>

      <div className="px-5 pb-6 space-y-4">

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {(['all','unlocked','locked'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-2 rounded-2xl text-xs font-semibold capitalize"
              style={{
                background: filter === f ? '#FF6B35' : '#0a0a0a',
                color: filter === f ? '#000' : 'rgba(255,255,255,0.32)',
              }}>
              {f === 'all' ? `All (${ACHIEVEMENTS.length})` : f === 'unlocked' ? `Earned (${unlocked.length})` : `Locked (${locked.length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {displayed.map(a => {
            const isUnlocked = unlocked.includes(a);
            const color = RARITY_COLOR[a.rarity];
            return (
              <div key={a.id}
                className="rounded-3xl p-4 flex flex-col gap-2"
                style={{
                  background: isUnlocked ? '#0a0a0a' : '#0a0a0a',
                  border: isUnlocked ? `1px solid ${color}33` : '1px solid #161616',
                  opacity: isUnlocked ? 1 : 0.55,
                }}>
                <div className="text-2xl" style={{ filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                  {isUnlocked ? a.emoji : '🔒'}
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight"
                    style={{ color: isUnlocked ? '#fff' : '#444' }}>
                    {a.title}
                  </div>
                  <div className="text-[10px] mt-0.5 leading-snug"
                    style={{ color: isUnlocked ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.08)' }}>
                    {a.description}
                  </div>
                </div>
                <div className="mt-auto">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: isUnlocked ? color + '20' : '#161616',
                      color: isUnlocked ? color : 'rgba(255,255,255,0.2)',
                    }}>
                    {RARITY_LABEL[a.rarity]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
