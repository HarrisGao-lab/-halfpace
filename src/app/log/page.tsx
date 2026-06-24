'use client';
import { useEffect, useState } from 'react';
import { loadRuns, deleteRun, paceStr, durationStr, weeklyStats, type RunEntry } from '@/lib/runLog';
import LogRunModal from '@/components/LogRunModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Plus, Trash2, Trophy, Medal, Activity } from 'lucide-react';
import Link from 'next/link';

const CHART_STYLE = { fontSize: 10, fill: '#444' };
const TOOLTIP_STYLE = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11, color: '#fff' };

const RPE_COLOR: Record<number, string> = {
  1:'#22c55e',2:'#22c55e',3:'#84cc16',4:'#eab308',
  5:'#f97316',6:'#f97316',7:'#ef4444',8:'#ef4444',9:'#dc2626',10:'#dc2626',
};

export default function LogPage() {
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'chart' | 'list'>('chart');
  const [deleting, setDeleting] = useState<string | null>(null);

  function refresh() { setRuns(loadRuns()); }

  useEffect(() => { refresh(); }, []);

  function handleDelete(id: string) {
    deleteRun(id);
    refresh();
    setDeleting(null);
  }

  const weekly = weeklyStats(runs);
  const totalKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const avgPace = runs.length
    ? runs.reduce((s, r) => s + (r.durationMin * 60) / r.distanceKm, 0) / runs.length
    : 0;
  const avgPaceStr = avgPace
    ? `${Math.floor(avgPace / 60)}:${Math.round(avgPace % 60).toString().padStart(2, '0')}`
    : '—';

  const paceChartData = [...runs].reverse().slice(-12).map(r => ({
    date: new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    pace: Math.round((r.durationMin * 60) / r.distanceKm),
  }));

  return (
    <>
      <div className="h-screen overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <header className="px-5 pt-14 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: '#555' }}>Training Log</p>
            <h1 className="text-[30px] font-bold tracking-tight text-white">My Runs</h1>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/achievements"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#161616', color: '#ff9f0a' }}>
              <Medal size={14} />
            </Link>
            <Link href="/prs"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#161616', color: '#FF6B35' }}>
              <Trophy size={14} /> PRs
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#FF6B35', color: '#000' }}
            >
              <Plus size={15} strokeWidth={2.5} /> Log Run
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="px-5 mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Total km', value: totalKm.toFixed(1) },
            { label: 'Runs', value: runs.length },
            { label: 'Avg pace', value: avgPaceStr + (avgPace ? '/km' : '') },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center"
              style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#555' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div className="px-5 mb-5">
          <div className="flex rounded-xl p-1" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
            {(['chart', 'list'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                style={{ background: tab === t ? '#2a2a2a' : 'transparent', color: tab === t ? '#fff' : '#444' }}>
                {t === 'chart' ? 'Charts' : 'Activities'}
              </button>
            ))}
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-16 px-5 pb-32">
            <Activity size={48} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 16 }} />
            <p className="text-sm" style={{ color: '#555' }}>No runs yet. Tap Log Run to add your first one.</p>
          </div>
        ) : tab === 'chart' ? (
          <div className="px-5 space-y-8 pb-32">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: '#555' }}>Weekly Volume (km)</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weekly} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 4" stroke="#1a1a1a" />
                  <XAxis dataKey="week" tick={CHART_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} km`, 'Distance']} contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="km" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {paceChartData.length > 1 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: '#555' }}>Pace Trend</p>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={paceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="1 4" stroke="#1a1a1a" />
                    <XAxis dataKey="date" tick={CHART_STYLE} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_STYLE} reversed axisLine={false} tickLine={false}
                      tickFormatter={v => `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`} />
                    <Tooltip
                      formatter={(v) => { const n=Number(v); return [`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}/km`,'Pace']; }}
                      contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#2a2a2a' }} />
                    <Line type="monotone" dataKey="pace" stroke="#FF6B35" strokeWidth={1.5}
                      dot={{ fill: '#FF6B35', r: 3, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 pb-32 space-y-2">
            {runs.map(r => {
              const isDeleting = deleting === r.id;
              return (
                <div key={r.id} className="rounded-2xl overflow-hidden"
                  style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: RPE_COLOR[r.rpe] + '22', color: RPE_COLOR[r.rpe] }}>
                      {r.rpe}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {r.distanceKm} km
                        <span className="font-normal ml-2" style={{ color: '#555' }}>
                          · {durationStr(r.durationMin)} · {paceStr(r.distanceKm, r.durationMin)}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                        {new Date(r.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {r.notes ? ` · ${r.notes}` : ''}
                      </div>
                    </div>
                    <button onClick={() => setDeleting(isDeleting ? null : r.id)}
                      style={{ color: isDeleting ? '#ef4444' : '#333' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {isDeleting && (
                    <div className="flex items-center gap-2 px-4 py-2.5"
                      style={{ borderTop: '1px solid #1a1a1a' }}>
                      <span className="text-xs flex-1" style={{ color: '#888' }}>Delete this run?</span>
                      <button onClick={() => handleDelete(r.id)}
                        className="text-xs px-3 py-1 rounded-lg font-semibold"
                        style={{ background: '#ef4444', color: '#fff' }}>Delete</button>
                      <button onClick={() => setDeleting(null)}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: '#1e1e1e', color: '#888' }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <LogRunModal onClose={() => setShowModal(false)} onSaved={refresh} />}
    </>
  );
}
