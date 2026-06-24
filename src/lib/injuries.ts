export type BodyZone =
  | 'left_knee' | 'right_knee'
  | 'left_shin' | 'right_shin'
  | 'left_calf' | 'right_calf'
  | 'left_hip' | 'right_hip'
  | 'lower_back'
  | 'left_ankle' | 'right_ankle'
  | 'left_foot' | 'right_foot'
  | 'it_band_left' | 'it_band_right'
  | 'left_hamstring' | 'right_hamstring';

export const ZONE_LABELS: Record<BodyZone, string> = {
  left_knee:      'Left Knee',
  right_knee:     'Right Knee',
  left_shin:      'Left Shin',
  right_shin:     'Right Shin',
  left_calf:      'Left Calf',
  right_calf:     'Right Calf',
  left_hip:       'Left Hip',
  right_hip:      'Right Hip',
  lower_back:     'Lower Back',
  left_ankle:     'Left Ankle',
  right_ankle:    'Right Ankle',
  left_foot:      'Left Foot',
  right_foot:     'Right Foot',
  it_band_left:   'IT Band (L)',
  it_band_right:  'IT Band (R)',
  left_hamstring: 'Left Hamstring',
  right_hamstring:'Right Hamstring',
};

// Common runner injuries grouped for UI
export const BODY_GROUPS: { label: string; zones: BodyZone[] }[] = [
  { label: 'Hip & Back',    zones: ['left_hip', 'right_hip', 'lower_back'] },
  { label: 'IT Band',       zones: ['it_band_left', 'it_band_right'] },
  { label: 'Hamstring',     zones: ['left_hamstring', 'right_hamstring'] },
  { label: 'Knee',          zones: ['left_knee', 'right_knee'] },
  { label: 'Shin & Calf',   zones: ['left_shin', 'right_shin', 'left_calf', 'right_calf'] },
  { label: 'Ankle & Foot',  zones: ['left_ankle', 'right_ankle', 'left_foot', 'right_foot'] },
];

export type Severity = 1 | 2 | 3;

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  1: { label: 'Mild',     color: '#ff9f0a' },
  2: { label: 'Moderate', color: '#f97316' },
  3: { label: 'Severe',   color: '#ef4444' },
};

export interface InjuryEntry {
  id: string;
  date: string;
  zones: BodyZone[];
  severity: Severity;
  notes: string;
}

const KEY = 'injuries_v1';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export function loadInjuries(): InjuryEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveInjury(entry: Omit<InjuryEntry, 'id'>): InjuryEntry {
  const injury: InjuryEntry = { ...entry, id: uid() };
  const all = loadInjuries();
  all.unshift(injury);
  localStorage.setItem(KEY, JSON.stringify(all));
  return injury;
}

export function deleteInjury(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadInjuries().filter(i => i.id !== id)));
}

export function getActiveZones(): BodyZone[] {
  const recent = loadInjuries().filter(i => {
    const days = (Date.now() - new Date(i.date).getTime()) / 86400000;
    return days <= 14;
  });
  const zones = new Set<BodyZone>();
  recent.forEach(i => i.zones.forEach(z => zones.add(z)));
  return Array.from(zones);
}
