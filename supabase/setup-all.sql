-- Shaan Fitness · database setup
-- Paste everything into Supabase → SQL Editor → New query, then click Run.
begin;

-- ===== rebuild-from-wave1.sql =====
-- One-time step: removes the first test version of the database (wave 1) so the
-- YDL-model database can be built in its place. It only runs if the wave-1 tables
-- are there, and it stops without changing anything if any member or payment exists.
-- Logins (auth.users) are kept; they're linked again by the setup.
do $$
begin
  if to_regclass('public.cycles') is null then
    raise notice 'No wave-1 tables found; nothing to remove.';
    return;
  end if;
  if exists (select 1 from public.members) or exists (select 1 from public.payments) then
    raise exception 'Stopped: this database already has members or payments. Nothing was changed.';
  end if;
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'drop view if exists public.cycle_overview cascade';
  execute 'drop function if exists public.care_progress() cascade';
  execute 'drop table if exists public.activity_log, public.banners, public.follow_ups, public.leads, public.expenses,
    public.payments, public.attendance, public.bookings, public.slots, public.extensions, public.freezes, public.cycles,
    public.plans, public.member_health, public.care_team, public.members, public.staff, public.profiles, public.studios cascade';
  execute 'drop schema if exists app cascade';
  execute 'drop type if exists public.staff_role, public.member_status, public.cycle_status, public.plan_tier,
    public.attendance_status, public.payment_method, public.lead_stage, public.lead_temperature, public.followup_status,
    public.care_role, public.request_status, public.doctor_decision cascade';
  raise notice 'Wave-1 tables removed.';
end $$;

-- ===== 20261008000001_foundation.sql =====
-- Shaan Fitness app · 1. Foundation
-- Studios, editable dropdown lists, services, staff, and clients (enquiries and members).
-- The data model follows YDL field by field so nothing is lost when the studio switches,
-- and every dropdown is an editable list rather than fixed code.
-- Access is enforced here with row-level security (RLS): screens decide what to show,
-- the database decides what each login may read or change.

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

create type public.staff_role as enum ('owner', 'front_desk', 'coach', 'doctor');
create type public.care_role as enum ('coach', 'doctor');
create type public.doctor_decision as enum ('pending', 'approved', 'approved_with_limits', 'hold');

-- Grants for every table in public: logins get access (RLS still decides which rows),
-- the anonymous key gets none. Each migration calls this at its end.
create or replace procedure app.apply_grants()
language plpgsql as $$
begin
  grant usage on schema public to authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant all on all tables in schema public to service_role;
  grant all on all sequences in schema public to authenticated, service_role;
  revoke all on all tables in schema public from anon;
  revoke execute on all functions in schema public from public, anon;
  grant execute on all functions in schema public to authenticated, service_role;
end $$;

-- ---------------------------------------------------------------------------
-- Studios (YDL: Fitness Center basic information + settings)
-- ---------------------------------------------------------------------------
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_name text,
  slug text not null unique,
  tag_line text,
  description text,
  email text,
  mobile text,
  landline text,
  street1 text,
  street2 text,
  city text,
  state text,
  country text not null default 'India',
  pincode text,
  capacity int,
  facilities text[] not null default '{}',
  logo_url text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  tax_label text not null default 'GST',
  default_language text not null default 'en',
  -- Every business rule is a setting the owner can change without code.
  settings jsonb not null default '{
    "member_code":  {"prefix": "SF", "width": 4, "zero_fill": true},
    "enquiry_code": {"prefix": "ENQ", "width": 4, "zero_fill": true},
    "trainer_code": {"prefix": "TT-", "width": 3, "zero_fill": true},
    "staff_code":   {"prefix": "ST-", "width": 3, "zero_fill": true},
    "plan_code":    {"prefix": "MP-", "width": 3, "zero_fill": true},
    "batch_code":   {"prefix": "Batch-", "width": 3, "zero_fill": true},
    "invoice": {"mode": "automatic", "start": 1, "width": 4, "zero_fill": true, "applicable_from": null, "restart": "year", "prefix": "SF-INV-", "suffix": ""},
    "receipt": {"mode": "automatic", "start": 1, "width": 4, "zero_fill": true, "applicable_from": null, "restart": "year", "prefix": "SF-", "suffix": ""},
    "gst": {"enabled": false, "rate": 18, "number": null},
    "unused_sessions": {"mode": "expire", "carry_cap": 0},
    "extensions": {"max_per_cycle": 1, "days": 7, "fee": 0},
    "freeze": {"max_days": 0, "fee": 0, "needs_approval": true},
    "trials": {"free_sessions": 1},
    "renewal_reminders": {"days_before": [5], "sessions_left": null},
    "about_to_expire_days": 7,
    "irregular_after_days": 7,
    "booking": {"cancel_cutoff_hours": 2, "advance_days": 7},
    "working_days": [1, 2, 3, 4, 5, 6],
    "themes": {"staff": "noir", "member": "club", "doctor": "clinic"},
    "payroll": {"trainer_grace_minutes": 10, "staff_grace_minutes": 10}
  }'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The studio's own calendar date (its time zone, not the server's).
create or replace function app.today(p_studio uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select s.timezone from public.studios s where s.id = p_studio), 'Asia/Kolkata'))::date;
$$;

-- ---------------------------------------------------------------------------
-- Numbering: member codes, invoice and receipt numbers (YDL invoice settings)
-- ---------------------------------------------------------------------------
create table app.counters (
  studio_id uuid not null references public.studios(id) on delete cascade,
  key text not null,
  value bigint not null default 0,
  primary key (studio_id, key)
);

create or replace function app.next_counter(p_studio uuid, p_key text, p_start bigint default 1)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint;
begin
  insert into app.counters (studio_id, key, value) values (p_studio, p_key, greatest(p_start, 1))
  on conflict (studio_id, key) do update set value = app.counters.value + 1
  returning value into v;
  return v;
end $$;

create or replace function app.format_number(p_cfg jsonb, p_n bigint)
returns text language sql immutable as $$
  select coalesce(p_cfg->>'prefix', '')
      || case when coalesce((p_cfg->>'zero_fill')::boolean, true)
              then lpad(p_n::text, greatest(coalesce((p_cfg->>'width')::int, 0), length(p_n::text)), '0')
              else p_n::text end
      || coalesce(p_cfg->>'suffix', '');
$$;

-- Next number for a setting key (member_code, invoice, receipt, ...).
-- "restart" resets the count every year, financial year (April) or month.
create or replace function app.next_code(p_studio uuid, p_kind text, p_date date default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_cfg jsonb; v_key text; v_d date;
begin
  select coalesce(s.settings->p_kind, '{}'::jsonb) into v_cfg from public.studios s where s.id = p_studio;
  v_d = coalesce(p_date, app.today(p_studio));
  v_key = p_kind || case v_cfg->>'restart'
    when 'year' then ':' || to_char(v_d, 'YYYY')
    when 'financial_year' then ':FY' || to_char(v_d - interval '3 months', 'YYYY')
    when 'month' then ':' || to_char(v_d, 'YYYY-MM')
    else '' end;
  return app.format_number(v_cfg, app.next_counter(p_studio, v_key, coalesce((v_cfg->>'start')::bigint, 1)));
end $$;

-- ---------------------------------------------------------------------------
-- Editable dropdown lists (source of promotion, follow-up types, payment modes, ...)
-- "kind" gives a fixed meaning to an item the app relies on (e.g. a follow-up
-- response that means "not interested"), so labels can be renamed freely.
-- ---------------------------------------------------------------------------
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  list text not null,
  label text not null check (length(trim(label)) > 0),
  kind text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, list, label)
);
create index list_items_lookup_idx on public.list_items (studio_id, list, sort);

-- YDL's values, as Shaan Fitness has them today. Owners can add, rename, reorder or hide.
create or replace function app.default_list_items()
returns table (list text, label text, kind text, sort int)
language sql immutable as $$
  with src(list, items) as (values
    ('source_promotion', array['Unknown','Exterior Sign','Media Article','Television','Promotions','Other','Lead by APP','Google Ads','Facebook','Instagram','Word Of Mouth','Banner','Walk In','Member Referral','Poster','SMS','Website','Flyers','Hoarding','Just Dial','WhatsApp Marketing','WhatsApp','ADs','Reseller','Facebook Messenger','Outbound','Country Club','Passing By','Hotel Guest','Database 1','Database 2','Database 3','Database 4','Database 5','Message','Trial passes','Fitpass','Enquiry QR or Link','Phone','Lead from Facebook','Coursetakers','Follow Up','Incoming Call','Renewal','Sign Board','Camp','Swimming','Tenant']),
    ('source_enquiry', array['Unknown','Walk In','Lead from Facebook','Call','Whatsapp','POS Referral','Member Referral','Telephonic','Buddy Referral','Trainer Referral','Instagram','Interakt','Email Inquiry','Lead from Meta','Facebook']),
    ('employment_status', array['Unknown','STUDENT','WORKING','NOT WORKING','SELF EMPLOYED','HOUSE WIFE']),
    ('contact_type', array['Phone','In Person','Email','Whatsapp','SMS']),
    ('quick_message', array['Not reachable','No answer','Waiting','Busy','Incorrect','Interested','Switch Off','Call','Joining Call','Courtesy Call','Call Again','Demo Scheduled Waiting For Final Confirmation','Demo Scheduled','Inquired but did not ask for payment','Inquired & Payment link sent or to be sent.','Call later same day or tomorrow or some other month','Costly Cannot afford','Phone Cut','Half Call.Call again','Not Interested','Inquired by mistake','Joined Somewhere else','Other']),
    ('member_level', array['Beginner','Intermediate','Advanced']),
    ('payment_mode', array['CASH','ONLINE','UPI','Credit Card','Debit Card','Card','PAYTM','Bajaj EMI','Cheque','NEFT or Bank Transfer','RazorPay','Google Pay','PhonePe','PayPal','Fitternity','FIT PASS','Paper finance','Payed App','IDFC- S','IDFC- K','HDFC','Save In','Tabby','Tabby Card','Postpay','Tamara','Third party','Draft','Bharatpe','MPESA','EMI','Federal','Payment Link','Pay Later','Pay U','Free']),
    ('expense_category', array['Salary','Electricity Bills','PT Incentives','Sales Incentives','Rent','Printing Stationary','Travelling','Misc expenses','Food bevarages','Tel Bills','Housekeeping','Advertisement','Service Tax paid','Repair maintenance','Assets Purchased','Income Tax Paid','Management Expense','Refund','Cash Handhover','Bonus','Advance Salary','PETTY CASH']),
    ('expense_payment_type', array['CASH','ONLINE','Credit Card','DebitCard','PAYTM','Cheque','NEFT','Google Pay','PhonePay','Fitternity']),
    ('trainer_type', array['Head Trainer/Nutritionist','Personal Trainer','General Trainer','Doctor','Zumba Instructor','Coach','Nutritionist','Massage therapist','Fitness manager','Yoga instructor','Dietitian','Counsellor','Dance Choreographer','MMA Professional','Music Instructor','Physiotherapy','Psychology','S & C Coach','Senior Head Coach','Lead Coach','Group Fitness Coach','Postnatal Fitness Coach','CrossFit Coach','Personal Training and Nutrition Coach','Pilates Teacher','Freelancer']),
    ('staff_type', array['Gym Owner','Manager','Floor Manager','Receptionist','Front Desk Executive','Sales','Gym Sales','Sales Manager','HR','Support Staff/Helper','Helper']),
    ('document_type', array['PAN Card','Aadhaar Card','Voting Card','Ration Card','Driving License','Medical History','KYC','Passport','CLIENT FITNESS DOCUMENTS','LEGAL ID']),
    ('appointment_purpose', array['Meeting','Class','Diet Consultation','PT Session','Live Video Session','Telephonic appointment','Therapy','Wellness Profile & Counselling','Fitness Test','Fitness Counselling','Steam Booking','BMI Check','Foot Reflexology','Tour(GYM Floor Tour)']),
    ('holiday_type', array['PUBLIC HOLIDAY','GOVERMENT HOLIDAY','GYM HOLIDAY']),
    ('facility', array['Locker','Shower','Training','Steam','Sauna','Valet Parking','Wifi','Cafe','Toilet','Biometric','Changing Room','Pantry','Separate weight loss','Cardio Training area','Fat Loss','Weight Loss','Weight Gain','Cardio','Strength Training','Natural Bodybuilding','Injury Rehab','Weight Training','Crossfit Workout','Calisthenics','Special Population Training','Nutrition Counselling','Transformation Plans']),
    ('primary_tag', array[]::text[]),
    ('secondary_tag', array[]::text[]),
    -- "Label|kind": the kind marks items the app relies on (follow-ups it creates by itself,
    -- responses that close an enquiry, ...).
    ('followup_type', array['Enquiry|enquiry','RE-Enquiry','Membership Enquiry','Membership Renewal|renewal','Irregular Member|irregular','Balance due|balance_due','Freeze|freeze','Assign Trial|trial','Feedback|feedback','Measurement|measurement','PT Renewal|pt_renewal','PT Trial|pt_trial','PT Follow-up','Commitment','Anniversary|anniversary','Birthday|birthday','Referral|referral','Transfer','Upgrade','Online Prospect(Non gym)','Online Training','Massage','Trial Online PT','Trial Online PT Feedback','Nutrition','Other','Ex-Member|ex_member','Ready To Sign Up','Fitness Test','Fitness Counselling','Nutrition Assessment','Nutrition Appointment','Steam Appointment','Demo Scheduled','Demo Conducted','Confirmation Calls','Gym/Studio Trial']),
    ('followup_response', array['Open Follow up|open','Successful Follow up|successful','Not Interested - Rates to high|not_interested','Not Interested - Joined Another Gym|not_interested','Not Interested - Wrong number|not_interested','Not Interested - Relocated|not_interested','Not Interested - other|not_interested']),
    ('convertibility', array['Hot|hot','Warm / Maybe|warm','Cold / Not so interested|cold','Expected|expected','Successful Follow up|successful','Unpitched|unpitched'])
  )
  select s.list, split_part(x.item, '|', 1), nullif(split_part(x.item, '|', 2), ''), (x.ord * 10)::int
  from src s, unnest(s.items) with ordinality as x(item, ord);
$$;

-- ---------------------------------------------------------------------------
-- Services (YDL: fitness center categories and the Service Listing page)
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  custom_name text,
  navigate_to text check (navigate_to in ('class_listing', 'membership_plans')),
  show_in_app boolean not null default true,
  banner_url text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, name)
);

-- Seeds a new studio with the default lists and YDL's service categories.
create or replace function app.seed_studio_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.list_items (studio_id, list, label, kind, sort)
  select new.id, d.list, d.label, d.kind, d.sort from app.default_list_items() d
  on conflict (studio_id, list, label) do nothing;

  insert into public.services (studio_id, name, active, sort)
  select new.id, x.name, x.on_, x.ord * 10
  from unnest(
    array['Weight Training','Yoga','Cardio','Cross-fit','Zumba','Personal Training / Nutrition','Dance','Body Massage','Kick Boxing','Calisthenics','HIIT','Strength Training','MMA','Group Activity','Spinning','Nutrition','Physiotherapy','Steam','Locker','Boxing','Sauna','Free Body Weight','Pilates (Group)','Pilates (Private)'],
    array[true,false,true,true,false,true,false,false,false,true,true,true,false,true,false,true,false,true,true,false,false,true,false,false]
  ) with ordinality as x(name, on_, ord)
  on conflict (studio_id, name) do nothing;
  return new;
