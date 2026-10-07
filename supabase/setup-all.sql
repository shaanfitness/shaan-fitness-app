-- Shaan Fitness · database setup (run once, on a new Supabase project)
-- Paste everything into Supabase → SQL Editor → New query, then click Run.

-- ===== 20261007000001_core.sql =====
-- Shaan Fitness app · core schema (wave 1)
-- One app for every role: owner, front desk, coach, doctor, member.
-- Every business table carries studio_id so the same database can later host
-- other studios and the worldwide marketplace.
-- Access is enforced here, in the database, with row-level security (RLS):
-- the app's screens only decide what to show, never what a person may read.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('owner', 'front_desk', 'coach', 'doctor');
create type public.member_status as enum ('active', 'inactive', 'frozen', 'expired');
create type public.cycle_status as enum ('upcoming', 'active', 'frozen', 'completed', 'expired', 'cancelled');
create type public.plan_tier as enum ('group', 'semi_private', 'elite', 'custom');
create type public.attendance_status as enum ('present', 'absent', 'late_cancel');
create type public.payment_method as enum ('cash', 'upi', 'card', 'bank_transfer', 'razorpay', 'other');
create type public.lead_stage as enum ('new', 'contacted', 'trial_booked', 'trial_done', 'negotiating', 'won', 'lost');
create type public.lead_temperature as enum ('hot', 'warm', 'cold');
create type public.followup_status as enum ('open', 'done', 'cancelled');
create type public.care_role as enum ('coach', 'doctor');
create type public.request_status as enum ('requested', 'approved', 'rejected');
create type public.doctor_decision as enum ('pending', 'approved', 'approved_with_limits', 'hold');

-- Private schema for helpers; not exposed through the API.
create schema if not exists app;
grant usage on schema app to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Studios and business-rule settings
-- ---------------------------------------------------------------------------
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text not null default 'IN',
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  default_language text not null default 'en',
  -- Every business rule lives here so the owner can change it without code.
  settings jsonb not null default '{
    "receipt_prefix": "SF-",
    "member_code_prefix": "SF",
    "gst": {"enabled": false, "rate": 18, "number": null},
    "unused_sessions": {"mode": "expire", "carry_cap": 0},
    "extensions": {"max_per_cycle": 1, "days": 7, "fee": 0},
    "freeze": {"max_days": 0, "fee": 0, "needs_approval": true},
    "trials": {"free_sessions": 1},
    "renewal_reminders": {"days_before": [5], "sessions_left": null},
    "booking": {"cancel_cutoff_hours": 2, "advance_days": 7},
    "working_days": [1, 2, 3, 4, 5, 6],
    "themes": {"staff": "noir", "member": "club", "doctor": "clinic"}
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- Per-studio counters for receipt numbers and member codes.
create table app.counters (
  studio_id uuid not null references public.studios(id) on delete cascade,
  key text not null,
  value bigint not null default 0,
  primary key (studio_id, key)
);

create or replace function app.next_counter(p_studio uuid, p_key text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v bigint;
begin
  insert into app.counters (studio_id, key, value) values (p_studio, p_key, 1)
  on conflict (studio_id, key) do update set value = app.counters.value + 1
  returning value into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
-- One profile per login (Supabase auth user).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  theme text check (theme in ('noir', 'club', 'clinic')),  -- null = the studio's default for their role
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role public.staff_role not null,
  full_name text not null,
  phone text,
  email text,
  title text,                         -- e.g. Head Coach, Junior Trainer
  level text,                         -- e.g. Level B
  specialisations text[] not null default '{}',
  years_experience int,
  client_limit int,
  show_in_member_app boolean not null default true,
  service_type text not null default 'offline' check (service_type in ('online', 'offline', 'both')),
  registration_number text,           -- doctors: medical council registration
  permissions jsonb not null default '{}'::jsonb, -- per-person overrides of role defaults
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_studio_idx on public.staff (studio_id);
create index staff_user_idx on public.staff (user_id);
create unique index staff_user_role_uq on public.staff (studio_id, user_id, role) where user_id is not null;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  member_code text,
  full_name text not null,
  phone text not null,
  alt_phone text,
  email text,
  date_of_birth date,
  gender text check (gender in ('female', 'male', 'other')),
  emergency_contact_name text,
  emergency_contact_phone text,
  address text,
  lead_source text,
  referred_by_member_id uuid references public.members(id) on delete set null,
  preferred_language text not null default 'en',
  photo_url text,
  notes text,
  status public.member_status not null default 'active',
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, member_code)
);
create index members_studio_idx on public.members (studio_id);
create index members_user_idx on public.members (user_id);
create index members_phone_idx on public.members (studio_id, phone);

