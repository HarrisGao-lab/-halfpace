# HalfPace — Setup Guide

## 1. Supabase (database)

1. Go to https://supabase.com → New project (free)
2. Go to **SQL Editor** → paste contents of `supabase_schema.sql` → Run
3. Go to **Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Strava API

1. Go to https://www.strava.com/settings/api → Create app
   - Website: `http://localhost:3000`
   - Authorization Callback Domain: `localhost` (dev) / `your-app.vercel.app` (prod)
2. Copy **Client ID** → `NEXT_PUBLIC_STRAVA_CLIENT_ID`
3. Copy **Client Secret** → `STRAVA_CLIENT_SECRET`

## 3. Environment variables

```bash
cp .env.local.example .env.local
# Fill in the values above
```

## 4. Run locally

```bash
npm run dev
# Open http://localhost:3000 on your phone (same WiFi)
# or use ngrok to expose to internet
```

## 5. Deploy to Vercel (free)

```bash
npm install -g vercel
vercel --prod
```

Then:
- Add all env vars in Vercel dashboard → Settings → Environment Variables
- Update Strava app callback domain to your `.vercel.app` URL
- Register Strava webhook (one-time):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://your-app.vercel.app/api/strava/webhook \
  -F verify_token=YOUR_STRAVA_WEBHOOK_VERIFY_TOKEN
```

## 6. Add to iPhone home screen

1. Open your app URL in Safari
2. Tap Share → "Add to Home Screen"
3. Done — works like a native app!
