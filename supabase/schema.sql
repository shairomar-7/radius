-- Radius validation experiment — schema
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Design notes
-- * All experiment tables are prefixed exp_ (plus experiment_responses) so they stay
--   cleanly separated from the real app's tables (users, activities, ...) in the same project.
-- * RLS is ON with NO policies: the browser (anon key) can't read or write anything.
--   All access goes through Next.js server routes using the secret/service-role key.
-- * Variants are assigned in the database when a session row is first created and never
--   change afterwards (sticky per respondent).

create extension if not exists pgcrypto;

-- One row per anonymous visitor (cookie-based session id).
create table if not exists public.exp_sessions (
  id               uuid primary key,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  -- Experiment 2: willingness to pay. Assigned once, 50/50.
  wtp_price_usd    int  not null default (case when random() < 0.5 then 5 else 10 end)
                        check (wtp_price_usd in (5, 10)),
  -- Experiment 3: commute tolerance. Assigned once, 50/50.
  commute_minutes  int  not null default (case when random() < 0.5 then 25 else 60 end)
                        check (commute_minutes in (25, 60)),
  -- Coarse location only (neighborhood name). Exact coordinates are never sent to the server.
  neighborhood     text,
  location_method  text check (location_method in ('geolocation', 'picker')),
  referrer         text,
  utm_source       text,
  user_agent       text,
  is_test          boolean not null default false
);

-- Funnel events. A session can fire an event more than once; the funnel counts distinct sessions.
create table if not exists public.exp_events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.exp_sessions(id) on delete cascade,
  event       text not null check (event in (
                'visit', 'demo_opened', 'interest_clicked',
                'form_submitted', 'wtp_answered', 'commute_answered')),
  created_at  timestamptz not null default now(),
  meta        jsonb
);
create index if not exists exp_events_session_idx on public.exp_events (session_id);
create index if not exists exp_events_event_idx   on public.exp_events (event);

-- Interest-form signups (one per session). Early prototype of the real users table.
create table if not exists public.exp_signups (
  session_id  uuid primary key references public.exp_sessions(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  created_at  timestamptz not null default now()
);
create index if not exists exp_signups_email_idx on public.exp_signups (lower(email));

-- Experiment answers. One answer per session per experiment; first answer wins.
create table if not exists public.experiment_responses (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.exp_sessions(id) on delete cascade,
  experiment  text not null check (experiment in ('wtp', 'commute')),
  variant     text not null,             -- '5' / '10' (USD per month) or '25' / '60' (minutes)
  answer      boolean not null,          -- true = Yes
  created_at  timestamptz not null default now(),
  unique (session_id, experiment)
);

-- Runtime switches, flipped from the admin page (no redeploy needed).
create table if not exists public.exp_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into public.exp_settings (key, value) values
  ('wtp_enabled', 'true'::jsonb),
  ('commute_enabled', 'false'::jsonb)
on conflict (key) do nothing;

alter table public.exp_sessions          enable row level security;
alter table public.exp_events            enable row level security;
alter table public.exp_signups           enable row level security;
alter table public.experiment_responses  enable row level security;
alter table public.exp_settings          enable row level security;

-- Admin dashboard numbers in one round trip. Excludes test sessions unless asked.
create or replace function public.exp_admin_stats(include_test boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select * from exp_sessions where include_test or not is_test
  ),
  ev as (
    select e.event, count(distinct e.session_id) as n
    from exp_events e join s on s.id = e.session_id
    group by e.event
  ),
  r as (
    select x.experiment, x.variant,
           count(*) as n,
           count(*) filter (where x.answer) as yes
    from experiment_responses x join s on s.id = x.session_id
    group by x.experiment, x.variant
  ),
  daily as (
    select d::date as day,
           (select count(*) from s where s.created_at::date = d::date) as visitors,
           (select count(*) from exp_signups g join s on s.id = g.session_id
             where g.created_at::date = d::date) as signups
    from generate_series((now() - interval '13 days')::date, now()::date, interval '1 day') d
  )
  select jsonb_build_object(
    'generated_at', now(),
    'sessions', (select count(*) from s),
    'test_sessions', (select count(*) from exp_sessions where is_test),
    'funnel', jsonb_build_object(
      'visit',            coalesce((select n from ev where event = 'visit'), 0),
      'demo_opened',      coalesce((select n from ev where event = 'demo_opened'), 0),
      'interest_clicked', coalesce((select n from ev where event = 'interest_clicked'), 0),
      'form_submitted',   coalesce((select n from ev where event = 'form_submitted'), 0),
      'wtp_answered',     coalesce((select n from ev where event = 'wtp_answered'), 0),
      'commute_answered', coalesce((select n from ev where event = 'commute_answered'), 0)
    ),
    'responses', coalesce((select jsonb_agg(jsonb_build_object(
        'experiment', experiment, 'variant', variant, 'n', n, 'yes', yes)) from r), '[]'::jsonb),
    'assigned', jsonb_build_object(
      'wtp_5',  (select count(*) from s where wtp_price_usd = 5),
      'wtp_10', (select count(*) from s where wtp_price_usd = 10),
      'commute_25', (select count(*) from s where commute_minutes = 25),
      'commute_60', (select count(*) from s where commute_minutes = 60)
    ),
    'neighborhoods', coalesce((select jsonb_agg(t) from (
        select neighborhood, count(*) as n from s
        where neighborhood is not null
        group by neighborhood order by count(*) desc limit 8) t), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
        'day', day, 'visitors', visitors, 'signups', signups) order by day) from daily), '[]'::jsonb),
    'signups', coalesce((select jsonb_agg(t order by t.created_at desc) from (
        select g.name, g.email, g.created_at, s.neighborhood,
               s.wtp_price_usd, w.answer as wtp_answer,
               s.commute_minutes, c.answer as commute_answer
        from exp_signups g
        join s on s.id = g.session_id
        left join experiment_responses w on w.session_id = g.session_id and w.experiment = 'wtp'
        left join experiment_responses c on c.session_id = g.session_id and c.experiment = 'commute'
        order by g.created_at desc
        limit 500) t), '[]'::jsonb)
  );
$$;

revoke all on function public.exp_admin_stats(boolean) from public, anon, authenticated;
grant execute on function public.exp_admin_stats(boolean) to service_role;
