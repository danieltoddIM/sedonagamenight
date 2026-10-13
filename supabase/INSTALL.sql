-- Fresh install or non-destructive upgrade. Back up an existing project first.
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


-- Run AFTER schema.sql. Safe to rerun. Works with an existing v1 installation.
-- Application traffic is server-only. Never grant these RPCs to anon/authenticated.
alter table public.signups add column if not exists game_preferences text[] not null default '{}';
alter table public.signups add column if not exists learn_games boolean not null default false;
alter table public.signups add column if not exists can_teach boolean not null default false;
alter table public.signups add column if not exists reconfirmed_at timestamptz;
alter table public.signups add column if not exists checked_in_at timestamptz;
alter table public.signups add column if not exists consent_recorded_at timestamptz;
alter table public.signups add column if not exists consent_version text;

create table if not exists public.notification_jobs(
 id uuid primary key default gen_random_uuid(),
 signup_id uuid not null references public.signups(id) on delete cascade,
 metric text not null, properties jsonb not null default '{}', dedupe_key text not null unique,
 created_at timestamptz not null default now(), available_at timestamptz not null default now(),
 locked_until timestamptz, attempts integer not null default 0,
 completed_at timestamptz, last_error text
);
create index if not exists notification_pending on public.notification_jobs(available_at) where completed_at is null;
alter table public.notification_jobs enable row level security;
create table if not exists public.rate_limits(bucket text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.rate_limits enable row level security;

create or replace function public.sgn_rate_limit(p_key text,p_limit int,p_seconds int)
returns boolean language plpgsql security invoker set search_path=public as $$
declare b text; n integer;
begin
 b:=p_key||':'||floor(extract(epoch from now())/p_seconds)::text;
 insert into public.rate_limits(bucket,hits,expires_at) values(b,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=rate_limits.hits+1 returning hits into n;
 delete from public.rate_limits where expires_at<now()-interval '1 day';
 return n<=p_limit;
end;$$;

create or replace function public.sgn_queue(p_signup uuid,p_metric text,p_key text,p_properties jsonb default '{}')
returns void language sql security invoker set search_path=public as $$
 insert into public.notification_jobs(signup_id,metric,dedupe_key,properties)
 values(p_signup,p_metric,p_key,p_properties) on conflict(dedupe_key) do nothing;
$$;

-- Every allocation takes the same event row lock. This serializes competing requests.
create or replace function public.sgn_process_night(p_event_id uuid,p_overflow boolean default true,p_offer_hours int default 24,p_stop_hours int default 3)
returns void language plpgsql security invoker set search_path=public as $$
declare n public.events; s public.signups; used integer; cutoff timestamptz; expires timestamptz;
begin
 select * into n from public.events where id=p_event_id for update;
 if not found then return; end if;
 for s in update public.signups set status='expired',updated_at=now()
  where event_id=n.id and status='offered' and offer_expires_at<=now() returning *
 loop
  perform public.sgn_queue(s.id,'Game Night Offer Expired','expired-'||s.id||'-'||s.offer_expires_at);
 end loop;
 cutoff:=((n.date+n.start_time::time) at time zone 'America/Phoenix')-make_interval(hours=>p_stop_hours);
 if now()>=cutoff or n.status='closed' then return; end if;
 loop
  select coalesce(sum(adults+kids),0) into used from public.signups where event_id=n.id and status in('confirmed','offered');
  if used>=n.capacity then exit; end if;
  select * into s from public.signups where event_id=n.id and status='waitlist' order by waitlisted_at,created_at,id limit 1 for update;
  if not found then exit; end if;
  -- Strict mode keeps FIFO and waits for enough seats for the whole first group.
  if not p_overflow and used+s.adults+s.kids>n.capacity then exit; end if;
  expires:=least(now()+make_interval(hours=>p_offer_hours),cutoff);
  update public.signups set status='offered',offer_expires_at=expires,updated_at=now() where id=s.id;
  perform public.sgn_queue(s.id,'Game Night Spot Offered','offer-'||s.id||'-'||expires,jsonb_build_object('expires_at',expires));
 end loop;
end;$$;

create or replace function public.sgn_rsvp(p_input jsonb,p_manage_token text default null,p_overflow boolean default true,p_offer_hours int default 24,p_stop_hours int default 3)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare n public.events; s public.signups; old public.signups; used integer; waiting integer; gets_seat boolean; outcome text; picks text[];
begin
 select * into n from public.events where id=(p_input->>'event_id')::uuid for update;
 if not found or n.status='closed' or (n.date+n.start_time::time) at time zone 'America/Phoenix'<=now() then raise exception 'EVENT_CLOSED';end if;
 perform public.sgn_process_night(n.id,p_overflow,p_offer_hours,p_stop_hours);
 if p_manage_token is not null then
  select * into old from public.signups where event_id=n.id and token=p_manage_token;
  if not found or old.phone<>p_input->>'phone' then raise exception 'PRIVATE_LINK_REQUIRED';end if;
 else
  select * into old from public.signups where event_id=n.id and phone=p_input->>'phone';
 end if;
 -- A phone number is NOT authentication. Never expose or replace another RSVP's token.
 if old.id is not null and (p_manage_token is null or old.token<>p_manage_token) then raise exception 'PRIVATE_LINK_REQUIRED';end if;
 select array(select jsonb_array_elements_text(coalesce(p_input->'game_preferences','[]'::jsonb))) into picks;
 if old.id is not null and old.status in('confirmed','waitlist','offered') then
  if old.status in('confirmed','offered') and not p_overflow then
   select coalesce(sum(adults+kids),0) into used from public.signups where event_id=n.id and status in('confirmed','offered') and id<>old.id;
   if used+(p_input->>'adults')::int+(p_input->>'kids')::int>n.capacity then raise exception 'GROUP_TOO_LARGE';end if;
  end if;
  outcome:='updated';
 else
  select coalesce(sum(adults+kids),0) into used from public.signups where event_id=n.id and status in('confirmed','offered');
  select count(*) into waiting from public.signups where event_id=n.id and status='waitlist';
  gets_seat:=waiting=0 and used<n.capacity and (p_overflow or used+(p_input->>'adults')::int+(p_input->>'kids')::int<=n.capacity);
  outcome:=case when gets_seat then 'confirmed' else 'waitlist' end;
  if old.id is null then
   insert into public.signups(event_id,name,phone,status) values(n.id,p_input->>'name',p_input->>'phone',outcome) returning * into old;
  else
   update public.signups set status=outcome,offer_expires_at=null,reminder_sent_at=null,reconfirmed_at=null,checked_in_at=null where id=old.id;
  end if;
  update public.signups set waitlisted_at=case when gets_seat then null else now() end where id=old.id;
 end if;
 update public.signups set name=p_input->>'name',email=nullif(p_input->>'email',''),
 adults=(p_input->>'adults')::int,kids=(p_input->>'kids')::int,kid_ages=nullif(p_input->>'kid_ages',''),
 pizza=nullif(p_input->>'pizza',''),gluten_free=(p_input->>'gluten_free')::int,dietary=nullif(p_input->>'dietary',''),
 bringing=p_input->>'bringing',bringing_detail=nullif(p_input->>'bringing_detail',''),church=nullif(p_input->>'church',''),
 notes=nullif(p_input->>'notes',''),source=coalesce(source,nullif(p_input->>'source','')),
 sms_consent=coalesce((p_input->>'sms_consent')::boolean,false),
 consent_recorded_at=case when coalesce((p_input->>'sms_consent')::boolean,false) then now() else consent_recorded_at end,
 consent_version=case when coalesce((p_input->>'sms_consent')::boolean,false) then '2026-10-community-v2' else consent_version end,
 game_preferences=picks,learn_games=coalesce((p_input->>'learn_games')::boolean,false),can_teach=coalesce((p_input->>'can_teach')::boolean,false),updated_at=now()
 where id=old.id returning * into s;
 if s.sms_consent and not old.sms_consent then perform public.sgn_queue(s.id,'Subscribe SMS','subscribe-'||s.id||'-'||s.updated_at);end if;
 if outcome in('confirmed','waitlist') then
  perform public.sgn_queue(s.id,case when outcome='confirmed' then 'Game Night RSVP Confirmed' else 'Game Night Waitlisted' end,outcome||'-'||s.id||'-'||s.updated_at);
 end if;
 perform public.sgn_process_night(n.id,p_overflow,p_offer_hours,p_stop_hours);
 select * into s from public.signups where id=s.id;
 return jsonb_build_object('signup',to_jsonb(s),'outcome',outcome);
end;$$;

create or replace function public.sgn_signup_action(p_token text,p_action text,p_id uuid default null,p_overflow boolean default true,p_offer_hours int default 24,p_stop_hours int default 3)
returns text language plpgsql security invoker set search_path=public as $$
declare s public.signups; n public.events; old_status text;
begin
 select * into s from public.signups where (p_token is not null and token=p_token) or (p_id is not null and id=p_id);
 if not found then return 'invalid';end if;
 select * into n from public.events where id=s.event_id for update;
 perform public.sgn_process_night(n.id,p_overflow,p_offer_hours,p_stop_hours);
 select * into s from public.signups where id=s.id for update;
 old_status:=s.status;
 if p_action='claim' then
  if s.status='confirmed' then return 'confirmed';end if;
  if s.status<>'offered' or s.offer_expires_at<=now() or n.status='closed' then return 'expired';end if;
  update public.signups set status='confirmed',offer_expires_at=null,updated_at=now() where id=s.id;
  perform public.sgn_queue(s.id,'Game Night RSVP Confirmed','claim-'||s.id||'-'||s.offer_expires_at);
  return 'confirmed';
 elsif p_action='cancel' then
  if s.status in('confirmed','offered','waitlist') then
   update public.signups set status=case when s.status='offered' then 'declined' else 'cancelled' end,offer_expires_at=null,checked_in_at=null,updated_at=now() where id=s.id;
   if old_status='confirmed' then perform public.sgn_queue(s.id,'Game Night Cancelled','cancel-'||s.id||'-'||now());end if;
  end if;
 elsif p_action='reconfirm' then
  if s.status<>'confirmed' or (n.date+n.end_time::time) at time zone 'America/Phoenix'<now() then return 'invalid';end if;
  update public.signups set reconfirmed_at=now(),updated_at=now() where id=s.id;
 elsif p_action in('confirmed','cancelled','waitlist','checkin','uncheckin') and p_id is not null then
  if p_action in('checkin','uncheckin') then
   if s.status<>'confirmed' then return 'invalid';end if;
   update public.signups set checked_in_at=case when p_action='checkin' then now() else null end,updated_at=now() where id=s.id;
  else
   update public.signups set status=p_action,offer_expires_at=null,waitlisted_at=case when p_action='waitlist' then now() else s.waitlisted_at end,checked_in_at=null,updated_at=now() where id=s.id;
   if p_action='confirmed' and old_status<>'confirmed' then perform public.sgn_queue(s.id,'Game Night RSVP Confirmed','admin-'||s.id||'-'||now());end if;
  end if;
 else return 'invalid';end if;
 perform public.sgn_process_night(n.id,p_overflow,p_offer_hours,p_stop_hours);
 return case when p_action='cancel' then 'cancelled' else p_action end;
end;$$;

create or replace function public.sgn_queue_reminders(p_event_id uuid)
returns integer language plpgsql security invoker set search_path=public as $$
declare n public.events; s public.signups; total int:=0;
begin
 select * into n from public.events where id=p_event_id for update;
 if n.status='closed' or n.date<>(now() at time zone 'America/Phoenix')::date or (n.date+n.start_time::time) at time zone 'America/Phoenix'<=now() then return 0;end if;
 for s in update public.signups set reminder_sent_at=now() where event_id=n.id and status='confirmed' and reminder_sent_at is null returning * loop
  perform public.sgn_queue(s.id,'Game Night Reminder','reminder-'||s.id||'-'||n.date);total:=total+1;
 end loop;
 return total;
end;$$;

create or replace function public.sgn_claim_notifications(p_limit int default 30)
returns setof public.notification_jobs language sql security invoker set search_path=public as $$
 update public.notification_jobs set locked_until=now()+interval '2 minutes',attempts=attempts+1
 where id in(
  select j.id from public.notification_jobs j
  where j.completed_at is null and j.available_at<=now() and (j.locked_until is null or j.locked_until<now())
  and (j.metric='Subscribe SMS' or not exists (
   select 1 from public.notification_jobs pending where pending.signup_id=j.signup_id
   and pending.metric='Subscribe SMS' and pending.completed_at is null
  ))
  order by j.created_at,j.id limit least(greatest(p_limit,1),30) for update of j skip locked
 )
 returning *;
$$;

-- Scope grants to this application's functions, not unrelated public-schema functions.
revoke all on function public.sgn_rate_limit(text,int,int) from public,anon,authenticated;
revoke all on function public.sgn_queue(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.sgn_process_night(uuid,boolean,int,int) from public,anon,authenticated;
revoke all on function public.sgn_rsvp(jsonb,text,boolean,int,int) from public,anon,authenticated;
revoke all on function public.sgn_signup_action(text,text,uuid,boolean,int,int) from public,anon,authenticated;
revoke all on function public.sgn_queue_reminders(uuid) from public,anon,authenticated;
revoke all on function public.sgn_claim_notifications(int) from public,anon,authenticated;
grant execute on function public.sgn_rate_limit(text,int,int), public.sgn_queue(uuid,text,text,jsonb), public.sgn_process_night(uuid,boolean,int,int),public.sgn_rsvp(jsonb,text,boolean,int,int),public.sgn_signup_action(text,text,uuid,boolean,int,int),public.sgn_queue_reminders(uuid),public.sgn_claim_notifications(int) to service_role;
grant all on public.notification_jobs,public.rate_limits to service_role;
