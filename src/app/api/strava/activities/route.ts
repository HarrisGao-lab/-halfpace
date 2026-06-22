import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchStravaActivities, refreshStravaToken } from '@/lib/strava';

async function getValidToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (!data) return null;

  // Refresh if expired (with 5 min buffer)
  if (data.expires_at < Date.now() / 1000 + 300) {
    try {
      const refreshed = await refreshStravaToken(data.refresh_token);
      await supabase.from('strava_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
      }).eq('user_id', userId);
      return refreshed.access_token;
    } catch {
      return null;
    }
  }

  return data.access_token;
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ connected: false, activities: [] });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ connected: false, activities: [] });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  // Try to return cached activities from Supabase first
  const { data: cached } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(limit);

  // Sync fresh from Strava in background if cache is stale or empty
  const token = await getValidToken(userId);
  if (token) {
    try {
      const stravaActivities = await fetchStravaActivities(token, 1, Math.min(limit, 30));
      const runs = stravaActivities.filter((a: any) => a.type === 'Run');

      if (runs.length > 0) {
        const rows = runs.map((a: any) => ({
          strava_id: a.id,
          user_id: userId,
          name: a.name,
          distance_m: a.distance,
          moving_time_s: a.moving_time,
          elapsed_time_s: a.elapsed_time,
          start_date: a.start_date,
          average_speed: a.average_speed,
          average_heartrate: a.average_heartrate || null,
          max_heartrate: a.max_heartrate || null,
          type: a.type,
        }));

        await supabase.from('activities').upsert(rows, { onConflict: 'strava_id' });

        return NextResponse.json({ connected: true, activities: rows });
      }
    } catch (e) {
      console.error('Strava fetch error:', e);
    }
  }

  return NextResponse.json({ connected: true, activities: cached || [] });
}
