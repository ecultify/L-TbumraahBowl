-- Supabase Leaderboard schema for Bowling Analyzer
-- Run this file in the Supabase SQL editor.
-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) Enum for speed class (idempotent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'speed_class') then
    create type speed_class as enum ('Slow', 'Fast', 'Zooooom');
  end if;
end $$;

-- 3) Main table
create table if not exists public.bowling_attempts (
  id uuid primary key default gen_random_uuid (),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users (id) on delete set null,
  display_name text not null default 'Anonymous',
  predicted_kmh numeric(6, 2) not null check (
    predicted_kmh >= 0
    and predicted_kmh <= 250
  ),
  similarity_percent numeric(5, 2) not null check (
    similarity_percent >= 0
    and similarity_percent <= 100
  ),
  intensity_percent numeric(5, 2) not null check (
    intensity_percent >= 0
    and intensity_percent <= 100
  ),
  speed_class speed_class not null,
  video_url text null,
  avatar_url text null,
  location text null,
  device text null,
  duration_seconds real null check (
    duration_seconds is null
    or duration_seconds >= 0
  ),
  meta jsonb not null default '{}'::jsonb
);

comment on table public.bowling_attempts is 'Per-run results used for the leaderboard';

-- 4) Indexes
create index if not exists bowling_attempts_speed_idx on public.bowling_attempts (predicted_kmh desc);

create index if not exists bowling_attempts_created_idx on public.bowling_attempts (created_at desc);

create index if not exists bowling_attempts_user_idx on public.bowling_attempts (user_id);

-- 5) RLS & Policies
alter table public.bowling_attempts enable row level security;

-- Default user_id to auth user when authenticated
alter table public.bowling_attempts
alter column user_id
set default auth.uid ();

-- Public read
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bowling_attempts' and policyname = 'read leaderboard (public)'
  ) then
    create policy "read leaderboard (public)"
    on public.bowling_attempts
    for select
    using (true);
  end if;
end $$;

-- Insert allowed for anon and auth
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bowling_attempts' and policyname = 'insert attempts (anon+auth)'
  ) then
    create policy "insert attempts (anon+auth)"
    on public.bowling_attempts
    for insert
    with check (user_id is null or user_id = auth.uid());
  end if;
end $$;

-- Update/delete only by owner (optional)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bowling_attempts' and policyname = 'update own attempts'
  ) then
    create policy "update own attempts"
    on public.bowling_attempts
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bowling_attempts' and policyname = 'delete own attempts'
  ) then
    create policy "delete own attempts"
    on public.bowling_attempts
    for delete
    using (user_id = auth.uid());
  end if;
end $$;

-- 6) Views (optional but recommended)
create or replace view public.leaderboard_all_time as
select
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  meta
from
  public.bowling_attempts
order by
  predicted_kmh desc,
  similarity_percent desc,
  created_at asc;

create or replace view public.leaderboard_best_per_player as
with
  ranked as (
    select
      ba.*,
      row_number() over (
        partition by
          coalesce(ba.user_id::text, ba.display_name)
        order by
          ba.predicted_kmh desc,
          ba.similarity_percent desc,
          ba.created_at asc
      ) as rn
    from
      public.bowling_attempts ba
  )
select
  id,
  created_at,
  display_name as name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  meta
from
  ranked
where
  rn = 1
order by
  predicted_kmh desc,
  similarity_percent desc,
  created_at asc;

create or replace view public.leaderboard_weekly as
select
  *
from
  public.bowling_attempts
where
  created_at >= date_trunc('week', now())
order by
  predicted_kmh desc,
  similarity_percent desc,
  created_at asc;