end $$;
create trigger studios_seed after insert on public.studios for each row execute function app.seed_studio_defaults();

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  theme text check (theme in ('noir', 'club', 'clinic')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Staff accounts and trainers (YDL keeps them on two pages; here a role tells them apart).
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role public.staff_role not null,
  staff_code text,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text,
  full_name text generated always as (trim(first_name || ' ' || coalesce(last_name, ''))) stored,
  email text,
  country_code text not null default '+91',
  phone text,
  emergency_phone text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  employee_type text,
  designation text,
  title text,
  years_experience int,
  client_limit int,
  show_in_member_app boolean not null default true,
  service_type text not null default 'both' check (service_type in ('both', 'online', 'offline')),
  service_ids uuid[] not null default '{}',
  working_days smallint[] not null default '{1,2,3,4,5,6}',
  photo_url text,
  street1 text,
  street2 text,
  city text,
  state text,
  country text,
  pincode text,
  star_trainer boolean not null default false,
  registration_number text,
  -- Coach app switches and staff rights (YDL: trainer coach app settings, staff account options).
  permissions jsonb not null default '{
    "allow_workout": true, "allow_diet": true, "allow_followups": true, "allow_appointments": true,
    "assign_subscription": false, "view_subscription": false, "view_membership_plan": false,
    "create_membership_plan": false, "view_programs": false, "create_programs": false,
    "view_all_batches": false, "view_self_batches": false, "create_self_batches": false, "create_all_batches": false,
    "allow_discounting": true, "only_his_clients": false, "auto_allocate_leads": false
  }'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, staff_code)
);
create index staff_studio_idx on public.staff (studio_id);
create index staff_user_idx on public.staff (user_id);
create unique index staff_user_role_uq on public.staff (studio_id, user_id, role) where user_id is not null;

-- Pay details: owner only (other staff can see the team list, never salaries).
create table public.staff_payroll (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  basic_pay numeric(12,2) not null default 0,
  pay_per text not null default 'month' check (pay_per in ('month', 'week', 'day')),
  deduct_for_absent boolean not null default false,
  late_penalty numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Clients: enquiries and members in one table (YDL "Clients database").
-- An enquiry becomes a member when kind changes to 'member'; it keeps its history.
create table public.members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'enquiry' check (kind in ('enquiry', 'member')),
  enquiry_code text,
  member_code text,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text,
  full_name text generated always as (trim(first_name || ' ' || coalesce(last_name, ''))) stored,
  email text,
  country_code text not null default '+91',
  phone text,
  phone_withheld boolean not null default false,       -- "Customer reluctant to give Mobile Number"
  alt_country_code text,
  alt_phone text,
  guardian_phone text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  enquiry_date date not null default current_date,
  added_by uuid references public.staff(id) on delete set null,   -- YDL "created by" / handled by / client rep
  ref_no text,
  trainer_id uuid references public.staff(id) on delete set null, -- assigned trainer
  source_promotion text,
  source_enquiry text,
  primary_tag text,
  secondary_tag text,
  employment_status text,
  occupation text,
  referred_by_staff_id uuid references public.staff(id) on delete set null,
  referred_by_member_id uuid references public.members(id) on delete set null,
  third_party_referral text,
  interested_service_ids uuid[] not null default '{}',
  street1 text,
  street2 text,
  city text,
  state text,
  country text,
  pincode text,
  emergency_first_name text,
  emergency_last_name text,
  emergency_email text,
  emergency_phone text,
  emergency_relationship text,
  notes text,                                            -- Remarks / Summary
  lead_status text not null default 'open' check (lead_status in ('open', 'not_interested')),
  convertibility text,                                   -- latest, from follow-ups
  tapped boolean not null default false,                 -- follow-up stage: tapped / untapped
  level text,
  photo_url text,
  preferred_language text not null default 'en',
  app_installed_at timestamptz,
  biometric_code int,
  rfid text,
  active boolean not null default true,                  -- deactivated clients are hidden from lists
  converted_at timestamptz,
  joined_on date,
  deleted_at timestamptz,
  deleted_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is not null or phone_withheld),
  unique (studio_id, member_code),
  unique (studio_id, enquiry_code)
);
create index members_studio_kind_idx on public.members (studio_id, kind, created_at desc);
create index members_user_idx on public.members (user_id);
create index members_phone_idx on public.members (studio_id, phone);
create index members_trainer_idx on public.members (trainer_id);
create index members_added_by_idx on public.members (added_by);

-- Billing identity: kept apart so coaches never see it. Aadhaar: last four digits only.
create table public.member_billing (
  member_id uuid primary key references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  company_name text,
  gst_number text,
  pan text,
  aadhaar_last4 text check (aadhaar_last4 ~ '^[0-9]{4}$'),
  updated_at timestamptz not null default now()
);

