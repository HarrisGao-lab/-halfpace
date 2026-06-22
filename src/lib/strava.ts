import type { RunEntry } from './runLog';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;       // unix seconds
  athlete_id: number;
  athlete_name: string;
  athlete_avatar: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string; // "YYYY-MM-DDTHH:MM:SSZ"
  distance: number;         // metres
  moving_time: number;      // seconds
  average_heartrate?: number;
  calories?: number;
}

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'strava_token_v1';
const LAST_SYNC_KEY = 'strava_last_sync';

export function getStravaToken(): StravaToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveStravaToken(token: StravaToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function clearStravaToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function isStravaConnected(): boolean {
  return !!getStravaToken();
}

// ── OAuth URL ─────────────────────────────────────────────────────────────────

export function getStravaAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = `${base}/api/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function getValidToken(): Promise<StravaToken | null> {
  const token = getStravaToken();
  if (!token) return null;

  // Still valid (5-min buffer)
  if (token.expires_at - 300 > Date.now() / 1000) return token;

  try {
    const res = await fetch('/api/strava/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token.refresh_token }),
    });
    if (!res.ok) { clearStravaToken(); return null; }
    const data = await res.json();
    const refreshed: StravaToken = {
      ...token,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };
    saveStravaToken(refreshed);
    return refreshed;
  } catch { return null; }
}

// ── Fetch activities ──────────────────────────────────────────────────────────

export async function fetchStravaActivities(
  accessToken: string,
  after?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: '100' });
  if (after) params.set('after', String(after));

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Strava API ${res.status}`);
  return res.json();
}

// ── Convert Strava activity → RunEntry ────────────────────────────────────────

function estimateRpe(a: StravaActivity): number {
  if (a.average_heartrate) {
    if (a.average_heartrate < 130) return 3;
    if (a.average_heartrate < 145) return 4;
    if (a.average_heartrate < 158) return 6;
    if (a.average_heartrate < 168) return 7;
    return 8;
  }
  const paceSecPerKm = a.moving_time / (a.distance / 1000);
  if (paceSecPerKm > 360) return 3;
  if (paceSecPerKm > 300) return 5;
  if (paceSecPerKm > 260) return 7;
  return 8;
}

export function stravaToRunEntry(a: StravaActivity): RunEntry | null {
  const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type ?? a.type);
  if (!isRun) return null;

  const distanceKm = Math.round(a.distance / 10) / 100;
  const durationMin = Math.round(a.moving_time / 60);
  if (distanceKm < 0.5 || durationMin < 1) return null;

  const genericNames = ['Morning Run', 'Afternoon Run', 'Evening Run', 'Lunch Run', 'Night Run'];
  const notes = genericNames.includes(a.name) ? '' : a.name;

  return {
    id: `strava_${a.id}`,
    date: a.start_date_local.slice(0, 10),
    startTime: a.start_date_local,
    distanceKm,
    durationMin,
    rpe: estimateRpe(a),
    heartRateAvg: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    caloriesKcal: a.calories ? Math.round(a.calories) : undefined,
    notes,
    source: 'strava',
    stravaId: a.id,
  };
}

// ── Full sync ─────────────────────────────────────────────────────────────────

export async function syncStravaRuns(): Promise<{ imported: number; skipped: number }> {
  const token = await getValidToken();
  if (!token) throw new Error('Not connected to Strava');

  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  const after = lastSync ? parseInt(lastSync) : undefined;

  const activities = await fetchStravaActivities(token.access_token, after);
  const { loadRuns, saveRunsDirect } = await import('./runLog');

  const existing = loadRuns();
  const existingIds = new Set(existing.map(r => r.id));

  let imported = 0;
  let skipped = 0;
  const newRuns: RunEntry[] = [];

  for (const activity of activities) {
    const entry = stravaToRunEntry(activity);
    if (!entry) { skipped++; continue; }
    if (existingIds.has(entry.id)) { skipped++; continue; }
    newRuns.push(entry);
    imported++;
  }

  if (newRuns.length > 0) {
    const merged = [...newRuns, ...existing].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    saveRunsDirect(merged);
  }

  localStorage.setItem(LAST_SYNC_KEY, String(Math.floor(Date.now() / 1000)));
  return { imported, skipped };
}

// ── Legacy helpers kept for compatibility ─────────────────────────────────────

export const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!;

export function speedToPace(speedMs: number): string {
  if (!speedMs) return '—';
  const secsPerKm = 1000 / speedMs;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function metersToKm(m: number): string {
  return (m / 1000).toFixed(1);
}

export function secondsToTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
