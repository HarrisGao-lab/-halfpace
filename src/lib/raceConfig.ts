export type RaceDistance = 'half' | 'full';

export interface RaceConfig {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  distance: RaceDistance;
  targetHours: number;
  targetMinutes: number;
  targetSeconds: number;
}

const RACES_KEY = 'races_v2';
const ACTIVE_KEY = 'active_race_id';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_RACE: RaceConfig = {
  id: 'default',
  name: 'My Half Marathon',
  date: '2026-11-08',
  distance: 'half',
  targetHours: 1,
  targetMinutes: 59,
  targetSeconds: 0,
};

// ── Storage ─────────────────────────────────────────────────────────────────

export function loadRaces(): RaceConfig[] {
  if (typeof window === 'undefined') return [DEFAULT_RACE];
  try {
    const raw = localStorage.getItem(RACES_KEY);
    if (!raw) return [DEFAULT_RACE];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_RACE];
  } catch {
    return [DEFAULT_RACE];
  }
}

export function saveRaces(races: RaceConfig[]): void {
  localStorage.setItem(RACES_KEY, JSON.stringify(races));
}

export function getActiveRaceId(): string {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem(ACTIVE_KEY) || loadRaces()[0]?.id || 'default';
}

export function setActiveRaceId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveRace(): RaceConfig {
  const races = loadRaces();
  const activeId = getActiveRaceId();
  return races.find(r => r.id === activeId) ?? races[0] ?? DEFAULT_RACE;
}

export function addRace(partial: Omit<RaceConfig, 'id'>): RaceConfig {
  const races = loadRaces();
  const newRace: RaceConfig = { ...partial, id: generateId() };
  races.push(newRace);
  saveRaces(races);
  return newRace;
}

export function updateRace(updated: RaceConfig): void {
  const races = loadRaces();
  const idx = races.findIndex(r => r.id === updated.id);
  if (idx >= 0) races[idx] = updated;
  else races.push(updated);
  saveRaces(races);
}

export function deleteRace(id: string): void {
  const races = loadRaces().filter(r => r.id !== id);
  saveRaces(races.length > 0 ? races : [DEFAULT_RACE]);
  // If we deleted the active race, switch to the first one
  if (getActiveRaceId() === id) {
    setActiveRaceId(races[0]?.id ?? 'default');
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getRaceDistanceKm(distance: RaceDistance): number {
  return distance === 'half' ? 21.0975 : 42.195;
}

export function getTargetMinutes(config: RaceConfig): number {
  return config.targetHours * 60 + config.targetMinutes + config.targetSeconds / 60;
}

export function formatTargetTime(config: RaceConfig): string {
  const h = config.targetHours;
  const m = config.targetMinutes.toString().padStart(2, '0');
  const s = config.targetSeconds.toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getDaysUntilRace(config: RaceConfig): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(config.date);
  race.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getCurrentWeekNumber(config: RaceConfig): number {
  const raceDate = new Date(config.date);
  const planStart = new Date(raceDate);
  planStart.setDate(planStart.getDate() - 19 * 7);
  const today = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const week = Math.floor((today.getTime() - planStart.getTime()) / msPerWeek) + 1;
  return Math.max(1, Math.min(week, 20));
}

export function formatCountdown(config: RaceConfig) {
  const now = new Date();
  const race = new Date(config.date);
  race.setHours(6, 0, 0, 0);
  const diff = Math.max(0, race.getTime() - now.getTime());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export function isRacePast(config: RaceConfig): boolean {
  return getDaysUntilRace(config) === 0;
}