-- Health: owner, the member's coach and doctor, and the member. Never front desk.
create table public.member_health (
  member_id uuid primary key references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  height_cm numeric(5,1),
  conditions text,
  injuries text,
  medications text,
  par_q jsonb,                 -- YDL medical history: heart problem, diabetes, chest pain, ...
  medical_note text,
  doctor_decision public.doctor_decision not null default 'pending',
  doctor_limits text,
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Extra coaches and doctors looking after a member (the assigned trainer is members.trainer_id).
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

-- Who changed what, when.
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
-- Access helpers (security definer, so policies can use them without recursion)
-- ---------------------------------------------------------------------------
create or replace function app.has_role(p_studio uuid, p_roles public.staff_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.role = any (p_roles)
  );
$$;

create or replace function app.is_owner(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role(p_studio, array['owner']::public.staff_role[]);
$$;

create or replace function app.is_desk(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role(p_studio, array['owner', 'front_desk']::public.staff_role[]);
$$;

create or replace function app.is_staff(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role(p_studio, array['owner', 'front_desk', 'coach', 'doctor']::public.staff_role[]);
$$;

create or replace function app.in_studio(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_staff(p_studio)
      or exists (select 1 from public.members m where m.studio_id = p_studio and m.user_id = (select auth.uid()) and m.deleted_at is null);
$$;

create or replace function app.my_staff_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s where s.user_id = (select auth.uid()) and s.active;
$$;

-- The signed-in person's staff record in a studio (owner/front desk first, then coach).
create or replace function app.my_staff_id(p_studio uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active
  order by case s.role when 'owner' then 0 when 'front_desk' then 1 when 'coach' then 2 else 3 end
  limit 1;
$$;

create or replace function app.is_self(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.id = p_member and m.user_id = (select auth.uid()));
$$;

-- True when the signed-in coach or doctor looks after this member
-- (assigned trainer, or listed on the member's care team).
create or replace function app.in_care_team(p_member uuid, p_roles public.care_role[] default array['coach', 'doctor']::public.care_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.care_team c join public.staff s on s.id = c.staff_id
    where c.member_id = p_member and c.role = any (p_roles) and s.user_id = (select auth.uid()) and s.active
  ) or ('coach' = any (p_roles) and exists (
    select 1 from public.members m join public.staff s on s.id = m.trainer_id
    where m.id = p_member and s.user_id = (select auth.uid()) and s.active
  ));
$$;

-- Owner sees every client. Front desk sees every client unless the owner set
-- "Can see only his clients" for them; then only clients they added or train.
create or replace function app.can_see_client(p_studio uuid, p_added_by uuid, p_trainer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_owner(p_studio) or exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.role = 'front_desk'
      and (not coalesce((s.permissions->>'only_his_clients')::boolean, false) or s.id = p_added_by or s.id = p_trainer)
  );
$$;

revoke execute on all functions in schema app from public;
grant execute on function app.today(uuid), app.has_role(uuid, public.staff_role[]), app.is_owner(uuid), app.is_desk(uuid),
  app.is_staff(uuid), app.in_studio(uuid), app.my_staff_ids(), app.my_staff_id(uuid), app.is_self(uuid),
  app.in_care_team(uuid, public.care_role[]), app.can_see_client(uuid, uuid, uuid), app.format_number(jsonb, bigint)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger staff_touch before update on public.staff for each row execute function app.touch_updated_at();
create trigger members_touch before update on public.members for each row execute function app.touch_updated_at();
create trigger member_billing_touch before update on public.member_billing for each row execute function app.touch_updated_at();
create trigger member_health_touch before update on public.member_health for each row execute function app.touch_updated_at();
create trigger staff_payroll_touch before update on public.staff_payroll for each row execute function app.touch_updated_at();

-- Codes: enquiries get an enquiry code; members get a member code when they join.
create or replace function app.set_member_codes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.added_by is null then new.added_by = app.my_staff_id(new.studio_id); end if;
    if new.kind = 'enquiry' and new.enquiry_code is null then
      new.enquiry_code = app.next_code(new.studio_id, 'enquiry_code');
    end if;
  end if;
  if new.kind = 'member' then
    if new.member_code is null then new.member_code = app.next_code(new.studio_id, 'member_code'); end if;
    if new.converted_at is null and new.enquiry_code is not null then new.converted_at = now(); end if;
    if new.joined_on is null then new.joined_on = app.today(new.studio_id); end if;
  end if;
  if tg_op = 'UPDATE' and new.kind = 'enquiry' and old.kind = 'member' then
    raise exception 'A member cannot go back to being an enquiry';
  end if;
  return new;
end $$;
create trigger members_codes before insert or update on public.members for each row execute function app.set_member_codes();

create or replace function app.set_staff_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.staff_code is null then
    new.staff_code = app.next_code(new.studio_id, case when new.role = 'coach' then 'trainer_code' else 'staff_code' end);
  end if;
  return new;
end $$;
create trigger staff_code before insert on public.staff for each row execute function app.set_staff_code();

create or replace function app.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_old jsonb;
begin
  v_row = case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old = case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  insert into public.activity_log (studio_id, actor, table_name, row_id, action, changes)
  values (
    (v_row->>'studio_id')::uuid, auth.uid(), tg_table_name,
    coalesce(v_row->>'id', v_row->>'member_id', v_row->>'staff_id')::uuid, lower(tg_op),
    case when tg_op = 'UPDATE' then (
      select jsonb_object_agg(k, jsonb_build_object('from', v_old->k, 'to', v_row->k))
      from jsonb_object_keys(v_row) k where v_row->k is distinct from v_old->k and k <> 'updated_at'
    ) else v_row end
  );
  return null;
end $$;

create trigger members_log after insert or update or delete on public.members for each row execute function app.log_activity();
create trigger staff_log after insert or update or delete on public.staff for each row execute function app.log_activity();
create trigger staff_payroll_log after insert or update or delete on public.staff_payroll for each row execute function app.log_activity();
create trigger list_items_log after insert or update or delete on public.list_items for each row execute function app.log_activity();

-- Logins: create a profile and link the person to their staff or member record
-- by phone or email, so nobody types codes or IDs.
create or replace function app.digits(p text)
returns text language sql immutable as $$ select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), ''); $$;

create or replace function app.same_phone(a text, b text)
returns boolean language sql immutable as $$
  select app.digits(a) is not null and app.digits(b) is not null and (
    app.digits(a) = app.digits(b)
    or (length(app.digits(a)) = 10 and right(app.digits(b), 10) = app.digits(a))
    or (length(app.digits(b)) = 10 and right(app.digits(a), 10) = app.digits(b))
  );
$$;

create or replace function app.link_user(p_id uuid, p_phone text, p_email text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, email, full_name) values (p_id, p_phone, p_email, p_name)
  on conflict (id) do nothing;

  update public.staff s set user_id = p_id
  where s.user_id is null and s.active
    and ((p_phone is not null and app.same_phone(s.country_code || coalesce(s.phone, ''), p_phone))
      or (p_phone is not null and app.same_phone(s.phone, p_phone))
      or (p_email is not null and lower(s.email) = lower(p_email)));

  update public.members m set user_id = p_id
  where m.user_id is null and m.deleted_at is null
    and ((p_phone is not null and app.same_phone(m.phone, p_phone))
      or (p_email is not null and lower(m.email) = lower(p_email)));
end $$;

create or replace function app.link_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.link_user(new.id, new.phone, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app.link_new_user();

-- Re-links logins that already exist (used after a database rebuild).
create or replace function app.relink_existing_users()
returns void language plpgsql security definer set search_path = '' as $$
declare u record;
begin
  for u in select id, phone, email, raw_user_meta_data->>'full_name' as name from auth.users loop
    perform app.link_user(u.id, u.phone, u.email, u.name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.studios enable row level security;
alter table public.list_items enable row level security;
alter table public.services enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.staff_payroll enable row level security;
alter table public.members enable row level security;
alter table public.member_billing enable row level security;
alter table public.member_health enable row level security;
alter table public.care_team enable row level security;
alter table public.activity_log enable row level security;

create policy studios_read on public.studios for select to authenticated using (app.in_studio(id));
create policy studios_owner_update on public.studios for update to authenticated using (app.is_owner(id)) with check (app.is_owner(id));

create policy list_items_read on public.list_items for select to authenticated using (app.in_studio(studio_id));
create policy list_items_owner on public.list_items for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy services_read on public.services for select to authenticated using (app.in_studio(studio_id));
create policy services_owner on public.services for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy profiles_self on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Staff: the team list is visible to staff; only the owner changes it.
create policy staff_read on public.staff for select to authenticated using (app.is_staff(studio_id) or user_id = (select auth.uid()));
create policy staff_owner_insert on public.staff for insert to authenticated with check (app.is_owner(studio_id));
create policy staff_owner_update on public.staff for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy staff_owner_delete on public.staff for delete to authenticated using (app.is_owner(studio_id));

create policy staff_payroll_owner on public.staff_payroll for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

-- Clients: owner all; front desk all (or only their own when restricted);
-- coaches and doctors only the members they look after; a member only themself.
create policy members_read on public.members for select to authenticated
  using (app.can_see_client(studio_id, added_by, trainer_id) or app.in_care_team(id) or user_id = (select auth.uid()));
create policy members_desk_insert on public.members for insert to authenticated with check (app.is_desk(studio_id));
create policy members_desk_update on public.members for update to authenticated
  using (app.can_see_client(studio_id, added_by, trainer_id)) with check (app.is_desk(studio_id));
create policy members_owner_delete on public.members for delete to authenticated using (app.is_owner(studio_id));

create policy member_billing_read on public.member_billing for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy member_billing_desk on public.member_billing for insert to authenticated with check (app.is_desk(studio_id));
create policy member_billing_desk_update on public.member_billing for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy health_read on public.member_health for select to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy health_insert on public.member_health for insert to authenticated
  with check (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy health_update on public.member_health for update to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id))
  with check (app.is_owner(studio_id) or app.in_care_team(member_id));

create policy care_team_read on public.care_team for select to authenticated using (app.is_staff(studio_id) or app.is_self(member_id));
create policy care_team_desk on public.care_team for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy activity_owner_read on public.activity_log for select to authenticated using (app.is_owner(studio_id));

-- Only the member's doctor (or the owner) records the health decision.
create or replace function app.guard_doctor_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if (tg_op = 'INSERT' and (new.doctor_decision <> 'pending' or new.doctor_limits is not null))
     or (tg_op = 'UPDATE' and (new.doctor_decision is distinct from old.doctor_decision or new.doctor_limits is distinct from old.doctor_limits)) then
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

call app.apply_grants();
revoke insert, update, delete on public.activity_log from authenticated;

-- ===== 20261008000002_memberships.sql =====
-- Shaan Fitness app · 2. Memberships and money
-- Membership plans, coupons, combo offers, subscriptions (YDL invoices), receipts,
-- write-offs, refunds, freezes, extensions, transfers, upgrades and downgrades.

-- ---------------------------------------------------------------------------
-- Membership plans (YDL membership plan form)
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  plan_code text,
  kind text not null default 'gym' check (kind in ('gym', 'pt')),       -- YDL subscription service type: Gym / P.T
  service_ids uuid[] not null default '{}',                              -- membership category
  show_in_app boolean not null default true,
  trainer_ids uuid[] not null default '{}',                              -- assign trainer
  terms text,                                                            -- terms & conditions
  session_count int check (session_count is null or session_count > 0),
  unlimited_sessions boolean not null default false,
  disable_messages_followups boolean not null default false,
  tenure_value int not null check (tenure_value > 0),
  tenure_unit text not null default 'months' check (tenure_unit in ('days', 'months', 'years')),
  is_one_time boolean not null default false,
  freeze_days int not null default 0 check (freeze_days >= 0),
  weekly_class_limit int check (weekly_class_limit is null or weekly_class_limit >= 0),
  is_free_trial boolean not null default false,
  price numeric(12,2) not null default 0 check (price >= 0),
  discount_price numeric(12,2) check (discount_price is null or discount_price >= 0),
  total_price numeric(12,2) generated always as (coalesce(discount_price, price)) stored,
  app_sequence int not null default 0,
  image_url text,
  appointment_type text check (appointment_type in ('daily', 'alternate_day', 'every_third_day', 'once_a_week', 'one_time')),
  -- Shaan Fitness additions
  tier text check (tier in ('group', 'semi_private', 'elite', 'custom')),
  includes_personal_coach boolean not null default false,
  includes_doctor boolean not null default false,
  doctor_consults_per_cycle int not null default 0,
  coach_split jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, plan_code)
);
create index plans_studio_idx on public.plans (studio_id, active);

-- Last day of a plan that starts on p_start (1 month from 7 Sep ends 6 Oct, like YDL).
create or replace function app.plan_end_date(p_start date, p_value int, p_unit text)
returns date language sql immutable as $$
  select (case p_unit
    when 'days' then p_start + p_value
    when 'years' then (p_start + make_interval(years => p_value))::date
    else (p_start + make_interval(months => p_value))::date
  end) - 1;
$$;

-- ---------------------------------------------------------------------------
-- Coupons and combo offers
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  code text not null,
  type text not null check (type in ('flat', 'percentage', 'installments', 'flat_installments', 'percentage_installments')),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  service_id uuid references public.services(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  who_can_use text not null default 'both' check (who_can_use in ('new', 'existing', 'both')),
  start_date date,
  expiry_date date,
  max_redemptions int,
  max_per_user int,
  min_order numeric(12,2),
  max_order numeric(12,2),
  max_discount numeric(12,2),
  terms text,
  installments int check (installments between 1 and 10),
  installment_interval int check (installment_interval between 1 and 10),
  installment_unit text check (installment_unit in ('month', 'week', 'year')),
  interest_rate numeric(6,2),
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, code)
);

create table public.combo_offers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  plan_ids uuid[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subscriptions (a member's plan for a period; YDL invoice)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  kind text not null check (kind in ('gym', 'pt', 'trial')),
  invoice_no text,
  invoice_date date not null default current_date,
  is_renewal boolean not null default false,
  start_date date not null,
  base_end_date date not null,
  extension_days int not null default 0 check (extension_days >= 0),
  frozen_days int not null default 0 check (frozen_days >= 0),
  end_date date generated always as (base_end_date + extension_days + frozen_days) stored,
  sessions_total int check (sessions_total is null or sessions_total >= 0),
  sessions_used int not null default 0,
  pt_points int,
  trainer_id uuid references public.staff(id) on delete set null,
  second_trainer_id uuid references public.staff(id) on delete set null,
  group_member_ids uuid[] not null default '{}',               -- couple / group plan members
  divide_sessions_in_group boolean not null default false,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  coupon_discount numeric(12,2) not null default 0 check (coupon_discount >= 0),
  gst_rate numeric(5,2) not null default 0,
  igst boolean not null default false,
  net_amount numeric(12,2) generated always as (greatest(selling_price - coupon_discount, 0)) stored,
  gst_amount numeric(12,2) generated always as (round(greatest(selling_price - coupon_discount, 0) * gst_rate / 100, 2)) stored,
  total_amount numeric(12,2) generated always as (greatest(selling_price - coupon_discount, 0) + round(greatest(selling_price - coupon_discount, 0) * gst_rate / 100, 2)) stored,
  balance_due_date date,                                       -- YDL "schedule payment date"
  status text not null default 'live' check (status in ('live', 'transferred', 'upgraded', 'downgraded')),
  mark_used boolean not null default false,
  batch_id uuid,                                               -- set when batches exist (migration 3)
  combo_offer_id uuid references public.combo_offers(id) on delete set null,
  bill_rep_id uuid references public.staff(id) on delete set null,
  client_rep_id uuid references public.staff(id) on delete set null,
  note text,
  customer_address text,
  recurring boolean not null default false,
  next_payable_date date,
  next_payable_amount numeric(12,2),
  previous_subscription_id uuid references public.subscriptions(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.staff(id) on delete set null,
  cancel_reason text,
  deleted_at timestamptz,
  deleted_by uuid references public.staff(id) on delete set null,
  delete_reason text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_end_date >= start_date),
  unique (studio_id, invoice_no)
);
create index subscriptions_member_idx on public.subscriptions (member_id, start_date desc);
create index subscriptions_studio_end_idx on public.subscriptions (studio_id, end_date);
create index subscriptions_studio_invoice_idx on public.subscriptions (studio_id, invoice_date);

-- ---------------------------------------------------------------------------
-- Receipts (payments), write-offs and refunds
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  kind text not null default 'payment' check (kind in ('payment', 'write_off', 'refund')),
  purpose text not null default 'subscription' check (purpose in ('subscription', 'freeze_fee', 'extension_fee', 'transfer_fee', 'store', 'other')),
  receipt_no text,
  receipt_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  mode text,
  status text not null default 'paid' check (status in ('paid', 'cancelled')),
  reference text,
  note text,
  bill_rep_id uuid references public.staff(id) on delete set null,
  added_by uuid references public.staff(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.staff(id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, receipt_no)
);
create index payments_member_idx on public.payments (member_id);
create index payments_subscription_idx on public.payments (subscription_id);
create index payments_studio_date_idx on public.payments (studio_id, receipt_date);

-- Receipt register log: every change to a receipt after it was made.
create table public.receipt_changes (
  id bigint generated always as identity primary key,
  studio_id uuid not null references public.studios(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  changed_by uuid references public.staff(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_values jsonb not null,
  new_values jsonb not null
);
create index receipt_changes_payment_idx on public.receipt_changes (payment_id);

-- ---------------------------------------------------------------------------
-- Freezes, extensions, transfers, upgrades, downgrades
-- ---------------------------------------------------------------------------
create table public.freezes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  start_date date not null,
  days int not null check (days > 0),
  end_date date generated always as (start_date + days - 1) stored,
  fee numeric(12,2) not null default 0 check (fee >= 0),
  note text,
  status text not null default 'approved' check (status in ('requested', 'approved', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references public.staff(id) on delete set null,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index freezes_subscription_idx on public.freezes (subscription_id);

create table public.extensions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  days int not null check (days > 0),
  fee numeric(12,2) not null default 0 check (fee >= 0),
  note text,
  status text not null default 'approved' check (status in ('requested', 'approved', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index extensions_subscription_idx on public.extensions (subscription_id);

create table public.subscription_changes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  kind text not null check (kind in ('transfer', 'upgrade', 'downgrade')),
  from_subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  to_subscription_id uuid references public.subscriptions(id) on delete set null,
  from_member_id uuid not null references public.members(id) on delete cascade,
  to_member_id uuid references public.members(id) on delete set null,
  old_amount numeric(12,2),
  new_amount numeric(12,2),
  fee numeric(12,2) not null default 0,
  refund_amount numeric(12,2) not null default 0,
  refund_paid boolean not null default false,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One state for display and filters: pending, active, frozen, expired, used,
-- cancelled, deleted, transferred, upgraded, downgraded.
create or replace function app.subscription_state(s public.subscriptions)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.deleted_at is not null then 'deleted'
    when s.cancelled_at is not null then 'cancelled'
    when s.status <> 'live' then s.status
    when s.mark_used then 'used'
    when s.sessions_total is not null and s.sessions_total > 0 and s.sessions_used >= s.sessions_total then 'used'
    when app.today(s.studio_id) < s.start_date then 'pending'
    when app.today(s.studio_id) > s.end_date then 'expired'
    when exists (select 1 from public.freezes f where f.subscription_id = s.id and f.status = 'approved'
                 and app.today(s.studio_id) between f.start_date and f.end_date) then 'frozen'
    else 'active'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger plans_touch before update on public.plans for each row execute function app.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function app.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function app.touch_updated_at();

create or replace function app.set_plan_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan_code is null then new.plan_code = app.next_code(new.studio_id, 'plan_code'); end if;
  if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  if new.is_free_trial and new.discount_price is null then new.discount_price = 0; end if;
  return new;
end $$;
create trigger plans_code before insert on public.plans for each row execute function app.set_plan_code();

-- New subscriptions copy what they need from the plan, get an invoice number,
-- and turn an enquiry into a member (trials don't).
create or replace function app.fill_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.plans; m public.members; st public.studios;
begin
  select * into p from public.plans where id = new.plan_id;
  select * into m from public.members where id = new.member_id;
  select * into st from public.studios where id = new.studio_id;
  if p.studio_id <> new.studio_id or m.studio_id <> new.studio_id then
    raise exception 'Plan and member must belong to this studio';
  end if;
  if new.kind is null then new.kind = case when p.is_free_trial then 'trial' else p.kind end; end if;
  if new.base_end_date is null then new.base_end_date = app.plan_end_date(new.start_date, p.tenure_value, p.tenure_unit); end if;
  if new.sessions_total is null and not p.unlimited_sessions then new.sessions_total = p.session_count; end if;
  if new.base_price = 0 and p.price > 0 then new.base_price = p.price; end if;
  if new.gst_rate = 0 and coalesce((st.settings->'gst'->>'enabled')::boolean, false) then
    new.gst_rate = coalesce((st.settings->'gst'->>'rate')::numeric, 0);
  end if;
  if new.invoice_no is null and coalesce(st.settings->'invoice'->>'mode', 'automatic') = 'automatic' then
    new.invoice_no = app.next_code(new.studio_id, 'invoice', new.invoice_date);
  end if;
  if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  if new.bill_rep_id is null then new.bill_rep_id = new.created_by; end if;
  if new.client_rep_id is null then new.client_rep_id = coalesce(m.added_by, new.created_by); end if;
  new.is_renewal = exists (
    select 1 from public.subscriptions s
    where s.member_id = new.member_id and s.kind = new.kind and s.deleted_at is null and s.id <> new.id
  );
  return new;
end $$;
create trigger subscriptions_fill before insert on public.subscriptions for each row execute function app.fill_subscription();

create or replace function app.convert_on_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind in ('gym', 'pt') and new.deleted_at is null then
    update public.members set kind = 'member' where id = new.member_id and kind = 'enquiry';
  end if;
  return null;
end $$;
create trigger subscriptions_convert after insert on public.subscriptions for each row execute function app.convert_on_subscription();

-- Prices, invoice numbers, cancelling and deleting are owner decisions; front desk
-- can change prices only if the owner allowed them to give discounts.
create or replace function app.guard_subscription_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_discount boolean;
begin
  if auth.uid() is null or app.is_owner(new.studio_id) then return new; end if;
  if new.deleted_at is distinct from old.deleted_at or new.cancelled_at is distinct from old.cancelled_at
     or new.invoice_no is distinct from old.invoice_no or new.invoice_date is distinct from old.invoice_date then
    raise exception 'Only the owner can cancel or delete a subscription or change its invoice';
  end if;
  if new.base_price is distinct from old.base_price or new.selling_price is distinct from old.selling_price
     or new.coupon_discount is distinct from old.coupon_discount or new.gst_rate is distinct from old.gst_rate then
    select coalesce((s.permissions->>'allow_discounting')::boolean, false) into v_discount
    from public.staff s where s.id = app.my_staff_id(new.studio_id);
    if not coalesce(v_discount, false) then raise exception 'You are not allowed to change prices'; end if;
  end if;
  return new;
end $$;
create trigger subscriptions_guard before update on public.subscriptions for each row execute function app.guard_subscription_update();

create or replace function app.set_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_total numeric; v_paid numeric;
begin
  if new.receipt_no is null then
    select coalesce(s.settings->'receipt'->>'mode', 'automatic') into v_mode from public.studios s where s.id = new.studio_id;
    if v_mode = 'automatic' then new.receipt_no = app.next_code(new.studio_id, 'receipt', new.receipt_date); end if;
  end if;
  if new.added_by is null then new.added_by = app.my_staff_id(new.studio_id); end if;
  if new.bill_rep_id is null then new.bill_rep_id = new.added_by; end if;
  -- A receipt can't take more than what is still owed on the subscription.
  if new.subscription_id is not null and new.purpose = 'subscription' and new.kind in ('payment', 'write_off') and new.status = 'paid' then
    select s.total_amount into v_total from public.subscriptions s where s.id = new.subscription_id;
    select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) into v_paid
    from public.payments p
    where p.subscription_id = new.subscription_id and p.purpose = 'subscription' and p.status = 'paid' and p.id <> new.id;
    if v_paid + new.amount > v_total + 0.009 then
      raise exception 'This is more than the balance due (% left)', greatest(v_total - v_paid, 0);
    end if;
  end if;
  return new;
end $$;
create trigger payments_receipt before insert or update on public.payments for each row execute function app.set_receipt();

create or replace function app.log_receipt_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.amount, old.mode, old.receipt_date, old.status, old.receipt_no, old.reference)
     is distinct from (new.amount, new.mode, new.receipt_date, new.status, new.receipt_no, new.reference) then
    insert into public.receipt_changes (studio_id, payment_id, changed_by, old_values, new_values)
    values (new.studio_id, new.id, app.my_staff_id(new.studio_id),
      jsonb_build_object('amount', old.amount, 'mode', old.mode, 'receipt_date', old.receipt_date, 'status', old.status, 'receipt_no', old.receipt_no, 'reference', old.reference),
      jsonb_build_object('amount', new.amount, 'mode', new.mode, 'receipt_date', new.receipt_date, 'status', new.status, 'receipt_no', new.receipt_no, 'reference', new.reference));
  end if;
  return null;
end $$;
create trigger payments_change_log after update on public.payments for each row execute function app.log_receipt_change();

-- Freezes and extensions move the subscription's end date.
create or replace function app.apply_extension()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid = coalesce(new.subscription_id, old.subscription_id);
begin
  update public.subscriptions set extension_days = (
    select coalesce(sum(e.days), 0) from public.extensions e where e.subscription_id = v_id and e.status = 'approved'
  ) where id = v_id;
  return null;
end $$;
create trigger extensions_apply after insert or update or delete on public.extensions for each row execute function app.apply_extension();

create or replace function app.apply_freeze()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid = coalesce(new.subscription_id, old.subscription_id);
begin
  update public.subscriptions set frozen_days = (
    select coalesce(sum(f.days), 0) from public.freezes f where f.subscription_id = v_id and f.status = 'approved'
  ) where id = v_id;
  return null;
end $$;
create trigger freezes_apply after insert or update or delete on public.freezes for each row execute function app.apply_freeze();

create or replace function app.fill_staff_and_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  if new.member_id is null then select s.member_id into new.member_id from public.subscriptions s where s.id = new.subscription_id; end if;
  return new;
end $$;
create trigger freezes_fill before insert on public.freezes for each row execute function app.fill_staff_and_member();
create trigger extensions_fill before insert on public.extensions for each row execute function app.fill_staff_and_member();

create trigger plans_log after insert or update or delete on public.plans for each row execute function app.log_activity();
create trigger subscriptions_log after insert or update or delete on public.subscriptions for each row execute function app.log_activity();
create trigger payments_log after insert or update or delete on public.payments for each row execute function app.log_activity();
create trigger coupons_log after insert or update or delete on public.coupons for each row execute function app.log_activity();
create trigger freezes_log after insert or update or delete on public.freezes for each row execute function app.log_activity();
create trigger extensions_log after insert or update or delete on public.extensions for each row execute function app.log_activity();

-- ---------------------------------------------------------------------------
-- Views (security_invoker: they obey the same access rules as the tables)
-- ---------------------------------------------------------------------------
create view public.subscription_overview with (security_invoker = true) as
select
  s.*,
  app.subscription_state(s) as state,
  p.name as plan_name,
  p.service_ids as plan_service_ids,
  p.tier as plan_tier,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.email as member_email,
  m.gender as member_gender,
  m.kind as member_kind,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  coalesce(pay.paid, 0) as paid_amount,
  coalesce(pay.written_off, 0) as written_off_amount,
  greatest(s.total_amount - coalesce(pay.paid, 0) - coalesce(pay.written_off, 0), 0) as balance_amount,
  case when s.total_amount - coalesce(pay.paid, 0) - coalesce(pay.written_off, 0) <= 0.009 then 'paid' else 'pending' end as payment_status,
  (s.end_date - app.today(s.studio_id)) as days_left,
  case when s.sessions_total is null then null else greatest(s.sessions_total - s.sessions_used, 0) end as sessions_left
from public.subscriptions s
join public.plans p on p.id = s.plan_id
join public.members m on m.id = s.member_id
left join lateral (
  select
    sum(case when x.kind = 'payment' then x.amount when x.kind = 'refund' then -x.amount else 0 end) as paid,
    sum(case when x.kind = 'write_off' then x.amount else 0 end) as written_off
  from public.payments x
  where x.subscription_id = s.id and x.purpose = 'subscription' and x.status = 'paid'
) pay on true;

create view public.payment_overview with (security_invoker = true) as
select
  x.*,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.email as member_email,
  m.gender as member_gender,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  s.invoice_no,
  s.invoice_date,
  s.start_date,
  s.end_date,
  s.total_amount as bill_amount,
  s.plan_id,
  pl.name as plan_name,
  pl.service_ids as plan_service_ids,
  ab.full_name as added_by_name,
  br.full_name as bill_rep_name
from public.payments x
join public.members m on m.id = x.member_id
left join public.subscriptions s on s.id = x.subscription_id
left join public.plans pl on pl.id = s.plan_id
left join public.staff ab on ab.id = x.added_by
left join public.staff br on br.id = x.bill_rep_id;

-- Coaches and doctors see plan progress for the members they look after, without money.
create or replace function public.care_progress()
returns table (member_id uuid, subscription_id uuid, plan_name text, kind text, start_date date, end_date date,
               sessions_total int, sessions_used int, state text)
language sql stable security definer set search_path = '' as $$
  select s.member_id, s.id, p.name, s.kind, s.start_date, s.end_date, s.sessions_total, s.sessions_used, app.subscription_state(s)
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.deleted_at is null and (app.in_care_team(s.member_id) or app.is_desk(s.studio_id));
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.coupons enable row level security;
alter table public.combo_offers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.receipt_changes enable row level security;
alter table public.freezes enable row level security;
alter table public.extensions enable row level security;
alter table public.subscription_changes enable row level security;

create policy plans_read on public.plans for select to authenticated using (app.in_studio(studio_id));
create policy plans_owner on public.plans for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy coupons_read on public.coupons for select to authenticated using (app.is_staff(studio_id));
create policy coupons_owner on public.coupons for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy combos_read on public.combo_offers for select to authenticated using (app.is_staff(studio_id));
create policy combos_owner on public.combo_offers for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy subscriptions_read on public.subscriptions for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy subscriptions_desk_insert on public.subscriptions for insert to authenticated with check (app.is_desk(studio_id));
create policy subscriptions_desk_update on public.subscriptions for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy payments_read on public.payments for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy payments_desk_insert on public.payments for insert to authenticated with check (app.is_desk(studio_id));
create policy payments_owner_update on public.payments for update to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy receipt_changes_owner on public.receipt_changes for select to authenticated using (app.is_owner(studio_id));

create policy freezes_read on public.freezes for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy freezes_desk on public.freezes for insert to authenticated with check (app.is_desk(studio_id) or (app.is_self(member_id) and status = 'requested'));
create policy freezes_desk_update on public.freezes for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy extensions_read on public.extensions for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy extensions_desk on public.extensions for insert to authenticated with check (app.is_desk(studio_id) or (app.is_self(member_id) and status = 'requested'));
create policy extensions_desk_update on public.extensions for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy changes_read on public.subscription_changes for select to authenticated using (app.is_desk(studio_id));
create policy changes_desk on public.subscription_changes for insert to authenticated with check (app.is_desk(studio_id));

call app.apply_grants();
revoke insert, update, delete on public.receipt_changes from authenticated;

-- ===== 20261008000003_schedule.sql =====
-- Shaan Fitness app · 3. Batches and attendance
-- YDL batches (trainer, service, working days, timing, capacity), fixed batch members,
-- and check-ins (manual, live session, QR, PT session, biometric, class).

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  batch_code text,
  name text not null check (length(trim(name)) > 0),
  info text,
  capacity int check (capacity is null or capacity > 0),
  room text,
  trainer_ids uuid[] not null default '{}',
  service_ids uuid[] not null default '{}',
  start_date date,
  end_date date,
  days smallint[] not null default '{1,2,3,4,5,6}',      -- ISO weekdays, 1 = Monday
  start_time time not null,
  end_time time not null,
  gender text not null default 'all' check (gender in ('all', 'male', 'female')),
  tier text check (tier in ('group', 'semi_private', 'elite', 'custom')),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (studio_id, batch_code)
);
create index batches_studio_idx on public.batches (studio_id, active, start_time);

create table public.batch_members (
  batch_id uuid not null references public.batches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, member_id)
);
create index batch_members_member_idx on public.batch_members (member_id);

alter table public.subscriptions
  add constraint subscriptions_batch_fk foreign key (batch_id) references public.batches(id) on delete set null;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  date date not null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  source text not null default 'manual' check (source in ('manual', 'live', 'qr', 'pt', 'biometric', 'class', 'app')),
  status text not null default 'present' check (status in ('present', 'absent', 'late_cancel')),
  body_temperature numeric(4,1),
  marked_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (check_out is null or check_out >= check_in),
  unique (member_id, date, batch_id)
);
create index attendance_studio_date_idx on public.attendance (studio_id, date);
create index attendance_subscription_idx on public.attendance (subscription_id);
create index attendance_member_idx on public.attendance (member_id, date desc);

create trigger batches_touch before update on public.batches for each row execute function app.touch_updated_at();

create or replace function app.set_batch_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.batch_code is null then new.batch_code = app.next_code(new.studio_id, 'batch_code'); end if;
  return new;
end $$;
create trigger batches_code before insert on public.batches for each row execute function app.set_batch_code();

-- True when the signed-in coach takes this batch.
create or replace function app.coaches_batch(p_batch uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batches b
    where b.id = p_batch and b.trainer_ids && array(select app.my_staff_ids())
  );
$$;
grant execute on function app.coaches_batch(uuid) to authenticated, service_role;

-- A check-in counts against the plan that covers that day (gym or PT before trials).
create or replace function app.attendance_link_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.subscription_id is null then
    select s.id into new.subscription_id from public.subscriptions s
    where s.member_id = new.member_id and new.date between s.start_date and s.end_date
      and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
    order by (s.kind = 'trial'), s.start_date desc
    limit 1;
  end if;
  if new.marked_by is null then new.marked_by = app.my_staff_id(new.studio_id); end if;
  return new;
end $$;
create trigger attendance_link before insert or update of date, member_id on public.attendance
  for each row execute function app.attendance_link_subscription();

create or replace function app.recount_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  ids = array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.subscription_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.subscription_id end
  ], null);
  update public.subscriptions s set sessions_used = (
    select count(*) from public.attendance a where a.subscription_id = s.id and a.status = 'present'
  ) where s.id = any (ids);
  return null;
end $$;
create trigger attendance_recount after insert or update or delete on public.attendance
  for each row execute function app.recount_sessions();

create trigger batches_log after insert or update or delete on public.batches for each row execute function app.log_activity();
create trigger attendance_log after update or delete on public.attendance for each row execute function app.log_activity();

alter table public.batches enable row level security;
alter table public.batch_members enable row level security;
alter table public.attendance enable row level security;

create policy batches_read on public.batches for select to authenticated using (app.in_studio(studio_id));
create policy batches_owner on public.batches for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy batch_members_read on public.batch_members for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.is_self(member_id));
create policy batch_members_desk on public.batch_members for all to authenticated
  using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy attendance_read on public.attendance for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy attendance_mark on public.attendance for insert to authenticated
  with check (app.is_desk(studio_id) or app.coaches_batch(batch_id));
create policy attendance_fix on public.attendance for update to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id))
  with check (app.is_desk(studio_id) or app.coaches_batch(batch_id));
create policy attendance_owner_delete on public.attendance for delete to authenticated using (app.is_owner(studio_id));

call app.apply_grants();

-- ===== 20261008000004_follow_ups.sql =====
-- Shaan Fitness app · 4. Follow-ups
-- YDL follow-up model: each follow-up has a type, a date, the staff it's assigned to,
-- convertibility, expected date and amount, contact type and a to-do note.
-- Answering one ("follow up response") closes it and, if needed, schedules the next.

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  type text not null,
  due_at timestamptz not null,
  assigned_to uuid references public.staff(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done', 'successful', 'not_interested')),
  convertibility text,
  expected_date date,
  expected_amount numeric(12,2) check (expected_amount is null or expected_amount >= 0),
  contact_type text,
  notes text,
  response text,
  response_kind text check (response_kind in ('open', 'successful', 'not_interested')),
  response_note text,
  responded_at timestamptz,
  responded_by uuid references public.staff(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  previous_id uuid references public.follow_ups(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'system')),
  created_by uuid references public.staff(id) on delete set null,   -- null = system generated
  created_at timestamptz not null default now()
);
create index follow_ups_due_idx on public.follow_ups (studio_id, status, due_at);
create index follow_ups_member_idx on public.follow_ups (member_id, created_at desc);
create index follow_ups_assigned_idx on public.follow_ups (assigned_to, status, due_at);
-- One open follow-up per client, type and day: no duplicate reminders.
create unique index follow_ups_no_dupes on public.follow_ups
  (member_id, type, ((due_at at time zone 'Asia/Kolkata')::date)) where status = 'open';

create trigger follow_ups_log after update or delete on public.follow_ups for each row execute function app.log_activity();

-- True when the signed-in staff member has a follow-up for this client.
create or replace function app.has_follow_up_for(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.follow_ups f
    where f.member_id = p_member and f.assigned_to in (select app.my_staff_ids())
  );
$$;
grant execute on function app.has_follow_up_for(uuid) to authenticated, service_role;

-- Coaches also see the clients whose follow-ups they've been given.
drop policy members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (app.can_see_client(studio_id, added_by, trainer_id) or app.in_care_team(id)
         or app.has_follow_up_for(id) or user_id = (select auth.uid()));

alter table public.follow_ups enable row level security;
create policy follow_ups_read on public.follow_ups for select to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()) or created_by in (select app.my_staff_ids()));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()))
  with check (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()));
