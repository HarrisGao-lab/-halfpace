export interface Shoe {
  id: string;
  name: string;
  brand: string;
  color: string;    // hex
  startKm: number;  // odometer at start (if transferring from another tracker)
  maxKm: number;    // retirement threshold (default 700)
  addedDate: string; // YYYY-MM-DD
  retired: boolean;
  notes: string;
}

export interface RunEntry_ShoeId {
  runId: string;
  shoeId: string;
}

const SHOE_KEY = 'shoes_v1';
const SHOE_RUN_KEY = 'shoe_runs_v1';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── Shoe CRUD ──────────────────────────────────────────────────────────────

export function loadShoes(): Shoe[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SHOE_KEY) || '[]'); } catch { return []; }
}

export function saveShoe(shoe: Omit<Shoe, 'id'>): Shoe {
  const shoes = loadShoes();
  const newShoe: Shoe = { ...shoe, id: uid() };
  shoes.push(newShoe);
  localStorage.setItem(SHOE_KEY, JSON.stringify(shoes));
  return newShoe;
}

export function updateShoe(id: string, updates: Partial<Shoe>): void {
  const shoes = loadShoes().map(s => s.id === id ? { ...s, ...updates } : s);
  localStorage.setItem(SHOE_KEY, JSON.stringify(shoes));
}

export function deleteShoe(id: string): void {
  const shoes = loadShoes().filter(s => s.id !== id);
  localStorage.setItem(SHOE_KEY, JSON.stringify(shoes));
  // Remove run associations
  const assocs = loadShoeRuns().filter(a => a.shoeId !== id);
  localStorage.setItem(SHOE_RUN_KEY, JSON.stringify(assocs));
}

// ── Run-Shoe associations ──────────────────────────────────────────────────

export function loadShoeRuns(): RunEntry_ShoeId[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SHOE_RUN_KEY) || '[]'); } catch { return []; }
}

export function assignRunToShoe(runId: string, shoeId: string): void {
  const assocs = loadShoeRuns().filter(a => a.runId !== runId);
  assocs.push({ runId, shoeId });
  localStorage.setItem(SHOE_RUN_KEY, JSON.stringify(assocs));
}

export function getRunShoe(runId: string): string | null {
  return loadShoeRuns().find(a => a.runId === runId)?.shoeId ?? null;
}

// ── Mileage per shoe ──────────────────────────────────────────────────────

export function shoeKm(shoeId: string, runs: { id: string; distanceKm: number }[]): number {
  const shoe = loadShoes().find(s => s.id === shoeId);
  if (!shoe) return 0;
  const assocs = loadShoeRuns();
  const runIds = new Set(assocs.filter(a => a.shoeId === shoeId).map(a => a.runId));
  const logged = runs.filter(r => runIds.has(r.id)).reduce((s, r) => s + r.distanceKm, 0);
  return Math.round(shoe.startKm + logged);
}

// ── Retirement status ─────────────────────────────────────────────────────

export function shoeStatus(km: number, maxKm: number): {
  pct: number;
  label: string;
  color: string;
} {
  const pct = Math.min(100, Math.round((km / maxKm) * 100));
  if (pct >= 100) return { pct, label: 'Replace now', color: '#ef4444' };
  if (pct >= 85)  return { pct, label: 'Nearing end', color: '#ff9f0a' };
  if (pct >= 60)  return { pct, label: 'Mid-life',    color: '#eab308' };
  return               { pct, label: 'Fresh',         color: '#30d158' };
}

// ── Active (non-retired) shoes ────────────────────────────────────────────

export function activeShoes(): Shoe[] {
  return loadShoes().filter(s => !s.retired);
}
