import { NextRequest, NextResponse } from 'next/server';

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

export async function POST() {
  // Webhooks not used — sync is client-side
  return NextResponse.json({ ok: true });
}
