-- Shaan Fitness · database update (up to 20261009000012_center)
-- Paste everything into Supabase → SQL Editor → New query, then click Run.
-- Safe to run more than once: parts the database already has are skipped.
begin;

do $guard$ begin
  if to_regclass('app.schema_migrations') is null then raise exception 'This database is not set up yet. Run setup-all.sql instead.'; end if;
  if not exists (select 1 from app.schema_migrations where version = '20261008000007_member_billing') then
    raise exception 'This update needs % first. Ask Claude for the right update file.', '20261008000007_member_billing'; end if;
end $guard$;

-- ===== 20261008000008_registers =====
do $bu20261008000008$ begin
  if exists (select 1 from app.schema_migrations where version = '20261008000008_registers') then raise notice 'already has 20261008000008_registers'; return; end if;
  execute $u20261008000008$
-- Shaan Fitness app · 8. Account registers
-- Read models for YDL's 24 account registers, PT session recording (deduct / no-show),
-- the deleted-session log, and course orders.

-- ---------------------------------------------------------------------------
-- PT sessions: who trained the client and what was done (YDL session register)
-- ---------------------------------------------------------------------------
alter table public.attendance
  add column trainer_id uuid references public.staff(id) on delete set null,
  add column activity text;

-- No-show that still uses up a session = 'late_cancel'; no-show that doesn't = 'absent'.
create or replace function app.recount_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  ids = array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.subscription_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.subscription_id end
  ], null);
  update public.subscriptions s set sessions_used = (
    select count(*) from public.attendance a where a.subscription_id = s.id and a.status in ('present', 'late_cancel')
  ) where s.id = any (ids);
  return null;
end $$;

-- Every deleted check-in or session is kept for the Deleted Session Register.
create table public.attendance_deletions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  attendance_id uuid not null,
  member_id uuid references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  trainer_id uuid references public.staff(id) on delete set null,
  check_in timestamptz not null,
  status text not null,
  source text not null,
  activity text,
  reason text,
  deleted_by uuid references public.staff(id) on delete set null,
  deleted_at timestamptz not null default now()
);
create index attendance_deletions_studio_idx on public.attendance_deletions (studio_id, deleted_at desc);

create or replace function app.keep_deleted_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Skip when the client or studio itself is being removed (cascade).
  if not exists (select 1 from public.members where id = old.member_id) then return old; end if;
  insert into public.attendance_deletions (studio_id, attendance_id, member_id, subscription_id, batch_id, trainer_id, check_in,
    status, source, activity, reason, deleted_by)
  values (old.studio_id, old.id, old.member_id, old.subscription_id, old.batch_id, old.trainer_id, old.check_in,
    old.status, old.source, old.activity, nullif(current_setting('app.delete_reason', true), ''), app.my_staff_id(old.studio_id));
  return old;
end $$;
create trigger attendance_keep_deleted before delete on public.attendance for each row execute function app.keep_deleted_attendance();

-- Record a PT session against a subscription (YDL "Deduct session").
--   p: subscription_id, at (timestamp), show ('show' | 'no_show_deduct' | 'no_show'), trainer_id, activity
create or replace function public.record_session(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; v_id uuid; v_at timestamptz; v_status text;
begin
  select * into s from public.subscriptions where id = (p->>'subscription_id')::uuid;
  if s.id is null then raise exception 'Subscription not found'; end if;
  if not (app.is_desk(s.studio_id) or s.trainer_id = app.my_staff_id(s.studio_id) or app.my_staff_id(s.studio_id) = any (s.second_trainer_ids)) then
    raise exception 'Only the front desk or the client''s trainer can record sessions';
  end if;
  if s.deleted_at is not null or s.cancelled_at is not null or s.status <> 'live' then raise exception 'This subscription is closed'; end if;
  v_at = coalesce(nullif(p->>'at', '')::timestamptz, now());
  if (v_at at time zone 'Asia/Kolkata')::date not between s.start_date and s.end_date then
    raise exception 'The session date is outside the subscription (% to %)', to_char(s.start_date, 'DD-MM-YYYY'), to_char(s.end_date, 'DD-MM-YYYY');
  end if;
  v_status = case coalesce(p->>'show', 'show') when 'show' then 'present' when 'no_show_deduct' then 'late_cancel' else 'absent' end;
  if v_status <> 'absent' and s.sessions_total is not null and s.sessions_used >= s.sessions_total then
    raise exception 'All % sessions are used', s.sessions_total;
  end if;
  insert into public.attendance (studio_id, member_id, subscription_id, date, check_in, source, status, trainer_id, activity)
  values (s.studio_id, s.member_id, s.id, (v_at at time zone 'Asia/Kolkata')::date, v_at, 'pt', v_status,
          coalesce(nullif(p->>'trainer_id', '')::uuid, s.trainer_id), nullif(trim(p->>'activity'), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.delete_session(p_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.attendance;
begin
  select * into a from public.attendance where id = p_id;
  if a.id is null then raise exception 'Session not found'; end if;
  if not app.is_owner(a.studio_id) then raise exception 'Only the owner can delete sessions'; end if;
  perform set_config('app.delete_reason', coalesce(p_reason, ''), true);
  delete from public.attendance where id = p_id;
end $$;

-- Coaches record sessions for their own PT clients.
drop policy attendance_mark on public.attendance;
create policy attendance_mark on public.attendance for insert to authenticated
  with check (app.is_desk(studio_id) or app.coaches_batch(batch_id) or trainer_id = app.my_staff_id(studio_id));

-- ---------------------------------------------------------------------------
-- Course orders (courses sold in the member app)
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  course_type text not null default 'paid' check (course_type in ('free', 'paid')),
  validity_days int,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.course_orders (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'failed', 'pending')),
  valid_until date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
-- Subscriptions: coupon details, renewal, voided receipts, who closed it.
create or replace view public.subscription_overview with (security_invoker = true) as
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
  case when s.sessions_total is null then null else greatest(s.sessions_total - s.sessions_used, 0) end as sessions_left,
  -- added in migration 8
  c.name as coupon_name,
  c.type as coupon_type,
  c.active as coupon_active,
  exists (select 1 from public.subscriptions r where r.member_id = s.member_id and r.kind = s.kind and r.id <> s.id
          and r.start_date > s.start_date and r.deleted_at is null and r.cancelled_at is null) as renewed,
  coalesce(pay.voided, 0) as voided_amount,
  (m.deleted_at is not null) as member_deleted,
  db.full_name as deleted_by_name,
  cnb.full_name as cancelled_by_name,
  pay.last_receipt_date
from public.subscriptions s
join public.plans p on p.id = s.plan_id
join public.members m on m.id = s.member_id
left join public.staff tr on tr.id = s.trainer_id
left join public.staff br on br.id = s.bill_rep_id
left join public.staff cr on cr.id = s.client_rep_id
left join public.staff cb on cb.id = s.created_by
left join public.staff db on db.id = s.deleted_by
left join public.staff cnb on cnb.id = s.cancelled_by
left join public.coupons c on c.id = s.coupon_id
left join lateral (
  select
    sum(case when x.status = 'paid' and x.kind = 'payment' then x.amount when x.status = 'paid' and x.kind = 'refund' then -x.amount else 0 end) as paid,
    sum(case when x.status = 'paid' and x.kind = 'write_off' then x.amount else 0 end) as written_off,
    sum(case when x.status = 'cancelled' and x.kind = 'payment' then x.amount else 0 end) as voided,
    max(x.receipt_date) filter (where x.status = 'paid' and x.kind = 'payment') as last_receipt_date
  from public.payments x
  where x.subscription_id = s.id and x.purpose = 'subscription'
) pay on true;

-- Receipts with their bill's state, balance, client rep and batch (receipt, cash, tax and write-off registers).
create or replace view public.payment_overview with (security_invoker = true) as
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
  cb.full_name as cancelled_by_name,
  -- added in migration 8
  case when s.id is null then null else app.subscription_state(s) end as subscription_state,
  s.client_rep_id,
  cr.full_name as client_rep_name,
  s.batch_id,
  s.net_amount as bill_net_amount,
  case when s.id is null then 0 else greatest(s.total_amount - coalesce(sp.paid, 0), 0) end as bill_balance,
  case when coalesce(s.gst_rate, 0) > 0 and x.kind = 'payment' then round(x.amount * s.gst_rate / (100 + s.gst_rate), 2) else 0 end as tax_amount
from public.payments x
join public.members m on m.id = x.member_id
left join public.subscriptions s on s.id = x.subscription_id
left join public.plans pl on pl.id = s.plan_id
left join public.staff ab on ab.id = x.added_by
left join public.staff br on br.id = x.bill_rep_id
left join public.staff cb on cb.id = x.cancelled_by
left join public.staff cr on cr.id = s.client_rep_id
left join lateral (
  select sum(case when y.kind in ('payment', 'write_off') then y.amount when y.kind = 'refund' then -y.amount else 0 end) as paid
  from public.payments y where y.subscription_id = s.id and y.purpose = 'subscription' and y.status = 'paid'
) sp on true;

-- Transfers, upgrades and downgrades.
create view public.change_overview with (security_invoker = true) as
select
  c.*,
  fp.name as from_plan_name,
  tp.name as to_plan_name,
  fm.full_name as from_member_name,
  coalesce(fm.member_code, fm.enquiry_code) as from_client_code,
  fm.gender as from_member_gender,
  tm.full_name as to_member_name,
  coalesce(tm.member_code, tm.enquiry_code) as to_client_code,
  st.full_name as created_by_name,
  fs.client_rep_id,
  cr.full_name as client_rep_name,
  fp.service_ids as from_service_ids,
  tp.service_ids as to_service_ids,
  ts.plan_id as to_plan_id
from public.subscription_changes c
join public.subscriptions fs on fs.id = c.from_subscription_id
join public.plans fp on fp.id = fs.plan_id
left join public.subscriptions ts on ts.id = c.to_subscription_id
left join public.plans tp on tp.id = ts.plan_id
join public.members fm on fm.id = c.from_member_id
left join public.members tm on tm.id = c.to_member_id
left join public.staff st on st.id = c.created_by
left join public.staff cr on cr.id = fs.client_rep_id;

create view public.freeze_overview with (security_invoker = true) as
select f.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.gender as member_gender,
  p.name as plan_name, st.full_name as created_by_name, s.client_rep_id, cr.full_name as client_rep_name
from public.freezes f
join public.subscriptions s on s.id = f.subscription_id
join public.plans p on p.id = s.plan_id
join public.members m on m.id = f.member_id
left join public.staff st on st.id = f.created_by
left join public.staff cr on cr.id = s.client_rep_id;

create view public.extension_overview with (security_invoker = true) as
select e.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.gender as member_gender,
  p.name as plan_name, st.full_name as created_by_name, s.client_rep_id, cr.full_name as client_rep_name
from public.extensions e
join public.subscriptions s on s.id = e.subscription_id
join public.plans p on p.id = s.plan_id
join public.members m on m.id = e.member_id
left join public.staff st on st.id = e.created_by
left join public.staff cr on cr.id = s.client_rep_id;

-- PT sessions recorded (and every check-in, for the Recorded Session Register).
create view public.session_overview with (security_invoker = true) as
select a.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.gender as member_gender,
  m.country_code as member_country_code, m.phone as member_phone,
  p.name as plan_name, s.kind as subscription_kind, tr.full_name as trainer_name, mb.full_name as marked_by_name
from public.attendance a
join public.members m on m.id = a.member_id
left join public.subscriptions s on s.id = a.subscription_id
left join public.plans p on p.id = s.plan_id
left join public.staff tr on tr.id = a.trainer_id
left join public.staff mb on mb.id = a.marked_by;

create view public.deleted_session_overview with (security_invoker = true) as
select d.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, p.name as plan_name,
  p.service_ids as plan_service_ids, tr.full_name as trainer_name, b.name as batch_name, st.full_name as deleted_by_name
from public.attendance_deletions d
left join public.members m on m.id = d.member_id
left join public.subscriptions s on s.id = d.subscription_id
left join public.plans p on p.id = s.plan_id
left join public.staff tr on tr.id = d.trainer_id
left join public.batches b on b.id = d.batch_id
left join public.staff st on st.id = d.deleted_by;

-- Receipt Register Log: each change to a receipt, with the receipt as it is now.
create view public.receipt_log_overview with (security_invoker = true) as
select rc.id as change_id, rc.changed_at, rc.old_values, rc.new_values, ch.full_name as changed_by_name, po.*
from public.receipt_changes rc
join public.payment_overview po on po.id = rc.payment_id
left join public.staff ch on ch.id = rc.changed_by;

create view public.course_order_overview with (security_invoker = true) as
select o.*, c.name as course_name, c.course_type, c.validity_days, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code
from public.course_orders o join public.courses c on c.id = o.course_id join public.members m on m.id = o.member_id;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.attendance_deletions enable row level security;
alter table public.courses enable row level security;
alter table public.course_orders enable row level security;
create policy attendance_deletions_read on public.attendance_deletions for select to authenticated using (app.is_desk(studio_id));
create policy courses_read on public.courses for select to authenticated using (app.in_studio(studio_id));
create policy courses_owner on public.courses for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy course_orders_read on public.course_orders for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy course_orders_desk on public.course_orders for insert to authenticated with check (app.is_desk(studio_id));

-- ---------------------------------------------------------------------------
-- Upgrade / downgrade into personal training asks for a trainer (replaces the version in migration 7)
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
  if pl.kind = 'pt' and coalesce(nullif(p->>'trainer_id', '')::uuid, s.trainer_id) is null then
    raise exception 'Assign a trainer for %', pl.name;
  end if;
  if p_kind = 'downgrade' then v_refund = greatest(v_paid - pl.total_price, 0); end if;
  if nullif(trim(p->>'coupon_code'), '') is not null then
    v_coupon = public.check_coupon(s.studio_id, p->>'coupon_code', pl.id, s.member_id, v_price);
    if not (v_coupon->>'ok')::boolean then raise exception '%', v_coupon->>'message'; end if;
    v_disc = (v_coupon->>'discount')::numeric; v_coupon_id = (v_coupon->>'coupon_id')::uuid;
  end if;
  insert into public.subscriptions (studio_id, member_id, plan_id, kind, start_date, base_end_date, trainer_id, second_trainer_ids,
    group_member_ids, base_price, selling_price, coupon_id, coupon_code, coupon_discount, previous_subscription_id, note, balance_due_date)
  values (s.studio_id, s.member_id, pl.id, pl.kind, v_start, v_end, coalesce(nullif(p->>'trainer_id', '')::uuid, s.trainer_id), s.second_trainer_ids,
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

-- Grants: logs and records that only change through the database's own functions stay read-only.
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
  revoke insert, update, delete on public.activity_log, public.receipt_changes, public.member_medical,
    public.attendance_deletions from authenticated;
end $$;
call app.apply_grants();
-- One-time clean-up for databases set up before 8 Oct 2026 evening: the made-up starter plans
-- (Group, Semi-Private, 1:1 Elite) and their 8 batches make way for the plans and batches copied
-- from YDL (seed-ydl.sql). Anything already used — sold, or with check-ins or batch members — is
-- kept but switched off. Safe to run more than once.
delete from public.plans p
where p.id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3')
  and not exists (select 1 from public.subscriptions s where s.plan_id = p.id);
update public.plans set active = false
where id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3');

delete from public.batches b
where b.studio_id = '00000000-0000-4000-8000-000000000001'
  and b.name in ('5:30 AM Group', '7:00 AM Group', '8:30 AM Semi-Private', '10:00 AM Elite', '4:00 PM Group', '5:30 PM Semi-Private', '7:00 PM Group', '8:30 PM Elite')
  and not exists (select 1 from public.attendance a where a.batch_id = b.id)
  and not exists (select 1 from public.batch_members m where m.batch_id = b.id)
  and not exists (select 1 from public.subscriptions s where s.batch_id = b.id);
update public.batches set active = false
where studio_id = '00000000-0000-4000-8000-000000000001'
  and name in ('5:30 AM Group', '7:00 AM Group', '8:30 AM Semi-Private', '10:00 AM Elite', '4:00 PM Group', '5:30 PM Semi-Private', '7:00 PM Group', '8:30 PM Elite');
-- Shaan Fitness membership plans and batches, as set up in YDL (generated by scripts/build-seed-ydl.py).
-- Runs once on a new database; edit plans and batches in the app afterwards.

insert into public.plans (studio_id, plan_code, name, description, kind, service_ids, show_in_app, terms, session_count,
  unlimited_sessions, disable_messages_followups, tenure_value, tenure_unit, is_one_time, freeze_days, weekly_class_limit,
  is_free_trial, price, discount_price, app_sequence, appointment_type, faqs, guidelines, dos_donts, shopping_list, snack_list,
  activities, other_text, active)
select v.* from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-49725', 'One Day', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['HIIT','Strength Training','Locker']::text[]) order by s.sort), false, null, null::int, false, false, 1, 'days', false, 0, 0, false, 100.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43951', 'Cardio & Strengthening (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 2499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43952', 'Strengthening (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43953', 'Student Strengthening (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1199.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43957', 'Personal Training (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Personal Training / Nutrition']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 11999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43958', 'Group Training (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 7999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42167', 'Demo Plan', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43960', 'Student Cardio & Strengthening (1 Month)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43961', 'Annual Maintenance & Facility Enhancement Fee', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'days', false, 0, 0, false, 999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-75964', 'demo 1 Do Not use', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 100.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43966', 'Steam Bath', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'days', false, 0, 0, false, 499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43967', '1 Month G.N.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43969', '1 Month S&C', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 2500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43970', 'Group Training', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 6000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43971', '1 Month S.P', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 1200.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43975', '1 Month P.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Personal Training / Nutrition']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 12000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43977', 'Daily (Incl. Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'days', false, 0, 0, false, 149.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43978', '[ALT] 1 Month P.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Personal Training / Nutrition']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 8000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43986', '1 Month', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 1, 'months', false, 0, 0, false, 2500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43954', 'Cardio & Strengthening (3 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 6499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43955', 'Strengthening (3 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 3999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43964', 'Student Strengthening (3 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 3499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43968', '3 Months S&C', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 6499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43972', '3 Months G.N.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 4000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43973', '1 Month S.P (Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 2000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43974', '3 Months S.P (Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 5500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43979', '3 Months S.P', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 3500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43982', 'Group Training (3 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 20999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43983', '3 Months P.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Personal Training / Nutrition']::text[]) order by s.sort), true, null, null::int, false, false, 3, 'months', false, 0, 0, false, 30000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43959', 'Cardio & Strengthening (6 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 6, 'months', false, 0, 0, false, 10999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43962', 'Strengthening (1 Week)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 6, 'days', false, 0, 0, false, 599.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43963', 'Strengthening (6 Months)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 6, 'months', false, 0, 0, false, 7499.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43980', '6 Months S&C', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 6, 'months', false, 0, 0, false, 9000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43985', '1 Week G.N.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 6, 'days', false, 0, 0, false, 699.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-53266', 'One Week', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), false, null, null::int, false, false, 7, 'days', false, 0, 0, false, 500.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-56389', 'One Week', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), false, null, null::int, false, false, 7, 'days', false, 0, 0, false, 500.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-56293', 'One Week', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), false, null, null::int, false, false, 7, 'days', false, 0, 0, false, 700.00, 200.00, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-56294', 'One Week (Incl. Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio']::text[]) order by s.sort), false, null, null::int, false, false, 7, 'days', false, 0, 0, false, 700.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-56295', 'One Week', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), false, null, null::int, false, false, 7, 'days', false, 0, 0, false, 700.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43956', 'Cardio & Strengthening (1 Year)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 12, 'months', false, 0, 0, false, 17999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43965', 'Strengthening (1 Year)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 12, 'months', false, 0, 0, false, 11999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43976', '1 Year (12 Months) S&C', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 12, 'months', false, 0, 0, false, 14000.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43981', '1 Year (12 Months) G.N.T', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 12, 'months', false, 0, 0, false, 9999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-43984', 'Diamond Pack', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training']::text[]) order by s.sort), true, null, null::int, false, false, 12, 'months', false, 0, 0, false, 17999.00, null::numeric, 0, null, null, null, null, null, null, null, null, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42716', 'VIP Coaching [4 Weeks]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 24, false, false, 28, 'days', false, 0, 0, false, 11999.00, null::numeric, 14, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42749', 'Elite Training [4 Weeks]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 12, false, false, 28, 'days', false, 0, 0, false, 7999.00, null::numeric, 15, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-76898', 'Advanced Training [1 Month]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 26, false, false, 30, 'days', false, 0, 0, false, 5999.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42698', '1 Month Strengthening', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Strength Training','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 30, 'days', false, 3, 0, false, 1499.00, null::numeric, 17, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42699', '1 Month Signature', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 30, 'days', false, 3, 0, false, 2999.00, null::numeric, 16, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42702', '3 Months Signature', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 84, 'days', false, 11, 0, false, 7999.00, null::numeric, 12, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42750', 'Elite Training [3 Months]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 78, false, false, 84, 'days', false, 0, 0, false, 20999.00, null::numeric, 11, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42700', '3 Months Strengthening', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Strength Training','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 90, 'days', false, 11, 0, false, 4499.00, 3999.00, 13, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42741', 'VIP Coaching [3 Months]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 78, false, false, 90, 'days', false, 0, 0, false, 31999.00, null::numeric, 10, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-102025', '4 Months Semester', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio']::text[]) order by s.sort), false, null, null::int, false, false, 112, 'days', false, 0, 0, false, 5999.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42707', '6 Months Strengthening', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Strength Training','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 180, 'days', false, 25, 0, false, 8999.00, 7499.00, 9, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42710', '6 Months Strengthening (Incl. Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','HIIT','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 180, 'days', false, 25, 0, false, 14999.00, 10999.00, 8, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42742', 'VIP Coaching [6 Months]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 156, false, false, 180, 'days', false, 0, 0, false, 49999.00, null::numeric, 6, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42751', 'Elite Training [6 Months]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 156, false, false, 180, 'days', false, 0, 0, false, 37999.00, null::numeric, 7, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42752', 'Elite Training [1 Year]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 312, false, false, 365, 'days', false, 0, 0, false, 71999.00, null::numeric, 3, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-45957', 'Access Plus', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), false, null, null::int, false, false, 365, 'days', false, 0, 0, false, 999.00, null::numeric, 0, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42712', '1 Year Strengthening', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Strength Training','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 365, 'days', false, 55, 0, false, 17999.00, 11999.00, 5, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42715', '1 Year Strengthening (Incl. Cardio)', null, 'gym', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','HIIT','Nutrition','Steam']::text[]) order by s.sort), true, null, null::int, false, false, 365, 'days', false, 55, 0, false, 29999.00, 17999.00, 4, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-42743', 'VIP Coaching [1 Year]', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), true, null, 312, false, false, 365, 'days', false, 0, 0, false, 89999.00, null::numeric, 2, null, null, null, null, null, null, null, null, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'YD-45758', 'Free Trail', null, 'pt', array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','HIIT','Strength Training','Group Activity','Nutrition']::text[]) order by s.sort), false, null, 3, false, false, 3, 'days', false, 0, 0, true, 0.00, null::numeric, 17, null, null, null, null, null, null, null, null, true)
) as v(studio_id, plan_code, name, description, kind, service_ids, show_in_app, terms, session_count, unlimited_sessions,
  disable_messages_followups, tenure_value, tenure_unit, is_one_time, freeze_days, weekly_class_limit, is_free_trial, price,
  discount_price, app_sequence, appointment_type, faqs, guidelines, dos_donts, shopping_list, snack_list, activities, other_text, active)
