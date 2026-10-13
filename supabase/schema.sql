-- Sedona Game Night: database setup
-- Use INSTALL.sql for a complete install including the required RPC migration.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- Game nights. Organizers add these from /admin.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text not null default '18:30',   -- 24-hour, Arizona time
  end_time text not null default '21:00',
  capacity int not null default 25 check (capacity between 1 and 500),
  -- open: anyone can RSVP
  -- invite_only: only people with the link (used to give the waitlist first dibs)
  -- closed: no new RSVPs
  status text not null default 'open' check (status in ('open', 'invite_only', 'closed')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (date);

-- RSVPs and waitlist. One row per phone number per night.
create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone text not null,                 -- +1XXXXXXXXXX
  email text,
  adults int not null default 1 check (adults between 1 and 20),
  kids int not null default 0 check (kids between 0 and 20),
  kid_ages text,
  pizza text,                          -- comma separated, e.g. 'Pepperoni,Cheese'
  gluten_free int not null default 0,  -- how many in the group need gluten-free
  dietary text,
  bringing text not null default 'nothing',
  bringing_detail text,
  church text,
  notes text,
  source text,                         -- e.g. 'mailer', from the QR code link
  sms_consent boolean not null default false,
  -- confirmed: has a spot
  -- waitlist: in line
  -- offered: a spot opened and a private-page offer is ready to claim (holds the spot until offer_expires_at)
  -- cancelled / declined / expired: no longer coming
  status text not null default 'confirmed'
    check (status in ('confirmed', 'waitlist', 'offered', 'cancelled', 'declined', 'expired')),
  waitlisted_at timestamptz,
  offer_expires_at timestamptz,
  reminder_sent_at timestamptz,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, phone)
);
create index if not exists signups_event_status_idx on public.signups (event_id, status);

-- Games: organizer picks (curated = true) and guest suggestions (curated = false)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  players text,
  category text,
  curated boolean not null default false,
  suggested_by text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists games_name_unique on public.games (lower(name));

-- Votes: one per browser per game
create table if not exists public.game_votes (
  game_id uuid not null references public.games(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, voter_id)
);

-- Lock the tables down. The website talks to the database only from its own
-- server using the service role key, so no public access is needed.
alter table public.events enable row level security;
alter table public.signups enable row level security;
alter table public.games enable row level security;
alter table public.game_votes enable row level security;

-- Familiar favorites selected for Sedona Game Night. No invented play counts.
insert into public.games(name,description,category,curated) values
 ('Rummikub','A little strategy. A lot of good company.','Classic',true),
 ('Scrabble','Good words and even better conversation.','Word',true),
 ('Yahtzee','Roll the dice. Cheer each other on.','Classic',true),
 ('Skip-Bo','A familiar favorite to deal everyone in.','Card',true),
 ('Sorry!','Friendly competition. No hard feelings.','Family',true),
 ('The Game of Life','Take a few unexpected turns together.','Family',true),
 ('Clue','A little mystery around the table.','Classic',true)
on conflict do nothing;

