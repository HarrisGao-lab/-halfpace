'use client';
import { useState, useEffect } from 'react';
import {
  loadResults, saveResult, deleteResult, formatResultTime, DISTANCE_KM,
  type RaceResult, type ResultDistance,
} from '@/lib/raceResults';
import { Plus, Trash2, X, Check, Flag } from 'lucide-react';
import Link from 'next/link';

const DISTANCES: ResultDistance[] = ['5K', '10K', 'Half', 'Full', 'Other'];

const DIST_COLOR: Record<ResultDistance, string> = {
  '5K': '#32ade6', '10K': '#30d158', 'Half': '#FF6B35', 'Full': '#bf5af2', 'Other': 'rgba(255,255,255,0.42)',
};

function paceStr(durationMin: number, km: number): string {
  if (!km) return '—';
  const secPerKm = (durationMin * 60) / km;
  return `${Math.floor(secPerKm / 60)}:${Math.round(secPerKm % 60).toString().padStart(2,'0')}/km`;
}

export default function ResultsPage() {
  const [results, setResults] = useState<RaceResult[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dist, setDist] = useState<ResultDistance>('Half');
  const [h, setH] = useState('1');
  const [m, setM] = useState('59');
  const [s, setS] = useState('59');
  const [placement, setPlacement] = useState('');
  const [notes, setNotes] = useState('');

  function refresh() { setResults(loadResults()); }
  useEffect(() => { refresh(); }, []);

  function handleSave() {
    if (!name.trim()) return;
    const durationMin = (parseInt(h)||0)*60 + (parseInt(m)||0) + (parseInt(s)||0)/60;
    saveResult({ name: name.trim(), date, distance: dist, durationMin, placement, notes });
    setAdding(false);
    setName(''); setH('1'); setM('59'); setS('59'); setPlacement(''); setNotes('');
    refresh();
  }

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-6">
        <Link href="/settings" className="text-xs mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          ← Settings
        </Link>
        <p className="label mb-1.5">Official Races</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Race Results</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>Your race history & finish times</p>
      </header>

      <div className="px-5 pb-6 space-y-3">

        {/* Add button */}
        {!adding ? (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-semibold"
            style={{ background: '#FF6B35', color: '#000' }}>
            <Plus size={15} strokeWidth={2.5} /> Log Race Result
          </button>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid #FF6B3533' }}>
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">New Race Result</p>
              <button onClick={() => setAdding(false)}><X size={16} style={{ color: 'rgba(255,255,255,0.32)' }} /></button>
            </div>

            <div className="px-5 pb-3 space-y-2.5">
              {/* Name */}
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Race name (e.g. Standard Chartered HK)"
                className="w-full rounded-2xl px-4 py-3 text-sm"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }} />

              {/* Date */}
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }} />

              {/* Distance */}
              <div className="flex gap-1.5 flex-wrap">
                {DISTANCES.map(d => (
                  <button key={d} onClick={() => setDist(d)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: dist === d ? DIST_COLOR[d] + '30' : '#161616',
                      color: dist === d ? DIST_COLOR[d] : 'rgba(255,255,255,0.32)',
                      border: dist === d ? `1px solid ${DIST_COLOR[d]}55` : '1px solid transparent',
                    }}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Finish time */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.32)' }}>Finish Time</p>
                <div className="flex items-center gap-2">
                  {[
                    { v: h, set: setH, max: 9,  lbl: 'h'   },
                    { v: m, set: setM, max: 59, lbl: 'min' },
                    { v: s, set: setS, max: 59, lbl: 'sec' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>:</span>}
                      <div className="flex flex-col items-center gap-0.5">
                        <input type="number" value={f.v}
                          onChange={e => f.set(Math.min(f.max, Math.max(0, parseInt(e.target.value)||0)).toString())}
                          className="text-center font-bold rounded-xl w-14 py-2 text-base"
                          style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }}
                        />
                        <span className="text-[9px]" style={{ color: '#555' }}>{f.lbl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placement */}
              <input value={placement} onChange={e => setPlacement(e.target.value)}
                placeholder="Placement (optional, e.g. 342/1200)"
                className="w-full rounded-2xl px-4 py-2.5 text-sm"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }} />

              {/* Notes */}
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes (weather, how you felt...)"
                rows={2} className="w-full rounded-2xl px-4 py-3 text-sm resize-none"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }} />

              <button onClick={handleSave} disabled={!name.trim()}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: name.trim() ? '#FF6B35' : '#161616', color: name.trim() ? '#000' : 'rgba(255,255,255,0.2)' }}>
                <Check size={14} strokeWidth={3} /> Save Result
              </button>
            </div>
          </div>
        )}

        {/* Results list */}
        {results.length === 0 && !adding && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <div className="text-4xl mb-2 opacity-30">🏅</div>
            <p className="text-sm">No results yet. Log your first official race.</p>
          </div>
        )}

        {results.map((r, i) => {
          const color = DIST_COLOR[r.distance];
          const km = DISTANCE_KM[r.distance];
          return (
            <div key={r.id} className="rounded-3xl overflow-hidden"
              style={{ background: '#0a0a0a', border: `1px solid ${color}18` }}>
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: color + '18' }}>
                  <Flag size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    {new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    <span style={{ color }}>{r.distance}</span>
                  </div>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-2xl font-bold tabular-nums tracking-tight">
                      {formatResultTime(r.durationMin)}
                    </span>
                    {km > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {paceStr(r.durationMin, km)}
                      </span>
                    )}
                  </div>
                  {r.placement && (
                    <div className="text-xs mt-1" style={{ color: '#ff9f0a' }}>🏅 {r.placement}</div>
                  )}
                  {r.notes && (
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>{r.notes}</p>
                  )}
                </div>
                <button onClick={() => { deleteResult(r.id); refresh(); }} className="p-1 mt-0.5 shrink-0">
                  <Trash2 size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