where not exists (select 1 from public.plans x where x.studio_id = v.studio_id and x.plan_code = v.plan_code);

insert into public.batches (studio_id, batch_code, name, info, capacity, room, service_ids, start_date, end_date, days, start_time, end_time, gender)
select v.* from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5755', '5:00 AM - 6:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '05:00'::time, '06:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5756', '5:30 AM - 7:00 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '05:30'::time, '07:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5757', '6:00 AM - 7:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '06:00'::time, '07:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5758', '6:30 AM - 8:00 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '06:30'::time, '08:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5759', '7:00 AM - 8:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '07:00'::time, '08:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5760', '7:30 AM - 9:00 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '07:30'::time, '09:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5761', '8:00 AM - 9:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '08:00'::time, '09:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5762', '8:30 AM - 10:00 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '08:30'::time, '10:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5763', '9:00 AM - 10:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '09:00'::time, '10:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5764', '9:30 AM - 11:00 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '09:30'::time, '11:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5765', '10:00 AM - 11:30 AM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '10:00'::time, '11:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5767', '10:30 AM - 12:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '10:30'::time, '12:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5776', '2:00 PM - 3:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '14:00'::time, '15:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5777', '2:30 PM - 4:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '14:30'::time, '16:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5778', '3:00 PM - 4:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '15:00'::time, '16:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5779', '3:30 PM - 5:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '15:30'::time, '17:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5780', '4:00 PM - 5:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '16:00'::time, '17:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5775', '4:30 PM - 6:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '16:30'::time, '18:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5768', '5:00 PM - 6:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '17:00'::time, '18:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5769', '5:30 PM - 7:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '17:30'::time, '19:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5770', '6:00 PM - 7:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '18:00'::time, '19:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5771', '6:30 PM - 8:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '18:30'::time, '20:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5772', '7:00 PM - 8:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '19:00'::time, '20:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5773', '7:30 PM - 9:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '19:30'::time, '21:00'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5766', '8:00 PM - 9:30 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '20:00'::time, '21:30'::time, 'all'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Batch-5774', '8:30 PM - 10:00 PM', null, 15, null, array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = any (array['Weight Training','Cardio','Cross-fit','Personal Training / Nutrition','Calisthenics','HIIT','Strength Training','Group Activity','Nutrition','Steam','Locker']::text[]) order by s.sort), null::date, null::date, '{1,2,3,4,5,6}'::smallint[], '20:30'::time, '22:00'::time, 'all')
) as v(studio_id, batch_code, name, info, capacity, room, service_ids, start_date, end_date, days, start_time, end_time, gender)
where not exists (select 1 from public.batches x where x.studio_id = v.studio_id and x.batch_code = v.batch_code);
$u20261008000008$;
  insert into app.schema_migrations (version) values ('20261008000008_registers');
end $bu20261008000008$;

-- ===== 20261008000009_classes =====
do $bu20261008000009$ begin
  if exists (select 1 from app.schema_migrations where version = '20261008000009_classes') then raise notice 'already has 20261008000009_classes'; return; end if;
  execute $u20261008000009$
-- Shaan Fitness app · 9. Batches & classes, appointments, programs, attendance reports
-- YDL's "Batches & Classes" menu (batches, class bookings and waiting list, classes calendar,
-- programs, class registers and feedback, Daily Booking Appointment) and "Attendance Reports"
-- (staff & trainer attendance, client traffic, check-ins leaderboard).

-- ---------------------------------------------------------------------------
-- Batches: front desk adds and edits them too (YDL "Add Batch" is a front-desk page)
-- ---------------------------------------------------------------------------
drop policy batches_owner on public.batches;
create policy batches_desk on public.batches for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

