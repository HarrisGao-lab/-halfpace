'use client';
import { useState, useEffect } from 'react';
import { loadRuns } from '@/lib/runLog';
import {
  getMergedPRs, saveManualPR, deleteManualPR, formatDuration,
  type PR, type PRDistance,
} from '@/lib/prs';
import { Pencil, Trash2, Trophy, X, Check } from 'lucide-react';
import Link from 'next/link';

const DISTANCES: PRDistance[] = ['5K', '10K', 'Half', 'Full'];

const DIST_COLOR: Record<PRDistance, string> = {
  '5K':   '#32ade6',
  '10K':  '#30d158',
  'Half': '#FF6B35',
  'Full': '#bf5af2',
};

function parseDuration(h: string, m: string, s: string): number {
  return (parseInt(h) || 0) * 60 + (parseInt(m) || 0) + (parseInt(s) || 0) / 60;
}

export default function PRsPage() {
  const [prs, setPrs] = useState<Partial<Record<PRDistance, PR>>>({});
  const [editing, setEditing] = useState<PRDistance | null>(null);
  const [eh, setEh] = useState('0');
  const [em, setEm] = useState('25');
  const [es, setEs] = useState('0');
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));

  function refresh() { setPrs(getMergedPRs(loadRuns())); }
  useEffect(() => { refresh(); }, []);

  function startEdit(dist: PRDistance) {
    const pr = prs[dist];
    if (pr) {
      const totalSec = Math.round(pr.durationMin * 60);
      setEh(Math.floor(totalSec / 3600).toString());
      setEm(Math.floor((totalSec % 3600) / 60).toString());
      setEs((totalSec % 60).toString());
      setEDate(pr.date);
    } else {
      setEh('0'); setEm('25'); setEs('0');
      setEDate(new Date().toISOString().slice(0, 10));
    }
    setEditing(dist);
  }

  function saveEdit() {
    if (!editing) return;
    saveManualPR({
      distance: editing,
      durationMin: parseDuration(eh, em, es),
      date: eDate,
      source: 'manual',
    });
    setEditing(null);
    refresh();
  }

  function handleDelete(dist: PRDistance) {
    deleteManualPR(dist);
    refresh();
  }

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-6">
        <Link href="/log" className="text-xs mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          ← Back to Log
        </Link>
        <p className="label mb-1.5">Best Times</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Personal Records</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>Auto-detected from your runs · tap edit to set manually</p>
      </header>

      <div className="px-5 pb-6 space-y-3">
        {DISTANCES.map(dist => {
          const pr = prs[dist];
          const color = DIST_COLOR[dist];
          return (
            <div key={dist} className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a', border: `1px solid ${color}22` }}>
              <div className="flex items-center px-5 py-4 gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: color + '18' }}>
                  <Trophy size={22} style={{ color }} />
                </div>

                {/* Data */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: color }}>
                    {dist === 'Half' ? 'Half Marathon' : dist === 'Full' ? 'Full Marathon' : dist}
                  </div>
                  {pr ? (
                    <>
                      <div className="text-2xl font-bold tracking-tight tabular-nums">
                        {formatDuration(pr.durationMin)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {new Date(pr.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        <span style={{ color: pr.source === 'manual' ? 'rgba(255,255,255,0.32)' : '#30d158' }}>
                          {pr.source === 'manual' ? 'Manual entry' : 'Auto-detected ✓'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>No record yet</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {pr?.source === 'manual' && (
                    <button onClick={() => handleDelete(dist)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: '#ef444415' }}>
                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                    </button>
                  )}
                  <button onClick={() => startEdit(dist)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: '#161616' }}>
                    <Pencil size={14} style={{ color: 'rgba(255,255,255,0.42)' }} />
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editing === dist && (
                <div className="px-5 pb-4 pt-2" style={{ borderTop: '1px solid #1c1c1e', background: '#0a0a0a' }}>
                  <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>Enter your best time for {dist}</p>
                  <div className="flex items-center gap-2 mb-3">
                    {[
                      { v: eh, set: setEh, max: 9,  lbl: 'h'   },
                      { v: em, set: setEm, max: 59, lbl: 'min' },
                      { v: es, set: setEs, max: 59, lbl: 'sec' },
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
                    <div className="ml-2 flex-1">
                      <input type="date" value={eDate} onChange={e => setEDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                        style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ background: color, color: '#000' }}>
                      <Check size={14} strokeWidth={3} /> Save PR
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="px-4 py-2.5 rounded-2xl text-sm"
                      style={{ background: '#161616', color: 'rgba(255,255,255,0.42)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-center pt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Runs logged within 2% of race distance are auto-detected
        </p>
      </div>
    </div>
  );
}
