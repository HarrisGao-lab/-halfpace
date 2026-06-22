'use client';
import { useEffect, useState } from 'react';
import { formatCountdown, getActiveRace } from '@/lib/raceConfig';

export default function Countdown() {
  const [tick, setTick] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const config = getActiveRace();
    function update() { setTick(formatCountdown(config)); }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  const units = [
    { value: tick.days,    label: 'Days' },
    { value: tick.hours,   label: 'Hrs'  },
    { value: tick.minutes, label: 'Min'  },
    { value: tick.seconds, label: 'Sec'  },
  ];

  return (
    <div className="flex items-end gap-0">
      {units.map(({ value, label }, i) => (
        <div key={label} className="flex-1 flex flex-col items-center" style={{ gap: 4 }}>
          <div
            className="tabular-nums w-full text-center"
            style={{
              fontSize: i === 0 ? 52 : 36,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: i === 0 ? '#FF6B35' : i === 3 ? 'rgba(255,255,255,0.3)' : '#fff',
            }}
          >
            {String(value).padStart(2, '0')}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
