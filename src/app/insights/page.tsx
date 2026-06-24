'use client';
import { useState, useEffect } from 'react';
import { loadRuns } from '@/lib/runLog';
import { getActiveRace } from '@/lib/raceConfig';
import { generatePlan, getCurrentWeekData } from '@/lib/planEngine';
import { loadProfile } from '@/lib/userProfile';
import { loadRaces } from '@/lib/raceConfig';
import { generateInsights, type Insight } from '@/lib/insights';
import { getCurrentLoad, formLabel, computeLoadHistory, weeklyTSS } from '@/lib/trainingLoad';
import { predictRaceTimes, estimateVO2max } from '@/lib/predictions';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';

function DynIcon({ name, size, color }: { name: string; size: number; color?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return Icon ? <Icon size={size} color={color} /> : null;
}

const CONFIDENCE_COLOR = { high: '#30d158', medium: '#ff9f0a', low: 'rgba(255,255,255,0.3)' };

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadData, setLoadData] = useState<ReturnType<typeof getCurrentLoad> | null>(null);
  const [loadHistory, setLoadHistory] = useState<{ date: string; atl: number; ctl: number; tsb: number }[]>([]);
  const [predictions, setPredictions] = useState<ReturnType<typeof predictRaceTimes>>([]);
  const [vo2max, setVo2max] = useState<ReturnType<typeof estimateVO2max>>(null);
  const [activeRaceName, setActiveRaceName] = useState('');
  const [activeRaceDist, setActiveRaceDist] = useState<'half' | 'full'>('half');

  useEffect(() => {
    const runs = loadRuns();
    const profile = loadProfile();
    const races = loadRaces();
    const plan = generatePlan(profile, races);
    const weekData = getCurrentWeekData(plan);
    const race = getActiveRace();

    setInsights(generateInsights(runs, race, weekData));
    setLoadData(getCurrentLoad(runs));
    setLoadHistory(computeLoadHistory(runs, 56).filter((_, i) => i % 2 === 0)); // every 2 days
    setPredictions(predictRaceTimes(runs));
    setVo2max(estimateVO2max(runs));
    if (race) {
      setActiveRaceName(race.name);
      setActiveRaceDist(race.distance);
    }
  }, []);

  const form = loadData ? formLabel(loadData.tsb) : null;
  const racePred = predictions.find(p => p.distance === (activeRaceDist === 'full' ? 'Full' : 'Half'));

  return (
    <div className="h-screen overflow-y-auto" style={{ color: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <header className="px-5 pt-14 pb-6">
        <Link href="/" className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.32)' }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: '#555' }}>Coach</p>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>Insights</h1>
      </header>

      <div className="px-5 space-y-6 pb-32">

        {/* Training Form + VO2max row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
            <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>Form</p>
            {form ? (
              <>
                <div className="text-xl font-bold" style={{ color: form.color }}>{form.label}</div>
                <div className="text-[10px] mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.3)' }}>TSB {loadData?.tsb ?? 0}</div>
              </>
            ) : (
              <div className="text-sm" style={{ color: '#444' }}>Log runs to see form</div>
            )}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
            <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>VO2max est.</p>
            {vo2max ? (
              <>
                <div className="text-xl font-bold" style={{ color: '#FF6B35' }}>{vo2max.value}</div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{vo2max.label}</div>
              </>
            ) : (
              <div className="text-sm" style={{ color: '#444' }}>Log a 5–10K run</div>
            )}
          </div>
        </div>

        {/* Load chart */}
        {loadHistory.length > 4 && (
          <div className="rounded-2xl p-4" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: '#555' }}>Training Load (8 weeks)</p>
              <div className="flex gap-3 text-[10px]">
                <span style={{ color: '#32ade6' }}>— Fitness</span>
                <span style={{ color: '#FF6B35' }}>— Fatigue</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={loadHistory} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#32ade6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#32ade6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="atlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }}
                  tickFormatter={v => v.slice(5).replace('-', '/')} interval={6} />
                <YAxis tick={{ fontSize: 9, fill: '#444' }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 11, color: '#fff' }}
                  formatter={(val, name) => [val, name === 'ctl' ? 'Fitness' : 'Fatigue']}
                />
                <Area type="monotone" dataKey="ctl" stroke="#32ade6" strokeWidth={1.5} fill="url(#ctlGrad)" dot={false} />
                <Area type="monotone" dataKey="atl" stroke="#FF6B35" strokeWidth={1.5} fill="url(#atlGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Form = Fitness − Fatigue · Target: −10 to +5 for peak performance
            </p>
          </div>
        )}

        {/* Race predictions */}
        {predictions.length > 0 && (
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>Race Predictions</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
              {predictions.map((pred, i) => (
                <div key={pred.distance}
                  className="flex items-center px-4 py-3.5"
                  style={{ borderBottom: i < predictions.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{pred.distance}
                      {pred.distance === (activeRaceDist === 'full' ? 'Full' : 'Half') && activeRaceName && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: '#FF6B3520', color: '#FF6B35' }}>Your race</span>
                      )}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Based on {pred.basedOn}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold" style={{ color: '#FF6B35' }}>{pred.predictedFormatted}</div>
                    <div className="text-[10px] mt-0.5 font-semibold" style={{ color: CONFIDENCE_COLOR[pred.confidence] }}>
                      {pred.confidence === 'high' ? 'High confidence' : pred.confidence === 'medium' ? 'Medium' : 'Low confidence'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-2 px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Predictions use the Riegel formula (T2 = T1 × (D2/D1)^1.06). Log more races to improve accuracy.
            </p>
          </div>
        )}

        {/* Coaching insights */}
        {insights.length > 0 && (
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>Coaching Notes</p>
            <div className="space-y-2.5">
              {insights.map(ins => (
                <div key={ins.id}
                  className="flex items-start gap-3 rounded-2xl px-4 py-4"
                  style={{ background: '#0a0a0a', border: `1px solid ${ins.color}22` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${ins.color}18` }}>
                    <DynIcon name={ins.icon} size={15} color={ins.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold leading-tight">{ins.title}</div>
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {ins.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length === 0 && predictions.length === 0 && (
          <div className="text-center py-16">
            <DynIcon name="Brain" size={40} color="rgba(255,255,255,0.12)" />
            <p className="text-sm mt-4" style={{ color: '#555' }}>
              Log at least 5 runs to unlock coaching insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