create policy follow_ups_owner_delete on public.follow_ups for delete to authenticated using (app.is_owner(studio_id));

-- Add a follow-up, or answer one (p.follow_up_id), in one step.
--   p: member_id, follow_up_id?, type, assigned_to, response, convertibility,
--      expected_date, expected_amount, next_at, contact_type, notes
-- The response's kind decides what happens: open → the next follow-up is scheduled;
-- successful → closed as successful; not_interested → closed, and an enquiry is
-- marked "not interested".
create or replace function public.add_follow_up(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_member public.members;
  v_prev public.follow_ups;
  v_me uuid;
  v_kind text;
  v_new uuid;
  v_type text;
  v_next timestamptz;
begin
  if nullif(p->>'follow_up_id', '') is not null then
    select * into v_prev from public.follow_ups where id = (p->>'follow_up_id')::uuid;
    if v_prev.id is null then raise exception 'Follow-up not found'; end if;
    select * into v_member from public.members where id = v_prev.member_id;
  else
    select * into v_member from public.members where id = (p->>'member_id')::uuid;
  end if;
  if v_member.id is null then raise exception 'Client not found'; end if;

  -- Who may do this: owner and front desk always; a coach for clients they look after
  -- or follow-ups assigned to them.
  if not app.is_desk(v_member.studio_id) then
    if not (app.has_role(v_member.studio_id, array['coach']::public.staff_role[])
            and (app.in_care_team(v_member.id) or coalesce(v_prev.assigned_to in (select app.my_staff_ids()), false))) then
      raise exception 'You are not allowed to add follow-ups for this client';
    end if;
  end if;
  v_me = app.my_staff_id(v_member.studio_id);

  select li.kind into v_kind from public.list_items li
  where li.studio_id = v_member.studio_id and li.list = 'followup_response' and li.label = p->>'response';
  v_kind = coalesce(v_kind, 'open');
  v_type = coalesce(nullif(p->>'type', ''), v_prev.type, 'Enquiry');
  v_next = nullif(p->>'next_at', '')::timestamptz;

  if v_prev.id is not null then
    if v_prev.status <> 'open' then raise exception 'This follow-up is already closed'; end if;
    update public.follow_ups set
      status = case v_kind when 'open' then 'done' else v_kind end,
      response = p->>'response', response_kind = v_kind, response_note = nullif(p->>'notes', ''),
      responded_at = now(), responded_by = v_me
    where id = v_prev.id;
  end if;

  if v_kind = 'open' then
    if v_next is null then raise exception 'Choose the next follow-up date'; end if;
    insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, convertibility, expected_date,
      expected_amount, contact_type, notes, previous_id, subscription_id, source, created_by)
    values (v_member.studio_id, v_member.id, v_type, v_next,
      coalesce(nullif(p->>'assigned_to', '')::uuid, v_prev.assigned_to, v_me),
      nullif(p->>'convertibility', ''), nullif(p->>'expected_date', '')::date, nullif(p->>'expected_amount', '')::numeric,
      nullif(p->>'contact_type', ''), nullif(p->>'notes', ''), v_prev.id, v_prev.subscription_id, 'manual', v_me)
    returning id into v_new;
  elsif v_prev.id is null then
    -- A closing response with nothing open: keep it in the history.
    insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status, convertibility, expected_date,
      expected_amount, contact_type, notes, response, response_kind, responded_at, responded_by, source, created_by)
    values (v_member.studio_id, v_member.id, v_type, coalesce(v_next, now()),
      coalesce(nullif(p->>'assigned_to', '')::uuid, v_me), v_kind,
      nullif(p->>'convertibility', ''), nullif(p->>'expected_date', '')::date, nullif(p->>'expected_amount', '')::numeric,
      nullif(p->>'contact_type', ''), nullif(p->>'notes', ''), p->>'response', v_kind, now(), v_me, 'manual', v_me)
    returning id into v_new;
  else
    v_new = v_prev.id;
  end if;

  update public.members set
    convertibility = coalesce(nullif(p->>'convertibility', ''), convertibility),
    tapped = true,
    lead_status = case when v_kind = 'not_interested' and kind = 'enquiry' then 'not_interested'
                       when v_kind <> 'not_interested' and kind = 'enquiry' then 'open'
                       else lead_status end
  where id = v_member.id;
  return v_new;
end $$;

-- Move every open follow-up from one staff member to another (YDL "Transfer follow ups").
create or replace function public.transfer_follow_ups(p_studio uuid, p_from uuid, p_to uuid)
returns int language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  if not app.is_desk(p_studio) then raise exception 'Only owner and front desk can transfer follow-ups'; end if;
  if not exists (select 1 from public.staff where id = p_to and studio_id = p_studio and active) then
    raise exception 'Choose an active staff member to transfer to';
  end if;
  update public.follow_ups set assigned_to = p_to
  where studio_id = p_studio and assigned_to = p_from and status = 'open';
  get diagnostics n = row_count;
  return n;
end $$;

create view public.follow_up_overview with (security_invoker = true) as
select
  f.*,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.gender as member_gender,
  m.kind as member_kind,
  m.lead_status as member_lead_status,
  m.added_by as member_added_by,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  a.full_name as assigned_name,
  c.full_name as created_by_name,
  r.full_name as responded_by_name,
  (f.due_at at time zone 'Asia/Kolkata')::date as due_date
from public.follow_ups f
join public.members m on m.id = f.member_id and m.deleted_at is null
left join public.staff a on a.id = f.assigned_to
left join public.staff c on c.id = f.created_by
left join public.staff r on r.id = f.responded_by;

call app.apply_grants();

-- ===== 20261008000005_expenses.sql =====
-- Shaan Fitness app · 5. Expenses and vendors (YDL expense and vendor pages)

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  contact_name text not null,
  phone1 text,
  phone2 text,
  gst_no text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  vendor_id uuid references public.vendors(id) on delete set null,
  category text not null,
  expense_date date not null default current_date,
  payment_type text not null,
  amount numeric(12,2) not null check (amount >= 0),
  gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  gst_no text,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_studio_date_idx on public.expenses (studio_id, expense_date);

create or replace function app.fill_created_by()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  return new;
end $$;
create trigger expenses_fill before insert on public.expenses for each row execute function app.fill_created_by();
create trigger expenses_log after insert or update or delete on public.expenses for each row execute function app.log_activity();

alter table public.vendors enable row level security;
alter table public.expenses enable row level security;
create policy vendors_owner on public.vendors for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy expenses_owner on public.expenses for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

call app.apply_grants();