-- A check-in during one of the client's fixed batches counts for that batch (YDL Batchwise Attendance).
create or replace function app.attendance_link_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tz text; v_local time;
begin
  if new.subscription_id is null then
    select s.id into new.subscription_id from public.subscriptions s
    where s.member_id = new.member_id and new.date between s.start_date and s.end_date
      and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
    order by (s.kind = 'trial'), s.start_date desc
    limit 1;
  end if;
  if new.marked_by is null then new.marked_by = app.my_staff_id(new.studio_id); end if;
  if tg_op = 'INSERT' and new.batch_id is null and new.source in ('manual', 'biometric', 'qr', 'app', 'live') then
    select s.timezone into v_tz from public.studios s where s.id = new.studio_id;
    v_local = (new.check_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::time;
    select b.id into new.batch_id
    from public.batch_members bm join public.batches b on b.id = bm.batch_id
    where bm.member_id = new.member_id and b.active
      and extract(isodow from new.date)::smallint = any (b.days)
      and (b.start_date is null or b.start_date <= new.date) and (b.end_date is null or b.end_date >= new.date)
      and v_local >= b.start_time - interval '30 minutes' and v_local <= b.end_time
      and not exists (select 1 from public.attendance a where a.member_id = new.member_id and a.date = new.date and a.batch_id = b.id)
    order by abs(extract(epoch from (v_local - b.start_time)))
    limit 1;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Class bookings (a batch on a date), the waiting list, cancellations and deletions
-- ---------------------------------------------------------------------------
create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  class_date date not null,
  status text not null default 'booked' check (status in ('booked', 'waiting', 'rejected')),
  from_waiting_list boolean not null default false,          -- YDL booking status "Approved"
  token text not null default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  source text not null default 'crm' check (source in ('crm', 'calendar', 'app')),
  booked_by uuid references public.staff(id) on delete set null,
  attendance_id uuid references public.attendance(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.staff(id) on delete set null,
  cancel_source text,
  deleted_at timestamptz,
  deleted_by uuid references public.staff(id) on delete set null,
  delete_source text,
  created_at timestamptz not null default now(),
  check (cancelled_at is null or deleted_at is null)
);
create unique index class_bookings_once on public.class_bookings (batch_id, member_id, class_date)
  where cancelled_at is null and deleted_at is null;
create index class_bookings_date_idx on public.class_bookings (studio_id, class_date);
create index class_bookings_member_idx on public.class_bookings (member_id, class_date);

-- One day's changes to a class: its name, time or trainer (YDL "Edit Class").
create table public.class_sessions (
  batch_id uuid not null references public.batches(id) on delete cascade,
  class_date date not null,
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text,
  start_time time,
  end_time time,
  trainer_ids uuid[],
  updated_by uuid references public.staff(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (batch_id, class_date),
  check (start_time is null or end_time is null or end_time > start_time)
);

-- Ratings clients give a class (YDL "Class Feedbacks").
create table public.class_feedback (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  booking_id uuid references public.class_bookings(id) on delete set null,
  batch_id uuid not null references public.batches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  class_date date not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (batch_id, member_id, class_date)
);
create index class_feedback_studio_idx on public.class_feedback (studio_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Programs: fixed online sessions with a meeting link (YDL "Program")
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  meeting_link text not null check (length(trim(meeting_link)) > 0),
  days smallint[] not null default '{1,2,3,4,5,6,7}',
  gender text not null default 'all' check (gender in ('all', 'male', 'female')),
  start_time time not null,
  end_time time not null,
  audience text not null default 'all' check (audience in
    ('all', 'paid', 'trial', 'paid_trial', 'enquiry', 'enquiry_trial', 'expired_trial', 'expired')),
  trainer_ids uuid[] not null default '{}',
  service_ids uuid[] not null default '{}',
  live boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index programs_studio_idx on public.programs (studio_id, active);

create table public.program_attendance (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (program_id, member_id, date)
);
create index program_attendance_studio_idx on public.program_attendance (studio_id, date);

-- ---------------------------------------------------------------------------
-- Appointments (YDL "Daily Booking Appointment" › Schedule Appointment)
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  batch_id uuid references public.batches(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  member_id uuid not null references public.members(id) on delete cascade,
  handled_by uuid references public.staff(id) on delete set null,
  room_no text,
  status text not null default 'open' check (status in ('open', 'no_action', 'attended', 'no_show', 'cancelled')),
  notify_client boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index appointments_studio_date_idx on public.appointments (studio_id, appointment_date);
create index appointments_member_idx on public.appointments (member_id);

-- ---------------------------------------------------------------------------
-- Staff and trainer attendance (YDL "Staff & Trainer attendance")
-- ---------------------------------------------------------------------------
create table public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  date date not null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  source text not null default 'manual' check (source in ('manual', 'biometric', 'app')),
  marked_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (check_out is null or check_out >= check_in)
);
create index staff_attendance_studio_idx on public.staff_attendance (studio_id, date);
create index staff_attendance_staff_idx on public.staff_attendance (staff_id, date desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger programs_touch before update on public.programs for each row execute function app.touch_updated_at();
create trigger appointments_touch before update on public.appointments for each row execute function app.touch_updated_at();
create trigger programs_created_by before insert on public.programs for each row execute function app.fill_created_by();
create trigger appointments_created_by before insert on public.appointments for each row execute function app.fill_created_by();
create trigger class_bookings_log after update or delete on public.class_bookings for each row execute function app.log_activity();
create trigger appointments_log after update or delete on public.appointments for each row execute function app.log_activity();
create trigger programs_log after insert or update or delete on public.programs for each row execute function app.log_activity();
create trigger staff_attendance_log after update or delete on public.staff_attendance for each row execute function app.log_activity();

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
-- Coaches see the clients in their batches and classes (YDL coach app: batch members, bookings).
create or replace function app.in_my_batch(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batch_members bm join public.batches b on b.id = bm.batch_id
    where bm.member_id = p_member and b.trainer_ids && array(select app.my_staff_ids())
  ) or exists (
    select 1 from public.class_bookings cb join public.batches b on b.id = cb.batch_id
    where cb.member_id = p_member and cb.deleted_at is null and b.trainer_ids && array(select app.my_staff_ids())
  );
$$;
grant execute on function app.in_my_batch(uuid) to authenticated, service_role;

drop policy members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (app.can_see_client(studio_id, added_by, trainer_id) or app.in_care_team(id)
         or app.has_follow_up_for(id) or app.in_my_batch(id) or user_id = (select auth.uid()));

alter table public.class_bookings enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_feedback enable row level security;
alter table public.programs enable row level security;
alter table public.program_attendance enable row level security;
alter table public.appointments enable row level security;
alter table public.staff_attendance enable row level security;

-- Bookings change only through the functions below (they check capacity, plan limits and dates).
create policy class_bookings_read on public.class_bookings for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.is_self(member_id));

create policy class_sessions_read on public.class_sessions for select to authenticated using (app.in_studio(studio_id));

create policy class_feedback_read on public.class_feedback for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.is_self(member_id));
create policy class_feedback_self on public.class_feedback for insert to authenticated
  with check (app.is_self(member_id) and exists (
    select 1 from public.class_bookings cb where cb.batch_id = class_feedback.batch_id and cb.member_id = class_feedback.member_id
      and cb.class_date = class_feedback.class_date and cb.status = 'booked' and cb.cancelled_at is null and cb.deleted_at is null));
create policy class_feedback_desk_delete on public.class_feedback for delete to authenticated using (app.is_desk(studio_id));

create policy programs_read on public.programs for select to authenticated using (app.in_studio(studio_id));
create policy programs_desk on public.programs for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
-- The program's trainer starts and ends its meeting.
create policy programs_trainer_update on public.programs for update to authenticated
  using (trainer_ids && array(select app.my_staff_ids())) with check (trainer_ids && array(select app.my_staff_ids()));

create policy program_attendance_read on public.program_attendance for select to authenticated
  using (app.is_staff(studio_id) or app.is_self(member_id));
create policy program_attendance_join on public.program_attendance for insert to authenticated
  with check (app.is_desk(studio_id) or app.is_self(member_id));

create policy appointments_read on public.appointments for select to authenticated
  using (app.is_desk(studio_id) or handled_by in (select app.my_staff_ids()) or app.is_self(member_id));
create policy appointments_desk on public.appointments for all to authenticated
  using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy appointments_coach_update on public.appointments for update to authenticated
  using (handled_by in (select app.my_staff_ids())) with check (handled_by in (select app.my_staff_ids()));

create policy staff_attendance_read on public.staff_attendance for select to authenticated
  using (app.is_desk(studio_id) or staff_id in (select app.my_staff_ids()));
create policy staff_attendance_desk on public.staff_attendance for insert to authenticated with check (app.is_desk(studio_id));
create policy staff_attendance_desk_update on public.staff_attendance for update to authenticated
  using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy staff_attendance_owner_delete on public.staff_attendance for delete to authenticated using (app.is_owner(studio_id));

-- ---------------------------------------------------------------------------
-- The class timetable for a date range: every batch on the days it runs, with
-- that day's changes, bookings, waiting list and fixed members.
-- ---------------------------------------------------------------------------
create or replace function public.class_schedule(p_studio uuid, p_from date, p_to date)
returns table (batch_id uuid, class_date date, batch_code text, batch_name text, title text, info text, room text,
               start_time time, end_time time, trainer_ids uuid[], trainer_names text, service_ids uuid[],
               capacity int, gender text, days smallint[], booked int, waiting int, enrolled int, changed boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, g.d::date, b.batch_code, b.name, coalesce(cs.title, b.name), b.info, b.room,
    coalesce(cs.start_time, b.start_time), coalesce(cs.end_time, b.end_time), coalesce(cs.trainer_ids, b.trainer_ids),
    (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (coalesce(cs.trainer_ids, b.trainer_ids))),
    b.service_ids, b.capacity, b.gender, b.days,
    (select count(*) from public.class_bookings cb where cb.batch_id = b.id and cb.class_date = g.d::date
       and cb.status = 'booked' and cb.cancelled_at is null and cb.deleted_at is null)::int,
    (select count(*) from public.class_bookings cb where cb.batch_id = b.id and cb.class_date = g.d::date
       and cb.status = 'waiting' and cb.cancelled_at is null and cb.deleted_at is null)::int,
    (select count(*) from public.batch_members bm where bm.batch_id = b.id)::int,
    cs.batch_id is not null
  from public.batches b
  cross join generate_series(p_from, p_to, interval '1 day') g(d)
  left join public.class_sessions cs on cs.batch_id = b.id and cs.class_date = g.d::date
  where b.studio_id = p_studio and b.active and app.in_studio(p_studio) and p_to - p_from <= 92
    and extract(isodow from g.d)::smallint = any (b.days)
    and (b.start_date is null or b.start_date <= g.d::date) and (b.end_date is null or b.end_date >= g.d::date)
  order by g.d, coalesce(cs.start_time, b.start_time), b.name;
$$;

-- A client by id or by member / enquiry code, in a studio.
create or replace function app.client_by_ref(p_studio uuid, p jsonb)
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare m public.members; v_code text = upper(trim(coalesce(p->>'client_code', '')));
begin
  if nullif(p->>'member_id', '') is not null then
    select * into m from public.members where id = (p->>'member_id')::uuid and studio_id = p_studio and deleted_at is null;
  elsif v_code <> '' then
    select * into m from public.members
    where studio_id = p_studio and deleted_at is null and (upper(member_code) = v_code or upper(enquiry_code) = v_code)
    order by (upper(member_code) = v_code) desc nulls last limit 1;
  end if;
  if m.id is null then
    raise exception '%', case when v_code <> '' then 'No client with code ' || v_code else 'Choose the client' end;
  end if;
  return m;
end $$;

-- Book a client into a class. Staff (front desk, or the class's trainer) and the client themself can book.
-- When the class is full the booking goes on the waiting list.
create or replace function public.book_class(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.batches; m public.members; v_date date; v_today date; v_staff boolean; v_sub uuid; v_limit int;
        v_booked int; v_status text = 'booked'; v_id uuid; v_settings jsonb; v_start time;
begin
  select * into b from public.batches where id = (p->>'batch_id')::uuid;
  if b.id is null or not app.in_studio(b.studio_id) then raise exception 'Class not found'; end if;
  if not b.active then raise exception 'This batch is deactivated'; end if;
  v_staff = app.is_desk(b.studio_id) or app.coaches_batch(b.id);
  m = app.client_by_ref(b.studio_id, p);
  if not v_staff and not app.is_self(m.id) then raise exception 'You can only book your own classes'; end if;
  v_today = app.today(b.studio_id);
  v_date = coalesce(nullif(p->>'class_date', '')::date, v_today);
  if not (extract(isodow from v_date)::smallint = any (b.days))
     or (b.start_date is not null and v_date < b.start_date) or (b.end_date is not null and v_date > b.end_date) then
    raise exception 'This batch has no class on %', to_char(v_date, 'DD-Mon-YYYY');
  end if;
  if b.gender <> 'all' and m.gender is not null and m.gender <> b.gender then
    raise exception 'This batch is for % only', case b.gender when 'male' then 'men' else 'women' end;
  end if;
  if exists (select 1 from public.class_bookings cb where cb.batch_id = b.id and cb.member_id = m.id and cb.class_date = v_date
             and cb.cancelled_at is null and cb.deleted_at is null) then
    raise exception '% is already booked for this class', m.full_name;
  end if;
  select s.id, pl.weekly_class_limit into v_sub, v_limit
  from public.subscriptions s join public.plans pl on pl.id = s.plan_id
  where s.member_id = m.id and s.deleted_at is null and s.cancelled_at is null and s.status = 'live' and not s.mark_used
    and v_date between s.start_date and s.end_date
    and (cardinality(b.service_ids) = 0 or pl.service_ids && b.service_ids)
  order by (s.kind = 'trial'), s.end_date desc
  limit 1;
  if not v_staff then
    select s.settings->'booking' into v_settings from public.studios s where s.id = b.studio_id;
    select coalesce(cs.start_time, b.start_time) into v_start from (select 1) x
      left join public.class_sessions cs on cs.batch_id = b.id and cs.class_date = v_date;
    if v_date < v_today or (v_date = v_today and v_start <= (now() at time zone 'Asia/Kolkata')::time) then
      raise exception 'This class has already started';
    end if;
    if v_date > v_today + coalesce((v_settings->>'advance_days')::int, 7) then
      raise exception 'Classes can be booked up to % days ahead', coalesce((v_settings->>'advance_days')::int, 7);
    end if;
    if v_sub is null then raise exception 'No active membership covers this class'; end if;
    if exists (select 1 from public.freezes f where f.subscription_id = v_sub and f.status = 'approved' and v_date between f.start_date and f.end_date) then
      raise exception 'Your membership is frozen on that day';
    end if;
    if coalesce(v_limit, 0) > 0 and (select count(*) from public.class_bookings cb where cb.member_id = m.id
        and cb.cancelled_at is null and cb.deleted_at is null and cb.status in ('booked', 'waiting')
        and date_trunc('week', cb.class_date) = date_trunc('week', v_date)) >= v_limit then
      raise exception 'Your membership allows % classes a week', v_limit;
    end if;
  end if;
  select count(*) into v_booked from public.class_bookings cb
  where cb.batch_id = b.id and cb.class_date = v_date and cb.status = 'booked' and cb.cancelled_at is null and cb.deleted_at is null;
  if b.capacity is not null and v_booked >= b.capacity then
    if coalesce((p->>'waiting_list')::boolean, true) then v_status = 'waiting';
    else raise exception 'This class is full'; end if;
  end if;
  insert into public.class_bookings (studio_id, batch_id, member_id, subscription_id, class_date, status, source, booked_by)
  values (b.studio_id, b.id, m.id, v_sub, v_date, v_status,
          case when not v_staff then 'app' when p->>'source' = 'calendar' then 'calendar' else 'crm' end,
          case when v_staff then app.my_staff_id(b.studio_id) end)
  returning id into v_id;
  return v_id;
end $$;

-- Cancel bookings (client or staff). Clients must cancel before the studio's cut-off.
create or replace function public.cancel_class_bookings(p_ids uuid[], p_source text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare cb public.class_bookings; v_n int = 0; v_staff boolean; v_cut int; v_start timestamptz;
begin
  for cb in select * from public.class_bookings where id = any (p_ids) for update loop
    if cb.cancelled_at is not null or cb.deleted_at is not null then continue; end if;
    v_staff = app.is_desk(cb.studio_id) or app.coaches_batch(cb.batch_id);
    if not v_staff and not app.is_self(cb.member_id) then raise exception 'You can''t cancel this booking'; end if;
    if cb.attendance_id is not null then raise exception 'A class the client has checked in to can''t be cancelled'; end if;
    if not v_staff then
      select coalesce((s.settings->'booking'->>'cancel_cutoff_hours')::int, 2) into v_cut from public.studios s where s.id = cb.studio_id;
      select (cb.class_date + coalesce(cs.start_time, b.start_time)) at time zone 'Asia/Kolkata' into v_start
      from public.batches b left join public.class_sessions cs on cs.batch_id = b.id and cs.class_date = cb.class_date where b.id = cb.batch_id;
      if now() > v_start - make_interval(hours => v_cut) then
        raise exception 'Bookings can be cancelled up to % hours before the class', v_cut;
      end if;
    end if;
    update public.class_bookings set cancelled_at = now(), cancelled_by = case when v_staff then app.my_staff_id(cb.studio_id) end,
      cancel_source = coalesce(nullif(p_source, ''), case when v_staff then 'CRM' else 'Client App' end)
    where id = cb.id;
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

-- Delete bookings (front desk). They stay in the Deleted Class Register.
create or replace function public.delete_class_bookings(p_ids uuid[], p_source text default 'CRM')
returns int language plpgsql security definer set search_path = '' as $$
declare cb public.class_bookings; v_n int = 0;
begin
  for cb in select * from public.class_bookings where id = any (p_ids) for update loop
    if cb.deleted_at is not null then continue; end if;
    if not app.is_desk(cb.studio_id) then raise exception 'Only owner and front desk can delete bookings'; end if;
    update public.class_bookings set deleted_at = now(), deleted_by = app.my_staff_id(cb.studio_id),
      delete_source = coalesce(nullif(p_source, ''), 'CRM'), cancelled_at = null
    where id = cb.id;
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

-- Waiting list: approve (books the client) or reject.
create or replace function public.decide_waiting_list(p_ids uuid[], p_approve boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare cb public.class_bookings; v_n int = 0;
begin
  for cb in select * from public.class_bookings where id = any (p_ids) and cancelled_at is null and deleted_at is null for update loop
    if not (app.is_desk(cb.studio_id) or app.coaches_batch(cb.batch_id)) then raise exception 'You can''t change this booking'; end if;
    if cb.status <> 'waiting' then continue; end if;
    update public.class_bookings set status = case when p_approve then 'booked' else 'rejected' end, from_waiting_list = p_approve
    where id = cb.id;
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

-- Check clients in to a class (YDL "Mark Customer Attendance" › Check In). Booked clients'
-- bookings are marked attended; clients without a booking (batchwise) are checked in to the batch.
create or replace function public.class_check_in(p_batch uuid, p_date date, p_member_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare b public.batches; v_member uuid; v_att uuid; v_n int = 0; v_when timestamptz; v_start time; v_trainers uuid[];
begin
  select * into b from public.batches where id = p_batch;
  if b.id is null then raise exception 'Class not found'; end if;
  if not (app.is_desk(b.studio_id) or app.coaches_batch(b.id)) then raise exception 'Only staff can mark attendance'; end if;
  if p_date > app.today(b.studio_id) then raise exception 'Attendance can''t be marked for a future class'; end if;
  select coalesce(cs.start_time, b.start_time), coalesce(cs.trainer_ids, b.trainer_ids) into v_start, v_trainers
  from (select 1) x left join public.class_sessions cs on cs.batch_id = b.id and cs.class_date = p_date;
  v_when = case when p_date = app.today(b.studio_id) then now() else (p_date + v_start) at time zone 'Asia/Kolkata' end;
  foreach v_member in array p_member_ids loop
    if not exists (select 1 from public.members m where m.id = v_member and m.studio_id = b.studio_id and m.deleted_at is null) then
      raise exception 'Client not found';
    end if;
    select a.id into v_att from public.attendance a where a.member_id = v_member and a.date = p_date and a.batch_id = b.id;
    if v_att is null then
      insert into public.attendance (studio_id, member_id, batch_id, date, check_in, source, status, trainer_id, marked_by)
      values (b.studio_id, v_member, b.id, p_date, v_when, 'class', 'present', v_trainers[1], app.my_staff_id(b.studio_id))
      returning id into v_att;
      v_n = v_n + 1;
    end if;
    update public.class_bookings set attendance_id = v_att
    where batch_id = b.id and member_id = v_member and class_date = p_date and cancelled_at is null and deleted_at is null and status = 'booked';
  end loop;
  return v_n;
end $$;

-- Change one day's class: name, time and trainer (YDL "Edit Class" / "Class Details").
create or replace function public.save_class_session(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.batches; v_date date = (p->>'class_date')::date;
begin
  select * into b from public.batches where id = (p->>'batch_id')::uuid;
  if b.id is null or not app.is_desk(b.studio_id) then raise exception 'Only owner and front desk can change a class'; end if;
  if nullif(p->>'start_time', '') is not null and nullif(p->>'end_time', '') is not null
     and (p->>'end_time')::time <= (p->>'start_time')::time then
    raise exception 'The class should end after it starts';
  end if;
  insert into public.class_sessions (batch_id, class_date, studio_id, title, start_time, end_time, trainer_ids, updated_by)
  values (b.id, v_date, b.studio_id, nullif(trim(p->>'title'), ''), nullif(p->>'start_time', '')::time, nullif(p->>'end_time', '')::time,
          case when p ? 'trainer_ids' then array(select jsonb_array_elements_text(p->'trainer_ids'))::uuid[] end, app.my_staff_id(b.studio_id))
  on conflict (batch_id, class_date) do update set title = excluded.title, start_time = excluded.start_time, end_time = excluded.end_time,
    trainer_ids = excluded.trainer_ids, updated_by = excluded.updated_by, updated_at = now();
end $$;

-- Book or change an appointment. The client is found by member or enquiry code.
create or replace function public.save_appointment(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_studio uuid = (p->>'studio_id')::uuid; a public.appointments; m public.members; v_id uuid = nullif(p->>'id', '')::uuid;
        v_start time; v_end time; v_date date; v_staff uuid;
begin
  if v_id is not null then
    select * into a from public.appointments where id = v_id;
    if a.id is null then raise exception 'Appointment not found'; end if;
    v_studio = a.studio_id;
  end if;
  if not (app.is_desk(v_studio) or (a.id is not null and a.handled_by in (select app.my_staff_ids()))) then
    raise exception 'Only owner and front desk can book appointments';
  end if;
  if nullif(trim(p->>'title'), '') is null then raise exception 'Enter the title'; end if;
  v_start = nullif(p->>'start_time', '')::time; v_end = nullif(p->>'end_time', '')::time;
  if v_start is null or v_end is null then raise exception 'Enter the start and end time'; end if;
  if v_start >= v_end then raise exception 'Appointment start time should be less than end time'; end if;
  v_date = coalesce(nullif(p->>'appointment_date', '')::date, a.appointment_date);
  if v_date is null then raise exception 'Choose the appointment date'; end if;
  if a.id is null or p ? 'client_code' or p ? 'member_id' then m = app.client_by_ref(v_studio, p); else select * into m from public.members where id = a.member_id; end if;
  v_staff = case when p ? 'handled_by' then nullif(p->>'handled_by', '')::uuid else a.handled_by end;
  if v_staff is not null and not exists (select 1 from public.staff s where s.id = v_staff and s.studio_id = v_studio) then
    raise exception 'Choose who the appointment is with';
  end if;
  if a.id is null then
    insert into public.appointments (studio_id, title, batch_id, appointment_date, start_time, end_time, member_id, handled_by, room_no, status, notify_client)
    values (v_studio, trim(p->>'title'), nullif(p->>'batch_id', '')::uuid, v_date, v_start, v_end, m.id, v_staff,
            nullif(trim(p->>'room_no'), ''), coalesce(nullif(p->>'status', ''), 'open'), coalesce((p->>'notify_client')::boolean, true))
    returning id into v_id;
    if coalesce((p->>'notify_client')::boolean, true) then
      insert into public.notifications (studio_id, member_id, title, body, sent_by)
      values (v_studio, m.id, 'Appointment booked',
              trim(p->>'title') || ' on ' || to_char(v_date, 'DD Mon YYYY') || ' at ' || to_char(v_start, 'HH12:MI AM')
              || coalesce(' with ' || (select s.full_name from public.staff s where s.id = v_staff), '')
              || coalesce(', room ' || nullif(trim(p->>'room_no'), ''), '') || '.',
              app.my_staff_id(v_studio));
    end if;
  else
    update public.appointments set title = trim(p->>'title'), appointment_date = v_date, start_time = v_start, end_time = v_end,
      member_id = m.id, handled_by = v_staff,
      batch_id = case when p ? 'batch_id' then nullif(p->>'batch_id', '')::uuid else batch_id end,
      room_no = case when p ? 'room_no' then nullif(trim(p->>'room_no'), '') else room_no end,
      status = coalesce(nullif(p->>'status', ''), status)
    where id = a.id;
  end if;
  return v_id;
end $$;

-- Staff check in / out: front desk for anyone, or a staff member for themself.
create or replace function public.staff_check_in(p_staff uuid, p_out boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.staff; v_id uuid; v_today date;
begin
  select * into s from public.staff where id = p_staff and active;
  if s.id is null then raise exception 'Staff not found'; end if;
  if not (app.is_desk(s.studio_id) or s.id in (select app.my_staff_ids())) then raise exception 'You can only mark your own attendance'; end if;
  v_today = app.today(s.studio_id);
  if p_out then
    update public.staff_attendance set check_out = now()
    where id = (select a.id from public.staff_attendance a where a.staff_id = s.id and a.date = v_today and a.check_out is null
                order by a.check_in desc limit 1)
    returning id into v_id;
    if v_id is null then raise exception '% isn''t checked in', s.full_name; end if;
  else
    if exists (select 1 from public.staff_attendance a where a.staff_id = s.id and a.date = v_today and a.check_out is null) then
      raise exception '% is already checked in', s.full_name;
    end if;
    insert into public.staff_attendance (studio_id, staff_id, date, check_in, source, marked_by)
    values (s.studio_id, s.id, v_today, now(), case when s.id in (select app.my_staff_ids()) then 'app' else 'manual' end, app.my_staff_id(s.studio_id))
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- Staff & trainer attendance for a period: working days (the staff member's working days,
-- up to today), days present and days missed.
create or replace function public.staff_attendance_summary(p_studio uuid, p_group text, p_from date, p_to date)
returns table (staff_id uuid, staff_code text, full_name text, role text, working_days int, present_days int, missed_days int,
               first_in timestamptz, last_out timestamptz)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.staff_code, s.full_name, s.role::text,
    (select count(*) from generate_series(p_from, least(p_to, app.today(p_studio)), interval '1 day') g
      where extract(isodow from g)::smallint = any (s.working_days))::int,
    (select count(distinct a.date) from public.staff_attendance a where a.staff_id = s.id and a.date between p_from and p_to)::int,
    (select count(*) from generate_series(p_from, least(p_to, app.today(p_studio)), interval '1 day') g
      where extract(isodow from g)::smallint = any (s.working_days)
        and not exists (select 1 from public.staff_attendance a where a.staff_id = s.id and a.date = g::date))::int,
    (select min(a.check_in) from public.staff_attendance a where a.staff_id = s.id and a.date between p_from and p_to),
    (select max(a.check_out) from public.staff_attendance a where a.staff_id = s.id and a.date between p_from and p_to)
  from public.staff s
  where s.studio_id = p_studio and s.active and app.is_desk(p_studio)
    and case p_group when 'trainer' then s.role = 'coach' when 'staff' then s.role in ('owner', 'front_desk') else true end
  order by s.full_name;
$$;

-- Clients ranked by check-ins in a period (YDL "Check-ins Leaderboard").
create or replace function public.checkin_leaderboard(p_studio uuid, p_from date, p_to date)
returns table (member_id uuid, member_name text, client_code text, member_gender text, member_country_code text, member_phone text,
               member_email text, total int, latest_in timestamptz, latest_out timestamptz, live_status text, current_plan_name text,
               current_end_date date)
language sql stable security invoker set search_path = '' as $$
  with c as (
    select a.member_id, count(*)::int as total, max(a.check_in) as latest_in,
      (array_agg(a.check_out order by a.check_in desc))[1] as latest_out
    from public.attendance a
    where a.studio_id = p_studio and a.date between p_from and p_to and a.status = 'present'
    group by a.member_id
  )
  select c.member_id, mo.full_name, mo.client_code, mo.gender, mo.country_code, mo.phone, mo.email, c.total, c.latest_in, c.latest_out,
    mo.live_status, mo.current_plan_name, mo.current_end_date
  from c join public.member_overview mo on mo.id = c.member_id
  order by c.total desc, c.latest_in desc;
$$;

-- ---------------------------------------------------------------------------
-- Views for the lists and registers
-- ---------------------------------------------------------------------------
-- Paid or pending, for a bill (the same rule as subscription_overview). Coaches see it without seeing receipts.
create or replace function app.payment_status(p_sub uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when s.total_amount - coalesce(sum(case when x.status = 'paid' and x.kind in ('payment', 'write_off') then x.amount
                                                      when x.status = 'paid' and x.kind = 'refund' then -x.amount else 0 end), 0) <= 0.009
              then 'paid' else 'pending' end
  from public.subscriptions s left join public.payments x on x.subscription_id = s.id and x.purpose = 'subscription'
  where s.id = p_sub
  group by s.id, s.total_amount;
$$;
grant execute on function app.payment_status(uuid) to authenticated, service_role;

create view public.batch_overview with (security_invoker = true) as
select b.*,
  (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (b.trainer_ids)) as trainer_names,
  (select string_agg(coalesce(sv.custom_name, sv.name), ', ' order by sv.sort) from public.services sv where sv.id = any (b.service_ids)) as service_names,
  (select count(*) from public.batch_members bm where bm.batch_id = b.id)::int as member_count,
  exists (select 1 from public.class_bookings cb where cb.batch_id = b.id) or exists (select 1 from public.attendance a where a.batch_id = b.id)
    or exists (select 1 from public.subscriptions s where s.batch_id = b.id) as in_use
from public.batches b;

create view public.class_booking_overview with (security_invoker = true) as
select cb.*,
  m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.country_code as member_country_code,
  m.phone as member_phone, m.email as member_email, m.gender as member_gender,
  b.batch_code, b.name as batch_name, coalesce(cs.title, b.name) as class_name,
  coalesce(cs.start_time, b.start_time) as start_time, coalesce(cs.end_time, b.end_time) as end_time, b.days, b.service_ids,
  coalesce(cs.trainer_ids, b.trainer_ids) as trainer_ids,
  (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (coalesce(cs.trainer_ids, b.trainer_ids))) as trainer_names,
  (select string_agg(coalesce(sv.custom_name, sv.name), ', ' order by sv.sort) from public.services sv where sv.id = any (b.service_ids)) as service_names,
  p.name as plan_name, s.end_date as subscription_end_date, case when s.id is null then null else app.payment_status(s.id) end as payment_status,
  case when s.id is null then null else app.subscription_state(s) end as subscription_state,
  bb.full_name as booked_by_name, cbn.full_name as cancelled_by_name, dbn.full_name as deleted_by_name,
  a.check_in, a.check_out,
  case when cb.deleted_at is not null then 'deleted' when cb.cancelled_at is not null then 'cancelled'
       when cb.status = 'waiting' then 'pending' when cb.status = 'rejected' then 'rejected'
       when cb.from_waiting_list then 'approved' else 'booked' end as booking_state
from public.class_bookings cb
join public.members m on m.id = cb.member_id
join public.batches b on b.id = cb.batch_id
left join public.class_sessions cs on cs.batch_id = cb.batch_id and cs.class_date = cb.class_date
left join public.subscriptions s on s.id = cb.subscription_id
left join public.plans p on p.id = s.plan_id
left join public.staff bb on bb.id = cb.booked_by
left join public.staff cbn on cbn.id = cb.cancelled_by
left join public.staff dbn on dbn.id = cb.deleted_by
left join public.attendance a on a.id = cb.attendance_id;

create view public.class_feedback_overview with (security_invoker = true) as
select f.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code,
  b.name as batch_name, b.batch_code, b.service_ids, coalesce(cs.title, b.name) as class_name,
  coalesce(cs.trainer_ids, b.trainer_ids) as trainer_ids,
  (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (coalesce(cs.trainer_ids, b.trainer_ids))) as trainer_names,
  (select string_agg(coalesce(sv.custom_name, sv.name), ', ' order by sv.sort) from public.services sv where sv.id = any (b.service_ids)) as service_names
from public.class_feedback f
join public.members m on m.id = f.member_id
join public.batches b on b.id = f.batch_id
left join public.class_sessions cs on cs.batch_id = f.batch_id and cs.class_date = f.class_date;

-- Every check-in with the client, the batch and the plan (Client Attendance, Batchwise Attendance).
create view public.checkin_overview with (security_invoker = true) as
select a.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.country_code as member_country_code,
  m.phone as member_phone, m.email as member_email, m.gender as member_gender, m.level as member_level, m.photo_url as member_photo,
  case when m.date_of_birth is null then null else extract(year from age(a.date, m.date_of_birth))::int end as member_age,
  extract(hour from a.check_in at time zone st.timezone)::int as checkin_hour,
  b.name as batch_name, b.batch_code, b.service_ids as batch_service_ids,
  (select string_agg(x.full_name, ', ' order by x.full_name) from public.staff x where x.id = any (b.trainer_ids)) as conducted_by,
  (select string_agg(coalesce(sv.custom_name, sv.name), ', ' order by sv.sort) from public.services sv where sv.id = any (b.service_ids)) as batch_service_names,
  p.id as plan_id, p.name as plan_name, p.service_ids as plan_service_ids, s.end_date as subscription_end_date,
  case when s.id is null then null else app.payment_status(s.id) end as payment_status,
  case when s.id is null then null else app.subscription_state(s) end as subscription_state,
  tr.full_name as trainer_name
from public.attendance a
join public.members m on m.id = a.member_id
join public.studios st on st.id = a.studio_id
left join public.batches b on b.id = a.batch_id
left join public.subscriptions s on s.id = a.subscription_id
left join public.plans p on p.id = s.plan_id
left join public.staff tr on tr.id = a.trainer_id;

create view public.program_overview with (security_invoker = true) as
select pr.*,
  (select string_agg(st.full_name, ', ' order by st.full_name) from public.staff st where st.id = any (pr.trainer_ids)) as trainer_names,
  (select count(*) from public.program_attendance pa where pa.program_id = pr.id)::int as attendance_count
from public.programs pr;

create view public.program_attendance_overview with (security_invoker = true) as
select pa.*, pr.name as program_name, pr.meeting_link, pr.start_time, pr.end_time,
  m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.country_code as member_country_code,
  m.phone as member_phone, m.gender as member_gender
from public.program_attendance pa
join public.programs pr on pr.id = pa.program_id
join public.members m on m.id = pa.member_id;

create view public.appointment_overview with (security_invoker = true) as
select ap.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.kind as member_kind,
  m.country_code as member_country_code, m.phone as member_phone,
  h.full_name as handled_by_name, h.photo_url as handled_by_photo, cb.full_name as created_by_name,
  b.name as batch_name
from public.appointments ap
join public.members m on m.id = ap.member_id
left join public.staff h on h.id = ap.handled_by
left join public.staff cb on cb.id = ap.created_by
left join public.batches b on b.id = ap.batch_id;

create view public.staff_attendance_overview with (security_invoker = true) as
select sa.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, mb.full_name as marked_by_name
from public.staff_attendance sa
join public.staff s on s.id = sa.staff_id
left join public.staff mb on mb.id = sa.marked_by;

-- ---------------------------------------------------------------------------
-- Public pictures (batch banners; gallery and banners later): "studio-media" bucket,
-- readable by the apps, written by owner and front desk. Paths: <studio>/<folder>/<file>.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('studio-media', 'studio-media', true) on conflict (id) do nothing;
  execute $p$ drop policy if exists studio_media_write on storage.objects $p$;
  execute $p$ create policy studio_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'studio-media' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists studio_media_update on storage.objects $p$;
  execute $p$ create policy studio_media_update on storage.objects for update to authenticated
    using (bucket_id = 'studio-media' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists studio_media_delete on storage.objects $p$;
  execute $p$ create policy studio_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'studio-media' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
end $$;

-- ---------------------------------------------------------------------------
-- Grants: bookings change only through the functions above.
-- ---------------------------------------------------------------------------
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
  revoke insert, update, delete on public.activity_log, public.receipt_changes, public.member_medical,
    public.attendance_deletions, public.class_bookings from authenticated;
end $$;
call app.apply_grants();
$u20261008000009$;
  insert into app.schema_migrations (version) values ('20261008000009_classes');
end $bu20261008000009$;

-- ===== 20261009000010_team =====
do $bu20261009000010$ begin
  if exists (select 1 from app.schema_migrations where version = '20261009000010_team') then raise notice 'already has 20261009000010_team'; return; end if;
  execute $u20261009000010$
-- Shaan Fitness app · 10. Team: staff, trainers, access control, targets, payroll; coupons and combo offers
-- YDL "Staff" (accounts, access control, targets), "Trainers" (trainers, client transformations,
-- leave requests), "Accounts › Payroll", "Memberships › Coupon / Combo Offer", holidays for payroll.

-- ---------------------------------------------------------------------------
-- Staff: YDL employee type (drives access control), shift time for late marks
-- ---------------------------------------------------------------------------
alter table public.staff
  add column access_type text check (access_type in
    ('owner', 'manager', 'floor_manager', 'admin', 'sales', 'front_desk_exec', 'helper', 'sales_manager', 'hr')),
  add column shift_start time,
  add column shift_end time,
  add column deleted_at timestamptz;
update public.staff set access_type = case role when 'owner' then 'owner' when 'front_desk' then 'front_desk_exec' end
where access_type is null and role in ('owner', 'front_desk');
-- One account per email and kind (the owner can also be a trainer with the same email).
create unique index staff_email_role_uq on public.staff (studio_id, lower(email), role) where deleted_at is null and email is not null;

-- YDL staff designations (an editable dropdown list).
insert into public.list_items (studio_id, list, label, sort)
select s.id, 'staff_designation', d.label, d.sort
from public.studios s cross join (values ('Sales Head', 1), ('Sales Executive', 2), ('Housekeeping', 3), ('Security', 4), ('Valet', 5),
  ('Team Owner', 6), ('Score Keeper', 7)) as d(label, sort)
where not exists (select 1 from public.list_items x where x.studio_id = s.id and x.list = 'staff_designation');

-- ---------------------------------------------------------------------------
-- Access control (YDL "Staff Accounts Access Control"): what each employee type may do.
-- Stored in studios.settings.access_control; until the owner saves it, Shaan Fitness's
-- own YDL settings (read on 9 Oct 2026) apply. The owner can always do everything.
-- ---------------------------------------------------------------------------
create or replace function app.default_access_control()
returns jsonb language sql immutable as $acl$ select '{"manager":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","bill_rep","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"floor_manager":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"front_desk_exec":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","upgrade","freeze","billing_screen","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"sales":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"helper":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"sales_manager":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"admin":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"hr":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"nav_off":{"admin":["Traffic Analysis","Members Analysis","Enquiry FollowUp Stage Analysis","Collection Analysis","Subscriptions Analysis","Renewal Analysis","Follow up Analysis","Conversion Analysis","Enquiry Analysis","Enquiry Conversion Report","Expense Analysis","Profit & Loss Analysis","Billing Analysis","Sales Leaderboard","Daily Collection Analysis","PT Analysis","Leaderboard","Revenue Forecast","Weight Loss Analysis","Lead Source Analysis","Collection Report","Receipt Register","Subscriptions Register","Cash Register","Session Register","Recorded Session Register","Deleted Session Register","Coupon Code Register","Expired Membership Register","Expired Session Register","Balance Due Register","TAX Register","Write Off Register","Deleted Subscription Register","Trial Register","Cancel Subscription Register","Transfer Register","Freeze Register","Upgrade Register","Extension Register","Downgrade Register","Course Orders","Receipt Register Log","Recurring Payments Register","Classes Point deduction on Booking"],"hr":["Traffic Analysis","Members Analysis","Enquiry FollowUp Stage Analysis","Collection Analysis","Subscriptions Analysis","Renewal Analysis","Follow up Analysis","Conversion Analysis","Enquiry Analysis","Enquiry Conversion Report","Expense Analysis","Profit & Loss Analysis","Billing Analysis","Sales Leaderboard","Daily Collection Analysis","PT Analysis","Leaderboard","Revenue Forecast","Weight Loss Analysis","Lead Source Analysis","Collection Report","Receipt Register","Subscriptions Register","Cash Register","Session Register","Recorded Session Register","Deleted Session Register","Coupon Code Register","Expired Membership Register","Expired Session Register","Balance Due Register","TAX Register","Write Off Register","Deleted Subscription Register","Trial Register","Cancel Subscription Register","Transfer Register","Freeze Register","Upgrade Register","Extension Register","Downgrade Register","Course Orders","Receipt Register Log","Recurring Payments Register","Classes Point deduction on Booking"]}}'::jsonb $acl$;

create or replace function app.access_control(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select s.settings->'access_control' from public.studios s where s.id = p_studio), app.default_access_control());
$$;

-- True when the signed-in person may do p_sub of p_key ('on' for single switches).
create or replace function app.can(p_studio uuid, p_key text, p_sub text default 'on')
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_owner(p_studio) or exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.deleted_at is null and s.role = 'front_desk'
      and coalesce(app.access_control(p_studio) -> coalesce(s.access_type, 'front_desk_exec') -> p_key, '[]'::jsonb) ? p_sub
  );
$$;

create or replace function app.require(p_studio uuid, p_key text, p_sub text, p_what text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.can(p_studio, p_key, p_sub) then raise exception 'You don''t have permission to %. Ask the owner (Staff › Staff Access Control).', p_what; end if;
end $$;

-- The signed-in staff member's rights, for the app to show or hide pages and buttons.
create or replace function public.my_access(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when app.is_owner(p_studio) then jsonb_build_object('owner', true)
    else jsonb_build_object('owner', false, 'type', s.access_type,
      'rights', coalesce(app.access_control(p_studio) -> coalesce(s.access_type, 'front_desk_exec'), '{}'::jsonb),
      'nav_off', coalesce(app.access_control(p_studio) -> 'nav_off' -> coalesce(s.access_type, 'front_desk_exec'), '[]'::jsonb))
  end
  from (select 1) x left join public.staff s
    on s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.deleted_at is null and s.role = 'front_desk';
$$;

-- The owner saves the matrix.
create or replace function public.save_access_control(p_studio uuid, p_acl jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change access control'; end if;
  if jsonb_typeof(p_acl) <> 'object' then raise exception 'Access control must be an object'; end if;
  update public.studios set settings = jsonb_set(settings, '{access_control}', p_acl, true) where id = p_studio;
end $$;

grant execute on function app.default_access_control(), app.access_control(uuid), app.can(uuid, text, text),
  app.require(uuid, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Plans, coupons, combo offers, batches, programs follow access control
-- ---------------------------------------------------------------------------
drop policy plans_owner on public.plans;
create policy plans_add on public.plans for insert to authenticated with check (app.can(studio_id, 'plans', 'add'));
create policy plans_edit on public.plans for update to authenticated using (app.can(studio_id, 'plans', 'edit')) with check (app.can(studio_id, 'plans', 'edit'));
create policy plans_delete on public.plans for delete to authenticated using (app.can(studio_id, 'plans', 'delete'));

drop policy coupons_owner on public.coupons;
create policy coupons_manage on public.coupons for all to authenticated using (app.can(studio_id, 'coupons')) with check (app.can(studio_id, 'coupons'));
create trigger coupons_created_by before insert on public.coupons for each row execute function app.fill_created_by();
alter table public.coupons add constraint coupons_name_check check (length(trim(name)) > 0),
  add constraint coupons_code_check check (code ~ '^[A-Za-z0-9_-]{2,30}$');
create unique index coupons_code_ci on public.coupons (studio_id, upper(code));

alter table public.combo_offers add column plan_prices jsonb not null default '{}'::jsonb;
alter table public.combo_offers add constraint combo_offers_name_check check (length(trim(name)) > 0);
drop policy combos_owner on public.combo_offers;
create policy combos_manage on public.combo_offers for all to authenticated using (app.can(studio_id, 'plans', 'add')) with check (app.can(studio_id, 'plans', 'add'));
create trigger combo_offers_created_by before insert on public.combo_offers for each row execute function app.fill_created_by();

drop policy batches_desk on public.batches;
create policy batches_add on public.batches for insert to authenticated with check (app.can(studio_id, 'batches', 'add'));
create policy batches_edit on public.batches for update to authenticated
  using (app.can(studio_id, 'batches', 'edit') or app.can(studio_id, 'batches', 'activate'))
  with check (app.can(studio_id, 'batches', 'edit') or app.can(studio_id, 'batches', 'activate'));
create policy batches_delete on public.batches for delete to authenticated using (app.can(studio_id, 'batches', 'delete'));

drop policy programs_desk on public.programs;
create policy programs_add on public.programs for insert to authenticated with check (app.can(studio_id, 'programs', 'add'));
create policy programs_edit on public.programs for update to authenticated using (app.can(studio_id, 'programs', 'edit')) with check (app.can(studio_id, 'programs', 'edit'));
create policy programs_delete on public.programs for delete to authenticated using (app.can(studio_id, 'programs', 'delete'));

-- ---------------------------------------------------------------------------
-- Staff and trainer accounts
-- ---------------------------------------------------------------------------
drop policy staff_owner_insert on public.staff;
drop policy staff_owner_update on public.staff;
create policy staff_desk_insert on public.staff for insert to authenticated with check (app.is_desk(studio_id));
create policy staff_desk_update on public.staff for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

-- Who may add or change which account. Runs as the caller, so the database's own
-- functions (which check rights themselves) are not stopped here.
create or replace function app.guard_staff()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user::text <> 'authenticated' or app.is_owner(new.studio_id) then return new; end if;
  if new.role in ('owner', 'doctor') or new.access_type = 'owner' or (tg_op = 'UPDATE' and old.role in ('owner', 'doctor')) then
    raise exception 'Only the owner can add or change owner and doctor accounts';
  end if;
  if tg_op = 'INSERT' then
    perform app.require(new.studio_id, case when new.role = 'coach' then 'trainers' else 'staff_accounts' end, 'add',
      case when new.role = 'coach' then 'add trainers' else 'add staff accounts' end);
    if new.user_id is not null then raise exception 'Logins are linked automatically'; end if;
  else
    perform app.require(new.studio_id, case when new.role = 'coach' then 'trainers' else 'staff_accounts' end, 'edit',
      case when new.role = 'coach' then 'edit trainers' else 'edit staff accounts' end);
    if new.user_id is distinct from old.user_id then raise exception 'Logins are linked automatically'; end if;
    if old.user_id = (select auth.uid()) and (new.permissions is distinct from old.permissions or new.access_type is distinct from old.access_type
        or new.role is distinct from old.role or new.active is distinct from old.active) then
      raise exception 'You can''t change your own access';
    end if;
    if new.role is distinct from old.role then raise exception 'A staff account can''t become a trainer (add a trainer instead)'; end if;
  end if;
  return new;
end $$;
create trigger staff_guard before insert or update on public.staff for each row execute function app.guard_staff();

-- Link a login that already exists (same email or mobile) to a staff record.
create or replace function public.link_staff_login(p_staff uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s public.staff; v_user uuid;
begin
  select * into s from public.staff where id = p_staff;
  if s.id is null or not app.is_desk(s.studio_id) then raise exception 'Staff not found'; end if;
  if s.user_id is not null then return true; end if;
  select u.id into v_user from auth.users u
  where (s.email is not null and lower(u.email) = lower(s.email))
     or (u.phone is not null and (app.same_phone(s.country_code || coalesce(s.phone, ''), u.phone) or app.same_phone(s.phone, u.phone)))
  order by u.created_at limit 1;
  if v_user is null then return false; end if;
  update public.staff set user_id = v_user where id = s.id;
  return true;
end $$;

-- Manual check-in and check-out times (YDL "Add Check In & Check Out Time").
create or replace function public.staff_add_time(p_staff uuid, p_in timestamptz, p_out timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.staff; v_id uuid; v_tz text;
begin
  select * into s from public.staff where id = p_staff and deleted_at is null;
  if s.id is null then raise exception 'Staff not found'; end if;
  perform app.require(s.studio_id, case when s.role = 'coach' then 'trainers' else 'staff_accounts' end, 'view', 'mark attendance');
  if p_in is null then raise exception 'Enter the check in date and time'; end if;
  if p_out is not null and p_out < p_in then raise exception 'Check out is before check in'; end if;
  if p_in > now() + interval '5 minutes' then raise exception 'Check in can''t be in the future'; end if;
  select st.timezone into v_tz from public.studios st where st.id = s.studio_id;
  insert into public.staff_attendance (studio_id, staff_id, date, check_in, check_out, source, marked_by)
  values (s.studio_id, s.id, (p_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::date, p_in, p_out, 'manual', app.my_staff_id(s.studio_id))
  returning id into v_id;
  return v_id;
end $$;

-- Delete a trainer or staff account, moving their clients and work to someone else first
-- (YDL "Delete & Migrate"). The record is kept, marked deleted, so old bills keep the name.
create or replace function public.delete_staff(p_staff uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.staff; t public.staff;
begin
  select * into s from public.staff where id = p_staff and deleted_at is null;
  if s.id is null then raise exception 'Staff not found'; end if;
  if not app.is_owner(s.studio_id) then raise exception 'Only the owner can delete trainers and staff'; end if;
  if s.role = 'owner' and (select count(*) from public.staff x where x.studio_id = s.studio_id and x.role = 'owner' and x.active and x.deleted_at is null) <= 1 then
    raise exception 'The last owner can''t be deleted';
  end if;
  if s.user_id = (select auth.uid()) and s.role = 'owner' then raise exception 'You can''t delete your own owner account'; end if;
  if p_to is not null then
    select * into t from public.staff where id = p_to and studio_id = s.studio_id and active and deleted_at is null;
    if t.id is null or t.id = s.id then raise exception 'Choose who takes over'; end if;
    update public.members set trainer_id = t.id where trainer_id = s.id;
    update public.members set added_by = t.id where added_by = s.id;
    update public.subscriptions set trainer_id = t.id where trainer_id = s.id and status = 'live' and deleted_at is null and cancelled_at is null;
    update public.subscriptions set client_rep_id = t.id where client_rep_id = s.id and status = 'live' and deleted_at is null and cancelled_at is null;
    update public.batches set trainer_ids = array_append(array_remove(trainer_ids, s.id), t.id) where s.id = any (trainer_ids) and not (t.id = any (trainer_ids));
    update public.batches set trainer_ids = array_remove(trainer_ids, s.id) where s.id = any (trainer_ids);
    update public.programs set trainer_ids = array_append(array_remove(trainer_ids, s.id), t.id) where s.id = any (trainer_ids) and not (t.id = any (trainer_ids));
    update public.programs set trainer_ids = array_remove(trainer_ids, s.id) where s.id = any (trainer_ids);
    update public.follow_ups set assigned_to = t.id where assigned_to = s.id and status = 'open';
    update public.appointments set handled_by = t.id where handled_by = s.id and appointment_date >= app.today(s.studio_id) and status = 'open';
    update public.care_team set staff_id = t.id where staff_id = s.id
      and not exists (select 1 from public.care_team c2 where c2.member_id = care_team.member_id and c2.staff_id = t.id);
  end if;
  update public.staff set active = false, deleted_at = now(), user_id = null where id = s.id;
end $$;

-- ---------------------------------------------------------------------------
-- Client transformations (shown in the member app). Clients' consent is required.
-- ---------------------------------------------------------------------------
create table public.transformations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  image_url text,
  client_name text not null check (length(trim(client_name)) > 0),
  member_id uuid references public.members(id) on delete set null,
  period_value int not null check (period_value > 0),
  period_unit text not null default 'months' check (period_unit in ('days', 'weeks', 'months', 'years')),
  trainer_id uuid references public.staff(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  consent boolean not null default false check (consent),
  show_in_app boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index transformations_studio_idx on public.transformations (studio_id, created_at desc);
create trigger transformations_created_by before insert on public.transformations for each row execute function app.fill_created_by();
create trigger transformations_log after update or delete on public.transformations for each row execute function app.log_activity();

-- ---------------------------------------------------------------------------
-- Leave requests (YDL "Trainer Leave Requests")
-- ---------------------------------------------------------------------------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  mode text not null default 'full' check (mode in ('full', 'morning_half', 'evening_half')),
  days numeric(5,1) generated always as ((end_date - start_date + 1) * case when mode = 'full' then 1 else 0.5 end) stored,
  paid boolean,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  cancelled boolean not null default false,
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index leave_requests_studio_idx on public.leave_requests (studio_id, start_date);
create trigger leave_requests_log after update or delete on public.leave_requests for each row execute function app.log_activity();

create or replace function public.decide_leave(p_ids uuid[], p_status text, p_paid boolean default null)
returns int language plpgsql security definer set search_path = '' as $$
declare l public.leave_requests; v_n int = 0;
begin
  if p_status not in ('approved', 'rejected') then raise exception 'Approve or reject'; end if;
  for l in select * from public.leave_requests where id = any (p_ids) for update loop
    perform app.require(l.studio_id, 'trainers', 'leave', 'decide leave requests');
    if l.cancelled then continue; end if;
    update public.leave_requests set status = p_status, paid = case when p_status = 'approved' then coalesce(p_paid, false) end,
      decided_by = app.my_staff_id(l.studio_id), decided_at = now() where id = l.id;
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.cancel_leave(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.leave_requests;
begin
  select * into l from public.leave_requests where id = p_id;
  if l.id is null or not (l.staff_id in (select app.my_staff_ids()) or app.can(l.studio_id, 'trainers', 'leave')) then raise exception 'Leave request not found'; end if;
  update public.leave_requests set cancelled = true where id = l.id;
end $$;

-- ---------------------------------------------------------------------------
-- Staff/Trainer targets with up to five commission slabs (YDL "Staff/Trainer Target")
-- ---------------------------------------------------------------------------
create table public.staff_targets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  year smallint not null check (year between 2020 and 2100),
  month smallint not null check (month between 1 and 12),
  target_type text check (target_type in ('pt', 'general', 'both', 'new_pt', 'new_general', 'renew_pt', 'renew_general')),
  commission_type text check (commission_type in ('flat', 'percentage')),
  tiers jsonb not null default '[]'::jsonb check (jsonb_typeof(tiers) = 'array' and jsonb_array_length(tiers) between 1 and 5),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index staff_targets_once on public.staff_targets (staff_id, year, month, coalesce(target_type, ''));
create trigger staff_targets_created_by before insert on public.staff_targets for each row execute function app.fill_created_by();
create trigger staff_targets_log after update or delete on public.staff_targets for each row execute function app.log_activity();

-- Sales that count for a target: bills where the person is the bill rep or the trainer, that month.
create or replace function app.target_sales(t public.staff_targets)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(s.net_amount), 0)
  from public.subscriptions s
  where s.studio_id = t.studio_id and s.deleted_at is null and s.cancelled_at is null and s.kind in ('gym', 'pt')
    and s.invoice_date >= make_date(t.year, t.month, 1) and s.invoice_date < (make_date(t.year, t.month, 1) + interval '1 month')::date
    and (s.bill_rep_id = t.staff_id or s.trainer_id = t.staff_id)
    and case t.target_type
      when 'pt' then s.kind = 'pt' when 'general' then s.kind = 'gym'
      when 'new_pt' then s.kind = 'pt' and not s.is_renewal when 'new_general' then s.kind = 'gym' and not s.is_renewal
      when 'renew_pt' then s.kind = 'pt' and s.is_renewal when 'renew_general' then s.kind = 'gym' and s.is_renewal
      else true end;
$$;

create view public.target_overview with (security_invoker = true) as
select t.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, cb.full_name as created_by_name,
  ach.sales as achieved,
  (select max(i) from generate_series(1, jsonb_array_length(t.tiers)) i where ach.sales >= (t.tiers -> (i - 1) ->> 'target')::numeric) as tier_reached,
  coalesce((select case t.commission_type
      when 'percentage' then round(ach.sales * coalesce((t.tiers -> (i - 1) ->> 'commission')::numeric, 0) / 100, 2)
      else coalesce((t.tiers -> (i - 1) ->> 'commission')::numeric, 0) end
    from generate_series(1, jsonb_array_length(t.tiers)) i where ach.sales >= (t.tiers -> (i - 1) ->> 'target')::numeric
    order by i desc limit 1), 0) as commission_earned
from public.staff_targets t
join public.staff s on s.id = t.staff_id
left join public.staff cb on cb.id = t.created_by
cross join lateral (select app.target_sales(t) as sales) ach;

-- ---------------------------------------------------------------------------
-- Holidays (YDL "Fitness Center Holiday"; payroll counts declared holidays)
-- ---------------------------------------------------------------------------
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  event_date date not null,
  title text not null check (length(trim(title)) > 0),
  holiday_type text,
  audience text not null default 'customer',
  is_holiday boolean not null default true,
  send_wish boolean not null default false,
  wish_text text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index holidays_studio_idx on public.holidays (studio_id, event_date);
create trigger holidays_created_by before insert on public.holidays for each row execute function app.fill_created_by();

-- ---------------------------------------------------------------------------
-- Payroll (YDL "Payroll Calculator" and "Payroll Register")
-- ---------------------------------------------------------------------------
create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  paid_date date not null,
  paid_days numeric(5,1) not null default 0,
  present_days int not null default 0,
  absent_days numeric(5,1) not null default 0,
  late_days int not null default 0,
  paid_leaves numeric(5,1) not null default 0,
  holidays int not null default 0,
  basic_salary numeric(12,2) not null default 0,
  pt_commission numeric(12,2) not null default 0,
  sales_commission numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  deduction numeric(12,2) not null default 0,
  payable numeric(12,2) not null default 0,
  mode text,
  expense_id uuid references public.expenses(id) on delete set null,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index payroll_entries_studio_idx on public.payroll_entries (studio_id, from_date);
create trigger payroll_entries_log after update or delete on public.payroll_entries for each row execute function app.log_activity();

-- Everyone's pay for a period from attendance, leave, holidays, targets and pay settings.
-- Per-day rate = monthly pay ÷ calendar days in the period (weekly pay ÷ 7; daily pay as is).
create or replace function public.payroll_calculate(p_studio uuid, p_from date, p_to date)
returns table (staff_id uuid, full_name text, staff_code text, role text, pay_per text, basic_pay numeric, calendar_days int,
               working_days int, holidays int, present_days int, paid_leaves numeric, unpaid_leaves numeric, absent_days numeric,
               late_days int, paid_days numeric, basic_salary numeric, pt_commission numeric, sales_commission numeric,
               deduction numeric, payable numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_to date; v_tz text; v_tgrace int; v_sgrace int;
begin
  perform app.require(p_studio, 'payroll', 'view_calculator', 'see the payroll calculator');
  if p_to < p_from or p_to - p_from > 62 then raise exception 'Choose a period of up to two months'; end if;
  v_to = least(p_to, app.today(p_studio));
  select st.timezone, coalesce((st.settings->'payroll'->>'trainer_grace_minutes')::int, 0), coalesce((st.settings->'payroll'->>'staff_grace_minutes')::int, 0)
    into v_tz, v_tgrace, v_sgrace from public.studios st where st.id = p_studio;
  return query
  with base as (
    select s.*, coalesce(sp.basic_pay, 0) as pay, coalesce(sp.pay_per, 'month') as per, coalesce(sp.deduct_for_absent, false) as deduct,
      coalesce(sp.late_penalty, 0) as penalty
    from public.staff s left join public.staff_payroll sp on sp.staff_id = s.id
    where s.studio_id = p_studio and s.active and s.deleted_at is null and s.role in ('owner', 'front_desk', 'coach')
      and (s.role <> 'owner' or coalesce(sp.basic_pay, 0) > 0)
  ), calc as (
    select b.*,
      (p_to - p_from + 1) as cal,
      (select count(*) from generate_series(p_from, v_to, interval '1 day') g where extract(isodow from g)::smallint = any (b.working_days)
         and exists (select 1 from public.holidays h where h.studio_id = p_studio and h.active and h.is_holiday and h.event_date = g::date))::int as hol,
      (select count(*) from generate_series(p_from, v_to, interval '1 day') g where extract(isodow from g)::smallint = any (b.working_days)
         and not exists (select 1 from public.holidays h where h.studio_id = p_studio and h.active and h.is_holiday and h.event_date = g::date))::int as work,
      (select count(distinct a.date) from public.staff_attendance a where a.staff_id = b.id and a.date between p_from and v_to)::int as present,
      (select coalesce(sum((least(l.end_date, v_to) - greatest(l.start_date, p_from) + 1) * case when l.mode = 'full' then 1 else 0.5 end), 0)
         from public.leave_requests l where l.staff_id = b.id and l.status = 'approved' and not l.cancelled and l.paid
           and l.start_date <= v_to and l.end_date >= p_from) as pleave,
      (select coalesce(sum((least(l.end_date, v_to) - greatest(l.start_date, p_from) + 1) * case when l.mode = 'full' then 1 else 0.5 end), 0)
         from public.leave_requests l where l.staff_id = b.id and l.status = 'approved' and not l.cancelled and not coalesce(l.paid, false)
           and l.start_date <= v_to and l.end_date >= p_from) as uleave,
      (select count(*) from (select a.date, min(a.check_in) as first_in from public.staff_attendance a
          where a.staff_id = b.id and a.date between p_from and v_to group by a.date) d
        where b.shift_start is not null
          and (d.first_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::time
              > b.shift_start + make_interval(mins => case when b.role = 'coach' then v_tgrace else v_sgrace end))::int as late,
      (select coalesce(sum(o.commission_earned), 0) from public.target_overview o where o.staff_id = b.id
         and make_date(o.year, o.month, 1) between date_trunc('month', p_from)::date and p_to and o.target_type in ('pt', 'new_pt', 'renew_pt')) as ptc,
      (select coalesce(sum(o.commission_earned), 0) from public.target_overview o where o.staff_id = b.id
         and make_date(o.year, o.month, 1) between date_trunc('month', p_from)::date and p_to and (o.target_type is null or o.target_type not in ('pt', 'new_pt', 'renew_pt'))) as salesc
    from base b
  ), fin as (
    select c.*, greatest(c.work - c.present - c.pleave, 0)::numeric as absent,
      case c.per when 'day' then c.pay when 'week' then c.pay / 7 else c.pay / greatest(c.cal, 1) end as per_day
    from calc c
  )
  select f.id, f.full_name, f.staff_code, f.role::text, f.per, f.pay, f.cal, f.work, f.hol, f.present, f.pleave, f.uleave, f.absent, f.late,
    (f.cal - f.absent)::numeric,
    round(case f.per when 'day' then f.pay * (f.present + f.pleave + f.hol) when 'week' then f.pay * f.cal / 7.0 else f.pay end, 2),
    round(f.ptc, 2), round(f.salesc, 2),
    round(case when f.per <> 'day' and f.deduct then f.per_day * f.absent else 0 end + f.penalty * f.late, 2),
    round(case f.per when 'day' then f.pay * (f.present + f.pleave + f.hol) when 'week' then f.pay * f.cal / 7.0 else f.pay end
      + f.ptc + f.salesc - (case when f.per <> 'day' and f.deduct then f.per_day * f.absent else 0 end + f.penalty * f.late), 2)
  from fin f
  order by f.role <> 'owner', f.full_name;
end $$;

-- Save calculated pay into the Payroll Register (and, if asked, as a Salary expense).
--   p: {from_date, to_date, paid_date, mode, as_expense, rows: [{staff_id, ...numbers, bonus, note}]}
create or replace function public.add_payroll(p_studio uuid, p jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_n int = 0; v_exp uuid; v_name text; v_pay numeric;
begin
  perform app.require(p_studio, 'payroll', 'add', 'add to the payroll register');
  for r in select * from jsonb_array_elements(p->'rows') loop
    select s.full_name into v_name from public.staff s where s.id = (r->>'staff_id')::uuid and s.studio_id = p_studio;
    if v_name is null then raise exception 'Staff not found'; end if;
    v_pay = coalesce((r->>'payable')::numeric, 0);
    v_exp = null;
    if coalesce((p->>'as_expense')::boolean, false) and v_pay > 0 then
      insert into public.expenses (studio_id, title, category, expense_date, payment_type, amount, gst_amount, final_amount, note, created_by)
      values (p_studio, 'Salary · ' || v_name || ' · ' || to_char((p->>'from_date')::date, 'Mon YYYY'), 'Salary',
              coalesce(nullif(p->>'paid_date', '')::date, app.today(p_studio)), coalesce(nullif(p->>'mode', ''), 'CASH'), v_pay, 0, v_pay,
              nullif(r->>'note', ''), app.my_staff_id(p_studio))
      returning id into v_exp;
    end if;
    insert into public.payroll_entries (studio_id, staff_id, from_date, to_date, paid_date, paid_days, present_days, absent_days, late_days,
      paid_leaves, holidays, basic_salary, pt_commission, sales_commission, bonus, deduction, payable, mode, expense_id, note, created_by)
    values (p_studio, (r->>'staff_id')::uuid, (p->>'from_date')::date, (p->>'to_date')::date, coalesce(nullif(p->>'paid_date', '')::date, app.today(p_studio)),
      coalesce((r->>'paid_days')::numeric, 0), coalesce((r->>'present_days')::int, 0), coalesce((r->>'absent_days')::numeric, 0),
      coalesce((r->>'late_days')::int, 0), coalesce((r->>'paid_leaves')::numeric, 0), coalesce((r->>'holidays')::int, 0),
      coalesce((r->>'basic_salary')::numeric, 0), coalesce((r->>'pt_commission')::numeric, 0), coalesce((r->>'sales_commission')::numeric, 0),
      coalesce((r->>'bonus')::numeric, 0), coalesce((r->>'deduction')::numeric, 0), v_pay, nullif(p->>'mode', ''), v_exp, nullif(r->>'note', ''),
      app.my_staff_id(p_studio));
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.save_payroll_settings(p_studio uuid, p_trainer_grace int, p_staff_grace int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.require(p_studio, 'payroll', 'edit_settings', 'change payroll settings');
  if p_trainer_grace < 0 or p_staff_grace < 0 or p_trainer_grace > 240 or p_staff_grace > 240 then raise exception 'Grace period is 0 to 240 minutes'; end if;
  update public.studios set settings = jsonb_set(settings, '{payroll}', coalesce(settings->'payroll', '{}'::jsonb)
    || jsonb_build_object('trainer_grace_minutes', p_trainer_grace, 'staff_grace_minutes', p_staff_grace), true) where id = p_studio;
end $$;

create view public.payroll_entry_overview with (security_invoker = true) as
select pe.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, cb.full_name as created_by_name
from public.payroll_entries pe
join public.staff s on s.id = pe.staff_id
left join public.staff cb on cb.id = pe.created_by;

-- ---------------------------------------------------------------------------
-- Subscriptions & Payments rights (YDL access control) checked where the change happens.
-- Only front-desk staff are checked; the owner can do everything.
-- ---------------------------------------------------------------------------
create or replace function app.is_limited_staff(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and not app.is_owner(p_studio) and app.has_role(p_studio, array['front_desk']::public.staff_role[]);
$$;

create or replace function app.guard_subscription_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  if tg_op = 'INSERT' then
    if new.previous_subscription_id is null then perform app.require(new.studio_id, 'subscriptions', 'add', 'add subscriptions'); end if;
    return new;
  end if;
  if (new.deleted_at is distinct from old.deleted_at or new.cancelled_at is distinct from old.cancelled_at) then
    perform app.require(new.studio_id, 'subscriptions', 'delete', 'delete or cancel subscriptions');
  end if;
  if new.selling_price is distinct from old.selling_price then perform app.require(new.studio_id, 'subscriptions', 'edit_bill', 'edit the bill amount'); end if;
  if new.start_date is distinct from old.start_date or new.base_end_date is distinct from old.base_end_date then
    perform app.require(new.studio_id, 'subscriptions', 'edit_date', 'edit subscription dates');
  end if;
  if new.bill_rep_id is distinct from old.bill_rep_id then perform app.require(new.studio_id, 'subscriptions', 'bill_rep', 'change the bill rep'); end if;
  if new.trainer_id is distinct from old.trainer_id or new.second_trainer_ids is distinct from old.second_trainer_ids or new.note is distinct from old.note
     or new.mark_used is distinct from old.mark_used then
    perform app.require(new.studio_id, 'subscriptions', 'edit', 'edit subscriptions');
    perform app.require(new.studio_id, 'allow_edit_subscription', 'on', 'edit subscriptions directly');
  end if;
  return new;
end $$;
create trigger subscriptions_rights before insert or update on public.subscriptions for each row execute function app.guard_subscription_rights();

create or replace function app.guard_change_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if app.is_limited_staff(new.studio_id) then
    perform app.require(new.studio_id, 'subscriptions', new.kind, new.kind || ' subscriptions');
  end if;
  return new;
end $$;
create trigger subscription_changes_rights before insert on public.subscription_changes for each row execute function app.guard_change_rights();

-- Without "Allow Freeze" / "Allow Extension" a freeze or extension becomes a request for the owner, with no fee.
create or replace function app.guard_freeze_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_key text = case tg_table_name when 'freezes' then 'freeze' else 'extend' end;
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  perform app.require(new.studio_id, 'subscriptions', v_key, case v_key when 'freeze' then 'freeze subscriptions' else 'extend subscriptions' end);
  if not app.can(new.studio_id, case v_key when 'freeze' then 'allow_freeze' else 'allow_extend' end) then
    if new.fee > 0 or new.payment_id is not null then
      raise exception 'Your % goes to the owner as a request, so it can''t take a fee. Leave the fee empty.', case v_key when 'freeze' then 'freeze' else 'extension' end;
    end if;
    new.status = 'requested';
    new.requested_by = (select auth.uid());
  end if;
  return new;
end $$;
create trigger freezes_rights before insert on public.freezes for each row execute function app.guard_freeze_rights();
create trigger extensions_rights before insert on public.extensions for each row execute function app.guard_freeze_rights();

-- The owner approves or rejects freeze and extension requests.
create or replace function public.decide_request(p_kind text, p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_studio uuid;
begin
  if p_kind = 'freeze' then select studio_id into v_studio from public.freezes where id = p_id and status = 'requested';
  elsif p_kind = 'extension' then select studio_id into v_studio from public.extensions where id = p_id and status = 'requested';
  else raise exception 'Unknown request'; end if;
  if v_studio is null then raise exception 'Request not found'; end if;
  if not app.is_owner(v_studio) then raise exception 'Only the owner decides requests'; end if;
  if p_kind = 'freeze' then
    update public.freezes set status = case when p_approve then 'approved' else 'rejected' end, decided_by = app.my_staff_id(v_studio) where id = p_id;
  else
    update public.extensions set status = case when p_approve then 'approved' else 'rejected' end where id = p_id;
  end if;
end $$;

create or replace function app.guard_payment_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then perform app.require(new.studio_id, 'subscriptions', 'cancel_payments', 'cancel receipts'); end if;
  if new.receipt_date is distinct from old.receipt_date then perform app.require(new.studio_id, 'subscriptions', 'receipt_date', 'change receipt dates'); end if;
  if new.amount is distinct from old.amount then perform app.require(new.studio_id, 'subscriptions', 'receipt_price', 'change receipt amounts'); end if;
  return new;
end $$;
create trigger payments_rights before update on public.payments for each row execute function app.guard_payment_rights();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create view public.staff_overview with (security_invoker = true) as
select s.*, (s.user_id is not null) as has_login,
  att.check_in as today_check_in, att.check_out as today_check_out,
  (select count(*) from public.members m where m.trainer_id = s.id and m.deleted_at is null)::int as client_count
from public.staff s
left join lateral (
  select a.check_in, a.check_out from public.staff_attendance a
  where a.staff_id = s.id and a.date = app.today(s.studio_id) order by a.check_in desc limit 1
) att on true
where s.deleted_at is null;

create view public.coupon_overview with (security_invoker = true) as
select c.*, coalesce(sv.custom_name, sv.name) as service_name, p.name as plan_name, m.full_name as member_name,
  coalesce(m.member_code, m.enquiry_code) as member_code, cb.full_name as created_by_name,
  (select count(*) from public.subscriptions s where s.coupon_id = c.id and s.deleted_at is null and s.cancelled_at is null)::int as used_count
from public.coupons c
left join public.services sv on sv.id = c.service_id
left join public.plans p on p.id = c.plan_id
left join public.members m on m.id = c.member_id
left join public.staff cb on cb.id = c.created_by;

create view public.transformation_overview with (security_invoker = true) as
select t.*, s.full_name as trainer_name, s.staff_code as trainer_code, s.photo_url as trainer_photo
from public.transformations t left join public.staff s on s.id = t.trainer_id;

create view public.leave_overview with (security_invoker = true) as
select l.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, s.phone as staff_phone, s.email as staff_email,
  d.full_name as decided_by_name
from public.leave_requests l
join public.staff s on s.id = l.staff_id
left join public.staff d on d.id = l.decided_by;

-- ---------------------------------------------------------------------------
-- Access rules for the new tables
-- ---------------------------------------------------------------------------
alter table public.transformations enable row level security;
alter table public.leave_requests enable row level security;
alter table public.staff_targets enable row level security;
alter table public.holidays enable row level security;
alter table public.payroll_entries enable row level security;

create policy transformations_read on public.transformations for select to authenticated
  using (app.is_staff(studio_id) or (show_in_app and app.in_studio(studio_id)));
create policy transformations_manage on public.transformations for all to authenticated
  using (app.can(studio_id, 'transformations') or (trainer_id in (select app.my_staff_ids()) and app.has_role(studio_id, array['coach']::public.staff_role[])))
  with check (app.can(studio_id, 'transformations') or (trainer_id in (select app.my_staff_ids()) and app.has_role(studio_id, array['coach']::public.staff_role[])));

create policy leave_read on public.leave_requests for select to authenticated
  using (app.can(studio_id, 'trainers', 'leave') or staff_id in (select app.my_staff_ids()));
create policy leave_request on public.leave_requests for insert to authenticated
  with check (status = 'pending' and paid is null and decided_by is null
    and (staff_id in (select app.my_staff_ids()) or app.can(studio_id, 'trainers', 'leave')));

create policy targets_read on public.staff_targets for select to authenticated
  using (app.can(studio_id, 'targets', 'view_listing') or staff_id in (select app.my_staff_ids()));
create policy targets_add on public.staff_targets for insert to authenticated with check (app.can(studio_id, 'targets', 'add'));
create policy targets_edit on public.staff_targets for update to authenticated using (app.can(studio_id, 'targets', 'edit')) with check (app.can(studio_id, 'targets', 'edit'));
create policy targets_delete on public.staff_targets for delete to authenticated using (app.can(studio_id, 'targets', 'delete'));

create policy holidays_read on public.holidays for select to authenticated using (app.in_studio(studio_id));
create policy holidays_desk on public.holidays for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy payroll_read on public.payroll_entries for select to authenticated using (app.can(studio_id, 'payroll', 'view_register'));
create policy payroll_delete on public.payroll_entries for delete to authenticated using (app.can(studio_id, 'payroll', 'delete'));

-- ---------------------------------------------------------------------------
-- Grants: changes that go through the functions above stay read-only in the tables.
-- ---------------------------------------------------------------------------
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
  revoke insert, update, delete on public.activity_log, public.receipt_changes, public.member_medical,
    public.attendance_deletions, public.class_bookings from authenticated;
  revoke insert, update on public.payroll_entries from authenticated;
  revoke update on public.leave_requests from authenticated;
end $$;
call app.apply_grants();
-- Shaan Fitness coupons and combo offers, as set up in YDL (generated by scripts/build-seed-ydl.py).
-- Only the ones missing are added; edit them in the app afterwards.

insert into public.coupons (studio_id, name, code, type, discount, service_id, plan_id, who_can_use, min_order, max_order, max_discount, installments, installment_interval, installment_unit, interest_rate, active)
select v.studio_id, v.name, v.code, v.type, v.discount,
  (select s.id from public.services s where s.studio_id = v.studio_id and s.name = v.service limit 1),
  (select p.id from public.plans p where p.studio_id = v.studio_id and p.plan_code = v.plan_code limit 1),
  v.who, v.min_order, v.max_order, v.max_discount, 1, 1, 'month', 0, v.active
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, '333 Offer', 'March333', 'percentage', 33.00, 'Strength Training', 'YD-42702', 'both', 3999.00, 6499.00, null::numeric, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'April', 'SHAAN50', 'percentage', 50.00, 'Weight Training', 'YD-42715', 'both', 7499.00, 17999.00, null::numeric, false),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Student Offer', 'STUDENT20', 'percentage', 20.00, 'Strength Training', null::text, 'both', 1500.00, 18000.00, null::numeric, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Female ONE PLUS ONE', 'FEM11', 'percentage', 50.00, 'Strength Training', null::text, 'both', 1500.00, 18000.00, null::numeric, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Membership ONE PLUS ONE', 'MEM50', 'percentage', 50.00, 'Strength Training', null::text, 'existing', null::numeric, 18000.00, 1500.00, true),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Welcome Offer', 'WELCOME10', 'percentage', 10.00, 'Strength Training', null::text, 'new', 1500.00, 18000.00, null::numeric, true)
) as v(studio_id, name, code, type, discount, service, plan_code, who, min_order, max_order, max_discount, active)
where not exists (select 1 from public.coupons x where x.studio_id = v.studio_id and upper(x.code) = upper(v.code));

insert into public.combo_offers (studio_id, name, plan_ids, active)
select '00000000-0000-4000-8000-000000000001'::uuid, 'Diamond Combo', array(select p.id from public.plans p where p.studio_id = '00000000-0000-4000-8000-000000000001'::uuid and p.plan_code = any (array['YD-42715','YD-42716']::text[])), true
where not exists (select 1 from public.combo_offers x where x.studio_id = '00000000-0000-4000-8000-000000000001'::uuid and x.name = 'Diamond Combo');
$u20261009000010$;
  insert into app.schema_migrations (version) values ('20261009000010_team');
end $bu20261009000010$;

-- ===== 20261009000011_site =====
do $bu20261009000011$ begin
  if exists (select 1 from app.schema_migrations where version = '20261009000011_site') then raise notice 'already has 20261009000011_site'; return; end if;
  execute $u20261009000011$
-- Shaan Fitness app · 11. Website, joining and logins
-- One address for everything: the public website, the member and coach app, and the CRM.
--  * The website reads one safe summary (studio contact, plans, timings, coaches, consented
--    results). Never a member's or staff member's personal details.
--  * A login joins a staff or client record only by a verified email or mobile number.
--  * Someone who joins on the website becomes an enquiry with a follow-up for the front desk.

-- ---------------------------------------------------------------------------
-- Website settings (Settings › Website): words, links and what the site shows.
-- ---------------------------------------------------------------------------
create or replace function app.default_website()
returns jsonb language sql immutable as $$
  select '{
    "hero_title": null, "hero_text": null, "about": null, "hero_image_url": null,
    "opening_hours": null, "whatsapp": null, "instagram": null, "facebook": null, "youtube": null, "map_url": null,
    "show_prices": true, "show_timings": true, "show_trainers": true, "show_results": true
  }'::jsonb;
$$;

create or replace function public.save_website(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_web jsonb; v_s jsonb := coalesce(p->'studio', '{}'::jsonb); k text;
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change the website'; end if;
  select coalesce(settings->'website', '{}'::jsonb) into v_web from public.studios where id = p_studio;
  for k in select jsonb_object_keys(app.default_website()) loop
    if (p->'website') ? k then
      v_web := v_web || jsonb_build_object(k, case
        when k like 'show_%' then to_jsonb(coalesce((p->'website'->>k)::boolean, true))
        else to_jsonb(nullif(left(trim(p->'website'->>k), 2000), '')) end);
    end if;
  end loop;
  if coalesce(v_web->>'map_url', '') <> '' and v_web->>'map_url' !~ '^https://' then raise exception 'The map link must start with https://'; end if;
  if coalesce(v_web->>'hero_image_url', '') <> '' and v_web->>'hero_image_url' !~ '^https://|^http://127\.0\.0\.1' then raise exception 'The picture link must start with https://'; end if;
  update public.studios set
    settings = jsonb_set(settings, '{website}', v_web),
    tag_line = case when v_s ? 'tag_line' then nullif(trim(v_s->>'tag_line'), '') else tag_line end,
    description = case when v_s ? 'description' then nullif(trim(v_s->>'description'), '') else description end,
    mobile = case when v_s ? 'mobile' then nullif(trim(v_s->>'mobile'), '') else mobile end,
    landline = case when v_s ? 'landline' then nullif(trim(v_s->>'landline'), '') else landline end,
    email = case when v_s ? 'email' then nullif(trim(v_s->>'email'), '') else email end,
    street1 = case when v_s ? 'street1' then nullif(trim(v_s->>'street1'), '') else street1 end,
    street2 = case when v_s ? 'street2' then nullif(trim(v_s->>'street2'), '') else street2 end,
    city = case when v_s ? 'city' then nullif(trim(v_s->>'city'), '') else city end,
    state = case when v_s ? 'state' then nullif(trim(v_s->>'state'), '') else state end,
    pincode = case when v_s ? 'pincode' then nullif(trim(v_s->>'pincode'), '') else pincode end
  where id = p_studio;
end $$;

-- ---------------------------------------------------------------------------
-- What the public website shows. Open to everyone, so it lists fields one by one.
-- ---------------------------------------------------------------------------
create or replace function public.site_info(p_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; w jsonb; v_today date;
begin
  select * into s from public.studios st
  where st.active and (p_slug is null or st.slug = p_slug)
  order by st.created_at limit 1;
  if s.id is null then return null; end if;
  w := app.default_website() || coalesce(s.settings->'website', '{}'::jsonb);
  v_today := (now() at time zone coalesce(s.timezone, 'Asia/Kolkata'))::date;
  return jsonb_build_object(
    'studio', jsonb_build_object(
      'name', s.name, 'branch', s.branch_name, 'slug', s.slug, 'tag_line', s.tag_line, 'description', s.description,
      'mobile', s.mobile, 'landline', s.landline, 'email', s.email, 'street1', s.street1, 'street2', s.street2,
      'city', s.city, 'state', s.state, 'pincode', s.pincode, 'facilities', to_jsonb(s.facilities),
      'logo_url', s.logo_url, 'currency', s.currency,
      'theme', coalesce(s.settings->'themes'->>'member', 'club')),
    'website', w,
    'services', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', coalesce(nullif(v.custom_name, ''), v.name), 'banner_url', v.banner_url)
                                order by v.sort, v.name), '[]'::jsonb)
      from public.services v where v.studio_id = s.id and v.active and v.show_in_app),
    'plans', case when coalesce((w->>'show_prices')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'kind', p.kind, 'tenure_value', p.tenure_value, 'tenure_unit', p.tenure_unit,
          'session_count', p.session_count, 'unlimited_sessions', p.unlimited_sessions, 'is_free_trial', p.is_free_trial,
          'price', p.price, 'discount_price', p.discount_price, 'total_price', p.total_price, 'image_url', p.image_url,
          'description', p.description,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (p.service_ids)))
        order by p.app_sequence, p.kind, p.total_price), '[]'::jsonb)
      from public.plans p where p.studio_id = s.id and p.active and p.show_in_app) else '[]'::jsonb end,
    'batches', case when coalesce((w->>'show_timings')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', b.id, 'name', b.name, 'start_time', b.start_time, 'end_time', b.end_time, 'days', to_jsonb(b.days), 'gender', b.gender,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (b.service_ids)))
        order by b.start_time, b.name), '[]'::jsonb)
      from public.batches b
      where b.studio_id = s.id and b.active
        and (b.end_date is null or b.end_date >= v_today)) else '[]'::jsonb end,
    'trainers', case when coalesce((w->>'show_trainers')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', t.id, 'name', t.full_name, 'title', t.title, 'designation', t.designation, 'years_experience', t.years_experience,
          'star', t.star_trainer, 'photo_url', case when t.photo_url ~ '^https?://' then t.photo_url end,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (t.service_ids)))
        order by t.star_trainer desc, t.years_experience desc nulls last, t.full_name), '[]'::jsonb)
      from public.staff t
      where t.studio_id = s.id and t.role = 'coach' and t.active and t.deleted_at is null and t.show_in_member_app) else '[]'::jsonb end,
    'results', case when coalesce((w->>'show_results')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'client_name', r.client_name, 'image_url', r.image_url, 'period_value', r.period_value, 'period_unit', r.period_unit,
          'title', r.title, 'description', r.description,
          'trainer', (select t.full_name from public.staff t where t.id = r.trainer_id))
        order by r.created_at desc), '[]'::jsonb)
      from public.transformations r where r.studio_id = s.id and r.consent and r.show_in_app) else '[]'::jsonb end
  );
end $$;
revoke all on function public.site_info(text) from public;
grant execute on function public.site_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Logins: link only what has been verified.
-- An email counts once its owner clicked the confirmation link; a mobile number once
-- its one-time code was entered. Until then the login reaches nothing.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;

create or replace function app.link_user(p_id uuid, p_phone text, p_email text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, email, full_name) values (p_id, p_phone, p_email, p_name)
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

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

-- Someone new who joined on the website: an enquiry, and a follow-up so the front desk calls.
create or replace function app.join_from_website(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u record; v_studio uuid; v_member uuid; v_first text; v_last text; v_phone text; v_gender text;
  v_dupe text; v_interest text; v_services uuid[]; v_plan text;
begin
  select au.id, au.email, au.email_confirmed_at, au.raw_user_meta_data as meta into u from auth.users au where au.id = p_user;
  if u.id is null or coalesce(u.meta->>'signup', '') <> 'website' then return; end if;
  if exists (select 1 from public.staff where user_id = p_user)
     or exists (select 1 from public.members where user_id = p_user and deleted_at is null) then return; end if;

  select id into v_studio from public.studios where slug = u.meta->>'studio' and active;
  if v_studio is null then select id into v_studio from public.studios where active order by created_at limit 1; end if;
  if v_studio is null then return; end if;

  v_first := left(coalesce(nullif(trim(u.meta->>'first_name'), ''), nullif(split_part(trim(coalesce(u.meta->>'full_name', '')), ' ', 1), ''), 'New client'), 60);
  v_last := left(nullif(trim(u.meta->>'last_name'), ''), 60);
  v_phone := right(app.digits(u.meta->>'phone'), 10);
  v_gender := case when u.meta->>'gender' in ('male', 'female', 'other') then u.meta->>'gender' end;
  v_interest := left(nullif(trim(u.meta->>'interest'), ''), 120);
  select coalesce(array_agg(v.id), '{}') into v_services from public.services v
  where v.studio_id = v_studio and v_interest is not null and lower(coalesce(nullif(v.custom_name, ''), v.name)) = lower(v_interest);
  if coalesce(u.meta->>'plan', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select p.name into v_plan from public.plans p where p.id = (u.meta->>'plan')::uuid and p.studio_id = v_studio and p.active;
  end if;

  insert into public.members (studio_id, user_id, kind, first_name, last_name, email, phone, gender,
                              source_promotion, enquiry_date, interested_service_ids)
  values (v_studio, p_user, 'enquiry', v_first, v_last, case when u.email_confirmed_at is not null then u.email end,
          v_phone, v_gender, 'Website', (now() at time zone 'Asia/Kolkata')::date, v_services)
  returning id into v_member;

  select string_agg(coalesce(m.member_code, m.enquiry_code, '') || ' ' || m.full_name, ', ') into v_dupe
  from public.members m
  where m.studio_id = v_studio and m.id <> v_member and m.deleted_at is null and v_phone is not null and app.same_phone(m.phone, v_phone);

  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (v_studio, v_member, 'Enquiry', now(), 'open', 'Phone',
          'Joined on the website' || coalesce('. Interested in ' || v_interest, '') || coalesce('. Chose the plan ' || v_plan, '')
          || '. Call to welcome them and book a trial.'
          || case when v_dupe is not null then ' Same mobile as ' || v_dupe || ': if it''s the same person, add this email ('
               || coalesce(u.email, '') || ') to that client and their login moves there.' else '' end,
          'system');
end $$;

create or replace function app.link_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_phone text;
begin
  if tg_op = 'UPDATE'
     and new.email_confirmed_at is not distinct from old.email_confirmed_at
     and new.phone_confirmed_at is not distinct from old.phone_confirmed_at
     and new.email is not distinct from old.email
     and new.phone is not distinct from old.phone then
    return new;
  end if;
  v_email := case when new.email_confirmed_at is not null then new.email end;
  v_phone := case when new.phone_confirmed_at is not null then new.phone end;
  perform app.link_user(new.id, v_phone, v_email, new.raw_user_meta_data->>'full_name');
  if new.raw_user_meta_data ? 'privacy_version' then
    update public.profiles set privacy_version = left(new.raw_user_meta_data->>'privacy_version', 40),
                               privacy_accepted_at = coalesce(privacy_accepted_at, new.created_at)
    where id = new.id and privacy_version is null;
  end if;
  if v_email is not null or v_phone is not null then
    -- Never let a problem here stop someone from signing up.
    begin
      perform app.join_from_website(new.id);
    exception when others then
      raise warning 'Shaan Fitness: could not make the website enquiry for %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;

-- Part 1's on_auth_user_created trigger already runs app.link_new_user() for new logins; this one
-- runs it again when an email or mobile number gets verified. (Supabase lets us add triggers to
-- auth.users but not drop them, so it's only created when missing.)
do $t$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_verified' and tgrelid = 'auth.users'::regclass) then
    create trigger on_auth_user_verified after update of email_confirmed_at, phone_confirmed_at, email, phone on auth.users
      for each row execute function app.link_new_user();
  end if;
end $t$;

-- Owner-made staff logins also wait for a verified email before they're linked automatically
-- (the owner can still link one by hand from the staff list).
create or replace function app.relink_existing_users()
returns void language plpgsql security definer set search_path = '' as $$
declare u record;
begin
  for u in select id, case when phone_confirmed_at is not null then phone end as phone,
                  case when email_confirmed_at is not null then email end as email,
                  raw_user_meta_data->>'full_name' as name from auth.users loop
    perform app.link_user(u.id, u.phone, u.email, u.name);
  end loop;
end $$;

-- When the front desk puts a verified email or mobile on a client, that person's login moves
-- there; an empty website enquiry it sat on is retired.
create or replace function app.members_relink()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_old uuid;
begin
  if new.user_id is not null or new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and new.email is not distinct from old.email and new.phone is not distinct from old.phone then return new; end if;
  select au.id into v_user from auth.users au
  where (new.email is not null and au.email_confirmed_at is not null and lower(au.email) = lower(new.email))
     or (new.phone is not null and au.phone_confirmed_at is not null and app.same_phone(new.phone, au.phone))
  order by au.created_at limit 1;
  if v_user is null then return new; end if;
  for v_old in
    select m.id from public.members m
    where m.user_id = v_user and m.studio_id = new.studio_id and m.id <> new.id and m.deleted_at is null
      and m.kind = 'enquiry' and m.source_promotion = 'Website'
      and not exists (select 1 from public.subscriptions s where s.member_id = m.id)
  loop
    update public.members set user_id = null, deleted_at = now() where id = v_old;
    update public.follow_ups set status = 'done', response_note = 'Joined with ' || new.full_name || '''s record', responded_at = now()
    where member_id = v_old and status = 'open';
  end loop;
  if exists (select 1 from public.members m where m.user_id = v_user and m.studio_id = new.studio_id and m.id <> new.id and m.deleted_at is null) then
    return new;
  end if;
  new.user_id := v_user;
  return new;
end $$;
drop trigger if exists members_relink on public.members;
create trigger members_relink before insert or update of email, phone on public.members
  for each row execute function app.members_relink();

-- ---------------------------------------------------------------------------
-- From the member app: "Book a free trial" / "Call me back" / "I want this plan".
-- ---------------------------------------------------------------------------
create or replace function public.request_callback(p_member uuid, p_what text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.members; v_type text; v_text text;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  if m.id is null or m.user_id is distinct from auth.uid() then raise exception 'You can only ask for yourself'; end if;
  if p_what not in ('trial', 'callback', 'plan') then raise exception 'Unknown request'; end if;
  v_type := case p_what when 'trial' then 'Assign Trial' when 'plan' then 'Ready To Sign Up' else 'Enquiry' end;
  v_text := case p_what when 'trial' then 'Asked for a free trial in the app'
                        when 'plan' then 'Wants to join' || coalesce(': ' || left(nullif(trim(p_note), ''), 160), '')
                        else 'Asked for a call back in the app' end;
  if exists (select 1 from public.follow_ups f where f.member_id = m.id and f.status = 'open' and f.type = v_type
             and f.source = 'system' and f.created_at > now() - interval '1 day') then
    return 'already';
  end if;
  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (m.studio_id, m.id, v_type, now(), 'open', 'Phone', v_text, 'system');
  return 'sent';
end $$;
revoke all on function public.request_callback(uuid, text, text) from public, anon;
grant execute on function public.request_callback(uuid, text, text) to authenticated;
revoke all on function public.save_website(uuid, jsonb) from public, anon;
grant execute on function public.save_website(uuid, jsonb) to authenticated;
$u20261009000011$;
  insert into app.schema_migrations (version) values ('20261009000011_site');
end $bu20261009000011$;

-- ===== 20261009000012_center =====
do $bu20261009000012$ begin
  if exists (select 1 from app.schema_migrations where version = '20261009000012_center') then raise notice 'already has 20261009000012_center'; return; end if;
  execute $u20261009000012$
-- Shaan Fitness app · 12. Fitness Center and App Settings (YDL replica part 5)
-- YDL's "Fitness Center" menu (My Fitness Centers with its four-step profile, Fitness Center
-- Settings, Invoice Settings, Biometric Manager and Extended Biometric Manager, DLT OTP Manager,
-- Email Manager, Holiday, Equipment, Notices, Rules, Currency, Feedback) and "App Settings"
-- (On/Off Permission, Services List, Gallery, Action Items, Quick Action Items, Banners,
-- Social Links & QR, Measurement Settings). Defaults are Shaan Fitness's own YDL values,
-- read on 9 October 2026.

-- ---------------------------------------------------------------------------
-- Fitness center profile: address details and timings live on the studio (the website shows
-- them); billing, bank, owner and manager details are owner-only (studio_private).
-- ---------------------------------------------------------------------------
alter table public.studios
  add column if not exists locality text,
  add column if not exists landmark text;

create table public.studio_private (
  studio_id uuid primary key references public.studios(id) on delete cascade,
  company_name text,
  billing jsonb not null default '{}'::jsonb,   -- address1, address2, city, state, pincode, country
  company_pan text,
  bank jsonb not null default '{}'::jsonb,      -- account_no, holder, ifsc, bank_name, branch
  owner jsonb not null default '{}'::jsonb,     -- name, email, mobile
  manager jsonb not null default '{}'::jsonb,   -- name, email, mobile
  support jsonb not null default '{}'::jsonb,   -- email, mobile, toll_free
  updated_at timestamptz not null default now()
);
alter table public.studio_private enable row level security;
create policy studio_private_owner on public.studio_private for all to authenticated
  using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create trigger studio_private_log after insert or update or delete on public.studio_private for each row execute function app.log_activity();

-- Passwords and API keys (SMTP password, SMS vendor key): written, never read back by the app.
create table public.studio_secrets (
  studio_id uuid not null references public.studios(id) on delete cascade,
  key text not null check (key in ('smtp_password', 'otp_vendor_api_key')),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (studio_id, key)
);
alter table public.studio_secrets enable row level security;   -- no policies: only the functions below touch it
revoke all on public.studio_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Default settings sections (YDL values for Shaan Fitness)
-- ---------------------------------------------------------------------------
create or replace function app.default_center_settings()
returns jsonb language sql immutable as $$ select '{
  "sms_on_enquiry": true, "sms_on_expiry": true, "sms_on_birthday": true, "email_on_bill": true,
  "app_live_traffic": true, "app_diet_plan": true, "app_workout_plan": true, "app_cardio_plan": true,
  "freeze_membership": true, "multi_centre_sessions": false,
  "bio_deactivate_on_balance": true, "bio_deactivate_on_expiry": true, "has_essl": true, "essl_server": "ETIME",
  "bio_serial": "CUB7235300639", "bio_serial_two": null, "bio_block_pt_expiry": false, "bio_email_alert": true,
  "bio_alert_email": "shaanfitnessgym@gmail.com",
  "vital_block_pt_expiry": false, "has_vital": false,
  "vital_device_id": null, "vital_mqtt_client_id": null, "vital_display_message": null, "vital_display_ou_id": null,
  "vital_device_id_two": null, "vital_mqtt_client_id_two": null, "vital_display_message_two": null, "vital_display_ou_id_two": null,
  "website_url": "https://whatsapp.com/channel/0029VauYch34Y9lhmttjwv0l", "web_app_url": null,
  "android_app_url": "https://play.google.com/store/apps/details?id=com.ydl.shaanfitness",
  "ios_app_url": "https://apps.apple.com/app/shaan-fitness/id6479194523",
  "export_emails": null, "class_limiter": true, "auto_approve_challenge": false, "auto_approve_community": false,
  "dashboard_design": "H", "nav_left_align": false, "checkin_search_by": null,
  "pt_request_cancel_only": false, "pt_cancel_access": ["Head Trainer", "Owner"],
  "enrollment_terms": null, "upgrade_block_days": 0,
  "push_to_coaches": ["CLASSBOOKED", "CLASSCANCELLED", "WAITINGLIST", "FREEZED", "MAKEPAY"],
  "custom_exercise_only": true, "share_custom_exercise": false,
  "exercise_coach": ["anatomy", "youtube", "gif"], "exercise_customer": ["anatomy", "youtube", "gif"]
}'::jsonb $$;

create or replace function app.default_app_settings()
returns jsonb language sql immutable as $$ select '{
  "is_online_training": false, "allow_workout": true, "is_allow_cardio": true, "volume": true, "is_allow_PT": true,
  "is_QR_Tab_Allowed": true, "is_Diet_PlanAllowed": true, "is_woplan_allowed": true, "can_view_parq_form": true,
  "allow_recipes": true, "is_show_batchInfo": true, "show_appointment": false, "live_gym_traffic": true,
  "show_diary": true, "show_diary_video": true, "trainer_prefix_name": "SFT", "customer_prefix_name": "SF",
  "fc_allow_freeze_memberships": true, "can_add_food": true, "can_edit_meal": true, "show_calories_breakdown": true,
  "can_book_appointment": true, "can_trainer_call": false, "can_whatsapp_trainer": false, "can_refer_friend": true,
  "ecommerce_banner": null, "can_sign_up": true, "show_browse_planoption": true, "show_slot_datewise_orderhistory": true,
  "cartnote_address_support": true, "show_subscription_price": true, "fc_allow_link_external_check_in": true,
  "show_challenge_player": true, "hide_pincode": false, "is_reference_code_compulsory": false, "whatsapp_link_url": null,
  "allow_ecommerce": true, "navigate_to_services_page": false, "is_signup_on_boarding_flow": true, "allow_recipe": true,
  "is_glucose_tracker_on": true, "allow_ydl_articles": true, "show_class": true, "is_habit_tracker_on": true,
  "show_membership_plans": true, "is_attendance_report_visible": false, "allow_expired_checkin": false,
  "show_terms_and_condition": false, "show_my_subscriptions": true, "can_set_goal": true, "show_diet_pdf": false,
  "show_workout_pdf": false, "can_change_diet_plan": false, "can_change_workout_plan": false, "show_diet_plan_history": true,
  "show_other_home_page": true, "can_see_payment_details": true, "show_subscription_payment_details": true,
  "show_diet_upcoming_plans": false, "show_membership_plans_prices": true, "show_subscription_plans_prices": true,
  "is_wellness_coach": false, "custom_screen_banner": null,
  "terms_active": true, "privacy_url": "/privacy", "terms_url": "/privacy", "terms_message": null
}'::jsonb $$;

create or replace function app.default_biometric_settings()
returns jsonb language sql immutable as $$ select '{
  "block_users_expired": true, "checkout_mode": "alternate", "block_users_balance": false, "block_users_freeze": false,
  "record_customer_checkout": false, "single_staff_checkin": false, "single_trainer_checkin": false,
  "allow_pt_access": true, "checkout_minutes": 90, "alert_email": "shaanfitnessgym@gmail.com"
}'::jsonb $$;

create or replace function app.default_otp_settings()
returns jsonb language sql immutable as $$ select '{
  "operator": null, "principal_entity_id": null, "sms_header_id": null, "sms_template_id": null, "vendor_otp_template_id": null,
  "customer_app_name": null, "customer_app_hash": null, "trainer_app_name": null, "trainer_app_hash": null,
  "otp_length": 6, "otp_expiry_minutes": 10, "sender_id": null, "otp_message": null,
  "whatsapp_otp": false, "firebase": false, "truecaller": false, "international_otp": false
}'::jsonb $$;

create or replace function app.default_email_settings()
returns jsonb language sql immutable as $$ select '{"host": null, "port": 587, "security": "TLS", "username": null, "sender_name": null}'::jsonb $$;

-- YDL "Measurements Settings": which measurements the app asks for, in what order.
create or replace function app.default_measurement_settings()
returns jsonb language sql immutable as $$
  select jsonb_agg(jsonb_build_object('key', k, 'order', o, 'on', o2 <= 33) order by o2)
  from (values
    ('height', 1, 1), ('weight_kg', 2, 2), ('resting_heart_rate', 3, 3), ('general_body_fat', 4, 4), ('blood_presure', 5, 5),
    ('bmi', 6, 6), ('bmr', 7, 7), ('visceral_fat', 8, 8), ('sub_cutaneous_fat', 9, 9), ('body_metabolic_age', 10, 10),
    ('muscle_mass', 11, 11), ('knees', 1, 12), ('calves', 2, 13), ('upper_arm', 3, 14), ('forearm', 4, 15), ('neck', 5, 16),
    ('shoulder', 6, 17), ('upper_abdomen', 7, 18), ('lower_abdomen', 8, 19), ('wrist', 9, 20), ('bust', 10, 21), ('chest', 11, 22),
    ('waist', 23, 23), ('hips', 24, 24), ('midway', 25, 25), ('thighs', 26, 26), ('deviation_note', 16, 27), ('image', 17, 28),
    ('image_two', 18, 29), ('image_three', 19, 30),
    ('trunk_fat', 20, 34), ('fat_free_weight', 21, 35), ('protein_bar', 22, 36), ('trunk_muscle_mass', 23, 37),
    ('left_arm_muscle_mass', 24, 38), ('left_leg_fat', 25, 39), ('bone_mass', 26, 40), ('body_water', 27, 41), ('right_arm_fat', 28, 42),
    ('right_arm_muscle_mass', 29, 43), ('right_leg_fat', 30, 44), ('left_leg_muscle_mass', 31, 45), ('skeletal_muscle', 32, 46),
    ('upper_arm_left', 33, 47), ('upper_arm_right', 34, 48), ('forearm_left', 35, 49), ('forearm_right', 36, 50), ('under_bust', 37, 51),
    ('upper_waist', 38, 52), ('lower_waist', 39, 53), ('abdomen', 40, 54), ('rib_cage', 41, 55), ('back_width', 42, 56), ('glutes', 43, 57),
    ('love_handles', 44, 58), ('mid_thigh_left', 45, 59), ('mid_thigh_right', 46, 60), ('face', 47, 61), ('jawline', 48, 62),
    ('wrist_left', 49, 63), ('wrist_right', 50, 64), ('thigh_left', 51, 65), ('thigh_right', 52, 66), ('knee_left', 53, 67),
    ('knee_right', 54, 68), ('calf_left', 55, 69), ('calf_right', 56, 70), ('ankle_left', 57, 71), ('ankle_right', 58, 72),
    ('resting_metabolism', 59, 73), ('subcut_fat_trunk', 60, 74), ('subcut_fat_arms', 61, 75), ('subcut_fat_legs', 62, 76),
    ('skele_muscle_body', 63, 77), ('skele_muscle_trunk', 64, 78), ('skele_muscle_arms', 65, 79), ('skele_muscle_legs', 66, 80),
    ('left_lower_thigh', 67, 81), ('right_lower_thigh', 68, 82), ('abs_upper', 69, 83), ('abs_mid', 70, 84), ('abs_lower', 71, 85)
  ) as m(k, o, o2);
$$;

-- Fill the new sections on existing studios (keeping anything already there).
update public.studios set settings = settings
  || jsonb_build_object('center', app.default_center_settings() || coalesce(settings->'center', '{}'::jsonb))
  || jsonb_build_object('app', app.default_app_settings() || coalesce(settings->'app', '{}'::jsonb))
  || jsonb_build_object('biometric', app.default_biometric_settings() || coalesce(settings->'biometric', '{}'::jsonb))
  || jsonb_build_object('otp', app.default_otp_settings() || coalesce(settings->'otp', '{}'::jsonb))
  || jsonb_build_object('email', app.default_email_settings() || coalesce(settings->'email', '{}'::jsonb))
  || jsonb_build_object('measurements', coalesce(settings->'measurements', app.default_measurement_settings()));

-- A new studio (a new branch, or a fresh setup) starts with every section filled in.
create or replace function app.studio_setting_defaults()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.settings := new.settings
    || jsonb_build_object('center', app.default_center_settings() || coalesce(new.settings->'center', '{}'::jsonb))
    || jsonb_build_object('app', app.default_app_settings() || coalesce(new.settings->'app', '{}'::jsonb))
    || jsonb_build_object('biometric', app.default_biometric_settings() || coalesce(new.settings->'biometric', '{}'::jsonb))
    || jsonb_build_object('otp', app.default_otp_settings() || coalesce(new.settings->'otp', '{}'::jsonb))
    || jsonb_build_object('email', app.default_email_settings() || coalesce(new.settings->'email', '{}'::jsonb))
    || jsonb_build_object('measurements', coalesce(new.settings->'measurements', app.default_measurement_settings()));
  return new;
end $$;
create trigger studios_setting_defaults before insert on public.studios for each row execute function app.studio_setting_defaults();

-- Social links live with the website settings (one place for Instagram, Facebook, WhatsApp…).
create or replace function app.default_website()
returns jsonb language sql immutable as $$
  select '{
    "hero_title": null, "hero_text": null, "about": null, "hero_image_url": null,
    "opening_hours": null, "whatsapp": null, "instagram": null, "facebook": null, "youtube": null, "map_url": null,
    "twitter": null, "linkedin": null, "video": null,
    "show_prices": true, "show_timings": true, "show_trainers": true, "show_results": true
  }'::jsonb;
$$;



-- ---------------------------------------------------------------------------
-- Saving settings
-- ---------------------------------------------------------------------------
-- Only keys the section knows are kept.
create or replace function app.pick(p_defaults jsonb, p jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(k, p->k), '{}'::jsonb) from jsonb_object_keys(p_defaults) k where p ? k;
$$;

create or replace function public.save_studio_section(p_studio uuid, p_section text, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cur jsonb; v_new jsonb; v_def jsonb; k text;
begin
  case p_section
    when 'center' then perform app.require(p_studio, 'fitness_center', 'edit', 'change the fitness center settings'); v_def := app.default_center_settings();
    when 'biometric' then perform app.require(p_studio, 'biometric', 'on', 'change the biometric settings'); v_def := app.default_biometric_settings();
    when 'app' then
      if not app.can(p_studio, 'app_settings', 'on') then raise exception 'Only the owner can change the app settings'; end if;
      v_def := app.default_app_settings();
    when 'otp' then
      if not app.is_owner(p_studio) then raise exception 'Only the owner can change the OTP settings'; end if;
      v_def := app.default_otp_settings();
    when 'email' then
      if not app.is_owner(p_studio) then raise exception 'Only the owner can change the email settings'; end if;
      v_def := app.default_email_settings();
    when 'invoice', 'receipt' then
      perform app.require(p_studio, 'fitness_center', 'edit', 'change the invoice settings');
      v_def := '{"mode": "automatic", "start": 1, "width": 5, "zero_fill": true, "applicable_from": null, "restart": "year", "prefix": "", "suffix": ""}'::jsonb;
      if p ? 'mode' and p->>'mode' not in ('automatic', 'manual') then raise exception 'Choose Automatic or Manual'; end if;
      if p ? 'start' and coalesce((p->>'start')::bigint, 0) < 1 then raise exception 'The starting number must be 1 or more'; end if;
      if p ? 'width' and coalesce((p->>'width')::int, 0) not between 1 and 10 then raise exception 'The width must be between 1 and 10'; end if;
      if p ? 'restart' and coalesce(p->>'restart', 'none') not in ('year', 'financial_year', 'month', 'none') then raise exception 'Unknown restart period'; end if;
    when 'timings' then
      perform app.require(p_studio, 'fitness_center', 'edit', 'change the timings');
      if jsonb_typeof(p->'days') <> 'array' or jsonb_typeof(p->'sessions') <> 'array' then raise exception 'Timings need open days and sessions'; end if;
      if jsonb_array_length(p->'sessions') = 0 then raise exception 'Enter at least Session 1'; end if;
      if exists (select 1 from jsonb_array_elements(p->'sessions') x
                 where coalesce(x->>'from', '') !~ '^\d{2}:\d{2}$' or coalesce(x->>'to', '') !~ '^\d{2}:\d{2}$' or x->>'to' <= x->>'from') then
        raise exception 'Each session needs a start and an end time, and must end after it starts';
      end if;
      -- The open days are also the studio's working days (payroll, bookings).
      update public.studios set settings = jsonb_set(jsonb_set(settings, '{timings}',
        jsonb_build_object('days', p->'days', 'sessions', p->'sessions')), '{working_days}', p->'days') where id = p_studio;
      return;
    when 'measurements' then
      if not app.can(p_studio, 'app_settings', 'on') then raise exception 'Only the owner can change the measurement settings'; end if;
      if jsonb_typeof(p->'items') <> 'array' then raise exception 'Nothing to save'; end if;
      update public.studios set settings = jsonb_set(settings, '{measurements}', (
        select coalesce(jsonb_agg(jsonb_build_object('key', d->>'key', 'order', coalesce((x->>'order')::int, (d->>'order')::int),
                                                     'on', coalesce((x->>'on')::boolean, (d->>'on')::boolean)) order by ord), '[]'::jsonb)
        from jsonb_array_elements(app.default_measurement_settings()) with ordinality as dd(d, ord)
        left join lateral (select y from jsonb_array_elements(p->'items') y where y->>'key' = d->>'key' limit 1) yy(x) on true))
      where id = p_studio;
      return;
    else raise exception 'Unknown settings section %', p_section;
  end case;
  select coalesce(settings->p_section, '{}'::jsonb) into v_cur from public.studios where id = p_studio;
  v_new := v_def || v_cur || app.pick(v_def, p);
  update public.studios set settings = jsonb_set(settings, array[p_section], v_new) where id = p_studio;
end $$;

-- Basic information and address (steps 1 and 2 of the fitness center profile).
create or replace function public.save_center_info(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  perform app.require(p_studio, 'fitness_center', 'edit', 'edit the fitness center');
  if p ? 'name' then
    v_name := nullif(trim(p->>'name'), '');
    if v_name is null then raise exception 'Enter the fitness center name'; end if;
  end if;
  if p ? 'capacity' and coalesce((p->>'capacity')::int, 0) < 1 then raise exception 'Enter the fitness center capacity'; end if;
  if p ? 'mobile' and coalesce(app.digits(p->>'mobile'), '') = '' then raise exception 'Enter the mobile number'; end if;
  if p ? 'street1' then
    if coalesce(trim(p->>'street1'), '') = '' or coalesce(trim(p->>'street2'), '') = '' or coalesce(trim(p->>'locality'), '') = ''
       or coalesce(trim(p->>'city'), '') = '' or coalesce(trim(p->>'state'), '') = '' or coalesce(trim(p->>'country'), '') = ''
       or coalesce(trim(p->>'pincode'), '') = '' then
      raise exception 'Fill in every address field marked *';
    end if;
  end if;
  update public.studios set
    name = coalesce(v_name, name),
    tag_line = case when p ? 'tag_line' then nullif(trim(p->>'tag_line'), '') else tag_line end,
    description = case when p ? 'description' then nullif(trim(p->>'description'), '') else description end,
    capacity = case when p ? 'capacity' then (p->>'capacity')::int else capacity end,
    email = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    mobile = case when p ? 'mobile' then nullif(trim(p->>'mobile'), '') else mobile end,
    landline = case when p ? 'landline' then nullif(trim(p->>'landline'), '') else landline end,
    facilities = case when p ? 'facilities' then array(select jsonb_array_elements_text(p->'facilities')) else facilities end,
    street1 = case when p ? 'street1' then trim(p->>'street1') else street1 end,
    street2 = case when p ? 'street2' then trim(p->>'street2') else street2 end,
    locality = case when p ? 'locality' then trim(p->>'locality') else locality end,
    branch_name = case when p ? 'locality' then trim(p->>'locality') else branch_name end,
    landmark = case when p ? 'landmark' then nullif(trim(p->>'landmark'), '') else landmark end,
    city = case when p ? 'city' then trim(p->>'city') else city end,
    state = case when p ? 'state' then trim(p->>'state') else state end,
    country = case when p ? 'country' then trim(p->>'country') else country end,
    pincode = case when p ? 'pincode' then trim(p->>'pincode') else pincode end
  where id = p_studio;
  -- Fitness center categories are the services the center offers.
  if p ? 'service_ids' then
    update public.services set active = (id = any (array(select (jsonb_array_elements_text(p->'service_ids'))::uuid)))
    where studio_id = p_studio;
  end if;
end $$;

-- Step 4: primary contacts, billing, bank and owner details (owner only). GST goes to invoices.
create or replace function public.save_center_private(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can see or change billing, bank and owner details'; end if;
  if coalesce(trim(p->>'company_name'), '') = '' then raise exception 'Enter the company name'; end if;
  if coalesce((p->>'gst_registered')::boolean, false) and coalesce(trim(p->>'gst_number'), '') = '' then raise exception 'Enter the GST number'; end if;
  if coalesce(trim(p->'support'->>'email'), '') = '' then raise exception 'Enter the support email'; end if;
  insert into public.studio_private (studio_id, company_name, billing, company_pan, bank, owner, manager, support, updated_at)
  values (p_studio, trim(p->>'company_name'), coalesce(p->'billing', '{}'), nullif(trim(p->>'company_pan'), ''),
          coalesce(p->'bank', '{}'), coalesce(p->'owner', '{}'), coalesce(p->'manager', '{}'), coalesce(p->'support', '{}'), now())
  on conflict (studio_id) do update set company_name = excluded.company_name, billing = excluded.billing, company_pan = excluded.company_pan,
    bank = excluded.bank, owner = excluded.owner, manager = excluded.manager, support = excluded.support, updated_at = now();
  update public.studios set settings = jsonb_set(settings, '{gst}', coalesce(settings->'gst', '{}'::jsonb) || jsonb_build_object(
    'enabled', coalesce((p->>'gst_registered')::boolean, false), 'number', nullif(trim(p->>'gst_number'), '')))
  where id = p_studio;
end $$;

create or replace function public.save_currency(p_studio uuid, p_currency text, p_tax text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change the currency'; end if;
  if coalesce(p_currency, '') !~ '^[A-Z]{3}$' then raise exception 'Choose a currency'; end if;
  update public.studios set currency = p_currency, tax_label = coalesce(nullif(trim(p_tax), ''), 'GST') where id = p_studio;
end $$;

create or replace function public.set_studio_secret(p_studio uuid, p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change this'; end if;
  if p_key not in ('smtp_password', 'otp_vendor_api_key') then raise exception 'Unknown setting'; end if;
  if coalesce(p_value, '') = '' then
    delete from public.studio_secrets where studio_id = p_studio and key = p_key;
  else
    insert into public.studio_secrets (studio_id, key, value) values (p_studio, p_key, p_value)
    on conflict (studio_id, key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;

-- Which secrets are set (never their values).
create or replace function public.studio_secret_status(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when app.is_owner(p_studio) then coalesce((select jsonb_object_agg(key, updated_at) from public.studio_secrets where studio_id = p_studio), '{}'::jsonb) end;
$$;

-- ---------------------------------------------------------------------------
-- Fitness Center Settings that take effect now
-- ---------------------------------------------------------------------------
create or replace function app.center_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'center'->p_key, app.default_center_settings()->p_key) from public.studios s where s.id = p_studio;
$$;

-- "Freeze Memberships: No" stops new freezes (from the desk and the member app).
create or replace function app.freeze_allowed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((app.center_setting(new.studio_id, 'freeze_membership'))::boolean, true) = false then
    raise exception 'Freezing memberships is switched off (Fitness Center › Fitness Center Settings)';
  end if;
  return new;
end $$;
create trigger freezes_allowed before insert on public.freezes for each row execute function app.freeze_allowed();

-- "Block Membership Upgrade After no of Days": upgrades only within that many days of the start.
create or replace function app.upgrade_allowed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_days int; v_start date;
begin
  if new.kind <> 'upgrade' then return new; end if;
  v_days := coalesce((app.center_setting(new.studio_id, 'upgrade_block_days'))::int, 0);
  if v_days <= 0 then return new; end if;
  select start_date into v_start from public.subscriptions where id = new.from_subscription_id;
  if app.today(new.studio_id) - v_start > v_days then
    raise exception 'Upgrades are allowed only within % days of the start (Fitness Center › Fitness Center Settings)', v_days;
  end if;
  return new;
end $$;
create trigger subscription_changes_upgrade_allowed before insert on public.subscription_changes for each row execute function app.upgrade_allowed();

-- ---------------------------------------------------------------------------
-- Biometric devices (YDL "Add Biometric Device") and device-wide operations
-- ---------------------------------------------------------------------------
alter table public.biometric_devices
  add column if not exists storage_types text[] not null default '{customers}',
  add column if not exists scan_type text not null default 'finger' check (scan_type in ('finger', 'face', 'face_ex', 'face_finger')),
  add column if not exists expiry_rule boolean not null default true,
  add column if not exists server text not null default 'ETIME';

create table public.device_operations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  device_id uuid not null references public.biometric_devices(id) on delete cascade,
  operation text not null check (operation in ('clear_logs', 'restart', 'reset_op_stamp', 'unblock_active')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'done', 'failed')),
  result text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index device_operations_idx on public.device_operations (studio_id, status, created_at);
create trigger device_operations_created_by before insert on public.device_operations for each row execute function app.fill_created_by();
alter table public.device_operations enable row level security;
create policy device_operations_read on public.device_operations for select to authenticated using (app.can(studio_id, 'biometric'));
create policy device_operations_add on public.device_operations for insert to authenticated with check (app.can(studio_id, 'biometric') and status = 'queued');

drop policy if exists devices_owner on public.biometric_devices;
create policy devices_manage on public.biometric_devices for all to authenticated
  using (app.can(studio_id, 'biometric')) with check (app.can(studio_id, 'biometric'));


-- ---------------------------------------------------------------------------
-- Holidays (YDL "Add Event Notice"), Notices, Rules, Equipment, Feedback
-- ---------------------------------------------------------------------------
alter table public.holidays add column if not exists notified_at timestamptz;
drop trigger if exists holidays_log on public.holidays;
create trigger holidays_log after update or delete on public.holidays for each row execute function app.log_activity();

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  audience text not null default 'customer' check (audience in ('customer', 'trainer')),
  active boolean not null default true,
  notified_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notices_studio_idx on public.notices (studio_id, created_at desc);
create trigger notices_created_by before insert on public.notices for each row execute function app.fill_created_by();
create trigger notices_log after update or delete on public.notices for each row execute function app.log_activity();

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index rules_studio_idx on public.rules (studio_id, created_at desc);
create trigger rules_created_by before insert on public.rules for each row execute function app.fill_created_by();
create trigger rules_log after update or delete on public.rules for each row execute function app.log_activity();

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  serial_number text not null check (length(trim(serial_number)) > 0),
  purchase_date date not null,
  status text not null default 'working' check (status in ('working', 'faulty', 'inactive')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index equipment_studio_idx on public.equipment (studio_id, purchase_date desc);
create trigger equipment_created_by before insert on public.equipment for each row execute function app.fill_created_by();
create trigger equipment_log after update or delete on public.equipment for each row execute function app.log_activity();

-- Feedback members send from the app (YDL "Feedback Listing").
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  feedback_no bigint generated always as identity,
  member_id uuid not null references public.members(id) on delete cascade,
  feedback text not null check (length(trim(feedback)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index app_feedback_studio_idx on public.app_feedback (studio_id, created_at desc);

-- Feedback Listing: each message with the client's name and email (only rows the reader may see).
create view public.app_feedback_overview with (security_invoker = true) as
select f.id, f.studio_id, f.feedback_no, f.member_id, f.feedback, f.created_at, m.full_name, m.email, m.member_code
from public.app_feedback f join public.members m on m.id = f.member_id;

create or replace function public.send_feedback(p_member uuid, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_id uuid;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  if m.id is null or m.user_id is distinct from auth.uid() then raise exception 'You can only send feedback for yourself'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'Write your feedback first'; end if;
  if (select count(*) from public.app_feedback where member_id = m.id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve sent a lot of feedback today. Please try again tomorrow.';
  end if;
  insert into public.app_feedback (studio_id, member_id, feedback) values (m.studio_id, m.id, left(trim(p_text), 2000)) returning id into v_id;
  return v_id;
end $$;

-- In-app notifications to every member (holiday wishes, notices). Returns how many were sent.
create or replace function public.notify_members(p_studio uuid, p_kind text, p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_title text; v_body text; v_n int;
begin
  if p_kind = 'notice' then
    perform app.require(p_studio, 'notices', 'on', 'send notices');
    select title, description into v_title, v_body from public.notices where id = p_id and studio_id = p_studio and active;
    if v_title is null then raise exception 'Only active notices can be sent'; end if;
    if (select audience from public.notices where id = p_id) = 'trainer' then
      update public.notices set notified_at = now() where id = p_id;
      return 0;   -- trainers see their notices in the coach app
    end if;
    update public.notices set notified_at = now() where id = p_id;
  elsif p_kind = 'holiday' then
    if not app.is_desk(p_studio) then raise exception 'Not allowed'; end if;
    select title, coalesce(nullif(trim(wish_text), ''), title || ' · ' || to_char(event_date, 'DD Mon YYYY')) into v_title, v_body
    from public.holidays where id = p_id and studio_id = p_studio and active;
    if v_title is null then raise exception 'Only active holidays can be sent'; end if;
    update public.holidays set notified_at = now() where id = p_id;
  else
    raise exception 'Unknown notification';
  end if;
  insert into public.notifications (studio_id, member_id, title, body, sent_by)
  select p_studio, m.id, v_title, v_body, app.my_staff_id(p_studio)
  from public.members m where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- App Settings: gallery, action items and quick action items, banners
-- ---------------------------------------------------------------------------
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  image_url text not null,
  is_gallery boolean not null default true,
  is_offer boolean not null default false,
  login_screen text check (login_screen in ('NUMBER_LOGIN', 'SLIDER_LOGIN')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (is_gallery or is_offer)
);
create trigger gallery_created_by before insert on public.gallery_images for each row execute function app.fill_created_by();

create table public.app_actions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  kind text not null check (kind in ('action', 'quick')),
  name text not null check (length(trim(name)) > 0),
  icon text,
  color text not null default '#000000' check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  link text,
  show_to text not null default 'both' check (show_to in ('both', 'paid', 'free', 'active_pt', 'general_no_pt', 'all_expired')),
  link_id text,
  action_id text,
  ordering int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_actions_idx on public.app_actions (studio_id, kind, ordering);
create trigger app_actions_created_by before insert on public.app_actions for each row execute function app.fill_created_by();
create trigger app_actions_log after update or delete on public.app_actions for each row execute function app.log_activity();

create table public.app_banners (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  image_url text not null,
  web_url text,
  active boolean not null default true,
  external_link boolean not null default false,
  link text,
  categories text[] not null default '{}',
  show_to text not null default 'both' check (show_to in ('both', 'paid', 'free', 'active_pt', 'general_no_pt', 'all_expired')),
  meta_description text,
  meta_keywords text,
  ordering int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_banners_idx on public.app_banners (studio_id, ordering);
create trigger app_banners_created_by before insert on public.app_banners for each row execute function app.fill_created_by();
create trigger app_banners_log after update or delete on public.app_banners for each row execute function app.log_activity();



-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.notices enable row level security;
alter table public.rules enable row level security;
alter table public.equipment enable row level security;
alter table public.app_feedback enable row level security;
alter table public.gallery_images enable row level security;
alter table public.app_actions enable row level security;
alter table public.app_banners enable row level security;

create policy notices_read on public.notices for select to authenticated using (app.is_desk(studio_id) or (app.in_studio(studio_id) and active));
create policy notices_manage on public.notices for all to authenticated using (app.can(studio_id, 'notices')) with check (app.can(studio_id, 'notices'));
create policy rules_read on public.rules for select to authenticated using (app.is_desk(studio_id) or (app.in_studio(studio_id) and active));
create policy rules_manage on public.rules for all to authenticated using (app.can(studio_id, 'rules')) with check (app.can(studio_id, 'rules'));
create policy equipment_desk on public.equipment for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy feedback_read on public.app_feedback for select to authenticated using (app.can(studio_id, 'feedback') or app.is_self(member_id));
create policy gallery_read on public.gallery_images for select to authenticated using (app.in_studio(studio_id));
create policy gallery_manage on public.gallery_images for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));
create policy actions_read on public.app_actions for select to authenticated using (app.in_studio(studio_id));
create policy actions_owner on public.app_actions for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));
create policy banners_read on public.app_banners for select to authenticated using (app.in_studio(studio_id));
create policy banners_manage on public.app_banners for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));

-- Services List (App Settings): owner, or staff with App Settings rights.
create policy services_app_settings on public.services for update to authenticated
  using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));

-- Front desk with Fitness Center rights may edit the center (through save_center_info); the
-- studios row itself stays owner-only for direct writes.

revoke all on function public.save_studio_section(uuid, text, jsonb) from public, anon;
revoke all on function public.save_center_info(uuid, jsonb) from public, anon;
revoke all on function public.save_center_private(uuid, jsonb) from public, anon;
revoke all on function public.save_currency(uuid, text, text) from public, anon;
revoke all on function public.set_studio_secret(uuid, text, text) from public, anon;
revoke all on function public.studio_secret_status(uuid) from public, anon;
revoke all on function public.send_feedback(uuid, text) from public, anon;
revoke all on function public.notify_members(uuid, text, uuid) from public, anon;
grant execute on function public.save_studio_section(uuid, text, jsonb), public.save_center_info(uuid, jsonb),
  public.save_center_private(uuid, jsonb), public.save_currency(uuid, text, text), public.set_studio_secret(uuid, text, text),
  public.studio_secret_status(uuid), public.send_feedback(uuid, text), public.notify_members(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The website shows the center's own timings and full address when set.
-- ---------------------------------------------------------------------------
create or replace function public.site_info(p_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; w jsonb; v_today date;
begin
  select * into s from public.studios st
  where st.active and (p_slug is null or st.slug = p_slug)
  order by st.created_at limit 1;
  if s.id is null then return null; end if;
  w := app.default_website() || coalesce(s.settings->'website', '{}'::jsonb);
  v_today := (now() at time zone coalesce(s.timezone, 'Asia/Kolkata'))::date;
  return jsonb_build_object(
    'studio', jsonb_build_object(
      'name', s.name, 'branch', s.branch_name, 'slug', s.slug, 'tag_line', s.tag_line, 'description', s.description,
      'mobile', s.mobile, 'landline', s.landline, 'email', s.email, 'street1', s.street1, 'street2', s.street2,
      'locality', s.locality, 'landmark', s.landmark,
      'city', s.city, 'state', s.state, 'pincode', s.pincode, 'facilities', to_jsonb(s.facilities),
      'logo_url', s.logo_url, 'currency', s.currency,
      'theme', coalesce(s.settings->'themes'->>'member', 'club'),
      'timings', s.settings->'timings',
      'can_sign_up', coalesce((s.settings->'app'->>'can_sign_up')::boolean, true)),
    'website', w,
    'services', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', coalesce(nullif(v.custom_name, ''), v.name), 'banner_url', v.banner_url)
                                order by v.sort, v.name), '[]'::jsonb)
      from public.services v where v.studio_id = s.id and v.active and v.show_in_app),
    'plans', case when coalesce((w->>'show_prices')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'kind', p.kind, 'tenure_value', p.tenure_value, 'tenure_unit', p.tenure_unit,
          'session_count', p.session_count, 'unlimited_sessions', p.unlimited_sessions, 'is_free_trial', p.is_free_trial,
          'price', p.price, 'discount_price', p.discount_price, 'total_price', p.total_price, 'image_url', p.image_url,
          'description', p.description,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (p.service_ids)))
        order by p.app_sequence, p.kind, p.total_price), '[]'::jsonb)
      from public.plans p where p.studio_id = s.id and p.active and p.show_in_app) else '[]'::jsonb end,
    'batches', case when coalesce((w->>'show_timings')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', b.id, 'name', b.name, 'start_time', b.start_time, 'end_time', b.end_time, 'days', to_jsonb(b.days), 'gender', b.gender,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (b.service_ids)))
        order by b.start_time, b.name), '[]'::jsonb)
      from public.batches b
      where b.studio_id = s.id and b.active
        and (b.end_date is null or b.end_date >= v_today)) else '[]'::jsonb end,
    'trainers', case when coalesce((w->>'show_trainers')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', t.id, 'name', t.full_name, 'title', t.title, 'designation', t.designation, 'years_experience', t.years_experience,
          'star', t.star_trainer, 'photo_url', case when t.photo_url ~ '^https?://' then t.photo_url end,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (t.service_ids)))
        order by t.star_trainer desc, t.years_experience desc nulls last, t.full_name), '[]'::jsonb)
      from public.staff t
      where t.studio_id = s.id and t.role = 'coach' and t.active and t.deleted_at is null and t.show_in_member_app) else '[]'::jsonb end,
    'results', case when coalesce((w->>'show_results')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'client_name', r.client_name, 'image_url', r.image_url, 'period_value', r.period_value, 'period_unit', r.period_unit,
          'title', r.title, 'description', r.description,
          'trainer', (select t.full_name from public.staff t where t.id = r.trainer_id))
        order by r.created_at desc), '[]'::jsonb)
      from public.transformations r where r.studio_id = s.id and r.consent and r.show_in_app) else '[]'::jsonb end
  );
end $$;
revoke all on function public.site_info(text) from public;
grant execute on function public.site_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants (as in part 4, plus: stored passwords are unreachable, feedback is added only
-- through send_feedback, device operations are never edited, and the website summary
-- stays open to visitors).
-- ---------------------------------------------------------------------------
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
  revoke insert, update, delete on public.activity_log, public.receipt_changes, public.member_medical,
    public.attendance_deletions, public.class_bookings from authenticated;
  revoke insert, update on public.payroll_entries from authenticated;
  revoke update on public.leave_requests from authenticated;
  revoke all on public.studio_secrets from authenticated;
  revoke insert, update, delete on public.app_feedback from authenticated;
  revoke update, delete on public.device_operations from authenticated;
  grant execute on function public.site_info(text) to anon;
end $$;
call app.apply_grants();
-- Shaan Fitness's fitness center details, app items and notices as set up in YDL (read 9 Oct 2026).
-- Fills in only what is still empty, so it is safe to run again and never overwrites the CRM's own
-- entries. Business details and public links only: owner, bank and staff personal details stay out.

update public.studios set
  street1 = coalesce(street1, 'Dr No. 3-17-32/9/FF, PNR Enclave, 5th Floor'),
  street2 = coalesce(street2, 'RTO Office Road'),
  locality = coalesce(locality, 'Godari Gunta'),
  landmark = coalesce(landmark, 'Near D-Mart'),
  pincode = coalesce(pincode, '533003'),
  tag_line = coalesce(tag_line, 'Your Trusted Health Partner'),
  capacity = case when capacity = 30 then 20 else capacity end,
  settings = jsonb_set(settings, '{website}', coalesce(settings->'website', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'facebook', case when coalesce(settings->'website'->>'facebook', '') = '' then 'https://www.facebook.com/ShaanFitnessGym' end,
    'instagram', case when coalesce(settings->'website'->>'instagram', '') = '' then 'https://www.instagram.com/shaanfitness.in' end,
    'twitter', case when coalesce(settings->'website'->>'twitter', '') = '' then 'https://x.com/ShaanFitnessGym' end,
    'youtube', case when coalesce(settings->'website'->>'youtube', '') = '' then 'https://www.youtube.com/@ShaanFitnessGym' end,
    'whatsapp', case when coalesce(settings->'website'->>'whatsapp', '') = '' then '+919642467896' end)))
where slug = 'shaan-fitness';

-- Fitness Center Timings: Monday to Saturday, 5 AM – 1 PM and 2 PM – 10 PM, everyone.
update public.studios set settings = jsonb_set(settings, '{timings}',
  '{"days": [1, 2, 3, 4, 5, 6], "sessions": [{"from": "05:00", "to": "13:00", "gender": "unisex"}, {"from": "14:00", "to": "22:00", "gender": "unisex"}]}'::jsonb)
where slug = 'shaan-fitness' and settings->'timings' is null;

-- YDL Email Manager (the password is never copied: the owner types it in Email Manager).
update public.studios set settings = jsonb_set(settings, '{email}', coalesce(settings->'email', '{}'::jsonb)
  || '{"host": "smtp.gmail.com", "port": 587, "security": "TLS", "username": "shaanfitnessgym@gmail.com", "sender_name": "Shaan Fitness Gym"}'::jsonb)
where slug = 'shaan-fitness' and coalesce(settings->'email'->>'host', '') = '';

-- YDL invoice and receipt numbering (SFG/00001/25-26 and SFG-R/00001/25-26), where ours were untouched.
update public.studios set settings = settings
  || jsonb_build_object('invoice', settings->'invoice' || '{"width": 5, "zero_fill": true, "restart": "year", "prefix": "SFG/", "suffix": "/25-26"}'::jsonb)
  || jsonb_build_object('receipt', settings->'receipt' || '{"width": 5, "zero_fill": true, "restart": "year", "prefix": "SFG-R/", "suffix": "/25-26"}'::jsonb)
where slug = 'shaan-fitness' and settings->'invoice'->>'prefix' = 'SF-INV-' and settings->'receipt'->>'prefix' = 'SF-';

-- The studio's ESSL face device (eTime server).
insert into public.biometric_devices (studio_id, serial, name, device_type, storage_types, scan_type, expiry_rule, server)
select s.id, 'CUB7235300639', 'Shaan Fitness Gym (Godari Gunta)', 'etime', '{customers}', 'face', true, 'ETIME'
from public.studios s where s.slug = 'shaan-fitness'
on conflict (studio_id, serial) do nothing;

-- Shaan Fitness's YDL action items and quick action items (own icons; YDL's pictures stay with YDL).
insert into public.app_actions (studio_id, kind, name, icon, color, active, link, show_to, ordering, created_at)
select s.id, a.kind, a.name, a.icon, a.color, true, a.link, 'both', 0, a.at::timestamptz
from public.studios s
cross join (values
  ('action', 'Browse Plans', 'browse_plans', '#000000', 'SUBSCRIPTIONS', '2024-03-09 10:00+05:30'),
  ('action', 'Track Workout', 'free_workout', '#000000', 'TRACK_WORKOUT', '2024-03-09 10:01+05:30'),
  ('action', 'Track Diet', 'track_diet', '#000000', 'DIET_PLAN', '2024-03-09 10:02+05:30'),
  ('action', 'Our Trainers', 'personal_trainer', '#000000', 'TRAINERS_LIST', '2024-03-09 10:03+05:30'),
  ('action', 'Recipes', 'recipes', '#000000', 'RECIPE_LIST', '2024-03-09 10:04+05:30'),
  ('action', 'About Us', 'browse_plans', '#000000', 'ABOUT_US', '2024-03-09 10:05+05:30'),
  ('action', 'Premium Free Trail', 'body_transformation', '#000000', 'FREE_TRIAL', '2024-03-22 10:00+05:30'),
  ('action', 'Friend Requests', 'refer_friend', '#000000', null, '2024-03-22 10:01+05:30'),
  ('action', 'Challenges', 'our_blogs', '#000000', 'CHALLENGE_LIST', '2024-04-02 10:00+05:30'),
  ('quick', 'Online Coach', null, '#ff0000', 'PT_TAB', '2024-04-08 10:00+05:30'),
  ('quick', 'Refer & Earn', 'claim_free_course', '#000000', null, '2025-04-01 10:00+05:30')
) as a(kind, name, icon, color, link, at)
where s.slug = 'shaan-fitness' and not exists (select 1 from public.app_actions x where x.studio_id = s.id);

-- Shaan Fitness's YDL notices.
insert into public.notices (studio_id, title, description, audience, active, created_at)
select s.id, n.title, n.description, 'customer', n.active, n.at::timestamptz
from public.studios s
cross join (values
  ('No Holiday on Ugadi & Ramadhan', E'Attention Shaan Fitness Gym Members!\n\nPush Through, No Pause on Progress!\n\nThis Ugadi and Ramadan, while we honor the festive spirit of our diverse team, we want to remind you that your fitness journey doesn''t take a holiday! \n\nPlease note:\n- Our Hindu trainers and staff will be celebrating Ugadi and will not be present.\n- Our Muslim trainers and staff will be observing Ramadan on their respective days.\n\nBut fear not, the gym will remain open for all members! This is your chance to show your dedication and keep the momentum going strong. Let''s turn these days into opportunities for self-improvement and personal victories.\n\nRemember, every day is a chance to be better than yesterday. So, let''s make these festive days count!\n\nYour Workout Waits for No One!\n\nStay strong, stay motivated, and most importantly, stay on track. We believe in you!\n\nShaan Fitness Gym Management', false, '2024-04-01 10:00+05:30'),
  ('Eid al-Fitr', 'Shaan Fitness Gym will be closed on 11th April for Eid-ul-Fitr. We’ll reopen on 12th April. Thanks for your understanding.', true, '2024-04-09 10:00+05:30'),
  ('Eid al-Fitr', 'Shaan Fitness Gym will be closed on 11th April for Eid-ul-Fitr. We’ll reopen on 12th April. Thanks for your understanding.', true, '2024-04-09 10:01+05:30')
) as n(title, description, active, at)
where s.slug = 'shaan-fitness' and not exists (select 1 from public.notices x where x.studio_id = s.id);
$u20261009000012$;
  insert into app.schema_migrations (version) values ('20261009000012_center');
end $bu20261009000012$;

commit;

select (select max(version) from app.schema_migrations) as latest,
       (select count(*) from public.plans where active) as active_plans,
       (select count(*) from public.batches where active) as active_batches,
       'Shaan Fitness database is up to date' as status;
