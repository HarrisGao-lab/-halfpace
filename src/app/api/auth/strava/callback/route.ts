import { NextRequest, NextResponse } from 'next/server';

// Legacy route — redirect to new callback handler
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const newUrl = new URL('/api/strava/callback', url.origin);
  newUrl.search = url.search;
  return NextResponse.redirect(newUrl);
}
