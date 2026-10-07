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
