'use client';
import { useState } from 'react';
import { type Phase } from '@/lib/trainingPlan';
import { loadProfile } from '@/lib/userProfile';
import { generatePlan, getCurrentWeekData, type GeneratedWeek } from '@/lib/planEngine';
import { loadRaces } from '@/lib/raceConfig';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

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

  function toggle(key: string) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    localStorage.setItem('completed_workouts', JSON.stringify(next));
  }

  let lastPhase: string | null = null;

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-4">
        <p className="label mb-1.5">{TRAINING_PLAN.length} Weeks{activeRace ? ` · ${activeRace.name}` : ''}</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Training Plan</h1>

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

                          <div className="flex-1 min-w-0">
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
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
