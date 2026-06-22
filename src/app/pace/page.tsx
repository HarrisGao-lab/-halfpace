'use client';
import { useState, useEffect } from 'react';
import { calculatePaces } from '@/lib/trainingPlan';
import { getActiveRace, getTargetMinutes, getRaceDistanceKm, type RaceConfig } from '@/lib/raceConfig';

const DISTANCES = [
  { label: 'Half Marathon', km: 21.0975 },
  { label: '10K', km: 10 },
  { label: '5K', km: 5 },
];

function paceToSec(p: string) {
  const [m, s] = p.split(':').map(Number);
  return m * 60 + (s || 0);
}

function secToStr(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function finishTime(secPerKm: number, km: number) {
  const t = Math.round(secPerKm * km);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
    : `${m}:${s.toString().padStart(2,'0')}`;
}

// Generate split checkpoints — O(n), pure math
function buildSplits(totalSec: number, km: number, negOffset: number) {
  const steps: number[] = [];
  let k = 5;
  while (k < km) { steps.push(k); k += 5; }
  steps.push(km);

  const halfKm = km / 2;
  const baseSec = totalSec / km;

  return steps.map(checkpoint => {
    const pace = checkpoint <= halfKm ? baseSec + negOffset : baseSec - negOffset;

    // Elapsed = first-half portion + second-half portion
    let elapsed: number;
    if (checkpoint <= halfKm) {
      elapsed = checkpoint * (baseSec + negOffset);
    } else {
      elapsed = halfKm * (baseSec + negOffset) + (checkpoint - halfKm) * (baseSec - negOffset);
    }

    const elapsedRound = Math.round(elapsed);
    const eh = Math.floor(elapsedRound / 3600);
    const em = Math.floor((elapsedRound % 3600) / 60);
    const es = elapsedRound % 60;
    const elapsedStr = eh > 0
      ? `${eh}:${em.toString().padStart(2,'0')}:${es.toString().padStart(2,'0')}`
      : `${em}:${es.toString().padStart(2,'0')}`;

    return { checkpoint, pace, paceStr: secToStr(pace), elapsedStr };
  });
}

const ZONES = [
  { key: 'easy',     dot: '#30d158', label: 'Easy Run',    sub: '80% of all training — conversational' },
  { key: 'tempo',    dot: '#ff9f0a', label: 'Tempo',       sub: 'Lactate threshold — comfortably hard'  },
  { key: 'interval', dot: '#ff453a', label: 'Interval',    sub: 'VO₂ max — hard repeats'                },
  { key: 'long',     dot: '#bf5af2', label: 'Long Run',    sub: 'Easy effort — time on feet'            },
  { key: 'race',     dot: '#FF6B35', label: 'Race Pace',   sub: 'Your goal race pace'                   },
];

export default function PacePage() {
  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [h, setH] = useState('1');
  const [m, setM] = useState('59');
  const [s, setS] = useState('0');
  const [paceInput, setPaceInput] = useState('5:40');
  const [splitDist, setSplitDist] = useState<'Half' | '10K' | '5K'>('Half');
  const [negOffset, setNegOffset] = useState(0); // seconds per km

  useEffect(() => {
    const cfg = getActiveRace();
    setConfig(cfg);
    setH(cfg.targetHours.toString());
    setM(cfg.targetMinutes.toString());
    setS(cfg.targetSeconds.toString());
    const sec = (getTargetMinutes(cfg) * 60) / getRaceDistanceKm(cfg.distance);
    setPaceInput(`${Math.floor(sec / 60)}:${Math.round(sec % 60).toString().padStart(2,'0')}`);
  }, []);

  const totalMin = parseInt(h||'0')*60 + parseInt(m||'0') + parseInt(s||'0')/60;
  const distKm = config ? getRaceDistanceKm(config.distance) : 21.0975;
  const paces = calculatePaces(totalMin, distKm);
  const paceSec = paceToSec(paceInput);

  const numIn = (val: string, set: (v:string)=>void, max: number) => (
    <input type="number" value={val}
      onChange={e => set(Math.min(max, Math.max(0, parseInt(e.target.value)||0)).toString())}
      style={{
        background: '#161616', border: 'none', color: '#fff', borderRadius: 12,
        width: 60, textAlign: 'center', fontSize: 26, fontWeight: 700,
        padding: '10px 0', outline: 'none', WebkitAppearance: 'none',
      }}
      min={0} max={max}
    />
  );

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-6">
        <p className="label mb-2">Calculator</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Pace Zones</h1>
      </header>

      <div className="px-5 pb-6 space-y-5">

        {/* Goal time */}
        <div className="rounded-3xl p-5" style={{ background: '#0a0a0a' }}>
          <p className="label mb-4">Goal Finish Time</p>
          <div className="flex items-center justify-center gap-3">
            {[{v:h,set:setH,max:9,lbl:'hr'},{v:m,set:setM,max:59,lbl:'min'},{v:s,set:setS,max:59,lbl:'sec'}].map((f,i)=>(
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <span className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.08)' }}>:</span>}
                <div className="flex flex-col items-center gap-1">
                  {numIn(f.v, f.set, f.max)}
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.32)' }}>{f.lbl}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zones */}
        <div>
          <p className="label mb-3">Your Training Zones</p>
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a' }}>
            {ZONES.map((z, i) => (
              <div key={z.key}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderTop: i > 0 ? '1px solid #161616' : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: z.dot + '22' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: z.dot }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{z.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>{z.sub}</div>
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums" style={{ color: '#FF6B35' }}>
                  {paces[z.key as keyof typeof paces]}/km
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pace → finish */}
        <div>
          <p className="label mb-3">Pace → Finish Time</p>
          <div className="rounded-3xl p-5 mb-3" style={{ background: '#0a0a0a' }}>
            <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>Enter pace (mm:ss per km)</p>
            <input type="text" value={paceInput} onChange={e => setPaceInput(e.target.value)}
              placeholder="5:41"
              style={{
                background: '#161616', border: 'none', color: '#fff', borderRadius: 14,
                width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 700,
                padding: '12px 0', outline: 'none',
              }} />
          </div>
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a' }}>
            {DISTANCES.map((d, i) => (
              <div key={d.label}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderTop: i > 0 ? '1px solid #161616' : 'none' }}>
                <div>
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>{d.km} km</div>
                </div>
                <div className="text-base font-bold tabular-nums">
                  {paceSec > 0 ? finishTime(paceSec, d.km) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Split Planner */}
        <div>
          <p className="label mb-3">Race Split Planner</p>
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a' }}>
            {/* Distance selector */}
            <div className="px-5 pt-4 pb-3 flex gap-2">
              {(['Half','10K','5K'] as const).map(d => (
                <button key={d} onClick={() => setSplitDist(d)}
                  className="flex-1 py-2 rounded-2xl text-xs font-semibold"
                  style={{
                    background: splitDist === d ? '#FF6B35' : '#161616',
                    color: splitDist === d ? '#000' : 'rgba(255,255,255,0.32)',
                  }}>
                  {d === 'Half' ? 'Half Marathon' : d}
                </button>
              ))}
            </div>

            {/* Negative split selector */}
            <div className="px-5 pb-3 flex gap-2">
              {[
                { label: 'Even', val: 0 },
                { label: '−5 sec', val: 5 },
                { label: '−10 sec', val: 10 },
              ].map(opt => (
                <button key={opt.val} onClick={() => setNegOffset(opt.val)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
                  style={{
                    background: negOffset === opt.val ? '#1c6e3d' : '#161616',
                    color: negOffset === opt.val ? '#30d158' : 'rgba(255,255,255,0.32)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {negOffset > 0 && (
              <p className="px-5 pb-2 text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                First half {negOffset}s/km slower → second half {negOffset}s/km faster (negative split)
              </p>
            )}

            {/* Splits table */}
            <div style={{ borderTop: '1px solid #161616' }}>
              {(() => {
                const km = splitDist === 'Half' ? 21.0975 : splitDist === '10K' ? 10 : 5;
                const totalSec = totalMin * 60;
                const splits = buildSplits(totalSec, km, negOffset);
                return splits.map((sp, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: i > 0 ? '1px solid #161616' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{ background: '#161616', color: 'rgba(255,255,255,0.42)' }}>
                        {sp.checkpoint % 1 !== 0 ? sp.checkpoint.toFixed(1) : sp.checkpoint}
                      </div>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>km</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums"
                        style={{ color: sp.checkpoint <= (km/2) && negOffset > 0 ? 'rgba(255,255,255,0.42)' : '#FF6B35' }}>
                        {sp.paceStr}/km
                      </div>
                      <div className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {sp.elapsedStr}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {[
            { title: '10% Rule', body: 'Never increase weekly mileage by more than 10%. The #1 way to avoid injury.' },
            { title: 'Shoe Mileage', body: 'Running shoes last 600–800 km. Track and replace before race day.' },
            { title: 'Easy Runs First', body: '80% of your training should feel easy. Speed comes from base volume.' },
          ].map(rule => (
            <div key={rule.title} className="rounded-3xl p-5" style={{ background: '#0a0a0a' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: '#FF6B35' }} />
                <span className="text-xs font-bold uppercase tracking-wider">{rule.title}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>{rule.body}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
