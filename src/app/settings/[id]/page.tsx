'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  loadRaces, updateRace, getDaysUntilRace, formatTargetTime,
  type RaceConfig, type RaceDistance,
} from '@/lib/raceConfig';
import { ChevronLeft, Check } from 'lucide-react';

const DISTANCE_OPTIONS: { value: RaceDistance; label: string; km: string }[] = [
  { value: 'half', label: 'Half Marathon', km: '21.1 km' },
  { value: 'full', label: 'Full Marathon', km: '42.2 km' },
];

export default function EditRacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const races = loadRaces();
    const found = races.find(r => r.id === id);
    if (found) setConfig(found);
    else router.push('/settings');
  }, [id, router]);

  if (!config) return null;

  function update<K extends keyof RaceConfig>(key: K, value: RaceConfig[K]) {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  function handleSave() {
    if (!config) return;
    updateRace(config);
    setSaved(true);
    setTimeout(() => router.push('/settings'), 700);
  }

  const daysLeft = getDaysUntilRace(config);

  const inputStyle = {
    background: '#141414',
    border: '1px solid #2a2a2a',
    color: '#fff',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    width: '100%',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#555',
    marginBottom: 8,
    display: 'block',
  };

  return (
    <div style={{ color: '#fff', minHeight: '100vh' }}>
      <header className="px-5 pt-14 pb-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1" style={{ color: '#555' }}>
          <ChevronLeft size={18} />
          <span className="text-sm">Races</span>
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: saved ? '#22c55e' : '#FF6B35', color: '#000' }}
        >
          {saved ? <><Check size={14} /> Saved</> : 'Save'}
        </button>
      </header>

      <div className="px-5 pb-6 space-y-6">
        {/* Preview card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#141414', border: '1px solid #1e1e1e' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">{config.name || 'My Race'}</div>
              <div className="text-sm mt-0.5" style={{ color: '#555' }}>
                {config.date.replace(/-/g, '/')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#FF6B35' }}>{daysLeft}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>days left</div>
            </div>
          </div>
          <div className="h-px my-4" style={{ background: '#1e1e1e' }} />
          <div className="flex justify-between text-sm" style={{ color: '#888' }}>
            <span>{config.distance === 'half' ? 'Half Marathon' : 'Full Marathon'}</span>
            <span>Target {formatTargetTime(config)}</span>
          </div>
        </div>

        {/* Race Name */}
        <div>
          <label style={labelStyle}>Race Name</label>
          <input
            type="text"
            value={config.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. Taipei Marathon 2027"
            style={inputStyle}
          />
        </div>

        {/* Race Date */}
        <div>
          <label style={labelStyle}>Race Date</label>
          <input
            type="date"
            value={config.date}
            onChange={e => update('date', e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>

        {/* Distance */}
        <div>
          <label style={labelStyle}>Distance</label>
          <div className="grid grid-cols-2 gap-3">
            {DISTANCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => update('distance', opt.value)}
                className="rounded-2xl p-4 text-left transition-all"
                style={{
                  background: '#141414',
                  border: config.distance === opt.value ? '1px solid #FF6B35' : '1px solid #1e1e1e',
                }}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#555' }}>{opt.km}</div>
                {config.distance === opt.value && (
                  <div className="mt-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#FF6B35' }}>
                    <Check size={10} color="#000" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Target time */}
        <div>
          <label style={labelStyle}>Target Finish Time</label>
          <div className="rounded-2xl p-5" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
            <div className="flex items-center justify-center gap-2">
              {[
                { label: 'hr',  value: config.targetHours,   key: 'targetHours'   as const, max: 9  },
                { label: 'min', value: config.targetMinutes, key: 'targetMinutes' as const, max: 59 },
                { label: 'sec', value: config.targetSeconds, key: 'targetSeconds' as const, max: 59 },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-2xl font-bold" style={{ color: '#333' }}>:</span>}
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="number"
                      value={f.value}
                      onChange={e => update(f.key, Math.min(f.max, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{
                        background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#fff',
                        borderRadius: 12, width: 64, textAlign: 'center',
                        fontSize: 24, fontWeight: 700, padding: '10px 0', outline: 'none',
                        WebkitAppearance: 'none',
                      }}
                      min={0} max={f.max}
                    />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#444' }}>{f.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
