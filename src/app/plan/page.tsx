'use client';
import { useState } from 'react';
import { type Phase } from '@/lib/trainingPlan';
import { loadProfile } from '@/lib/userProfile';
import { generatePlan, getCurrentWeekData, type GeneratedWeek, type GeneratedWorkout } from '@/lib/planEngine';
import { loadRaces } from '@/lib/raceConfig';
import { ChevronDown, ChevronUp, Check, X, ChevronRight } from 'lucide-react';

const PHASE_COLOR: Record<string, string> = {
  base: '#30d158', build: '#ff9f0a', peak: '#ff453a', taper: '#bf5af2', recovery: '#32ade6',
};
const TYPE_DOT: Record<string, string> = {
  easy: '#30d158', tempo: '#ff9f0a', interval: '#ff453a',
  long: '#bf5af2', rest: 'rgba(255,255,255,0.08)', cross: '#32ade6', race: '#FF6B35',
};
const TYPE_LABEL: Record<string, string> = {
  easy: 'Easy', tempo: 'Tempo', interval: 'Interval',
  long: 'Long', rest: 'Rest', cross: 'Cross', race: 'Race',
};
const DAY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function PlanPage() {
  const races = loadRaces();
  const profile = loadProfile();
  const TRAINING_PLAN: GeneratedWeek[] = generatePlan(profile, races);
  const currentWeekData = getCurrentWeekData(TRAINING_PLAN);
  const currentWeek = currentWeekData?.week ?? 1;
  const activeRace = races[0]; // first upcoming race
  const [expanded, setExpanded] = useState<number>(currentWeek);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('completed_workouts') || '{}'); } catch { return {}; }
  });
  const [selectedWorkout, setSelectedWorkout] = useState<{ workout: GeneratedWorkout; weekNum: number } | null>(null);

  function toggle(key: string) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    localStorage.setItem('completed_workouts', JSON.stringify(next));
  }

  let lastPhase: string | null = null;

  // Overall plan compliance
  const totalCheckable = TRAINING_PLAN.flatMap(w => w.workouts.filter(x => x.type !== 'rest')).length;
  const totalDone = Object.values(done).filter(Boolean).length;
  const compliancePct = totalCheckable > 0 ? Math.round((totalDone / totalCheckable) * 100) : 0;

  return (
    <div className="h-screen overflow-y-auto" style={{ color: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <header className="px-5 safe-top pb-4">
        <p className="label mb-1.5">{TRAINING_PLAN.length} Weeks{activeRace ? ` · ${activeRace.name}` : ''}</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Training Plan</h1>

        {/* Compliance bar */}
        {totalDone > 0 && (
          <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Plan compliance</span>
              <span className="text-xs font-bold" style={{ color: compliancePct >= 80 ? '#30d158' : compliancePct >= 50 ? '#ff9f0a' : '#ff453a' }}>
                {compliancePct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${compliancePct}%`, background: compliancePct >= 80 ? '#30d158' : compliancePct >= 50 ? '#ff9f0a' : '#ff453a' }} />
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{totalDone} of {totalCheckable} workouts completed</div>
          </div>
        )}

        {/* Phase legend */}
        <div className="flex gap-4 mt-4">
          {(['base','build','peak','taper'] as Phase[]).map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLOR[p] }} />
              <span className="text-[11px] font-medium capitalize" style={{ color: 'rgba(255,255,255,0.32)' }}>{p}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="px-5 pb-6 space-y-2">
        {TRAINING_PLAN.map(weekData => {
          const isNow = weekData.week === currentWeek;
          const isOpen = expanded === weekData.week;
          const showDivider = weekData.phase !== lastPhase;
          lastPhase = weekData.phase;
          const phaseColor = PHASE_COLOR[weekData.phase];
          const wStart = new Date(weekData.startDate);
          const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
          const fmt = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
          const runs = weekData.workouts.filter(w => w.type !== 'rest' && w.type !== 'cross');
          const doneCount = runs.filter(w => done[`${weekData.week}-${w.day}`]).length;

          return (
            <div key={weekData.week}>
              {showDivider && (
                <div className="flex items-center gap-3 mt-5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: phaseColor }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    {weekData.phase} phase
                  </span>
                  <div className="flex-1 h-px" style={{ background: '#161616' }} />
                </div>
              )}

              <div className="rounded-3xl overflow-hidden"
                style={{ background: '#0a0a0a', border: isNow ? `1px solid ${phaseColor}44` : '1px solid transparent' }}>

                <button onClick={() => setExpanded(isOpen ? 0 : weekData.week)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <div className="flex items-center gap-3">
                    {isNow && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF6B35' }} />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Week {weekData.week}</span>
                        {isNow && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                            style={{ background: '#FF6B35', color: '#000' }}>NOW</span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {fmt(wStart)} – {fmt(wEnd)} · {weekData.totalKm} km
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {runs.length > 0 && (
                      <span className="text-xs font-semibold"
                        style={{ color: doneCount === runs.length ? '#30d158' : 'rgba(255,255,255,0.32)' }}>
                        {doneCount}/{runs.length}
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={15} style={{ color: 'rgba(255,255,255,0.32)' }} />
                             : <ChevronDown size={15} style={{ color: 'rgba(255,255,255,0.32)' }} />}
                  </div>
                </button>

                {isOpen && (
                  <>
                    <div className="px-5 py-3" style={{ borderTop: '1px solid #1c1c1e', background: '#0a0a0a' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {weekData.weeklyGoal.replace(/^[⚠️🏁🏆]\s*/g, '')}
                      </p>
                    </div>
                    {weekData.workouts.map(workout => {
                      const key = `${weekData.week}-${workout.day}`;
                      const isDone = done[key];
                      const canCheck = workout.type !== 'rest';
                      return (
                        <div key={workout.day}
                          className="flex items-center gap-3 px-5 py-3.5"
                          style={{ borderTop: '1px solid #161616' }}>
                          {canCheck ? (
                            <button onClick={() => toggle(key)}
                              className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                              style={{ borderColor: isDone ? '#30d158' : 'rgba(255,255,255,0.08)', background: isDone ? '#30d158' : 'transparent' }}>
                              {isDone && <Check size={11} color="#000" strokeWidth={3} />}
                            </button>
                          ) : <div className="w-5 shrink-0" />}

                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_DOT[workout.type] }} />

                          <button className="flex-1 min-w-0 text-left"
                            onClick={() => setSelectedWorkout({ workout, weekNum: weekData.week })}>
                            <div className="text-sm font-medium"
                              style={{ color: isDone ? 'rgba(255,255,255,0.2)' : '#fff', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {DAY[workout.day]}
                              <span className="ml-2 font-normal" style={{ color: isDone ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.32)' }}>
                                {TYPE_LABEL[workout.type]}{workout.distanceKm > 0 ? ` · ${workout.distanceKm} km` : ''}
                              </span>
                            </div>
                            {!isDone && (
                              <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                {workout.description}
                              </div>
                            )}
                          </button>
                          {workout.type !== 'rest' && (
                            <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div className="pb-32" />
      </div>

      {/* Workout detail drawer */}
      {selectedWorkout && (() => {
        const { workout, weekNum } = selectedWorkout;
        const key = `${weekNum}-${workout.day}`;
        const isDone = done[key];
        const dot = TYPE_DOT[workout.type];
        const TIPS: Record<string, string> = {
          easy: 'Keep your heart rate in zone 2 (conversational pace). You should be able to hold a full conversation without gasping.',
          tempo: 'Run at "comfortably hard" effort — about 7-8/10. You can speak in short phrases but not full sentences.',
          interval: 'Push hard during work intervals (8-9/10). Full recovery between reps is key — don\'t cut rest short.',
          long: 'The cornerstone of marathon training. Run 60-90 sec/km slower than goal race pace. Prioritise time on feet over speed.',
          rest: 'Rest is where adaptation happens. Active recovery like gentle walking or stretching is fine.',
          cross: 'Cross-training builds aerobic fitness while reducing impact stress. Cycling, swimming, or yoga all count.',
          race: 'Race day! Stick to your plan, run the first half conservatively, and execute your nutrition strategy.',
        };
        return (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedWorkout(null)}>
            <div className="w-full rounded-t-3xl px-5 pt-5 pb-10"
              style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={e => e.stopPropagation()}>
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#2a2a2a' }} />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: dot }}>
                      {TYPE_LABEL[workout.type]}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {DAY[workout.day]}{workout.distanceKm > 0 ? ` · ${workout.distanceKm} km` : ''}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Week {weekNum}</p>
                </div>
                <button onClick={() => setSelectedWorkout(null)} style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Description */}
              <div className="rounded-2xl p-4 mb-4" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {workout.description}
                </p>
              </div>

              {/* Pace zone */}
              {workout.paceZone && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Pace zone:</span>
                  <span className="text-xs font-bold" style={{ color: '#FF6B35' }}>{workout.paceZone}</span>
                </div>
              )}

              {/* Coach tip */}
              <div className="rounded-2xl p-4 mb-5" style={{ background: `${dot}0d`, border: `1px solid ${dot}22` }}>
                <p className="text-[11px] tracking-widest uppercase mb-1.5 font-bold" style={{ color: dot }}>Coach Tip</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {TIPS[workout.type] ?? 'Focus on quality over quantity.'}
                </p>
              </div>

              {/* Mark done */}
              {workout.type !== 'rest' && (
                <button onClick={() => { toggle(key); setSelectedWorkout(null); }}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
                  style={{
                    background: isDone ? '#141414' : '#30d158',
                    color: isDone ? 'rgba(255,255,255,0.4)' : '#000',
                    border: isDone ? '1px solid #1e1e1e' : 'none',
                  }}>
                  <Check size={16} strokeWidth={3} />
                  {isDone ? 'Mark as not done' : 'Mark as done'}
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
