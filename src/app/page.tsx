'use client';
import { useEffect, useState } from 'react';
import { PACE_ZONES } from '@/lib/trainingPlan';
import { loadProfile } from '@/lib/userProfile';
import { generatePlan, getCurrentWeekData, getTodayWorkoutFromPlan } from '@/lib/planEngine';
import { loadRaces } from '@/lib/raceConfig';
import { getActiveRace, getCurrentWeekNumber, formatTargetTime, type RaceConfig } from '@/lib/raceConfig';
import { loadRuns, paceStr, durationStr, type RunEntry } from '@/lib/runLog';
import { getTodayFeel, saveFeel, FEEL_META, type FeelScore } from '@/lib/bodyFeel';
import Countdown from '@/components/Countdown';
import LogRunModal from '@/components/LogRunModal';
import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  easy: 'Easy Run', tempo: 'Tempo Run', interval: 'Intervals',
  long: 'Long Run', rest: 'Rest Day', cross: 'Cross Training',
};
const TYPE_DOT: Record<string, string> = {
  easy: '#30d158', tempo: '#ff9f0a', interval: '#ff453a',
  long: '#bf5af2', rest: 'rgba(255,255,255,0.08)', cross: '#32ade6', race: '#FF6B35',
};
const DAY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Race checklist for taper weeks
const RACE_CHECKLIST = [
  'Pin race bib on shirt', 'Charge GPS watch', 'Lay out race day gear',
  'Prepare nutrition / gels', 'Check race start time & location',
  'Set alarm 2h before start', 'Hydrate well the day before',
];

