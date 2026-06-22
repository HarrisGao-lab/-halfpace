import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { refreshStravaToken } from '@/lib/strava';

// Strava webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Receive new activity from Strava (POST)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Only handle new activities
  if (body.aspect_type !== 'create' || body.object_type !== 'activity') {
    return NextResponse.json({ ok: true });
  }

  const athleteId = body.owner_id?.toString();
  const activityId = body.object_id;

  // Get token for this athlete
  const { data: tokenRow } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', athleteId)
    .single();

  if (!tokenRow) return NextResponse.json({ ok: true });

  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at < Date.now() / 1000 + 300) {
    const refreshed = await refreshStravaToken(tokenRow.refresh_token);
    await supabase.from('strava_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    }).eq('user_id', athleteId);
    accessToken = refreshed.access_token;
  }

  // Fetch the specific activity
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return NextResponse.json({ ok: true });

  const a = await res.json();

  await supabase.from('activities').upsert({
    strava_id: a.id,
    user_id: athleteId,
    name: a.name,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    elapsed_time_s: a.elapsed_time,
    start_date: a.start_date,
    average_speed: a.average_speed,
    average_heartrate: a.average_heartrate || null,
    max_heartrate: a.max_heartrate || null,
    type: a.type,
  }, { onConflict: 'strava_id' });

  return NextResponse.json({ ok: true });
}
