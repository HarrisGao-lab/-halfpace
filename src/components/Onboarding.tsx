'use client';
import { useState } from 'react';
import { addRace, setActiveRaceId } from '@/lib/raceConfig';
import { requestPermission, saveNotifPrefs } from '@/lib/notifications';
import { saveProfile, type WeeklyKm, type DaysPerWeek, type Experience } from '@/lib/userProfile';
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
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [distance, setDistance] = useState<'half' | 'full'>('half');
  const [targetH, setTargetH] = useState('2');
  const [targetM, setTargetM] = useState('0');
  const [weeklyKm, setWeeklyKm] = useState<WeeklyKm | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().slice(0, 10);

  const TOTAL_STEPS = 8;

  function next() { setStep(s => s + 1); }

  async function handleNotif(enable: boolean) {
    if (enable) {
      const perm = await requestPermission();
      if (perm === 'granted') saveNotifPrefs({ enabled: true, hour: 7, minute: 0 });
    }
    finish();
  }

  function finish() {
    // Clear any stale race data so onboarding always starts fresh
    localStorage.removeItem('races_v2');
    localStorage.removeItem('active_race_id');
    localStorage.removeItem('generated_plan_v1');
    localStorage.removeItem('generated_plan_meta_v1');

    const race = addRace({
      name: raceName || 'My Race',
      date: raceDate || '2026-11-08',
      distance,
      targetHours: parseInt(targetH) || 2,
      targetMinutes: parseInt(targetM) || 0,
      targetSeconds: 0,
    });
    setActiveRaceId(race.id);
    saveProfile({
      weeklyKm: weeklyKm ?? 'zero',
      daysPerWeek: daysPerWeek ?? 4,
      experience: experience ?? 'beginner',
    });
    markOnboarded();
    onDone();
  }

  const steps = [
    // 0 — weekly km (auto-advance)
    {
      label: 'Fitness',
      icon: <Activity size={22} style={{ color: '#FF6B35' }} />,
      question: 'How much are you running right now?',
      content: (
        <div className="space-y-3">
          {([
            { k: 'zero' as WeeklyKm, title: 'Just starting out', sub: '0 – 10 km / week' },
            { k: 'low'  as WeeklyKm, title: 'Occasional runner',  sub: '10 – 20 km / week' },
            { k: 'medium' as WeeklyKm, title: 'Regular runner',   sub: '20 – 30 km / week' },
            { k: 'high' as WeeklyKm, title: 'Experienced',        sub: '30 + km / week' },
          ]).map(({ k, title, sub }) => (
            <button key={k} onClick={() => { setWeeklyKm(k); setTimeout(next, 220); }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: weeklyKm === k ? 'rgba(255,107,53,0.12)' : '#111',
                border: weeklyKm === k ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: weeklyKm === k ? '#FF6B35' : 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: weeklyKm === k ? '#fff' : 'rgba(255,255,255,0.6)' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      ),
    },

    // 1 — days per week (auto-advance)
    {
      label: 'Schedule',
      icon: <Activity size={22} style={{ color: '#FF6B35' }} />,
      question: 'How many days can you train each week?',
      content: (
        <div className="space-y-3">
          {([
            { d: 3 as DaysPerWeek, title: '3 days', sub: 'Mon · Wed · Sat' },
            { d: 4 as DaysPerWeek, title: '4 days', sub: 'Mon · Wed · Fri · Sat' },
            { d: 5 as DaysPerWeek, title: '5 days', sub: 'Mon · Tue · Thu · Fri · Sat' },
          ]).map(({ d, title, sub }) => (
            <button key={d} onClick={() => { setDaysPerWeek(d); setTimeout(next, 220); }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: daysPerWeek === d ? 'rgba(255,107,53,0.12)' : '#111',
                border: daysPerWeek === d ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: daysPerWeek === d ? '#FF6B35' : 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: daysPerWeek === d ? '#fff' : 'rgba(255,255,255,0.6)' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      ),
    },

    // 2 — experience (auto-advance)
    {
      label: 'Experience',
      icon: <Activity size={22} style={{ color: '#FF6B35' }} />,
      question: 'What\'s your race experience?',
      content: (
        <div className="space-y-3">
          {([
            { e: 'beginner'     as Experience, title: 'First race ever',             sub: 'Never run a half or full' },
            { e: 'intermediate' as Experience, title: 'Done a 5K or 10K',            sub: 'Some race experience' },
            { e: 'experienced'  as Experience, title: 'Half or full marathon',        sub: 'I know what I\'m doing' },
          ]).map(({ e, title, sub }) => (
            <button key={e} onClick={() => { setExperience(e); setTimeout(next, 220); }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: experience === e ? 'rgba(255,107,53,0.12)' : '#111',
                border: experience === e ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: experience === e ? '#FF6B35' : 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: experience === e ? '#fff' : 'rgba(255,255,255,0.6)' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      ),
    },

    // 3 — race distance (auto-advance)
    {
      label: 'Race',
      icon: <Flag size={22} style={{ color: '#FF6B35' }} />,
      question: 'What distance are you training for?',
      content: (
        <div className="space-y-3">
          {([
            { d: 'half' as const, title: 'Half Marathon', sub: '21.1 km · 13.1 mi' },
            { d: 'full' as const, title: 'Full Marathon',  sub: '42.2 km · 26.2 mi' },
          ]).map(({ d, title, sub }) => (
            <button key={d} onClick={() => { setDistance(d); setTimeout(next, 220); }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: distance === d ? 'rgba(255,107,53,0.12)' : '#111',
                border: distance === d ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: distance === d ? '#FF6B35' : 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: distance === d ? '#fff' : 'rgba(255,255,255,0.6)' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      ),
    },

    // 4 — race name + date (continue button)
    {
      label: 'Race details',
      icon: <Flag size={22} style={{ color: '#FF6B35' }} />,
      question: 'Tell us about your race',
      content: (
        <div className="space-y-4">
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 8 }}>Race Name</label>
            <input value={raceName} onChange={e => setRaceName(e.target.value)}
              placeholder="e.g. Tokyo Marathon 2027"
              style={inputSt} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 8 }}>Race Date</label>
            <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)}
              min={minDateStr}
              style={{ ...inputSt, colorScheme: 'dark' }} />
          </div>
          <button onClick={next}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 mt-2"
            style={{ background: '#FF6B35', color: '#000', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Continue <ChevronRight size={15} strokeWidth={3} />
          </button>
        </div>
      ),
    },

    // 5 — goal time (continue button)
    {
      label: 'Goal',
      icon: <Timer size={22} style={{ color: '#FF6B35' }} />,
      question: 'What\'s your goal finish time?',
      content: (
        <div>
          <div className="flex items-center justify-center gap-4 py-6">
            {[
              { val: targetH, set: setTargetH, max: 9, lbl: 'hr' },
              { val: targetM, set: setTargetM, max: 59, lbl: 'min' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.1)' }}>:</span>}
                <div className="flex flex-col items-center gap-2">
                  <input type="number" value={f.val}
                    onChange={e => f.set(Math.min(f.max, Math.max(0, parseInt(e.target.value) || 0)).toString())}
                    style={{ ...inputSt, width: 88, textAlign: 'center', fontSize: 36, fontWeight: 800, padding: '10px 0' }}
                    min={0} max={f.max} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{f.lbl}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 24 }}>
            Target: {targetH}h {targetM.padStart(2,'0')}min — adjustable later
          </p>
          <button onClick={next}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: '#FF6B35', color: '#000', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Continue <ChevronRight size={15} strokeWidth={3} />
          </button>
        </div>
      ),
    },

    // 6 — notifications
    {
      label: 'Reminders',
      icon: <Bell size={22} style={{ color: '#FF6B35' }} />,
      question: 'Want a daily reminder to run?',
      content: (
        <div className="space-y-3">
          <div style={{ background: '#111', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Daily at</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#FF6B35', letterSpacing: '-0.03em' }}>7:00</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Adjustable in Settings</div>
          </div>
          <button onClick={() => handleNotif(true)}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: '#FF6B35', color: '#000', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Bell size={14} /> Yes, remind me
          </button>
          <button onClick={() => handleNotif(false)}
            className="w-full py-3 rounded-2xl"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
            Skip
          </button>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center px-6"
      style={{ background: '#000' }}>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          background: '#FF6B35',
          width: `${((step + 1) / steps.length) * 100}%`,
          transition: 'width 0.35s ease',
        }} />
      </div>

      {/* Back button */}
      {step > 0 && (
        <button onClick={() => setStep(s => s - 1)}
          className="absolute top-6 left-6"
          style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ← Back
        </button>
      )}

      {/* Step counter */}
      <div className="absolute top-6 right-6"
        style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
        {step + 1} / {steps.length}
      </div>

      <div className="w-full max-w-sm mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,107,53,0.15)' }}>
            {current.icon}
          </div>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 28, lineHeight: 1.2 }}>
          {current.question}
        </h1>

        {/* Answer options */}
        {current.content}
      </div>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  background: '#111',
  border: '1px solid rgba(255,255,255,0.07)',
  color: '#fff',
  borderRadius: 12,
  padding: '14px 16px',
  fontSize: 15,
  outline: 'none',
  width: '100%',
};