export default function TodayPage() {
  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [todayFeel, setTodayFeel] = useState<FeelScore | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  function refresh() {
    setConfig(getActiveRace());
    setRuns(loadRuns());
    const feel = getTodayFeel();
    if (feel) setTodayFeel(feel.score as FeelScore);
    try { setChecklist(JSON.parse(localStorage.getItem('race_checklist') || '{}')); } catch {}
  }

  useEffect(() => { refresh(); }, []);

  if (!config) return null;

  const currentWeek = getCurrentWeekNumber(config);
  const plan = generatePlan(loadProfile(), loadRaces());
  const weekData = getCurrentWeekData(plan) ?? { totalKm: 0, phase: 'base', workouts: [] as never[] };
  const todayWorkout = getTodayWorkoutFromPlan(plan);
  const zone = todayWorkout ? PACE_ZONES[todayWorkout.paceZone] : null;
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  // Weekly progress
  const weekRuns = runs.filter(r => {
    const d = new Date(r.date);
    const today = new Date();
    const monday = new Date(today); monday.setDate(today.getDate() - todayIdx); monday.setHours(0,0,0,0);
    return d >= monday;
  });
  const weekActualKm = weekRuns.reduce((s, r) => s + r.distanceKm, 0);
  const weekPct = Math.min(weekActualKm / weekData.totalKm, 1);

  // Streak (consecutive weeks with at least 1 run)
  const streakWeeks = (() => {
    if (!runs.length) return 0;
    let streak = 0;
    const now = new Date();
    for (let w = 0; w < 20; w++) {
      const wStart = new Date(now); wStart.setDate(now.getDate() - todayIdx - w * 7); wStart.setHours(0,0,0,0);
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
      const hasRun = runs.some(r => { const d = new Date(r.date); return d >= wStart && d < wEnd; });
      if (!hasRun && w > 0) break;
      if (hasRun) streak++;
    }
    return streak;
  })();

  // Race checklist visible in taper
  const showChecklist = weekData.phase === 'taper';

  function toggleCheck(item: string) {
    const next = { ...checklist, [item]: !checklist[item] };
    setChecklist(next);
    localStorage.setItem('race_checklist', JSON.stringify(next));
  }

  function handleFeel(score: FeelScore) {
    saveFeel({ date: new Date().toISOString().slice(0, 10), score, note: '' });
    setTodayFeel(score);
  }

  const recentRuns = runs.slice(0, 3);

  return (
    <>
      <div className="h-screen overflow-y-auto" style={{ color: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Hero */}
        <header className="px-5 safe-top pb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="label mb-2">
                Week {currentWeek} · {weekData.phase}
              </p>
              <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                {config.name}
              </h1>
              <p className="mt-2" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.01em' }}>
                {new Date(config.date).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                <span style={{ color: '#FF6B35', marginLeft: 6 }}>→ {formatTargetTime(config)}</span>
              </p>
            </div>
            <Link href="/settings"
              className="w-9 h-9 rounded-full flex items-center justify-center mt-1 shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>⚙</span>
            </Link>
          </div>

          <Countdown />
        </header>

        <div className="px-5 space-y-3 pb-4">

          {/* Stats row — 3 clean tiles */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: weekData.totalKm, unit: 'km', lbl: 'this week' },
              { val: streakWeeks === 0 ? '—' : `${streakWeeks}`, unit: streakWeeks === 0 ? '' : 'wk', lbl: 'streak' },
              { val: config.distance === 'half' ? '21.1' : '42.2', unit: 'km', lbl: 'race dist' },
            ].map((s, idx) => (
              <div key={s.lbl} className="flex flex-col justify-between"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '14px 12px 12px',
                }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
                  {s.lbl}
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: idx === 1 && streakWeeks > 0 ? '#FF6B35' : '#fff' }}>
                  {s.val}
                  {s.unit && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Progress */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em' }}>Weekly Progress</span>
              <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: weekPct >= 1 ? '#30d158' : '#FF6B35' }}>
                {weekActualKm.toFixed(1)} / {weekData.totalKm} km
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(weekPct * 100, weekActualKm > 0 ? 3 : 0)}%`,
                background: weekPct >= 1 ? '#30d158' : '#FF6B35',
                borderRadius: 2,
                transition: 'width 0.7s ease',
              }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
              {weekPct >= 1 ? 'Week complete' : weekActualKm === 0 ? `${weekData.totalKm} km planned` : `${(weekData.totalKm - weekActualKm).toFixed(1)} km remaining`}
            </p>
          </div>

          {/* Today's Workout */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ borderLeft: `3px solid ${todayWorkout && todayWorkout.type !== 'rest' ? TYPE_DOT[todayWorkout.type] : '#1a1a1a'}`, padding: '16px 18px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Today</div>

              {todayWorkout && todayWorkout.type !== 'rest' ? (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {TYPE_LABEL[todayWorkout.type]}
                      </div>
                      {todayWorkout.distanceKm > 0 && (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{todayWorkout.distanceKm} km</div>
                      )}
                    </div>
                    {zone && zone.paceRange !== '—' && (
                      <div className="text-right">
                        <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 3 }}>Pace</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#FF6B35', letterSpacing: '-0.01em' }}>{zone.paceRange}</div>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14 }}>
                    {todayWorkout.description}
                  </p>
                  <button onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-2"
                    style={{ background: '#FF6B35', color: '#000', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <Plus size={14} strokeWidth={3} /> Log Run
                  </button>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Rest Day</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Recovery is training.</div>
                </div>
              )}
            </div>
          </div>

          {/* How do you feel today? */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Today's Feel</span>
              <Link href="/injury" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(239,68,68,0.7)' }}>
                + Log Pain
              </Link>
            </div>
            <div className="flex gap-1.5">
              {([1,2,3,4,5] as FeelScore[]).map(score => {
                const meta = FEEL_META[score];
                const active = todayFeel === score;
                return (
                  <button key={score} onClick={() => handleFeel(score)}
                    className="flex-1 flex flex-col items-center py-2.5"
                    style={{
                      borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: active ? `1px solid ${meta.color}40` : '1px solid transparent',
                    }}>
                    <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                    <span style={{ fontSize: 9, marginTop: 4, fontWeight: 600, color: active ? meta.color : 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week mini calendar */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>This Week</div>
            <div className="grid grid-cols-7 gap-1">
              {DAY.map((d, i) => {
                const w = weekData.workouts.find(x => x.day === i);
                const isToday = i === todayIdx;
                const done = weekRuns.some(r => {
                  const d2 = new Date(r.date);
                  const today2 = new Date();
                  const mon = new Date(today2); mon.setDate(today2.getDate() - todayIdx);
                  const target = new Date(mon); target.setDate(mon.getDate() + i);
                  return d2.toDateString() === target.toDateString();
                });
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5" style={{ padding: '8px 2px', borderRadius: 8, background: isToday ? 'rgba(255,107,53,0.08)' : 'transparent', border: isToday ? '1px solid rgba(255,107,53,0.25)' : '1px solid transparent' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? '#FF6B35' : 'rgba(255,255,255,0.2)' }}>{d}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#30d158' : w?.type === 'rest' ? 'rgba(255,255,255,0.06)' : TYPE_DOT[w?.type || 'rest'] + '55' }} />
                    {w && w.distanceKm > 0 && (
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{w.distanceKm}k</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* Race checklist (taper only) */}
          {showChecklist && (
            <div className="rounded-3xl p-5" style={{ background: '#0a0a0a' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="label">Race Day Checklist</p>
                <span className="text-xs font-semibold" style={{ color: '#FF6B35' }}>
                  {Object.values(checklist).filter(Boolean).length}/{RACE_CHECKLIST.length}
                </span>
              </div>
              <div className="space-y-2">
                {RACE_CHECKLIST.map(item => {
                  const done = checklist[item];
                  return (
                    <button key={item} onClick={() => toggleCheck(item)}
                      className="w-full flex items-center gap-3 py-2 text-left">
                      <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                        style={{ borderColor: done ? '#30d158' : 'rgba(255,255,255,0.08)', background: done ? '#30d158' : 'transparent' }}>
                        {done && <span style={{ color: '#000', fontSize: 10, fontWeight: 800 }}>✓</span>}
                      </div>
                      <span className="text-sm" style={{ color: done ? 'rgba(255,255,255,0.2)' : '#fff', textDecoration: done ? 'line-through' : 'none' }}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Runs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="label">Recent Runs</span>
              <Link href="/log" className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: '#FF6B35' }}>
                See All <ChevronRight size={12} />
              </Link>
            </div>
            {recentRuns.length === 0 ? (
              <button onClick={() => setShowModal(true)}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-2"
                style={{ background: '#0a0a0a', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <Plus size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Log your first run</span>
              </button>
            ) : (
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                {recentRuns.map((r, i) => (
                  <div key={r.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.distanceKm} km</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                        {durationStr(r.durationMin)} · {paceStr(r.distanceKm, r.durationMin)}
                        {r.notes ? ` · ${r.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                      {new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition tip for long runs */}
          {todayWorkout?.type === 'long' && (
            <div className="flex items-center gap-3 px-4 py-4 rounded-2xl"
              style={{ background: '#0a0a0a', border: '1px solid rgba(50,173,230,0.2)' }}>
              <span style={{ fontSize: 18 }}>💧</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Long Run Fuel</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  Gel or water every 45 min. Start fueling at 30 min.
                </p>
              </div>
            </div>
          )}

        </div>
        <div className="pb-32" />
      </div>

      {/* Floating Log Run button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed z-40 flex items-center gap-2 rounded-full"
        style={{
          bottom: 96,
          right: 20,
          background: '#FF6B35',
          color: '#000',
          padding: '12px 20px',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: '0 4px 20px rgba(255,107,53,0.5)',
        }}
      >
        <Plus size={15} strokeWidth={3} />
        Log Run
      </button>

      {showModal && <LogRunModal onClose={() => setShowModal(false)} onSaved={refresh} />}
    </>
  );
}