-- ===== 20261008000006_client_views.sql =====
-- Shaan Fitness app · 6. Client lists, saving clients, and the dashboard
-- Read models for YDL's enquiry list, member list, clients database and dashboard.

-- Deleting a client and turning an enquiry into a member by hand are owner decisions.
-- (The app converts enquiries itself when a plan is sold; that runs as the database owner.)
-- Runs as the caller (not security definer) so current_user tells API requests apart
-- from the database's own functions.
create or replace function app.guard_member_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user::text = 'authenticated' and not app.is_owner(new.studio_id) then
    if new.deleted_at is distinct from old.deleted_at then raise exception 'Only the owner can delete or restore a client'; end if;
    if new.kind is distinct from old.kind then raise exception 'A client becomes a member when a plan is sold to them'; end if;
    if new.member_code is distinct from old.member_code or new.enquiry_code is distinct from old.enquiry_code then
      raise exception 'Codes are given automatically';
    end if;
  end if;
  return new;
end $$;
create trigger members_guard before update on public.members for each row execute function app.guard_member_update();

-- Every client with what the lists show and filter on.
create view public.member_overview with (security_invoker = true) as
select
  m.*,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  ab.full_name as added_by_name,
  tr.full_name as trainer_name,
  tr.staff_code as trainer_code,
  case when m.date_of_birth is null then null
       else extract(year from age(app.today(m.studio_id), m.date_of_birth))::int end as age,
  to_char(m.date_of_birth, 'MM-DD') as birthday_md,
  to_char(m.joined_on, 'MM-DD') as anniversary_md,
  case when sub.any_active then 'active' when sub.any_pending then 'pending'
       when coalesce(sub.n, 0) > 0 then 'inactive' else 'none' end as live_status,
  cur.id as current_subscription_id,
  cur.plan_id as current_plan_id,
  cur.plan_name as current_plan_name,
  cur.service_ids as current_service_ids,
  cur.start_date as current_start_date,
  cur.end_date as current_end_date,
  coalesce(sub.n, 0) as subscription_count,
  coalesce(sub.had_trial, false) as had_trial,
  coalesce(sub.on_trial, false) as on_trial,
  att.last_check_in,
  coalesce(att.total, 0) as checkins_total,
  coalesce(att.now_in, false) as checked_in_now,
  fu.last_note as last_follow_up_note,
  fu.last_at as last_follow_up_at,
  fu.next_due as next_follow_up_at,
  (m.user_id is not null or m.app_installed_at is not null) as has_app
from public.members m
left join public.staff ab on ab.id = m.added_by
left join public.staff tr on tr.id = m.trainer_id
left join lateral (
  select
    count(*) filter (where z.kind in ('gym', 'pt')) as n,
    bool_or(z.kind in ('gym', 'pt') and z.st in ('active', 'frozen')) as any_active,
    bool_or(z.kind in ('gym', 'pt') and z.st = 'pending') as any_pending,
    bool_or(z.kind = 'trial') as had_trial,
    bool_or(z.kind = 'trial' and z.st in ('active', 'pending', 'frozen')) as on_trial
  from (
    select s.kind, app.subscription_state(s) as st
    from public.subscriptions s
    where s.member_id = m.id and s.deleted_at is null and s.cancelled_at is null
  ) z
) sub on true
left join lateral (
  select s.id, s.plan_id, p.name as plan_name, p.service_ids, s.start_date, s.end_date
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.member_id = m.id and s.deleted_at is null and s.cancelled_at is null and s.status = 'live' and s.kind in ('gym', 'pt')
  order by (app.today(s.studio_id) between s.start_date and s.end_date) desc, s.end_date desc
  limit 1
) cur on true
left join lateral (
  select max(a.check_in) as last_check_in,
         count(*) filter (where a.status = 'present') as total,
         bool_or(a.date = app.today(a.studio_id) and a.status = 'present' and a.check_out is null) as now_in
  from public.attendance a where a.member_id = m.id
) att on true
left join lateral (
  select
    (select coalesce(f.response_note, f.notes) from public.follow_ups f where f.member_id = m.id
      order by coalesce(f.responded_at, f.created_at) desc limit 1) as last_note,
    (select max(coalesce(f.responded_at, f.created_at)) from public.follow_ups f where f.member_id = m.id) as last_at,
    (select min(f.due_at) from public.follow_ups f where f.member_id = m.id and f.status = 'open') as next_due
) fu on true
where m.deleted_at is null;

-- Find an existing client by mobile number (YDL warns about duplicates).
create or replace function public.find_client_by_phone(p_studio uuid, p_phone text, p_except uuid default null)
returns table (id uuid, client_code text, full_name text, kind text)
language sql stable security invoker set search_path = '' as $$
  select m.id, coalesce(m.member_code, m.enquiry_code), m.full_name, m.kind
  from public.members m
  where m.studio_id = p_studio and m.deleted_at is null and app.same_phone(m.phone, p_phone)
    and (p_except is null or m.id <> p_except)
  limit 5;
$$;

