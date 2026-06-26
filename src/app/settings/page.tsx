'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  loadRaces, getActiveRaceId, setActiveRaceId, deleteRace, addRace,
  getDaysUntilRace, formatTargetTime, isRacePast,
  type RaceConfig,
} from '@/lib/raceConfig';
import {
  loadNotifPrefs, saveNotifPrefs, requestPermission, getPermission,
  type NotifPrefs,
} from '@/lib/notifications';
import { Plus, ChevronRight, Check, Trash2, Bell, BellOff, Flag, HeartPulse, Medal, Download, Upload, Smartphone, RefreshCw, Zap, Footprints } from 'lucide-react';
import { exportAllData, importAllData } from '@/lib/runLog';
import {
  isStravaConnected, getStravaToken, saveStravaToken, clearStravaToken,
  getStravaAuthUrl, syncStravaRuns, type StravaToken,
} from '@/lib/strava';
import Link from 'next/link';

function RacesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [races, setRaces] = useState<RaceConfig[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notif, setNotif] = useState<NotifPrefs>({ enabled: false, hour: 7, minute: 0 });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [importMsg, setImportMsg] = useState('');
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaAthlete, setStravaAthlete] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    setRaces(loadRaces());
    setActiveId(getActiveRaceId());
    setNotif(loadNotifPrefs());
    setPermission(getPermission());
    setStravaConnected(isStravaConnected());
    const t = getStravaToken();
    if (t) setStravaAthlete(t.athlete_name);
  }, []);

  // Handle OAuth callback redirect — URL params from /api/strava/callback
  useEffect(() => {
    const status = searchParams.get('strava');
    if (status === 'connected') {
      const token: StravaToken = {
        access_token: searchParams.get('access_token') ?? '',
        refresh_token: searchParams.get('refresh_token') ?? '',
        expires_at: parseInt(searchParams.get('expires_at') ?? '0'),
        athlete_id: parseInt(searchParams.get('athlete_id') ?? '0'),
        athlete_name: searchParams.get('athlete_name') ?? '',
        athlete_avatar: searchParams.get('athlete_avatar') ?? '',
      };
      saveStravaToken(token);
      setStravaConnected(true);
      setStravaAthlete(token.athlete_name);
      setSyncMsg('Strava connected! Tap Sync to import your runs.');
      // Clean up URL
      router.replace('/settings');
    } else if (status === 'denied' || status === 'error') {
      setSyncMsg('Could not connect to Strava. Please try again.');
      router.replace('/settings');
    }
  }, [searchParams, router]);

  async function handleStravaSync() {
    setSyncing(true);
    setSyncMsg('Syncing...');
    try {
      const { imported, skipped } = await syncStravaRuns();
      setSyncMsg(`Imported ${imported} new run${imported !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} skipped` : ''}.`);
    } catch (e) {
      setSyncMsg(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  function handleStravaDisconnect() {
    clearStravaToken();
    setStravaConnected(false);
    setStravaAthlete('');
    setSyncMsg('');
  }

  async function handleNotifToggle() {
    if (!notif.enabled) {
      const perm = await requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
      const updated = { ...notif, enabled: true };
      setNotif(updated);
      saveNotifPrefs(updated);
    } else {
      const updated = { ...notif, enabled: false };
      setNotif(updated);
      saveNotifPrefs(updated);
    }
  }

  function handleTimeChange(field: 'hour' | 'minute', val: string) {
    const num = parseInt(val) || 0;
    const clamped = field === 'hour' ? Math.min(23, Math.max(0, num)) : Math.min(59, Math.max(0, num));
    const updated = { ...notif, [field]: clamped };
    setNotif(updated);
    saveNotifPrefs(updated);
  }

  function handleSetActive(id: string) {
    setActiveRaceId(id);
    setActiveId(id);
  }

  function handleDelete(id: string) {
    deleteRace(id);
    const updated = loadRaces();
    setRaces(updated);
    setActiveId(getActiveRaceId());
    setDeleting(null);
  }

  function handleAddRace() {
    const newRace = addRace({
      name: 'New Race',
      date: new Date(Date.now() + 20 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      distance: 'half',
      targetHours: 1,
      targetMinutes: 59,
      targetSeconds: 0,
    });
    router.push(`/settings/${newRace.id}`);
  }

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halfpace-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const restored = importAllData(ev.target?.result as string);
        setImportMsg(`Restored ${restored} data sets. Reload to see changes.`);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportMsg('Import failed — invalid file.');
      }
    };
    reader.readAsText(file);
  }

  const sorted = [...races].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="h-screen overflow-y-auto" style={{ color: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <header className="px-5 pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: '#555' }}>Your Races</p>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>Race Manager</h1>
        </div>
        <button
          onClick={handleAddRace}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#FF6B35', color: '#000' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Race
        </button>
      </header>

      <div className="px-5 pb-6 space-y-3">
        {sorted.length === 0 && (
          <div className="text-center py-12" style={{ color: '#444' }}>
            <Flag size={40} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 12 }} />
            <p className="text-sm">No races yet. Add your first one.</p>
          </div>
        )}

        {sorted.map(race => {
          const isActive = race.id === activeId;
          const past = isRacePast(race);
          const days = getDaysUntilRace(race);
          const isConfirmingDelete = deleting === race.id;

          return (
            <div
              key={race.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#141414',
                border: isActive ? '1px solid #FF6B35' : '1px solid #1e1e1e',
              }}
            >
              {/* Main row */}
              <div className="flex items-center px-4 py-4 gap-3">
                {/* Active indicator / set active button */}
                <button
                  onClick={() => handleSetActive(race.id)}
                  className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: isActive ? '#FF6B35' : '#333',
                    background: isActive ? '#FF6B35' : 'transparent',
                  }}
                >
                  {isActive && <Check size={12} color="#000" strokeWidth={3} />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{race.name}</span>
                    {past && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                        style={{ background: '#1e1e1e', color: '#555' }}
                      >
                        Finished
                      </span>
                    )}
                    {isActive && !past && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 font-semibold"
                        style={{ background: '#FF6B3520', color: '#FF6B35' }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                    {race.date.replace(/-/g, '/')}
                    {' · '}
                    {race.distance === 'half' ? 'Half' : 'Full'} Marathon
                    {' · '}
                    Target {formatTargetTime(race)}
                  </div>
                </div>

                {/* Days left */}
                <div className="text-right shrink-0 mr-1">
                  {!past ? (
                    <>
                      <div className="text-lg font-bold" style={{ color: isActive ? '#FF6B35' : '#fff' }}>{days}</div>
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: '#555' }}>days</div>
                    </>
                  ) : (
                    <div className="text-sm" style={{ color: '#333' }}>—</div>
                  )}
                </div>

                {/* Edit */}
                <button
                  onClick={() => router.push(`/settings/${race.id}`)}
                  className="p-1.5 rounded-lg"
                  style={{ color: '#444' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Delete confirm row */}
              {races.length > 1 && (
                <div
                  className="flex items-center px-4 py-2.5"
                  style={{ borderTop: '1px solid #1a1a1a' }}
                >
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-xs flex-1" style={{ color: '#888' }}>Delete this race?</span>
                      <button
                        onClick={() => handleDelete(race.id)}
                        className="text-xs px-3 py-1 rounded-lg font-semibold"
                        style={{ background: '#ef4444', color: '#fff' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleting(null)}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: '#1e1e1e', color: '#888' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleting(race.id)}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: '#444' }}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-center pt-2" style={{ color: '#333' }}>
          Tap the circle to set active race · Tap → to edit
        </p>

        {/* Quick links */}
        <div className="mt-8">
          <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>More</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
            <Link href="/results"
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#FF6B3520' }}>
                <Flag size={15} style={{ color: '#FF6B35' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Race Results</div>
                <div className="text-xs" style={{ color: '#555' }}>Log your official race finish times</div>
              </div>
              <ChevronRight size={15} style={{ color: '#444' }} />
            </Link>
            <Link href="/injury"
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ef444420' }}>
                <HeartPulse size={15} style={{ color: '#ef4444' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Injury Log</div>
                <div className="text-xs" style={{ color: '#555' }}>Track pain & soreness patterns</div>
              </div>
              <ChevronRight size={15} style={{ color: '#444' }} />
            </Link>
            <Link href="/achievements"
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ff9f0a20' }}>
                <Medal size={15} style={{ color: '#ff9f0a' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Achievements</div>
                <div className="text-xs" style={{ color: '#555' }}>Milestones & badges</div>
              </div>
              <ChevronRight size={15} style={{ color: '#444' }} />
            </Link>
            <Link href="/shoes"
              className="flex items-center gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,53,0.12)' }}>
                <Footprints size={15} style={{ color: '#FF6B35' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Shoe Tracker</div>
                <div className="text-xs" style={{ color: '#555' }}>Track mileage per shoe pair</div>
              </div>
              <ChevronRight size={15} style={{ color: '#444' }} />
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <div className="mt-8">
          <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>Notifications</p>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
            {/* Toggle */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: notif.enabled ? '#FF6B3520' : '#161616' }}>
                  {notif.enabled
                    ? <Bell size={16} style={{ color: '#FF6B35' }} />
                    : <BellOff size={16} style={{ color: '#555' }} />}
                </div>
                <div>
                  <div className="text-sm font-semibold">Daily Run Reminder</div>
                  <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                    {permission === 'denied'
                      ? 'Blocked — enable in phone Settings'
                      : notif.enabled ? 'You\'ll be reminded to run' : 'Off'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleNotifToggle}
                disabled={permission === 'denied'}
                className="relative w-12 h-7 rounded-full transition-all"
                style={{
                  background: notif.enabled ? '#FF6B35' : 'rgba(255,255,255,0.08)',
                  opacity: permission === 'denied' ? 0.4 : 1,
                }}
              >
                <div
                  className="absolute top-0.5 w-6 h-6 rounded-full transition-all"
                  style={{
                    background: '#fff',
                    left: notif.enabled ? '22px' : '2px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}
                />
              </button>
            </div>

            {/* Time picker — only shown when enabled */}
            {notif.enabled && (
              <div className="px-4 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #1a1a1a' }}>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.42)' }}>Remind me at</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={23} value={notif.hour}
                    onChange={e => handleTimeChange('hour', e.target.value)}
                    className="text-center text-lg font-bold rounded-xl w-14 py-2"
                    style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }}
                  />
                  <span className="text-xl font-bold" style={{ color: '#444' }}>:</span>
                  <input
                    type="number" min={0} max={59} value={notif.minute.toString().padStart(2,'0')}
                    onChange={e => handleTimeChange('minute', e.target.value)}
                    className="text-center text-lg font-bold rounded-xl w-14 py-2"
                    style={{ background: '#161616', color: '#fff', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>

          {permission !== 'denied' && (
            <p className="text-xs mt-2 px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Notifications fire when the app is open or running in the background.
              For best results, add HalfPace to your Home Screen.
            </p>
          )}
        </div>

        {/* Strava */}
        <div className="mt-8">
          <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>Integrations</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>
            {stravaConnected ? (
              <>
                <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,76,2,0.15)' }}>
                    <Zap size={15} style={{ color: '#FC4C02' }} />
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Strava</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      Connected{stravaAthlete ? ` as ${stravaAthlete}` : ''}
                    </div>
                  </div>
                  <button onClick={handleStravaDisconnect}
                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                    Disconnect
                  </button>
                </div>
                <button onClick={handleStravaSync} disabled={syncing}
                  className="flex items-center gap-3 px-4 py-4 w-full text-left">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,76,2,0.1)' }}>
                    <RefreshCw size={15} style={{ color: '#FC4C02', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{syncing ? 'Syncing…' : 'Sync Activities'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {syncMsg || 'Import your latest Strava runs'}
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <button onClick={() => { window.location.href = getStravaAuthUrl(); }}
                className="flex items-center gap-3 px-4 py-4 w-full text-left">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,76,2,0.15)' }}>
                  <Zap size={15} style={{ color: '#FC4C02' }} />
                </div>
                <div className="flex-1">
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Connect Strava</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {syncMsg || 'Auto-import your runs from Strava'}
                  </div>
                </div>
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Data & Health */}
        <div className="mt-8">
          <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#555' }}>Data & Backup</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Export */}
            <button onClick={handleExport}
              className="flex items-center gap-3 px-4 py-4 w-full text-left"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(50,173,230,0.15)' }}>
                <Download size={15} style={{ color: '#32ade6' }} />
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 14, fontWeight: 600 }}>Export All Data</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Download JSON backup of all runs, races & settings</div>
              </div>
              <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </button>

            {/* Import */}
            <label className="flex items-center gap-3 px-4 py-4 cursor-pointer"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(48,209,88,0.15)' }}>
                <Upload size={15} style={{ color: '#30d158' }} />
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 14, fontWeight: 600 }}>Import Backup</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {importMsg || 'Restore from a HalfPace JSON export'}
                </div>
              </div>
              <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            {/* Health API teaser */}
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(191,90,242,0.15)' }}>
                <Smartphone size={15} style={{ color: '#bf5af2' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Apple Health / Google Fit</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.5 }}>
                  Coming soon. Your export file already includes workout session data in HealthKit & Google Fit compatible format — ready to sync when the native integration ships.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pb-32" />
      </div>
    </div>
  );
}

// useSearchParams requires Suspense boundary in Next.js App Router
export default function SettingsPageWrapper() {
  return (
    <Suspense>
      <RacesPage />
    </Suspense>
  );
}
