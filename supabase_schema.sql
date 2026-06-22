-- Run this in your Supabase SQL Editor

-- Strava OAuth tokens
create table if not exists strava_tokens (
  user_id           text primary key,
  access_token      text not null,
  refresh_token     text not null,
  expires_at        bigint not null,
  athlete_firstname text,
  athlete_lastname  text,
  athlete_profile   text,
  created_at        timestamptz default now()
);

-- Activities synced from Strava
create table if not exists activities (
  id                uuid primary key default gen_random_uuid(),
  strava_id         bigint unique not null,
  user_id           text not null references strava_tokens(user_id) on delete cascade,
  name              text,
  distance_m        float,
  moving_time_s     int,
  elapsed_time_s    int,
  start_date        timestamptz,
  average_speed     float,
  average_heartrate float,
  max_heartrate     float,
  type              text,
  created_at        timestamptz default now()
);

create index if not exists activities_user_date on activities(user_id, start_date desc);

-- Workout completion log
create table if not exists workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references strava_tokens(user_id) on delete cascade,
  week        int not null,
  day         int not null,
  completed   boolean default false,
  activity_id uuid references activities(id),
  notes       text,
  rpe         int check (rpe >= 1 and rpe <= 10),
  created_at  timestamptz default now(),
  unique(user_id, week, day)
);

-- Enable Row Level Security (RLS)
alter table strava_tokens enable row level security;
alter table activities enable row level security;
alter table workout_logs enable row level security;

-- RLS Policies: users can only see their own data
-- (In production you'd use Supabase Auth; for now service role bypasses RLS)
