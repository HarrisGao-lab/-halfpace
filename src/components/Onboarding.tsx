'use client';
import { useState } from 'react';
import { addRace, setActiveRaceId } from '@/lib/raceConfig';
import { requestPermission, saveNotifPrefs } from '@/lib/notifications';
import { saveProfile, type WeeklyKm, type DaysPerWeek, type Experience, WEEKLY_KM_LABELS, EXPERIENCE_LABELS } from '@/lib/userProfile';
import { ChevronRight, Bell, Flag, Timer, Activity } from 'lucide-react';

const ONBOARDED_KEY = 'onboarded_v1';

export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem(ONBOARDED_KEY);
}

function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, '1');
}

interface Props { onDone: () => void; }

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [raceName, setRaceName] = useState('My Half Marathon');
  const [raceDate, setRaceDate] = useState('');
  const [distance, setDistance] = useState<'half' | 'full'>('half');
  const [targetH, setTargetH] = useState('2');
  const [targetM, setTargetM] = useState('0');
  const [weeklyKm, setWeeklyKm] = useState<WeeklyKm>('zero');
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek>(4);
  const [experience, setExperience] = useState<Experience>('beginner');

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().slice(0, 10);

  async function handleNotif(enable: boolean) {
    if (enable) {
      const perm = await requestPermission();
      if (perm === 'granted') {
        saveNotifPrefs({ enabled: true, hour: 7, minute: 0 });
      }
    }
    finish();
  }

  function finish() {
    const dateVal = raceDate || '2026-11-08';
    const race = addRace({
      name: raceName || 'My Race',
      date: dateVal,
      distance,
      targetHours: parseInt(targetH) || 2,
      targetMinutes: parseInt(targetM) || 0,
      targetSeconds: 0,
    });
    setActiveRaceId(race.id);
    saveProfile({ weeklyKm, daysPerWeek, experience });
    markOnboarded();
    onDone();
  }

  const steps = [
    {
      icon: <Activity size={28} style={{ color: '#FF6B35' }} />,
      title: 'Your Fitness',
      subtitle: 'We\'ll build a plan that fits where you are now',
      content: (
        <div className="space-y-5">
          {/* Current weekly km */}
          <div>
            <div className="label mb-3">How much do you run right now?</div>
            <div className="space-y-2">
              {(['zero','low','medium','high'] as WeeklyKm[]).map(k => (
                <button key={k} onClick={() => setWeeklyKm(k)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                  style={{
                    background: weeklyKm === k ? 'rgba(255,107,53,0.1)' : '#141414',
                    border: weeklyKm === k ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: weeklyKm === k ? '#FF6B35' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: weeklyKm === k ? '#fff' : 'rgba(255,255,255,0.5)' }}>{WEEKLY_KM_LABELS[k]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Days per week */}
          <div>
            <div className="label mb-3">How many days can you train per week?</div>
            <div className="flex gap-2">
              {([3,4,5] as DaysPerWeek[]).map(d => (
                <button key={d} onClick={() => setDaysPerWeek(d)}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{
                    background: daysPerWeek === d ? '#FF6B35' : '#141414',
                    color: daysPerWeek === d ? '#000' : 'rgba(255,255,255,0.4)',
                    fontSize: 15, border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <div className="label mb-3">Race experience</div>
            <div className="space-y-2">
              {(['beginner','intermediate','experienced'] as Experience[]).map(e => (
                <button key={e} onClick={() => setExperience(e)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                  style={{
                    background: experience === e ? 'rgba(255,107,53,0.1)' : '#141414',
                    border: experience === e ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: experience === e ? '#FF6B35' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: experience === e ? '#fff' : 'rgba(255,255,255,0.5)' }}>{EXPERIENCE_LABELS[e]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Flag size={28} style={{ color: '#FF6B35' }} />,
      title: 'Your Race',
      subtitle: 'Set up your goal race to start training',
      content: (
        <div className="space-y-4">
          <div>
            <label className="label mb-2 block">Race Name</label>
            <input value={raceName} onChange={e => setRaceName(e.target.value)}
              placeholder="e.g. Tokyo Marathon 2027"
              style={inputSt} />
          </div>
          <div>
            <label className="label mb-2 block">Race Date</label>
            <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)}
              min={minDateStr}
              style={{ ...inputSt, colorScheme: 'dark' }} />
          </div>
          <div>
            <label className="label mb-2 block">Distance</label>
            <div className="flex gap-2">
              {(['half', 'full'] as const).map(d => (
                <button key={d} onClick={() => setDistance(d)}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{
                    background: distance === d ? '#FF6B35' : '#141414',
                    color: distance === d ? '#000' : 'rgba(255,255,255,0.4)',
                    fontSize: 13,
                  }}>
                  {d === 'half' ? 'Half Marathon' : 'Full Marathon'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Timer size={28} style={{ color: '#FF6B35' }} />,
      title: 'Goal Time',
      subtitle: 'What finish time are you aiming for?',
      content: (
        <div>
          <div className="flex items-center justify-center gap-6 py-4">
            {[
              { val: targetH, set: setTargetH, max: 9, lbl: 'hours' },
              { val: targetM, set: setTargetM, max: 59, lbl: 'minutes' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>:</span>}
                <div className="flex flex-col items-center gap-2">
                  <input type="number" value={f.val}
                    onChange={e => f.set(Math.min(f.max, Math.max(0, parseInt(e.target.value) || 0)).toString())}
                    style={{ ...inputSt, width: 80, textAlign: 'center', fontSize: 32, fontWeight: 800, padding: '12px 0' }}
                    min={0} max={f.max}
                  />
                  <span className="label">{f.lbl}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Target: {targetH}:{targetM.padStart(2,'0')}:00 — you can always adjust this later
          </p>
        </div>
      ),
    },
    {
      icon: <Bell size={28} style={{ color: '#FF6B35' }} />,
      title: 'Stay on Track',
      subtitle: 'Get a daily reminder to run',
      content: (
        <div className="space-y-3 py-2">
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, textAlign: 'center' }}>
            We&apos;ll send you a push notification every morning so you never miss a training day.
          </p>
          <div style={{ background: '#141414', borderRadius: 14, padding: '16px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Daily reminder at</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B35' }}>7:00 AM</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Adjustable in Settings</div>
          </div>
          <button onClick={() => handleNotif(true)}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: '#FF6B35', color: '#000', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Bell size={15} /> Enable Reminders
          </button>
          <button onClick={() => handleNotif(false)}
            className="w-full py-3 rounded-2xl"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
            Skip for now
          </button>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: '#000' }}>
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i <= step ? '#FF6B35' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,107,53,0.2)' }}>
            {current.icon}
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 6 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 32 }}>
          {current.subtitle}
        </p>

        {/* Step content */}
        {current.content}

        {/* Next button (shown on non-last steps) */}
        {!isLast && (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full mt-6 py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: '#FF6B35', color: '#000', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Continue <ChevronRight size={15} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  background: '#141414',
  border: '1px solid rgba(255,255,255,0.07)',
  color: '#fff',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  outline: 'none',
  width: '100%',
};