-- Who looks after each member: coaches and doctors.
create table public.care_team (
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  role public.care_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, staff_id, role)
);
create index care_team_staff_idx on public.care_team (staff_id);

-- Health details are kept apart from the member record so front desk never sees them.
create table public.member_health (
  member_id uuid primary key references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  height_cm numeric(5,1),
  conditions text,
  injuries text,
  medications text,
  par_q jsonb,
  doctor_decision public.doctor_decision not null default 'pending',
  doctor_limits text,
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plans, cycles (subscriptions), freezes and extensions
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  tier public.plan_tier not null default 'custom',
  description text,
  price numeric(10,2) not null check (price >= 0),
  sessions int check (sessions is null or sessions > 0),  -- null = date-based plan
  duration_days int not null check (duration_days > 0),
  includes_personal_coach boolean not null default false,
  includes_doctor boolean not null default false,
  doctor_consults_per_cycle int not null default 0,
  coach_split jsonb not null default '[]'::jsonb,        -- [{"staff_id": "...", "sessions": 12}]
  show_in_app boolean not null default true,
  legacy boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_studio_idx on public.plans (studio_id);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  start_date date not null,
  duration_days int not null check (duration_days > 0),
  extension_days int not null default 0 check (extension_days >= 0),
  frozen_days int not null default 0 check (frozen_days >= 0),
  end_date date generated always as (start_date + (duration_days - 1 + extension_days + frozen_days)) stored,
  sessions_total int,                                     -- null = unlimited within dates
  sessions_used int not null default 0,                   -- kept in step by attendance
  carried_sessions int not null default 0,
  price numeric(10,2) not null check (price >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  discount_reason text,
  status public.cycle_status not null default 'active',
  autopay boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cycles_member_idx on public.cycles (member_id);
create index cycles_studio_end_idx on public.cycles (studio_id, end_date);

create table public.freezes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  from_date date not null,
  to_date date not null check (to_date >= from_date),
  reason text,
  status public.request_status not null default 'requested',
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.extensions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  days int not null check (days > 0),
  reason text,
  fee numeric(10,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Slots, bookings, attendance
-- ---------------------------------------------------------------------------
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),  -- ISO: 1 = Monday
  start_time time not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  capacity int not null check (capacity > 0),
  tier public.plan_tier not null default 'group',
  coach_id uuid references public.staff(id) on delete set null,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, weekday, start_time, tier)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  booking_date date,                  -- null = the member's standing (default) slot
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index bookings_standing_uq on public.bookings (member_id, slot_id) where booking_date is null and status = 'booked';
create unique index bookings_oneoff_uq on public.bookings (member_id, slot_id, booking_date) where booking_date is not null and status = 'booked';
create index bookings_slot_idx on public.bookings (slot_id);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  cycle_id uuid references public.cycles(id) on delete set null,
  slot_id uuid references public.slots(id) on delete set null,
  date date not null,
  status public.attendance_status not null default 'present',
  method text not null default 'manual' check (method in ('manual', 'qr', 'app', 'biometric')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (member_id, date, slot_id)
);
create index attendance_cycle_idx on public.attendance (cycle_id);
create index attendance_studio_date_idx on public.attendance (studio_id, date);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  cycle_id uuid references public.cycles(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_on date not null default current_date,
  receipt_number text,
  gst_rate numeric(5,2) not null default 0,
  gst_amount numeric(10,2) not null default 0,
  reference text,
  notes text,
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, receipt_number)
);
create index payments_member_idx on public.payments (member_id);
create index payments_cycle_idx on public.payments (cycle_id);
create index payments_studio_date_idx on public.payments (studio_id, paid_on);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  spent_on date not null default current_date,
  category text not null,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Enquiries and follow-ups
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  gender text check (gender in ('female', 'male', 'other')),
  source text,
  interested_plan_id uuid references public.plans(id) on delete set null,
  stage public.lead_stage not null default 'new',
  temperature public.lead_temperature not null default 'warm',
  lost_reason text,
  assigned_to uuid references public.staff(id) on delete set null,
  notes text,
  converted_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_studio_idx on public.leads (studio_id, stage);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null,                 -- e.g. enquiry, renewal, balance_due, birthday, feedback
  due_at timestamptz not null,
  assigned_to uuid references public.staff(id) on delete set null,
  status public.followup_status not null default 'open',
  outcome text,
  notes text,
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (member_id is not null or lead_id is not null)
);
create index follow_ups_due_idx on public.follow_ups (studio_id, status, due_at);
-- One open follow-up per member, type and day: stops YDL-style duplicates.
create unique index follow_ups_no_dupes on public.follow_ups (member_id, type, ((due_at at time zone 'UTC')::date)) where status = 'open' and member_id is not null;

