import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/strava';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=strava_denied', req.url));
  }

  try {
    const tokenData = await exchangeCode(code);

    const userId = tokenData.athlete.id.toString();

    // Upsert athlete + tokens in Supabase
    await supabase.from('strava_tokens').upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      athlete_firstname: tokenData.athlete.firstname,
      athlete_lastname: tokenData.athlete.lastname,
      athlete_profile: tokenData.athlete.profile_medium,
    }, { onConflict: 'user_id' });

    // Set user session cookie
    const cookieStore = await cookies();
    cookieStore.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    return NextResponse.redirect(new URL('/', req.url));
  } catch (e) {
    console.error('Strava callback error:', e);
    return NextResponse.redirect(new URL('/?error=strava_failed', req.url));
  }
}
