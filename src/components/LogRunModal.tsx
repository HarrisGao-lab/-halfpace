'use client';
import { useState } from 'react';
import { saveRun, estimateCalories } from '@/lib/runLog';
import { generatePlan, getTodayWorkoutFromPlan } from '@/lib/planEngine';
import { loadProfile } from '@/lib/userProfile';
import { loadRaces } from '@/lib/raceConfig';
import { X, Check, Heart } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  prefillKm?: number;
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat hard',
  5: 'Hard', 6: 'Hard+', 7: 'Very hard', 8: 'Very hard+',
  9: 'Max effort', 10: 'All out',
};

export default function LogRunModal({ onClose, onSaved, prefillKm }: Props) {
  const todayWorkout = getTodayWorkoutFromPlan(generatePlan(loadProfile(), loadRaces()));
  const suggestedKm = prefillKm ?? (todayWorkout && todayWorkout.distanceKm > 0 ? todayWorkout.distanceKm : undefined);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [km, setKm] = useState(suggestedKm ? String(suggestedKm) : '');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('');
  const [rpe, setRpe] = useState(5);
  const [hr, setHr] = useState('');
  const [notes, setNotes] = useState('');
  const [showHr, setShowHr] = useState(false);

  const totalMin = parseInt(hours || '0') * 60 + parseInt(minutes || '0');
  const distKm = parseFloat(km) || 0;
  const paceValid = distKm > 0 && totalMin > 0;
  const paceDisplay = paceValid
    ? (() => {
        const s = (totalMin * 60) / distKm;
        return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}/km`;
      })()
    : '—';

  const calories = paceValid ? estimateCalories(distKm, totalMin) : null;

  function handleSave() {
    if (!distKm || !totalMin) return;
    const hrNum = hr ? parseInt(hr) : undefined;
    saveRun({
      date,
      startTime: `${date}T${new Date().toTimeString().slice(0, 8)}`,
      distanceKm: distKm,
      durationMin: totalMin,
      rpe,
      heartRateAvg: hrNum,
      caloriesKcal: calories ?? undefined,
      notes,
    });
    onSaved();
    onClose();
  }

  const inputStyle = {
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#fff',
    borderRadius: 10,
    padding: '11px 13px',
    fontSize: 15,
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-3xl px-5 pt-5 overflow-y-auto"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '90vh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#2a2a2a' }} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Log a Run</h2>
            {suggestedKm && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Today's plan: {suggestedKm} km — pre-filled
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="label mb-2 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          {/* Distance */}
          <div>
            <label className="label mb-2 block">Distance (km)</label>
            <input type="number" value={km} onChange={e => setKm(e.target.value)}
              placeholder="e.g. 8.5" step="0.1" min="0"
              style={{ ...inputStyle, WebkitAppearance: 'none' as const }} />
          </div>

          {/* Duration */}
          <div>
            <label className="label mb-2 block">Duration</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                  placeholder="0" min="0" max="9"
                  style={{ ...inputStyle, textAlign: 'center', WebkitAppearance: 'none' as const }} />
                <div className="text-[10px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>hours</div>
              </div>
              <div className="flex items-center pb-5 text-xl font-bold" style={{ color: 'rgba(255,255,255,0.1)' }}>:</div>
              <div className="flex-1">
                <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)}
                  placeholder="00" min="0" max="59"
                  style={{ ...inputStyle, textAlign: 'center', WebkitAppearance: 'none' as const }} />
                <div className="text-[10px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>minutes</div>
              </div>
              <div className="flex-1 rounded-xl flex flex-col items-center justify-center"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: paceValid ? '#FF6B35' : 'rgba(255,255,255,0.15)' }}>
                  {paceDisplay}
                </div>
                {calories && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>~{calories} kcal</div>
                )}
              </div>
            </div>
          </div>

          {/* RPE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Effort (RPE)</label>
              <span style={{ fontSize: 11, color: '#FF6B35', fontWeight: 600 }}>{rpe} — {RPE_LABELS[rpe]}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setRpe(n)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: n <= rpe ? '#FF6B35' : '#141414',
                    color: n <= rpe ? '#000' : 'rgba(255,255,255,0.2)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Heart Rate — optional, toggleable */}
          <div>
            <button onClick={() => setShowHr(v => !v)}
              className="flex items-center gap-2"
              style={{ fontSize: 11, color: showHr ? '#FF6B35' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
              <Heart size={13} />
              {showHr ? 'Heart Rate (bpm)' : '+ Add heart rate (optional)'}
            </button>
            {showHr && (
              <input type="number" value={hr} onChange={e => setHr(e.target.value)}
                placeholder="e.g. 155" min="40" max="220"
                className="mt-2"
                style={{ ...inputStyle, WebkitAppearance: 'none' as const }} />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label mb-2 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel?" rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={!distKm || !totalMin}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              background: distKm && totalMin ? '#FF6B35' : '#141414',
              color: distKm && totalMin ? '#000' : 'rgba(255,255,255,0.2)',
              fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
            <Check size={16} strokeWidth={3} /> Save Run
          </button>
        </div>
      </div>
    </div>
  );
}