-- ---------------------------------------------------------------------------
-- Member app content
-- ---------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  details text,
  image_url text,
  link_type text check (link_type in ('plan', 'coupon', 'class', 'event', 'url')),
  link_target text,
  audience text not null default 'everyone' check (audience in ('everyone', 'plans', 'expiring', 'leads')),
  audience_plan_ids uuid[] not null default '{}',
  starts_on date not null default current_date,
  ends_on date,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity log: who changed what, when
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  studio_id uuid,
  actor uuid,
  table_name text not null,
  row_id uuid,
  action text not null,
  changes jsonb,
  at timestamptz not null default now()
);
create index activity_log_studio_idx on public.activity_log (studio_id, at desc);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------
create or replace function app.has_role(p_studio uuid, p_roles public.staff_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.studio_id = p_studio
      and s.user_id = (select auth.uid())
      and s.active
      and s.role = any (p_roles)
  );
$$;

create or replace function app.is_owner(p_studio uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role(p_studio, array['owner']::public.staff_role[]); $$;

create or replace function app.is_desk(p_studio uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role(p_studio, array['owner', 'front_desk']::public.staff_role[]); $$;

create or replace function app.is_staff(p_studio uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role(p_studio, array['owner', 'front_desk', 'coach', 'doctor']::public.staff_role[]); $$;

create or replace function app.in_studio(p_studio uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app.is_staff(p_studio)
      or exists (select 1 from public.members m where m.studio_id = p_studio and m.user_id = (select auth.uid()));
$$;

create or replace function app.my_staff_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select s.id from public.staff s where s.user_id = (select auth.uid()) and s.active; $$;

-- True when the signed-in person is this member.
create or replace function app.is_self(p_member uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members m where m.id = p_member and m.user_id = (select auth.uid()));
$$;

-- True when the signed-in coach or doctor is on this member's care team.
create or replace function app.in_care_team(p_member uuid, p_roles public.care_role[] default array['coach', 'doctor']::public.care_role[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.care_team c
    join public.staff s on s.id = c.staff_id
    where c.member_id = p_member
      and c.role = any (p_roles)
      and s.user_id = (select auth.uid())
      and s.active
  );
$$;

-- True when the signed-in coach runs this slot.
create or replace function app.coaches_slot(p_slot uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.slots sl join public.staff s on s.id = sl.coach_id
    where sl.id = p_slot and s.user_id = (select auth.uid()) and s.active
  );
$$;

grant execute on all functions in schema app to authenticated;
revoke execute on function app.next_counter(uuid, text) from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Triggers: timestamps, codes, receipts, session counts, activity log
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger staff_touch before update on public.staff for each row execute function app.touch_updated_at();
create trigger members_touch before update on public.members for each row execute function app.touch_updated_at();
create trigger plans_touch before update on public.plans for each row execute function app.touch_updated_at();
create trigger cycles_touch before update on public.cycles for each row execute function app.touch_updated_at();
create trigger leads_touch before update on public.leads for each row execute function app.touch_updated_at();
create trigger member_health_touch before update on public.member_health for each row execute function app.touch_updated_at();

create or replace function app.set_member_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_prefix text;
begin
  if new.member_code is null then
    select coalesce(s.settings->>'member_code_prefix', 'M') into v_prefix from public.studios s where s.id = new.studio_id;
    new.member_code = v_prefix || lpad(app.next_counter(new.studio_id, 'member_code')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger members_code before insert on public.members for each row execute function app.set_member_code();

create or replace function app.set_receipt_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_prefix text;
begin
  if new.receipt_number is null then
    select coalesce(s.settings->>'receipt_prefix', 'R-') into v_prefix from public.studios s where s.id = new.studio_id;
    new.receipt_number = v_prefix || lpad(app.next_counter(new.studio_id, 'receipt')::text, 5, '0');
  end if;
  if new.received_by is null then new.received_by = auth.uid(); end if;
  return new;
end $$;
create trigger payments_receipt before insert on public.payments for each row execute function app.set_receipt_number();

-- New cycles copy their length and sessions from the plan unless given.
create or replace function app.fill_cycle_from_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.plans;
begin
  select * into p from public.plans where id = new.plan_id;
  if p.studio_id <> new.studio_id then raise exception 'Plan belongs to another studio'; end if;
  if new.sessions_total is null and tg_op = 'INSERT' then new.sessions_total = p.sessions; end if;
  if new.created_by is null then new.created_by = auth.uid(); end if;
  return new;
end $$;
create trigger cycles_fill before insert on public.cycles for each row execute function app.fill_cycle_from_plan();

-- Attendance finds the member's cycle for that date, then keeps sessions_used in step.
create or replace function app.attendance_link_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cycle_id is null then
    select c.id into new.cycle_id from public.cycles c
    where c.member_id = new.member_id and new.date between c.start_date and c.end_date
      and c.status in ('active', 'frozen')
    order by c.start_date desc limit 1;
  end if;
  if new.marked_by is null then new.marked_by = auth.uid(); end if;
  return new;
end $$;
create trigger attendance_link before insert or update of date, member_id on public.attendance
  for each row execute function app.attendance_link_cycle();

create or replace function app.recount_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  ids = array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.cycle_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.cycle_id end
  ], null);
  update public.cycles c set sessions_used = (
    select count(*) from public.attendance a where a.cycle_id = c.id and a.status = 'present'
  ) where c.id = any (ids);
  return null;
end $$;
create trigger attendance_recount after insert or update or delete on public.attendance
  for each row execute function app.recount_sessions();

-- Freezes and extensions move the cycle's end date.
create or replace function app.apply_extension()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.cycles set extension_days = (select coalesce(sum(days), 0) from public.extensions e where e.cycle_id = coalesce(new.cycle_id, old.cycle_id))
  where id = coalesce(new.cycle_id, old.cycle_id);
  return null;
end $$;
create trigger extensions_apply after insert or update or delete on public.extensions
  for each row execute function app.apply_extension();

create or replace function app.apply_freeze()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.cycles set frozen_days = (
    select coalesce(sum(f.to_date - f.from_date + 1), 0) from public.freezes f
    where f.cycle_id = coalesce(new.cycle_id, old.cycle_id) and f.status = 'approved'
  ) where id = coalesce(new.cycle_id, old.cycle_id);
  return null;
end $$;
create trigger freezes_apply after insert or update or delete on public.freezes
  for each row execute function app.apply_freeze();

-- Only the member's doctor (or the owner) can set the doctor's decision and limits.
create or replace function app.guard_doctor_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;  -- server-side jobs
  if (tg_op = 'INSERT' and (new.doctor_decision <> 'pending' or new.doctor_limits is not null))
     or (tg_op = 'UPDATE' and (new.doctor_decision is distinct from old.doctor_decision
                               or new.doctor_limits is distinct from old.doctor_limits)) then
    if not (app.is_owner(new.studio_id) or app.in_care_team(new.member_id, array['doctor']::public.care_role[])) then
      raise exception 'Only the member''s doctor can record a health decision';
    end if;
    new.decided_by = (select s.id from public.staff s where s.user_id = auth.uid() and s.studio_id = new.studio_id and s.active limit 1);
    new.decided_at = now();
  end if;
  return new;
end $$;
create trigger member_health_guard before insert or update on public.member_health
  for each row execute function app.guard_doctor_decision();

-- Members can't book a full slot; front desk can override.
create or replace function app.check_slot_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap int; v_taken int;
begin
  if new.status <> 'booked' or app.is_desk(new.studio_id) then return new; end if;
  select capacity into v_cap from public.slots where id = new.slot_id;
  select count(*) into v_taken from public.bookings b
  where b.slot_id = new.slot_id and b.status = 'booked' and b.id <> new.id
    and (b.booking_date is null or b.booking_date = new.booking_date);
  if v_taken >= v_cap then raise exception 'This slot is full'; end if;
  return new;
end $$;
create trigger bookings_capacity before insert or update on public.bookings
  for each row execute function app.check_slot_capacity();

create or replace function app.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_old jsonb;
begin
  v_row = case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old = case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  insert into public.activity_log (studio_id, actor, table_name, row_id, action, changes)
  values (
    (v_row->>'studio_id')::uuid,
    auth.uid(),
    tg_table_name,
    (v_row->>'id')::uuid,
    lower(tg_op),
    case when tg_op = 'UPDATE' then (
      select jsonb_object_agg(k, jsonb_build_object('from', v_old->k, 'to', v_row->k))
      from jsonb_object_keys(v_row) k where v_row->k is distinct from v_old->k and k <> 'updated_at'
    ) else v_row end
  );
  return null;
end $$;

create trigger members_log after insert or update or delete on public.members for each row execute function app.log_activity();
create trigger cycles_log after insert or update or delete on public.cycles for each row execute function app.log_activity();
create trigger payments_log after insert or update or delete on public.payments for each row execute function app.log_activity();
create trigger plans_log after insert or update or delete on public.plans for each row execute function app.log_activity();
create trigger staff_log after insert or update or delete on public.staff for each row execute function app.log_activity();
create trigger freezes_log after insert or update or delete on public.freezes for each row execute function app.log_activity();
create trigger extensions_log after insert or update or delete on public.extensions for each row execute function app.log_activity();

-- New logins: create a profile and link the person to their staff or member
-- record by verified phone or email, so nobody has to type codes or IDs.
create or replace function app.digits(p text)
returns text language sql immutable as $$ select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), ''); $$;

create or replace function app.same_phone(a text, b text)
returns boolean language sql immutable as $$
  -- Compare full international digits; a 10-digit local number matches on its last 10 digits.
  select app.digits(a) is not null and app.digits(b) is not null and (
    app.digits(a) = app.digits(b)
    or (length(app.digits(a)) = 10 and right(app.digits(b), 10) = app.digits(a))
    or (length(app.digits(b)) = 10 and right(app.digits(a), 10) = app.digits(b))
  );
$$;

create or replace function app.link_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  update public.staff s set user_id = new.id
  where s.user_id is null and s.active
    and ((new.phone is not null and app.same_phone(s.phone, new.phone))
      or (new.email is not null and lower(s.email) = lower(new.email)));

  update public.members m set user_id = new.id
  where m.user_id is null
    and ((new.phone is not null and app.same_phone(m.phone, new.phone))
      or (new.email is not null and lower(m.email) = lower(new.email)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.link_new_user();

-- ---------------------------------------------------------------------------
-- Views (security_invoker: they obey the same access rules as the tables)
-- ---------------------------------------------------------------------------
create view public.cycle_overview with (security_invoker = true) as
select
  c.*,
  p.name as plan_name,
  p.tier as plan_tier,
  greatest(coalesce(c.sessions_total, 0) + c.carried_sessions - c.sessions_used, 0) as sessions_left,
  (c.end_date - current_date) as days_left,
  coalesce((select sum(pay.amount) from public.payments pay where pay.cycle_id = c.id), 0) as amount_paid,
  (c.price - c.discount_amount) - coalesce((select sum(pay.amount) from public.payments pay where pay.cycle_id = c.id), 0) as amount_due
from public.cycles c
join public.plans p on p.id = c.plan_id;

-- Coaches and doctors see session progress for their members, without money.
create or replace function public.care_progress()
returns table (
  member_id uuid, cycle_id uuid, plan_name text, plan_tier public.plan_tier,
  start_date date, end_date date, sessions_total int, sessions_used int, status public.cycle_status
)
language sql stable security definer set search_path = ''
as $$
  select c.member_id, c.id, p.name, p.tier, c.start_date, c.end_date, c.sessions_total, c.sessions_used, c.status
  from public.cycles c join public.plans p on p.id = c.plan_id
  where app.in_care_team(c.member_id) or app.is_desk(c.studio_id);
$$;
grant execute on function public.care_progress() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.members enable row level security;
alter table public.care_team enable row level security;
alter table public.member_health enable row level security;
alter table public.plans enable row level security;
alter table public.cycles enable row level security;
alter table public.freezes enable row level security;
alter table public.extensions enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.leads enable row level security;
alter table public.follow_ups enable row level security;
alter table public.banners enable row level security;
alter table public.activity_log enable row level security;

-- Studios
create policy studios_read on public.studios for select to authenticated using (app.in_studio(id));
create policy studios_owner_update on public.studios for update to authenticated using (app.is_owner(id)) with check (app.is_owner(id));

-- Profiles: each person manages their own.
create policy profiles_self on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Staff: every staff member sees the team; only the owner changes it.
create policy staff_read on public.staff for select to authenticated using (app.is_staff(studio_id) or user_id = (select auth.uid()));
create policy staff_owner_write on public.staff for insert to authenticated with check (app.is_owner(studio_id));
create policy staff_owner_update on public.staff for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy staff_owner_delete on public.staff for delete to authenticated using (app.is_owner(studio_id));

-- Members: desk sees all; coaches and doctors see their own members; a member sees themself.
create policy members_read on public.members for select to authenticated
  using (app.is_desk(studio_id) or app.in_care_team(id) or user_id = (select auth.uid()));
create policy members_desk_insert on public.members for insert to authenticated with check (app.is_desk(studio_id));
create policy members_desk_update on public.members for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy members_owner_delete on public.members for delete to authenticated using (app.is_owner(studio_id));

-- Care team
create policy care_team_read on public.care_team for select to authenticated
  using (app.is_staff(studio_id) or app.is_self(member_id));
create policy care_team_desk_write on public.care_team for all to authenticated
  using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

-- Health: owner, the member's coach and doctor, and the member. Never front desk.
create policy health_read on public.member_health for select to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy health_write on public.member_health for insert to authenticated
  with check (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy health_update on public.member_health for update to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id))
  with check (app.is_owner(studio_id) or app.in_care_team(member_id));

-- Plans: everyone in the studio can browse; only the owner edits.
create policy plans_read on public.plans for select to authenticated using (app.in_studio(studio_id));
create policy plans_owner_write on public.plans for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Cycles: desk and the member. Coaches use care_progress(), which hides money.
create policy cycles_read on public.cycles for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy cycles_desk_insert on public.cycles for insert to authenticated with check (app.is_desk(studio_id));
create policy cycles_owner_update on public.cycles for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy cycles_owner_delete on public.cycles for delete to authenticated using (app.is_owner(studio_id));

-- Freezes: members and desk can request; only the owner decides.
create policy freezes_read on public.freezes for select to authenticated
  using (app.is_desk(studio_id) or exists (select 1 from public.cycles c where c.id = cycle_id and app.is_self(c.member_id)));
create policy freezes_request on public.freezes for insert to authenticated
  with check (status = 'requested' and (app.is_desk(studio_id) or exists (select 1 from public.cycles c where c.id = cycle_id and app.is_self(c.member_id))));
create policy freezes_owner_insert on public.freezes for insert to authenticated with check (app.is_owner(studio_id));
create policy freezes_owner_decide on public.freezes for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Extensions: owner only.
create policy extensions_read on public.extensions for select to authenticated using (app.is_desk(studio_id));
create policy extensions_owner on public.extensions for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Slots: everyone in the studio can see the timetable; owner edits.
create policy slots_read on public.slots for select to authenticated using (app.in_studio(studio_id));
create policy slots_owner_write on public.slots for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Bookings: desk all; coach for slots they run or members they look after; member their own.
create policy bookings_read on public.bookings for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_slot(slot_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy bookings_insert on public.bookings for insert to authenticated
  with check (app.is_desk(studio_id) or app.is_self(member_id));
create policy bookings_update on public.bookings for update to authenticated
  using (app.is_desk(studio_id) or app.is_self(member_id))
  with check (app.is_desk(studio_id) or app.is_self(member_id));

-- Attendance: desk and the slot's coach can mark it; members see their own.
create policy attendance_read on public.attendance for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_slot(slot_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy attendance_mark on public.attendance for insert to authenticated
  with check (app.is_desk(studio_id) or app.coaches_slot(slot_id));
create policy attendance_fix on public.attendance for update to authenticated
  using (app.is_desk(studio_id) or app.coaches_slot(slot_id))
  with check (app.is_desk(studio_id) or app.coaches_slot(slot_id));
create policy attendance_owner_delete on public.attendance for delete to authenticated using (app.is_owner(studio_id));

-- Payments: desk records; only the owner corrects; members see their own receipts.
create policy payments_read on public.payments for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy payments_desk_insert on public.payments for insert to authenticated with check (app.is_desk(studio_id));
create policy payments_owner_update on public.payments for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy payments_owner_delete on public.payments for delete to authenticated using (app.is_owner(studio_id));

-- Expenses: owner only.
create policy expenses_owner on public.expenses for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Enquiries: owner, front desk and coaches.
create policy leads_read on public.leads for select to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy leads_write on public.leads for insert to authenticated
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy leads_update on public.leads for update to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy leads_owner_delete on public.leads for delete to authenticated using (app.is_owner(studio_id));

-- Follow-ups: desk all; a coach sees and works the ones assigned to them.
create policy follow_ups_read on public.follow_ups for select to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()))
  with check (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()));
create policy follow_ups_owner_delete on public.follow_ups for delete to authenticated using (app.is_owner(studio_id));

-- Banners: everyone in the studio sees them; owner and front desk manage.
create policy banners_read on public.banners for select to authenticated using (app.in_studio(studio_id));
create policy banners_desk_write on public.banners for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

-- Activity log: owner reads; nobody edits (rows come from triggers).
create policy activity_owner_read on public.activity_log for select to authenticated using (app.is_owner(studio_id));

-- ---------------------------------------------------------------------------
-- API privileges (RLS still decides which rows)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.activity_log from authenticated;
grant select on public.cycle_overview to authenticated;

-- Server-side jobs (reminders, imports) run as service_role; it skips RLS but still needs privileges.
grant usage on schema app to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on all functions in schema app to service_role;

-- ===== seed.sql =====
-- Shaan Fitness starting setup: the studio, its owner, the three tiers and the weekly timetable.
-- Safe to run once on a fresh database. Everything here can be changed later in the app.

insert into public.studios (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Shaan Fitness', 'shaan-fitness')
on conflict (id) do nothing;

-- The owner is linked automatically when Sabir first logs in with this phone number.
insert into public.staff (id, studio_id, role, full_name, phone, email, title)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001',
        'owner', 'Sabir Rasool', '+919502318090', 'shaanfitnessgym@gmail.com', 'Head Coach')
on conflict (id) do nothing;

-- Sabir also coaches, so he gets a coach record too.
insert into public.staff (id, studio_id, role, full_name, phone, email, title)
values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001',
        'coach', 'Sabir Rasool', '+919502318090', 'shaanfitnessgym@gmail.com', 'Head Coach')
on conflict (id) do nothing;

insert into public.plans (id, studio_id, name, tier, price, sessions, duration_days, includes_personal_coach, coach_split, sort_order)
values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'Group', 'group', 4999, 24, 28, false,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 1),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001', 'Semi-Private (Side-by-Side)', 'semi_private', 7999, 24, 28, true,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 2),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001', '1:1 Elite', 'elite', 14999, 24, 28, true,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 3)
on conflict (id) do nothing;

-- Eight daily slots, Monday to Saturday.
insert into public.slots (studio_id, weekday, start_time, capacity, tier)
select '00000000-0000-4000-8000-000000000001', d, t.start_time, t.capacity, t.tier::public.plan_tier
from generate_series(1, 6) d
cross join (values
  ('05:30'::time, 9, 'group'),
  ('07:00'::time, 9, 'group'),
  ('08:30'::time, 2, 'semi_private'),
  ('10:00'::time, 1, 'elite'),
  ('16:00'::time, 9, 'group'),
  ('17:30'::time, 2, 'semi_private'),
  ('19:00'::time, 9, 'group'),
  ('20:30'::time, 1, 'elite')
) as t(start_time, capacity, tier)
on conflict do nothing;

-- ===== check =====
select (select count(*) from public.plans) as plans,
       (select count(*) from public.slots) as slots,
       (select count(*) from public.staff) as staff,
       'Shaan Fitness database is ready' as status;
