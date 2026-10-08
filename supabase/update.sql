-- Shaan Fitness · database update (after 20261008000007_member_billing)
-- Paste everything into Supabase → SQL Editor → New query, then click Run.
begin;

do $guard$ begin
  if to_regclass('app.schema_migrations') is null then raise exception 'This database is not set up yet. Run setup-all.sql instead.'; end if;
  if not exists (select 1 from app.schema_migrations where version = '20261008000007_member_billing') then
    raise exception 'This update needs % first. Ask Claude for the right update file.', '20261008000007_member_billing'; end if;
  if exists (select 1 from app.schema_migrations where version = '20261008000008_registers') then raise exception 'This update has already been run. Nothing was changed.'; end if;
end $guard$;

-- ===== 20261008000008_registers.sql =====
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

-- ===== replace-starter-plans.sql =====
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

-- ===== seed-ydl.sql =====
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

insert into app.schema_migrations (version) values ('20261008000008_registers') on conflict do nothing;

commit;

select (select string_agg(version, ', ' order by version) from app.schema_migrations where version > '20261008000007_member_billing') as added,
       (select count(*) from public.plans where active) as active_plans,
       (select count(*) from public.batches where active) as active_batches,
       'Shaan Fitness database is up to date' as status;
