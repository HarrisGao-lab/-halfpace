import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co';

export type ActivityRow = {
  id: string;
  user_id: string;
  strava_id: number;
  name: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  start_date: string;
  average_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  type: string;
  created_at: string;
};

export type WorkoutLogRow = {
  id: string;
  user_id: string;
  week: number;
  day: number;
  completed: boolean;
  activity_id: string | null;
  notes: string | null;
  rpe: number | null;
  created_at: string;
};
