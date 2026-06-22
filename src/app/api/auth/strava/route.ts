import { NextResponse } from 'next/server';
import { getStravaAuthUrl, STRAVA_CLIENT_ID } from '@/lib/strava';

export function GET() {
  if (!STRAVA_CLIENT_ID || STRAVA_CLIENT_ID === 'your_strava_client_id') {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px">
        <h2 style="color:#FF6B35">Strava not configured</h2>
        <p>Add your credentials to <code>.env.local</code>:</p>
        <pre style="background:#141414;padding:16px;border-radius:8px;margin-top:12px">
NEXT_PUBLIC_STRAVA_CLIENT_ID=your_id_here
STRAVA_CLIENT_SECRET=your_secret_here</pre>
        <p style="margin-top:16px;color:#888">Then restart <code>npm run dev</code> and try again.</p>
        <p style="margin-top:8px"><a href="https://www.strava.com/settings/api" style="color:#FF6B35">→ Create Strava API app</a></p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
  return NextResponse.redirect(getStravaAuthUrl());
}
