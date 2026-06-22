'use client';
import { useState, useEffect } from 'react';
import {
  loadInjuries, saveInjury, deleteInjury,
  BODY_GROUPS, ZONE_LABELS, SEVERITY_META,
  type BodyZone, type Severity, type InjuryEntry,
} from '@/lib/injuries';
import { Plus, Trash2, X, Check } from 'lucide-react';
import Link from 'next/link';

export default function InjuryPage() {
  const [entries, setEntries] = useState<InjuryEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedZones, setSelectedZones] = useState<BodyZone[]>([]);
  const [severity, setSeverity] = useState<Severity>(1);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function refresh() { setEntries(loadInjuries()); }
  useEffect(() => { refresh(); }, []);

  function toggleZone(z: BodyZone) {
    setSelectedZones(prev =>
      prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]
    );
  }

  function handleSave() {
    if (!selectedZones.length) return;
    saveInjury({ date, zones: selectedZones, severity, notes });
    setAdding(false);
    setSelectedZones([]);
    setSeverity(1);
    setNotes('');
    setDate(new Date().toISOString().slice(0, 10));
    refresh();
  }

  // Get active zones from last 14 days
  const recentZones = new Set<BodyZone>();
  entries.filter(i => (Date.now() - new Date(i.date).getTime()) / 86400000 <= 14)
         .forEach(i => i.zones.forEach(z => recentZones.add(z)));

  return (
    <div style={{ color: '#fff' }}>
      <header className="px-5 safe-top pb-6">
        <Link href="/" className="text-xs mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          ← Back
        </Link>
        <p className="label mb-1.5">Body Tracking</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>Injury Log</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>Track pain & soreness to spot patterns</p>
      </header>

      <div className="px-5 pb-6 space-y-4">

        {/* Active pain map */}
        {recentZones.size > 0 && (
          <div className="rounded-3xl p-4" style={{ background: '#0a0a0a', border: '1px solid #ef444422' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#ef4444' }}>
              Active Pain (last 14 days)
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(recentZones).map(z => (
                <span key={z} className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444433' }}>
                  {ZONE_LABELS[z]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add entry */}
        {!adding ? (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-semibold"
            style={{ background: '#0a0a0a', border: '1px dashed #2c2c2e', color: 'rgba(255,255,255,0.42)' }}>
            <Plus size={16} /> Log Pain / Soreness
          </button>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid #ff9f0a33' }}>
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">New Entry</p>
              <button onClick={() => setAdding(false)}>
                <X size={16} style={{ color: 'rgba(255,255,255,0.32)' }} />
              </button>
            </div>

            {/* Date */}
            <div className="px-5 pb-3">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }} />
            </div>

            {/* Body zones */}
            <div className="px-5 pb-3 space-y-3">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>Where does it hurt? (tap all that apply)</p>
              {BODY_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.zones.map(z => {
                      const active = selectedZones.includes(z);
                      return (
                        <button key={z} onClick={() => toggleZone(z)}
                          className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                          style={{
                            background: active ? '#ef444425' : '#161616',
                            color: active ? '#ef4444' : 'rgba(255,255,255,0.32)',
                            border: active ? '1px solid #ef444444' : '1px solid transparent',
                          }}>
                          {ZONE_LABELS[z]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Severity */}
            <div className="px-5 pb-3">
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.32)' }}>Severity</p>
              <div className="flex gap-2">
                {([1, 2, 3] as Severity[]).map(s => {
                  const meta = SEVERITY_META[s];
                  return (
                    <button key={s} onClick={() => setSeverity(s)}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5"
                      style={{
                        background: severity === s ? meta.color + '25' : '#161616',
                        color: severity === s ? meta.color : 'rgba(255,255,255,0.32)',
                        border: severity === s ? `1px solid ${meta.color}44` : '1px solid transparent',
                      }}>
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="px-5 pb-4">
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any notes (optional)..."
                rows={2}
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none"
                style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }}
              />
            </div>

            {/* Save */}
            <div className="px-5 pb-4">
              <button onClick={handleSave}
                disabled={!selectedZones.length}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  background: selectedZones.length ? '#FF6B35' : '#161616',
                  color: selectedZones.length ? '#000' : 'rgba(255,255,255,0.2)',
                }}>
                <Check size={14} strokeWidth={3} /> Save Entry
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {entries.length > 0 && (
          <div>
            <p className="label mb-3">History</p>
            <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a' }}>
              {entries.map((entry, i) => {
                const meta = SEVERITY_META[entry.severity];
                return (
                  <div key={entry.id}
                    className="flex items-start gap-3 px-5 py-4"
                    style={{ borderTop: i > 0 ? '1px solid #1c1c1e' : 'none' }}>
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                          {new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.zones.map(z => (
                          <span key={z} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: '#161616', color: 'rgba(255,255,255,0.42)' }}>
                            {ZONE_LABELS[z]}
                          </span>
                        ))}
                      </div>
                      {entry.notes && (
                        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.32)' }}>{entry.notes}</p>
                      )}
                    </div>
                    <button onClick={() => { deleteInjury(entry.id); refresh(); }}
                      className="p-1 mt-0.5 shrink-0">
                      <Trash2 size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {entries.length === 0 && !adding && (
          <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <div className="text-3xl mb-2 opacity-30">🩺</div>
            <p className="text-sm">No entries yet. Log pain early to prevent overuse injuries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