-- Save an enquiry or member from the YDL forms in one step:
-- the client, their billing identity, their batches and (optionally) a follow-up.
create or replace function public.save_client(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_studio uuid; v_dupe text;
begin
  v_id = nullif(p->>'id', '')::uuid;
  if v_id is null then
    v_studio = (p->>'studio_id')::uuid;
  else
    select m.studio_id into v_studio from public.members m where m.id = v_id;
    if v_studio is null then raise exception 'Client not found'; end if;
  end if;
  if not app.is_desk(v_studio) then raise exception 'Only owner and front desk can save clients'; end if;

  if nullif(p->>'phone', '') is not null and not coalesce((p->>'allow_duplicate_phone')::boolean, false) then
    select string_agg(d.client_code || ' ' || d.full_name, ', ') into v_dupe
    from public.find_client_by_phone(v_studio, p->>'phone', v_id) d;
    if v_dupe is not null then
      raise exception 'DUPLICATE_PHONE: This mobile number already belongs to %', v_dupe using errcode = 'P0001';
    end if;
  end if;

  if v_id is null then
    insert into public.members (studio_id, kind, first_name, last_name, email, country_code, phone, phone_withheld,
      alt_country_code, alt_phone, guardian_phone, date_of_birth, gender, enquiry_date, added_by, ref_no, trainer_id,
      source_promotion, source_enquiry, primary_tag, secondary_tag, employment_status, occupation,
      referred_by_staff_id, referred_by_member_id, third_party_referral, interested_service_ids,
      street1, street2, city, state, country, pincode,
      emergency_first_name, emergency_last_name, emergency_email, emergency_phone, emergency_relationship,
      notes, level, photo_url, tapped, joined_on)
    select v_studio, coalesce(x.kind, 'enquiry'), trim(x.first_name), nullif(trim(x.last_name), ''), nullif(trim(x.email), ''),
      coalesce(nullif(x.country_code, ''), '+91'), nullif(trim(x.phone), ''), coalesce(x.phone_withheld, false),
      nullif(x.alt_country_code, ''), nullif(trim(x.alt_phone), ''), nullif(trim(x.guardian_phone), ''), x.date_of_birth, x.gender,
      coalesce(x.enquiry_date, app.today(v_studio)), x.added_by, nullif(x.ref_no, ''), x.trainer_id,
      nullif(x.source_promotion, ''), nullif(x.source_enquiry, ''), nullif(x.primary_tag, ''), nullif(x.secondary_tag, ''),
      nullif(x.employment_status, ''), nullif(x.occupation, ''),
      x.referred_by_staff_id, x.referred_by_member_id, nullif(x.third_party_referral, ''), coalesce(x.interested_service_ids, '{}'),
      nullif(x.street1, ''), nullif(x.street2, ''), nullif(x.city, ''), nullif(x.state, ''), nullif(x.country, ''), nullif(x.pincode, ''),
      nullif(x.emergency_first_name, ''), nullif(x.emergency_last_name, ''), nullif(x.emergency_email, ''), nullif(x.emergency_phone, ''), nullif(x.emergency_relationship, ''),
      nullif(x.notes, ''), nullif(x.level, ''), nullif(x.photo_url, ''), coalesce(x.tapped, false), x.joined_on
    from jsonb_to_record(p) as x(kind text, first_name text, last_name text, email text, country_code text, phone text, phone_withheld boolean,
      alt_country_code text, alt_phone text, guardian_phone text, date_of_birth date, gender text, enquiry_date date, added_by uuid, ref_no text,
      trainer_id uuid, source_promotion text, source_enquiry text, primary_tag text, secondary_tag text, employment_status text, occupation text,
      referred_by_staff_id uuid, referred_by_member_id uuid, third_party_referral text, interested_service_ids uuid[],
      street1 text, street2 text, city text, state text, country text, pincode text,
      emergency_first_name text, emergency_last_name text, emergency_email text, emergency_phone text, emergency_relationship text,
      notes text, level text, photo_url text, tapped boolean, joined_on date)
    returning id into v_id;
  else
    update public.members m set (first_name, last_name, email, country_code, phone, phone_withheld,
      alt_country_code, alt_phone, guardian_phone, date_of_birth, gender, enquiry_date, added_by, ref_no, trainer_id,
      source_promotion, source_enquiry, primary_tag, secondary_tag, employment_status, occupation,
      referred_by_staff_id, referred_by_member_id, third_party_referral, interested_service_ids,
      street1, street2, city, state, country, pincode,
      emergency_first_name, emergency_last_name, emergency_email, emergency_phone, emergency_relationship, notes, level) =
    (select trim(x.first_name), nullif(trim(x.last_name), ''), nullif(trim(x.email), ''),
      coalesce(nullif(x.country_code, ''), '+91'), nullif(trim(x.phone), ''), coalesce(x.phone_withheld, false),
      nullif(x.alt_country_code, ''), nullif(trim(x.alt_phone), ''), nullif(trim(x.guardian_phone), ''), x.date_of_birth, x.gender,
      coalesce(x.enquiry_date, m.enquiry_date), coalesce(x.added_by, m.added_by), nullif(x.ref_no, ''), x.trainer_id,
      nullif(x.source_promotion, ''), nullif(x.source_enquiry, ''), nullif(x.primary_tag, ''), nullif(x.secondary_tag, ''),
      nullif(x.employment_status, ''), nullif(x.occupation, ''),
      x.referred_by_staff_id, x.referred_by_member_id, nullif(x.third_party_referral, ''), coalesce(x.interested_service_ids, '{}'),
      nullif(x.street1, ''), nullif(x.street2, ''), nullif(x.city, ''), nullif(x.state, ''), nullif(x.country, ''), nullif(x.pincode, ''),
      nullif(x.emergency_first_name, ''), nullif(x.emergency_last_name, ''), nullif(x.emergency_email, ''), nullif(x.emergency_phone, ''), nullif(x.emergency_relationship, ''),
      nullif(x.notes, ''), nullif(x.level, '')
     from jsonb_to_record(p) as x(first_name text, last_name text, email text, country_code text, phone text, phone_withheld boolean,
      alt_country_code text, alt_phone text, guardian_phone text, date_of_birth date, gender text, enquiry_date date, added_by uuid, ref_no text,
      trainer_id uuid, source_promotion text, source_enquiry text, primary_tag text, secondary_tag text, employment_status text, occupation text,
      referred_by_staff_id uuid, referred_by_member_id uuid, third_party_referral text, interested_service_ids uuid[],
      street1 text, street2 text, city text, state text, country text, pincode text,
      emergency_first_name text, emergency_last_name text, emergency_email text, emergency_phone text, emergency_relationship text,
      notes text, level text))
    where m.id = v_id;
    if not found then raise exception 'You are not allowed to change this client'; end if;
  end if;

  if jsonb_typeof(p->'billing') = 'object' then
    insert into public.member_billing (member_id, studio_id, company_name, gst_number, pan, aadhaar_last4)
    values (v_id, v_studio, nullif(trim(p->'billing'->>'company_name'), ''), nullif(upper(trim(p->'billing'->>'gst_number')), ''),
            nullif(upper(trim(p->'billing'->>'pan')), ''), nullif(right(regexp_replace(coalesce(p->'billing'->>'aadhaar', ''), '\D', '', 'g'), 4), ''))
    on conflict (member_id) do update set
      company_name = excluded.company_name, gst_number = excluded.gst_number, pan = excluded.pan,
      aadhaar_last4 = coalesce(excluded.aadhaar_last4, public.member_billing.aadhaar_last4);
  end if;

  if jsonb_typeof(p->'batch_ids') = 'array' then
    delete from public.batch_members bm
    where bm.member_id = v_id and not (bm.batch_id::text in (select jsonb_array_elements_text(p->'batch_ids')));
    insert into public.batch_members (batch_id, member_id, studio_id)
    select b::uuid, v_id, v_studio from jsonb_array_elements_text(p->'batch_ids') b
    on conflict do nothing;
  end if;

  if jsonb_typeof(p->'follow_up') = 'object' then
    perform public.add_follow_up((p->'follow_up') || jsonb_build_object('member_id', v_id));
  end if;
  return v_id;
end $$;

-- Dashboard numbers (YDL cards). Money comes back as 0 for logins that can't see money.
create or replace function public.dashboard_summary(p_studio uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with d as (select app.today(p_studio) as today,
                    coalesce((select (s.settings->>'about_to_expire_days')::int from public.studios s where s.id = p_studio), 7) as soon),
  pay as (
    select x.receipt_date, x.amount from public.payments x
    where x.studio_id = p_studio and x.kind = 'payment' and x.status = 'paid'
  ),
  subs as (
    select s.*, app.subscription_state(s) as st from public.subscriptions s
    where s.studio_id = p_studio and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
  ),
  bal as (
    select o.balance_amount, o.state from public.subscription_overview o
    where o.studio_id = p_studio and o.state not in ('deleted', 'cancelled', 'transferred', 'upgraded', 'downgraded')
  ),
  latest as (   -- each member's latest gym / PT subscription
    select distinct on (s.member_id, s.kind) s.member_id, s.kind, s.st, s.end_date
    from subs s where s.kind in ('gym', 'pt')
    order by s.member_id, s.kind, s.end_date desc
  )
  select jsonb_build_object(
    'today', (select today from d),
    'today_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date = d.today),
    'month_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date >= date_trunc('month', d.today)::date and receipt_date <= d.today),
    'year_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date >= date_trunc('year', d.today)::date and receipt_date <= d.today),
    'balance_amount', (select coalesce(sum(balance_amount), 0) from bal),
    'balance_clients', (select count(*) from bal where balance_amount > 0),
    'active_gym', (select count(*) from subs where kind = 'gym' and st in ('active', 'frozen')),
    'expired_gym', (select count(*) from latest where kind = 'gym' and st in ('expired', 'used')),
    'active_pt', (select count(*) from subs where kind = 'pt' and st in ('active', 'frozen')),
    'expired_pt', (select count(*) from latest where kind = 'pt' and st in ('expired', 'used')),
    'open_enquiries', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'enquiry'
                         and m.lead_status = 'open' and m.active and m.deleted_at is null),
    'active_members', (select count(distinct member_id) from subs where kind in ('gym', 'pt') and st in ('active', 'frozen')),
    'present_checkins', (select count(*) from public.attendance a, d where a.studio_id = p_studio and a.date = d.today
                           and a.status = 'present' and a.check_out is null),
    'checkins_today', (select count(*) from public.attendance a, d where a.studio_id = p_studio and a.date = d.today and a.status = 'present'),
    'app_installs', (select count(*) from public.members m where m.studio_id = p_studio and m.deleted_at is null
                       and (m.user_id is not null or m.app_installed_at is not null)),
    'expired_recent', (select count(distinct l.member_id) from latest l, d where l.st = 'expired' and l.end_date >= d.today - 30
                         and not exists (select 1 from subs s2 where s2.member_id = l.member_id and s2.kind in ('gym', 'pt') and s2.st in ('active', 'pending', 'frozen'))),
    'about_to_expire', (select count(distinct s.member_id) from subs s, d where s.kind in ('gym', 'pt') and s.st in ('active', 'frozen')
                          and s.end_date between d.today and d.today + d.soon)
  );
$$;

-- Batch-wise attendance for a date range (YDL "Today's Batches").
create or replace function public.batch_attendance_summary(p_studio uuid, p_from date, p_to date)
returns table (batch_id uuid, batch_code text, name text, trainer_names text, start_time time, end_time time,
               check_ins bigint, active_members bigint, expired_members bigint, not_assigned bigint)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.batch_code, b.name,
    (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (b.trainer_ids)),
    b.start_time, b.end_time,
    (select count(*) from public.attendance a where a.batch_id = b.id and a.date between p_from and p_to and a.status = 'present'),
    (select count(*) from public.batch_members bm join public.member_overview mo on mo.id = bm.member_id
      where bm.batch_id = b.id and mo.live_status in ('active', 'pending')),
    (select count(*) from public.batch_members bm join public.member_overview mo on mo.id = bm.member_id
      where bm.batch_id = b.id and mo.live_status = 'inactive'),
    (select count(*) from public.batch_members bm join public.member_overview mo on mo.id = bm.member_id
      where bm.batch_id = b.id and mo.live_status = 'none')
  from public.batches b
  where b.studio_id = p_studio and b.active
    and (b.start_date is null or b.start_date <= p_to) and (b.end_date is null or b.end_date >= p_from)
    and exists (select 1 from generate_series(p_from, p_to, interval '1 day') g where extract(isodow from g)::smallint = any (b.days))
  order by b.start_time;
$$;

-- Enquiries added per staff member and day (table on YDL's enquiry list).
create or replace function public.enquiry_staff_summary(p_studio uuid, p_from date, p_to date)
returns table (enquiry_date date, staff_id uuid, staff_name text, total bigint)
language sql stable security invoker set search_path = '' as $$
  select m.enquiry_date, m.added_by, coalesce(s.full_name, 'Not assigned'), count(*)
  from public.members m left join public.staff s on s.id = m.added_by
  where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null
    and m.enquiry_date between p_from and p_to
  group by m.enquiry_date, m.added_by, s.full_name
  order by m.enquiry_date desc, count(*) desc;
$$;

call app.apply_grants();

-- ===== 20261008000007_member_billing.sql =====
-- Shaan Fitness app · 7. Member profile, billing and payments
-- YDL member profile (membership actions, medical history, documents, notifications),
-- Add / Renew Subscription, Assign / Renew Personal Training, Book a free Trial,
-- Freeze, Extension, Transfer, Upgrade, Downgrade, Edit Subscription, Payments Details
-- (receipts, write-offs, cancel, delete, edit bill amount) and Quick Billing.

-- ---------------------------------------------------------------------------
-- Plans: the rest of YDL's plan form
-- ---------------------------------------------------------------------------
alter table public.plans
  add column description text,
  add column faqs text,
  add column guidelines text,
  add column dos_donts text,
  add column shopping_list text,
  add column snack_list text,
  add column activities text,
  add column other_text text;

-- ---------------------------------------------------------------------------
-- Subscriptions: sign-up fee and several secondary trainers
-- (the money columns are rebuilt so the sign-up fee is part of the bill)
-- ---------------------------------------------------------------------------
drop view if exists public.subscription_overview;
drop view if exists public.payment_overview;

alter table public.subscriptions
  add column sign_up_fee numeric(12,2) not null default 0 check (sign_up_fee >= 0),
  add column second_trainer_ids uuid[] not null default '{}';
update public.subscriptions set second_trainer_ids = array[second_trainer_id] where second_trainer_id is not null;
alter table public.subscriptions
  drop column second_trainer_id,
  drop column total_amount,
  drop column gst_amount,
  drop column net_amount;
alter table public.subscriptions
  add column net_amount numeric(12,2) generated always as (greatest(selling_price + sign_up_fee - coupon_discount, 0)) stored,
  add column gst_amount numeric(12,2) generated always as (round(greatest(selling_price + sign_up_fee - coupon_discount, 0) * gst_rate / 100, 2)) stored,
  add column total_amount numeric(12,2) generated always as (
    greatest(selling_price + sign_up_fee - coupon_discount, 0) + round(greatest(selling_price + sign_up_fee - coupon_discount, 0) * gst_rate / 100, 2)
  ) stored;

-- Fees for freezes, extensions and transfers point at their receipt.
alter table public.freezes add column payment_id uuid references public.payments(id) on delete set null;
alter table public.extensions add column payment_id uuid references public.payments(id) on delete set null;
alter table public.subscription_changes add column payment_id uuid references public.payments(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Medical history (YDL PAR-Q), readable by the desk that fills it in.
-- The doctor's decision stays in member_health (owner, doctor and care team only).
-- ---------------------------------------------------------------------------
create table public.member_medical (
  member_id uuid primary key references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,   -- heart_problem, diabetes, ... : true / false
  note text,
  updated_by uuid references public.staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.member_medical (member_id, studio_id, answers, note)
select h.member_id, h.studio_id, coalesce(h.par_q, '{}'::jsonb), h.medical_note
from public.member_health h where h.par_q is not null or h.medical_note is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Client documents (YDL "Client Document" tab) and profile photos
-- Files live in the private "member-files" storage bucket.
-- ---------------------------------------------------------------------------
create table public.member_documents (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  doc_type text not null,
  file_name text not null,
  path text not null,
  uploaded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index member_documents_member_idx on public.member_documents (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- App notifications sent to clients (YDL "Send Notification")
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null,
  sent_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_member_idx on public.notifications (member_id, created_at desc);
create index notifications_studio_idx on public.notifications (studio_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Biometric devices and the commands sent to them (YDL device operations).
-- A small bridge at the studio (or the device's own cloud push) picks commands up.
-- ---------------------------------------------------------------------------
create table public.biometric_devices (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  serial text not null,
  name text not null,
  device_type text not null default 'essl' check (device_type in ('essl', 'etime', 'zkteco', 'smartoffice', 'vital', 'timmy', 'other')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, serial)
);

create table public.device_commands (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  device_id uuid references public.biometric_devices(id) on delete set null,
  member_id uuid references public.members(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  command text not null check (command in ('add', 're_add', 'block', 'unblock', 'delete', 'sync', 'update_expiry')),
  method text check (method in ('finger', 'face', 'rfid')),
  biometric_code text,
  rfid text,
  expiry_date date,
  status text not null default 'queued' check (status in ('queued', 'sent', 'done', 'failed')),
  result text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (member_id is not null or staff_id is not null)
);
create index device_commands_status_idx on public.device_commands (studio_id, status, created_at);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- The signed-in staff member may change prices (owner, or staff allowed to give discounts).
create or replace function app.can_discount(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_owner(p_studio) or exists (
    select 1 from public.staff s
    where s.id = app.my_staff_id(p_studio) and coalesce((s.permissions->>'allow_discounting')::boolean, false)
  );
$$;

-- What a coupon takes off an amount, or why it can't be used.
create or replace function public.check_coupon(p_studio uuid, p_code text, p_plan uuid, p_member uuid, p_amount numeric)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.coupons; v_used int; v_mine int; v_plan public.plans; v_new boolean; v_off numeric;
begin
  if not app.is_desk(p_studio) then raise exception 'Not allowed'; end if;
  select * into c from public.coupons where studio_id = p_studio and upper(code) = upper(trim(p_code)) and active;
  if c.id is null then return jsonb_build_object('ok', false, 'message', 'No active coupon with this code'); end if;
  if c.start_date is not null and app.today(p_studio) < c.start_date then
    return jsonb_build_object('ok', false, 'message', 'This coupon starts on ' || to_char(c.start_date, 'DD-MM-YYYY'));
  end if;
  if c.expiry_date is not null and app.today(p_studio) > c.expiry_date then
    return jsonb_build_object('ok', false, 'message', 'This coupon expired on ' || to_char(c.expiry_date, 'DD-MM-YYYY'));
  end if;
  select * into v_plan from public.plans where id = p_plan;
  if c.plan_id is not null and c.plan_id <> p_plan then
    return jsonb_build_object('ok', false, 'message', 'This coupon is for a different plan');
  end if;
  if c.service_id is not null and not (c.service_id = any (coalesce(v_plan.service_ids, '{}'))) then
    return jsonb_build_object('ok', false, 'message', 'This coupon is for a different service');
  end if;
  if c.member_id is not null and c.member_id <> p_member then
    return jsonb_build_object('ok', false, 'message', 'This coupon is for another client');
  end if;
  v_new = not exists (select 1 from public.subscriptions s where s.member_id = p_member and s.kind in ('gym', 'pt') and s.deleted_at is null);
  if c.who_can_use = 'new' and not v_new then return jsonb_build_object('ok', false, 'message', 'This coupon is for new members only'); end if;
  if c.who_can_use = 'existing' and v_new then return jsonb_build_object('ok', false, 'message', 'This coupon is for existing members only'); end if;
  select count(*), count(*) filter (where s.member_id = p_member) into v_used, v_mine
  from public.subscriptions s where s.coupon_id = c.id and s.deleted_at is null and s.cancelled_at is null;
  if c.max_redemptions is not null and v_used >= c.max_redemptions then return jsonb_build_object('ok', false, 'message', 'This coupon has been fully used'); end if;
  if c.max_per_user is not null and v_mine >= c.max_per_user then return jsonb_build_object('ok', false, 'message', 'This client has already used this coupon'); end if;
  if c.min_order is not null and p_amount < c.min_order then
    return jsonb_build_object('ok', false, 'message', 'This coupon needs a bill of at least ' || c.min_order);
  end if;
  if c.max_order is not null and p_amount > c.max_order then
    return jsonb_build_object('ok', false, 'message', 'This coupon works on bills up to ' || c.max_order);
  end if;
  v_off = case when c.type like 'percentage%' then round(p_amount * c.discount / 100, 2) else c.discount end;
  if c.max_discount is not null then v_off = least(v_off, c.max_discount); end if;
  v_off = least(v_off, p_amount);
  return jsonb_build_object('ok', true, 'coupon_id', c.id, 'code', c.code, 'discount', v_off, 'message', 'Coupon applied: ' || v_off || ' off');
end $$;

-- A client in this studio, by id.
create or replace function app.studio_member(p_member uuid)
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  if m.id is null then raise exception 'Client not found'; end if;
  if not app.is_desk(m.studio_id) then raise exception 'Only owner and front desk can do this'; end if;
  return m;
end $$;

-- A live subscription of this studio, locked for the change being made.
create or replace function app.live_subscription(p_id uuid)
returns public.subscriptions language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = p_id for update;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_desk(s.studio_id) then raise exception 'Only owner and front desk can do this'; end if;
  if s.deleted_at is not null then raise exception 'This subscription was deleted'; end if;
  if s.cancelled_at is not null then raise exception 'This subscription was cancelled'; end if;
  if s.status <> 'live' then raise exception 'This subscription was already %', s.status; end if;
  return s;
end $$;

-- What has been received on a subscription (payments less refunds; write-offs separately).
create or replace function app.subscription_paid(p_id uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case when x.kind = 'payment' then x.amount when x.kind = 'refund' then -x.amount else 0 end), 0)
  from public.payments x where x.subscription_id = p_id and x.purpose = 'subscription' and x.status = 'paid';
$$;

-- A fee receipt (freeze, extension, transfer), paid now.
create or replace function app.fee_receipt(p_member public.members, p_sub uuid, p_purpose text, p_amount numeric, p_mode text, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if coalesce(p_amount, 0) <= 0 then return null; end if;
  insert into public.payments (studio_id, member_id, subscription_id, kind, purpose, amount, mode, note, receipt_date)
  values (p_member.studio_id, p_member.id, p_sub, 'payment', p_purpose, p_amount, coalesce(nullif(p_mode, ''), 'CASH'), nullif(p_note, ''), app.today(p_member.studio_id))
  returning id into v_id;
  return v_id;
end $$;

-- A "Balance due" follow-up like YDL's, when a bill isn't fully paid.
create or replace function app.balance_follow_up(p_sub uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s record; v_due date; v_at timestamptz;
begin
  select o.id, o.studio_id, o.member_id, o.balance_amount, o.balance_due_date, o.client_rep_id, o.bill_rep_id
  into s from public.subscription_overview o where o.id = p_sub;
  if s.id is null or s.balance_amount <= 0 then
    update public.follow_ups set status = 'done', response = 'Balance paid', response_kind = 'successful', responded_at = now()
    where subscription_id = p_sub and type = 'Balance due' and status = 'open' and source = 'system';
    return;
  end if;
  v_due = coalesce(s.balance_due_date, app.today(s.studio_id));
  v_at = (v_due::timestamp + time '10:00') at time zone (select st.timezone from public.studios st where st.id = s.studio_id);
  update public.follow_ups set status = 'done', response = 'Rescheduled', response_kind = 'open', responded_at = now()
  where subscription_id = p_sub and type = 'Balance due' and status = 'open' and source = 'system'
    and (due_at <> v_at or expected_amount is distinct from s.balance_amount);
  insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status, expected_date, expected_amount,
                                 contact_type, notes, subscription_id, source)
  select s.studio_id, s.member_id, 'Balance due', v_at, coalesce(s.client_rep_id, s.bill_rep_id), 'open', v_due, s.balance_amount,
         'Phone', 'Balance payment of Rs. ' || to_char(s.balance_amount, 'FM999999990.00') || ' due on ' || to_char(v_due, 'DD-MM-YYYY'),
         p_sub, 'system'
  where not exists (select 1 from public.follow_ups f where f.subscription_id = p_sub and f.type = 'Balance due'
                    and f.status = 'open' and f.source = 'system');
exception when unique_violation then null;
end $$;

-- ---------------------------------------------------------------------------
-- Selling: Add / Renew Subscription, Assign / Renew Personal Training,
-- Book a free Trial, Quick Billing. One call can sell several plans.
--   p: member_id, invoice_date?, bill_rep_id?, client_rep_id?, group_member_ids[], divide_sessions,
--      batch_ids[], note?,
--      items: [{ plan_id, start_date, end_date, base_price?, selling_price, sign_up_fee?, coupon_code?,
--                trainer_id?, second_trainer_ids[]?, pt_points?, sessions_total?, kind? ('trial') }]
-- ---------------------------------------------------------------------------
create or replace function public.sell_subscriptions(p jsonb)
returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare
  m public.members; it jsonb; pl public.plans; v_ids uuid[] = '{}'; v_id uuid; v_coupon jsonb;
  v_price numeric; v_signup numeric; v_start date; v_end date; v_disc numeric; v_coupon_id uuid; v_kind text;
begin
  m = app.studio_member((p->>'member_id')::uuid);
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'Choose a membership plan'; end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    select * into pl from public.plans where id = (it->>'plan_id')::uuid and studio_id = m.studio_id;
    if pl.id is null then raise exception 'Choose a membership plan'; end if;
    if not pl.active then raise exception '% is deactivated', pl.name; end if;
    v_kind = case when coalesce(it->>'kind', '') = 'trial' or pl.is_free_trial then 'trial' else pl.kind end;
    v_start = coalesce(nullif(it->>'start_date', '')::date, app.today(m.studio_id));
    v_end = coalesce(nullif(it->>'end_date', '')::date, app.plan_end_date(v_start, pl.tenure_value, pl.tenure_unit));
    if v_end < v_start then raise exception 'The end date is before the start date'; end if;
    v_price = coalesce(nullif(it->>'selling_price', '')::numeric, pl.total_price);
    v_signup = coalesce(nullif(it->>'sign_up_fee', '')::numeric, 0);
    if v_price < 0 or v_signup < 0 then raise exception 'Prices can''t be negative'; end if;
    if (v_price <> pl.total_price or v_signup <> 0) and v_kind <> 'trial' and not app.can_discount(m.studio_id) then
      raise exception 'You are not allowed to change the price of %', pl.name;
    end if;
    if v_kind = 'pt' and nullif(it->>'trainer_id', '') is null then raise exception 'Assign a trainer for %', pl.name; end if;
    v_disc = 0; v_coupon_id = null;
    if nullif(trim(it->>'coupon_code'), '') is not null then
      v_coupon = public.check_coupon(m.studio_id, it->>'coupon_code', pl.id, m.id, v_price + v_signup);
      if not (v_coupon->>'ok')::boolean then raise exception '%', v_coupon->>'message'; end if;
      v_disc = (v_coupon->>'discount')::numeric; v_coupon_id = (v_coupon->>'coupon_id')::uuid;
    end if;
    insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date,
      sessions_total, pt_points, trainer_id, second_trainer_ids, group_member_ids, divide_sessions_in_group,
      base_price, selling_price, sign_up_fee, coupon_id, coupon_code, coupon_discount,
      bill_rep_id, client_rep_id, note, batch_id, balance_due_date)
    values (m.studio_id, m.id, pl.id, v_kind,
      coalesce(nullif(p->>'invoice_date', '')::date, app.today(m.studio_id)), v_start, v_end,
      coalesce(nullif(it->>'sessions_total', '')::int, case when pl.unlimited_sessions then null else pl.session_count end),
      nullif(it->>'pt_points', '')::int, nullif(it->>'trainer_id', '')::uuid,
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(it->'second_trainer_ids', '[]')) x), '{}'),
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p->'group_member_ids', '[]')) x), '{}'),
      coalesce((p->>'divide_sessions')::boolean, false),
      coalesce(nullif(it->>'base_price', '')::numeric, pl.price), v_price, v_signup, v_coupon_id,
      case when v_coupon_id is null then null else upper(trim(it->>'coupon_code')) end, v_disc,
      nullif(p->>'bill_rep_id', '')::uuid, nullif(p->>'client_rep_id', '')::uuid, nullif(p->>'note', ''),
      (select x::uuid from jsonb_array_elements_text(coalesce(p->'batch_ids', '[]')) x limit 1),
      coalesce(nullif(p->>'balance_due_date', '')::date, v_start))
    returning id into v_id;
    v_ids = v_ids || v_id;
  end loop;

  if jsonb_typeof(p->'batch_ids') = 'array' then
    insert into public.batch_members (batch_id, member_id, studio_id)
    select b::uuid, m.id, m.studio_id from jsonb_array_elements_text(p->'batch_ids') b
    on conflict do nothing;
  end if;
  -- A PT plan's trainer becomes the client's assigned trainer if they don't have one.
  update public.members set trainer_id = (select s.trainer_id from public.subscriptions s where s.id = any (v_ids) and s.trainer_id is not null limit 1)
  where id = m.id and trainer_id is null;
  -- First receipt straight away (Quick Billing "Received Amount").
  if coalesce(nullif(p->>'paid_amount', '')::numeric, 0) > 0 then
    perform public.record_payment(jsonb_build_object(
      'subscription_id', v_ids[1], 'amount', p->>'paid_amount', 'mode', p->>'mode', 'receipt_date', p->>'receipt_date',
      'reference', p->>'reference', 'receipt_no', p->>'receipt_no', 'next_due_date', p->>'balance_due_date'));
  else
    foreach v_id in array v_ids loop perform app.balance_follow_up(v_id); end loop;
  end if;
  return v_ids;
end $$;

-- ---------------------------------------------------------------------------
-- Payments Details: take a receipt or write off a balance, and update the bill's details.
--   p: subscription_id, amount, mode, status ('paid' | 'write_off'), receipt_date, reference,
--      receipt_no (manual numbering), next_due_date, bill_rep_id, invoice_date, igst, note, customer_address
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; v_id uuid; v_amount numeric; v_balance numeric; v_status text;
begin
  select * into s from public.subscriptions where id = (p->>'subscription_id')::uuid;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_desk(s.studio_id) then raise exception 'Only owner and front desk can take payments'; end if;
  if s.deleted_at is not null or s.cancelled_at is not null then raise exception 'This subscription is closed'; end if;

  update public.subscriptions set
    bill_rep_id = coalesce(nullif(p->>'bill_rep_id', '')::uuid, bill_rep_id),
    igst = coalesce((p->>'igst')::boolean, igst),
    note = case when p ? 'note' then nullif(p->>'note', '') else note end,
    customer_address = case when p ? 'customer_address' then nullif(p->>'customer_address', '') else customer_address end,
    invoice_date = case when nullif(p->>'invoice_date', '') is not null and (p->>'invoice_date')::date <> invoice_date
                        then (p->>'invoice_date')::date else invoice_date end,
    balance_due_date = case when nullif(p->>'next_due_date', '') is not null then (p->>'next_due_date')::date else balance_due_date end
  where id = s.id;

  v_amount = coalesce(nullif(p->>'amount', '')::numeric, 0);
  v_status = coalesce(nullif(p->>'status', ''), 'paid');
  if v_amount > 0 then
    if v_status not in ('paid', 'write_off') then raise exception 'Choose Paid or Write Off'; end if;
    if v_status = 'write_off' and not app.is_owner(s.studio_id) then raise exception 'Only the owner can write off a balance'; end if;
    insert into public.payments (studio_id, member_id, subscription_id, kind, purpose, receipt_no, receipt_date, amount, mode, reference, note, bill_rep_id)
    values (s.studio_id, s.member_id, s.id, case when v_status = 'write_off' then 'write_off' else 'payment' end, 'subscription',
            nullif(trim(p->>'receipt_no'), ''), coalesce(nullif(p->>'receipt_date', '')::date, app.today(s.studio_id)), v_amount,
            case when v_status = 'write_off' then 'Write Off' else coalesce(nullif(p->>'mode', ''), 'CASH') end,
            nullif(p->>'reference', ''), nullif(p->>'payment_note', ''), nullif(p->>'bill_rep_id', '')::uuid)
    returning id into v_id;
  end if;

  select o.balance_amount into v_balance from public.subscription_overview o where o.id = s.id;
  if v_balance > 0 and nullif(p->>'next_due_date', '') is null and v_amount > 0 then
    raise exception 'Choose the next balance due date for the remaining %', v_balance;
  end if;
  perform app.balance_follow_up(s.id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Freeze and Extension (with optional fee receipts)
-- ---------------------------------------------------------------------------
create or replace function public.freeze_subscription(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; m public.members; pl public.plans; v_id uuid; v_days int; v_start date; v_used int; v_pay uuid;
begin
  s = app.live_subscription((p->>'subscription_id')::uuid);
  select * into m from public.members where id = s.member_id;
  select * into pl from public.plans where id = s.plan_id;
  v_days = (p->>'days')::int;
  v_start = coalesce(nullif(p->>'start_date', '')::date, app.today(s.studio_id));
  if v_days is null or v_days <= 0 then raise exception 'Enter the number of days to freeze'; end if;
  if v_start < s.start_date or v_start > s.end_date then raise exception 'The freeze must start within the subscription (% to %)', to_char(s.start_date, 'DD-MM-YYYY'), to_char(s.end_date, 'DD-MM-YYYY'); end if;
  select coalesce(sum(days), 0) into v_used from public.freezes where subscription_id = s.id and status = 'approved';
  if pl.freeze_days > 0 and v_used + v_days > pl.freeze_days and not app.is_owner(s.studio_id) then
    raise exception 'This plan allows % freeze days; % already used', pl.freeze_days, v_used;
  end if;
  if exists (select 1 from public.freezes f where f.subscription_id = s.id and f.status = 'approved'
             and daterange(f.start_date, f.end_date, '[]') && daterange(v_start, v_start + v_days - 1, '[]')) then
    raise exception 'This overlaps an earlier freeze';
  end if;
  v_pay = app.fee_receipt(m, s.id, 'freeze_fee', nullif(p->>'fee', '')::numeric, p->>'mode', 'Freeze fee');
  insert into public.freezes (studio_id, subscription_id, member_id, start_date, days, fee, note, status, payment_id)
  values (s.studio_id, s.id, s.member_id, v_start, v_days, coalesce(nullif(p->>'fee', '')::numeric, 0), nullif(p->>'note', ''), 'approved', v_pay)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.extend_subscription(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; m public.members; v_id uuid; v_days int; v_pay uuid;
begin
  s = app.live_subscription((p->>'subscription_id')::uuid);
  select * into m from public.members where id = s.member_id;
  v_days = (p->>'days')::int;
  if v_days is null or v_days <= 0 then raise exception 'Enter the number of extension days'; end if;
  v_pay = app.fee_receipt(m, s.id, 'extension_fee', nullif(p->>'fee', '')::numeric, p->>'mode', 'Extension fee');
  insert into public.extensions (studio_id, subscription_id, member_id, days, fee, note, status, payment_id)
  values (s.studio_id, s.id, s.member_id, v_days, coalesce(nullif(p->>'fee', '')::numeric, 0), nullif(p->>'note', ''), 'approved', v_pay)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Transfer: the rest of a subscription moves to another client.
--   p: subscription_id, to_member_id, start_date, fee, mode
-- ---------------------------------------------------------------------------
create or replace function public.transfer_subscription(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; m public.members; t public.members; v_left int; v_start date; v_new uuid; v_pay uuid; v_sessions int;
begin
  s = app.live_subscription((p->>'subscription_id')::uuid);
  select * into m from public.members where id = s.member_id;
  t = app.studio_member((p->>'to_member_id')::uuid);
  if t.studio_id <> s.studio_id then raise exception 'Choose a client of this studio'; end if;
  if t.id = s.member_id then raise exception 'Choose a different client to transfer to'; end if;
  v_start = coalesce(nullif(p->>'start_date', '')::date, app.today(s.studio_id));
  v_left = s.end_date - greatest(app.today(s.studio_id), s.start_date);
  if v_left < 0 then raise exception 'This subscription has already ended'; end if;
  v_sessions = case when s.sessions_total is null then null else greatest(s.sessions_total - s.sessions_used, 0) end;
  insert into public.subscriptions (studio_id, member_id, plan_id, kind, start_date, base_end_date, sessions_total, pt_points,
    trainer_id, second_trainer_ids, base_price, selling_price, gst_rate, previous_subscription_id, note, balance_due_date)
  values (s.studio_id, t.id, s.plan_id, s.kind, v_start, v_start + v_left, v_sessions, s.pt_points,
    s.trainer_id, s.second_trainer_ids, s.base_price, 0, 0, s.id,
    'Transferred from ' || coalesce(m.member_code, m.enquiry_code, '') || ' ' || m.full_name, v_start)
  returning id into v_new;
  update public.subscriptions set status = 'transferred' where id = s.id;
  v_pay = app.fee_receipt(m, s.id, 'transfer_fee', nullif(p->>'fee', '')::numeric, p->>'mode', 'Transfer fee');
  insert into public.subscription_changes (studio_id, kind, from_subscription_id, to_subscription_id, from_member_id, to_member_id,
    old_amount, new_amount, fee, payment_id, note)
  values (s.studio_id, 'transfer', s.id, v_new, s.member_id, t.id, s.total_amount, 0,
    coalesce(nullif(p->>'fee', '')::numeric, 0), v_pay, nullif(p->>'note', ''));
  perform app.balance_follow_up(s.id);
  return v_new;
end $$;

-- ---------------------------------------------------------------------------
-- Upgrade and Downgrade: a new subscription replaces the old one; the bill is the difference.
--   p: subscription_id, plan_id, start_date?, end_date, selling_price (final payable), coupon_code?, note?
-- ---------------------------------------------------------------------------
create or replace function app.change_plan(p jsonb, p_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; pl public.plans; v_paid numeric; v_price numeric; v_new uuid; v_start date; v_end date;
        v_coupon jsonb; v_disc numeric = 0; v_coupon_id uuid; v_refund numeric = 0;
begin
  s = app.live_subscription((p->>'subscription_id')::uuid);
  select * into pl from public.plans where id = (p->>'plan_id')::uuid and studio_id = s.studio_id and active;
  if pl.id is null then raise exception 'Choose the membership to %', p_kind; end if;
  if pl.id = s.plan_id then raise exception 'Choose a different membership'; end if;
  v_paid = app.subscription_paid(s.id);
  v_start = case when p_kind = 'upgrade' then s.start_date else coalesce(nullif(p->>'start_date', '')::date, s.start_date) end;
  v_end = coalesce(nullif(p->>'end_date', '')::date, app.plan_end_date(v_start, pl.tenure_value, pl.tenure_unit));
  if v_end < v_start then raise exception 'The end date is before the start date'; end if;
  v_price = coalesce(nullif(p->>'selling_price', '')::numeric, greatest(pl.total_price - v_paid, 0));
  if v_price < 0 then raise exception 'The price can''t be negative'; end if;
  if v_price <> greatest(pl.total_price - v_paid, 0) and not app.can_discount(s.studio_id) then
    raise exception 'You are not allowed to change the price';
  end if;
  if p_kind = 'downgrade' then v_refund = greatest(v_paid - pl.total_price, 0); end if;
  if nullif(trim(p->>'coupon_code'), '') is not null then
    v_coupon = public.check_coupon(s.studio_id, p->>'coupon_code', pl.id, s.member_id, v_price);
    if not (v_coupon->>'ok')::boolean then raise exception '%', v_coupon->>'message'; end if;
    v_disc = (v_coupon->>'discount')::numeric; v_coupon_id = (v_coupon->>'coupon_id')::uuid;
  end if;
  insert into public.subscriptions (studio_id, member_id, plan_id, kind, start_date, base_end_date, trainer_id, second_trainer_ids,
    group_member_ids, base_price, selling_price, coupon_id, coupon_code, coupon_discount, previous_subscription_id, note, balance_due_date)
  values (s.studio_id, s.member_id, pl.id, pl.kind, v_start, v_end, s.trainer_id, s.second_trainer_ids,
    case when coalesce((p->>'group')::boolean, false) then s.group_member_ids else '{}' end,
    pl.total_price, v_price, v_coupon_id, case when v_coupon_id is null then null else upper(trim(p->>'coupon_code')) end, v_disc,
    s.id, nullif(p->>'note', ''), app.today(s.studio_id))
  returning id into v_new;
  update public.subscriptions set status = case when p_kind = 'upgrade' then 'upgraded' else 'downgraded' end where id = s.id;
  insert into public.subscription_changes (studio_id, kind, from_subscription_id, to_subscription_id, from_member_id, to_member_id,
    old_amount, new_amount, refund_amount, note)
  values (s.studio_id, p_kind, s.id, v_new, s.member_id, s.member_id, v_paid, pl.total_price, v_refund, nullif(p->>'note', ''));
  update public.follow_ups set status = 'done', response = 'Plan changed', response_kind = 'successful', responded_at = now()
  where subscription_id = s.id and type = 'Balance due' and status = 'open' and source = 'system';
  perform app.balance_follow_up(v_new);
  return v_new;
end $$;

create or replace function public.upgrade_subscription(p jsonb)
returns uuid language sql security invoker set search_path = '' as $$ select app.change_plan(p, 'upgrade') $$;
create or replace function public.downgrade_subscription(p jsonb)
returns uuid language sql security invoker set search_path = '' as $$ select app.change_plan(p, 'downgrade') $$;

-- ---------------------------------------------------------------------------
-- Edit Subscription: dates, trainers, sessions, invoice date and number.
-- ---------------------------------------------------------------------------
create or replace function public.edit_subscription(p jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; v_start date; v_end date;
begin
  select * into s from public.subscriptions where id = (p->>'subscription_id')::uuid;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_desk(s.studio_id) then raise exception 'Only owner and front desk can edit subscriptions'; end if;
  v_start = coalesce(nullif(p->>'start_date', '')::date, s.start_date);
  v_end = coalesce(nullif(p->>'end_date', '')::date, s.end_date);
  if v_end < v_start then raise exception 'The end date is before the start date'; end if;
  if v_end - s.extension_days - s.frozen_days < v_start then raise exception 'The end date is too early for the extensions and freezes on this subscription'; end if;
  update public.subscriptions set
    start_date = v_start,
    base_end_date = v_end - extension_days - frozen_days,
    trainer_id = case when p ? 'trainer_id' then nullif(p->>'trainer_id', '')::uuid else trainer_id end,
    second_trainer_ids = case when p ? 'second_trainer_ids'
      then coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p->'second_trainer_ids') x), '{}') else second_trainer_ids end,
    sessions_total = case when p ? 'sessions_total' then nullif(p->>'sessions_total', '')::int else sessions_total end,
    invoice_date = coalesce(nullif(p->>'invoice_date', '')::date, invoice_date),
    invoice_no = case when p ? 'invoice_no' then nullif(trim(p->>'invoice_no'), '') else invoice_no end
  where id = s.id;
end $$;

-- ---------------------------------------------------------------------------
-- Cancel, Delete and Edit Bill Amount (owner, as in YDL's warnings)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_subscription(p_id uuid, p_reason text, p_cancel_receipts boolean default true)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = p_id;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_owner(s.studio_id) then raise exception 'Only the owner can cancel a subscription'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Enter the reason for cancellation'; end if;
  if s.cancelled_at is not null or s.deleted_at is not null then raise exception 'This subscription is already closed'; end if;
  update public.subscriptions set cancelled_at = now(), cancelled_by = app.my_staff_id(s.studio_id), cancel_reason = trim(p_reason) where id = s.id;
  if p_cancel_receipts then
    update public.payments set status = 'cancelled', cancelled_at = now(), cancelled_by = app.my_staff_id(s.studio_id),
      cancel_reason = 'Subscription cancelled: ' || trim(p_reason)
    where subscription_id = s.id and status = 'paid';
  end if;
  update public.follow_ups set status = 'done', response = 'Subscription cancelled', response_kind = 'successful', responded_at = now()
  where subscription_id = s.id and status = 'open' and source = 'system';
end $$;

create or replace function public.delete_subscription(p_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = p_id;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_owner(s.studio_id) then raise exception 'Only the owner can delete a subscription'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Enter the reason for deletion'; end if;
  if s.deleted_at is not null then raise exception 'This subscription is already deleted'; end if;
  update public.subscriptions set deleted_at = now(), deleted_by = app.my_staff_id(s.studio_id), delete_reason = trim(p_reason) where id = s.id;
  update public.payments set status = 'cancelled', cancelled_at = now(), cancelled_by = app.my_staff_id(s.studio_id),
    cancel_reason = 'Subscription deleted: ' || trim(p_reason)
  where subscription_id = s.id and status = 'paid';
  update public.follow_ups set status = 'done', response = 'Subscription deleted', response_kind = 'successful', responded_at = now()
  where subscription_id = s.id and status = 'open' and source = 'system';
end $$;

create or replace function public.edit_bill_amount(p_id uuid, p_price numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = p_id;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not app.is_desk(s.studio_id) or not app.can_discount(s.studio_id) then raise exception 'You are not allowed to change prices'; end if;
  if p_price is null or p_price < 0 then raise exception 'Enter the new price'; end if;
  if s.cancelled_at is not null or s.deleted_at is not null then raise exception 'This subscription is closed'; end if;
  update public.payments set status = 'cancelled', cancelled_at = now(), cancelled_by = app.my_staff_id(s.studio_id),
    cancel_reason = 'Bill amount edited'
  where subscription_id = s.id and status = 'paid' and purpose = 'subscription';
  update public.subscriptions set selling_price = p_price, coupon_discount = least(coupon_discount, p_price + sign_up_fee) where id = s.id;
  perform app.balance_follow_up(s.id);
end $$;

-- Mark a subscription used up (or not), as YDL's "mark used".
create or replace function public.mark_subscription_used(p_id uuid, p_used boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = p_id;
  if s.id is null or not app.is_desk(s.studio_id) then raise exception 'Not allowed'; end if;
  update public.subscriptions set mark_used = p_used where id = s.id;
end $$;

-- ---------------------------------------------------------------------------
-- Medical history (PAR-Q) and notifications
-- ---------------------------------------------------------------------------
create or replace function public.save_medical(p_member uuid, p_answers jsonb, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then raise exception 'Client not found'; end if;
  if not (app.is_desk(m.studio_id) or app.in_care_team(m.id) or app.is_self(m.id)) then raise exception 'Not allowed'; end if;
  insert into public.member_medical (member_id, studio_id, answers, note, updated_by, updated_at)
  values (m.id, m.studio_id, coalesce(p_answers, '{}'::jsonb), nullif(trim(p_note), ''), app.my_staff_id(m.studio_id), now())
  on conflict (member_id) do update set answers = excluded.answers, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
end $$;

create or replace function public.send_notification(p_member_ids uuid[], p_title text, p_body text)
returns int language plpgsql security invoker set search_path = '' as $$
declare v_n int;
begin
  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then raise exception 'Enter the title and the message'; end if;
  insert into public.notifications (studio_id, member_id, title, body, sent_by)
  select m.studio_id, m.id, trim(p_title), trim(p_body), app.my_staff_id(m.studio_id)
  from public.members m where m.id = any (p_member_ids) and m.deleted_at is null and app.is_desk(m.studio_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- Check in / check out from the profile
-- ---------------------------------------------------------------------------
create or replace function public.check_in_client(p_member uuid, p_out boolean default false)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare m public.members; v_id uuid;
begin
  m = app.studio_member(p_member);
  if p_out then
    update public.attendance set check_out = now()
    where id = (select a.id from public.attendance a where a.member_id = m.id and a.date = app.today(m.studio_id)
                and a.check_out is null and a.status = 'present' order by a.check_in desc limit 1)
    returning id into v_id;
    if v_id is null then raise exception 'This client isn''t checked in'; end if;
  else
    if exists (select 1 from public.attendance a where a.member_id = m.id and a.date = app.today(m.studio_id) and a.check_out is null and a.status = 'present') then
      raise exception 'This client is already checked in';
    end if;
    insert into public.attendance (studio_id, member_id, date, check_in, source, status)
    values (m.studio_id, m.id, app.today(m.studio_id), now(), 'manual', 'present') returning id into v_id;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create view public.subscription_overview with (security_invoker = true) as
select
  s.*,
  app.subscription_state(s) as state,
  p.name as plan_name,
  p.plan_code,
  p.service_ids as plan_service_ids,
  p.tier as plan_tier,
  p.tenure_value as plan_tenure_value,
  p.tenure_unit as plan_tenure_unit,
  p.freeze_days as plan_freeze_days,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.email as member_email,
  m.gender as member_gender,
  m.kind as member_kind,
  m.date_of_birth as member_date_of_birth,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  tr.full_name as trainer_name,
  br.full_name as bill_rep_name,
  cr.full_name as client_rep_name,
  cb.full_name as created_by_name,
  coalesce(pay.paid, 0) as paid_amount,
  coalesce(pay.written_off, 0) as written_off_amount,
  greatest(s.total_amount - coalesce(pay.paid, 0) - coalesce(pay.written_off, 0), 0) as balance_amount,
  case when s.total_amount - coalesce(pay.paid, 0) - coalesce(pay.written_off, 0) <= 0.009 then 'paid' else 'pending' end as payment_status,
  (s.end_date - app.today(s.studio_id)) as days_left,
  case when s.sessions_total is null then null else greatest(s.sessions_total - s.sessions_used, 0) end as sessions_left
from public.subscriptions s
join public.plans p on p.id = s.plan_id
join public.members m on m.id = s.member_id
left join public.staff tr on tr.id = s.trainer_id
left join public.staff br on br.id = s.bill_rep_id
left join public.staff cr on cr.id = s.client_rep_id
left join public.staff cb on cb.id = s.created_by
left join lateral (
  select
    sum(case when x.kind = 'payment' then x.amount when x.kind = 'refund' then -x.amount else 0 end) as paid,
    sum(case when x.kind = 'write_off' then x.amount else 0 end) as written_off
  from public.payments x
  where x.subscription_id = s.id and x.purpose = 'subscription' and x.status = 'paid'
) pay on true;

create view public.payment_overview with (security_invoker = true) as
select
  x.*,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.email as member_email,
  m.gender as member_gender,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  s.invoice_no,
  s.invoice_date,
  s.start_date,
  s.end_date,
  s.kind as subscription_kind,
  s.total_amount as bill_amount,
  s.gst_rate,
  s.igst,
  s.plan_id,
  pl.name as plan_name,
  pl.service_ids as plan_service_ids,
  ab.full_name as added_by_name,
  br.full_name as bill_rep_name,
  cb.full_name as cancelled_by_name
from public.payments x
join public.members m on m.id = x.member_id
left join public.subscriptions s on s.id = x.subscription_id
left join public.plans pl on pl.id = s.plan_id
left join public.staff ab on ab.id = x.added_by
left join public.staff br on br.id = x.bill_rep_id
left join public.staff cb on cb.id = x.cancelled_by;

-- Client Referrals (YDL list): who referred whom.
create view public.referral_overview with (security_invoker = true) as
select
  m.id,
  m.studio_id,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  m.enquiry_date as referral_date,
  coalesce(rm.full_name, rs.full_name, m.third_party_referral) as referral_from,
  case when rm.id is not null then 'Member' when rs.id is not null then initcap(replace(rs.role::text, '_', ' '))
       else 'Third party' end as referral_from_type,
  coalesce(rm.member_code, rm.enquiry_code, rs.staff_code) as referral_from_code,
  m.full_name as referred_to,
  m.country_code,
  m.phone,
  concat_ws(', ', m.street1, m.street2, m.city) as address,
  (m.user_id is not null or m.app_installed_at is not null) as has_app,
  m.referred_by_member_id,
  m.referred_by_staff_id,
  m.kind,
  m.created_at
from public.members m
left join public.members rm on rm.id = m.referred_by_member_id
left join public.staff rs on rs.id = m.referred_by_staff_id
where m.deleted_at is null
  and (m.referred_by_member_id is not null or m.referred_by_staff_id is not null or m.third_party_referral is not null);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.member_medical enable row level security;
alter table public.member_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.biometric_devices enable row level security;
alter table public.device_commands enable row level security;

create policy medical_read on public.member_medical for select to authenticated
  using (app.is_desk(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));

create policy documents_read on public.member_documents for select to authenticated
  using (app.is_desk(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy documents_desk on public.member_documents for insert to authenticated with check (app.is_desk(studio_id));
create policy documents_owner_delete on public.member_documents for delete to authenticated using (app.is_owner(studio_id));

create policy notifications_read on public.notifications for select to authenticated
  using (app.is_desk(studio_id) or app.is_self(member_id));
create policy notifications_desk on public.notifications for insert to authenticated with check (app.is_desk(studio_id));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (app.is_self(member_id)) with check (app.is_self(member_id));

create policy devices_read on public.biometric_devices for select to authenticated using (app.is_desk(studio_id));
create policy devices_owner on public.biometric_devices for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy commands_read on public.device_commands for select to authenticated using (app.is_desk(studio_id));
create policy commands_desk on public.device_commands for insert to authenticated with check (app.is_desk(studio_id) and status = 'queued');

create trigger member_documents_log after insert or delete on public.member_documents for each row execute function app.log_activity();
create trigger member_medical_log after insert or update on public.member_medical for each row execute function app.log_activity();

create or replace function app.fill_by_staff()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'member_documents' and new.uploaded_by is null then new.uploaded_by = app.my_staff_id(new.studio_id); end if;
  if tg_table_name = 'device_commands' and new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  return new;
end $$;
create trigger member_documents_fill before insert on public.member_documents for each row execute function app.fill_by_staff();
create trigger device_commands_fill before insert on public.device_commands for each row execute function app.fill_by_staff();

-- Storage for photos and documents (only where Supabase storage exists).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('member-files', 'member-files', false) on conflict (id) do nothing;
  -- Paths are <studio_id>/<member_id>/<file>.
  execute $p$ drop policy if exists member_files_read on storage.objects $p$;
  execute $p$ create policy member_files_read on storage.objects for select to authenticated
    using (bucket_id = 'member-files' and (app.is_desk((split_part(name, '/', 1))::uuid)
           or app.in_care_team((split_part(name, '/', 2))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
  execute $p$ drop policy if exists member_files_write on storage.objects $p$;
  execute $p$ create policy member_files_write on storage.objects for insert to authenticated
    with check (bucket_id = 'member-files' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists member_files_delete on storage.objects $p$;
  execute $p$ create policy member_files_delete on storage.objects for delete to authenticated
    using (bucket_id = 'member-files' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
end $$;

call app.apply_grants();
revoke insert, update, delete on public.member_medical from authenticated;

-- ===== seed.sql =====
-- Shaan Fitness starting setup: the studio, Sabir's owner and coach records,
-- the three membership tiers and the weekly batches. Everything can be changed in the app.
-- The studio insert also creates YDL's dropdown lists and service categories.

insert into public.studios (id, name, branch_name, slug, email, mobile, city, state, country, capacity, facilities)
values ('00000000-0000-4000-8000-000000000001', 'Shaan Fitness', 'Godari Gunta', 'shaan-fitness',
        'shaanfitnessgym@gmail.com', '+919502318090', 'Kakinada', 'Andhra Pradesh', 'India', 30,
        array['Locker','Shower','Training','Steam','Sauna','Wifi','Toilet','Biometric','Changing Room','Separate weight loss',
              'Cardio Training area','Fat Loss','Weight Loss','Weight Gain','Cardio','Strength Training','Natural Bodybuilding',
              'Injury Rehab','Weight Training','Crossfit Workout','Calisthenics','Special Population Training',
              'Nutrition Counselling','Transformation Plans'])
on conflict (id) do nothing;

-- Sabir is the owner and also coaches, so he has both records.
insert into public.staff (id, studio_id, role, first_name, last_name, phone, email, title, employee_type, star_trainer)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'owner', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Gym Owner', false),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'coach', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Head Trainer/Nutritionist', true)
on conflict (id) do nothing;

insert into public.plans (id, studio_id, name, kind, tier, service_ids, trainer_ids, session_count, tenure_value, tenure_unit,
                          price, includes_personal_coach, coach_split, app_sequence)
select v.id::uuid, '00000000-0000-4000-8000-000000000001', v.name, v.kind, v.tier,
       array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = v.service),
       array['00000000-0000-4000-8000-0000000000a2']::uuid[], 24, 28, 'days', v.price, v.pc,
       '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]'::jsonb, v.seq
from (values
  ('00000000-0000-4000-8000-0000000000b1', 'Group', 'gym', 'group', 'Group Activity', 4999, false, 1),
  ('00000000-0000-4000-8000-0000000000b2', 'Semi-Private (Side-by-Side)', 'pt', 'semi_private', 'Personal Training / Nutrition', 7999, true, 2),
  ('00000000-0000-4000-8000-0000000000b3', '1:1 Elite', 'pt', 'elite', 'Personal Training / Nutrition', 14999, true, 3)
) as v(id, name, kind, tier, service, price, pc, seq)
on conflict (id) do nothing;

-- Eight one-hour batches, Monday to Saturday.
insert into public.batches (studio_id, name, capacity, trainer_ids, service_ids, days, start_time, end_time, tier)
select '00000000-0000-4000-8000-000000000001', t.name, t.capacity,
       array['00000000-0000-4000-8000-0000000000a2']::uuid[],
       array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = t.service),
       '{1,2,3,4,5,6}', t.start_time, t.start_time + interval '1 hour', t.tier
from (values
  ('5:30 AM Group',         '05:30'::time, 9, 'group',        'Group Activity'),
  ('7:00 AM Group',         '07:00'::time, 9, 'group',        'Group Activity'),
  ('8:30 AM Semi-Private',  '08:30'::time, 2, 'semi_private', 'Personal Training / Nutrition'),
  ('10:00 AM Elite',        '10:00'::time, 1, 'elite',        'Personal Training / Nutrition'),
  ('4:00 PM Group',         '16:00'::time, 9, 'group',        'Group Activity'),
  ('5:30 PM Semi-Private',  '17:30'::time, 2, 'semi_private', 'Personal Training / Nutrition'),
  ('7:00 PM Group',         '19:00'::time, 9, 'group',        'Group Activity'),
  ('8:30 PM Elite',         '20:30'::time, 1, 'elite',        'Personal Training / Nutrition')
) as t(name, start_time, capacity, tier, service)
where not exists (select 1 from public.batches b where b.studio_id = '00000000-0000-4000-8000-000000000001');

-- Logins made before this setup (the owner's) get linked again.
select app.relink_existing_users();

-- ===== versions =====
create table if not exists app.schema_migrations (version text primary key, applied_at timestamptz not null default now());
insert into app.schema_migrations (version) values ('20261008000001_foundation') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000002_memberships') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000003_schedule') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000004_follow_ups') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000005_expenses') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000006_client_views') on conflict do nothing;
insert into app.schema_migrations (version) values ('20261008000007_member_billing') on conflict do nothing;

commit;

-- ===== check =====
select (select count(*) from public.list_items) as dropdown_options,
       (select count(*) from public.services) as services,
       (select count(*) from public.plans) as plans,
       (select count(*) from public.batches) as batches,
       (select count(*) from public.staff where user_id is not null) as linked_logins,
       'Shaan Fitness database is ready' as status;
