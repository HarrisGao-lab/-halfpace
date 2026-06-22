import { NextResponse } from 'next/server';

// Activities are synced client-side via /lib/strava.ts syncStravaRuns()
// This route is kept as a stub to avoid 404s from old bookmarks
export async function GET() {
  return NextResponse.json({ message: 'Use client-side sync' }, { status: 410 });
}
