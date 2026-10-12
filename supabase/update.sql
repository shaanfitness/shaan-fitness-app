-- Shaan Fitness · database update (up to 20261012000017_wallet_store)
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

-- ===== 20261011000013_analysis =====
do $bu20261011000013$ begin
  if exists (select 1 from app.schema_migrations where version = '20261011000013_analysis') then raise notice 'already has 20261011000013_analysis'; return; end if;
  execute $u20261011000013$
-- Shaan Fitness app · 13. Analysis: YDL's twenty analysis reports
-- Each report is one read-only function that returns its page's numbers as JSON, worked out
-- in the studio's own time zone. Each checks who is asking first: the owner always; front desk
-- staff only on the pages YDL gives them (Traffic, Members, Enquiry FollowUp Stage, Follow up,
-- Conversion, Enquiry and Daily Collection), unless the owner hid the page for their employee type.
--
-- Shared meanings (same as the dashboard and registers):
--   collection   = receipts (payments, not write-offs or refunds) that are not cancelled, by receipt date
--   a sale/bill  = a gym or PT subscription that is not deleted or cancelled, by invoice date
--   new/renewal  = the subscription's is_renewal flag (a client's first gym or first PT plan is new)
--   a conversion = a new (not renewal) gym or PT subscription
--   live         = a subscription that is active or frozen today

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function app.analysis_require(p_studio uuid, p_page text, p_desk boolean default false, p_key text default null)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if app.is_owner(p_studio) then return; end if;
  if p_desk and exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.deleted_at is null and s.role = 'front_desk'
      and not (coalesce(app.access_control(p_studio) -> 'nav_off' -> coalesce(s.access_type, 'front_desk_exec'), '[]'::jsonb) ? p_page)
      and (p_key is null or (coalesce(app.access_control(p_studio) -> coalesce(s.access_type, 'front_desk_exec') -> p_key, '[]'::jsonb) ? 'on'))
  ) then return; end if;
  raise exception 'You don''t have access to %. Ask the owner (Staff › Staff Access Control).', p_page using errcode = '42501';
end $$;

-- YDL's age bands; null outside them or when the date of birth is missing.
create or replace function app.age_group(p_dob date, p_today date)
returns text language sql immutable as $$
  select case
    when p_dob is null then null
    when a between 18 and 24 then '18-24' when a between 25 and 34 then '25-34' when a between 35 and 44 then '35-44'
    when a between 45 and 54 then '45-54' when a between 55 and 64 then '55-64' end
  from (select extract(year from age(p_today, p_dob))::int as a) x;
$$;

create or replace function app.member_levels(p_studio uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce((select array_agg(l.label order by l.sort) from public.list_items l
                   where l.studio_id = p_studio and l.list = 'member_level' and l.active),
                  array['Beginner', 'Intermediate', 'Advanced']);
$$;

-- Months of a year that have started (12 for past years) — YDL divides by these for averages.
create or replace function app.months_elapsed(p_studio uuid, p_year int)
returns int language sql stable security definer set search_path = '' as $$
  select case
    when p_year < extract(year from app.today(p_studio))::int then 12
    when p_year > extract(year from app.today(p_studio))::int then 0
    else extract(month from app.today(p_studio))::int end;
$$;

grant execute on function app.analysis_require(uuid, text, boolean, text), app.age_group(date, date), app.member_levels(uuid),
  app.months_elapsed(uuid, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Traffic Analysis (YDL /gym-traffic/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_traffic(p_studio uuid, p_from date, p_to date,
  p_genders text[] default '{}', p_ages text[] default '{}', p_levels text[] default '{}', p_week text default 'current')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date; v_tz text; v_cap int; v_mon date; v_levels text[];
begin
  perform app.analysis_require(p_studio, 'Traffic Analysis', true, 'traffic_insight');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  if p_to - p_from > 731 then raise exception 'Choose a range of up to two years'; end if;
  select s.timezone, s.capacity into v_tz, v_cap from public.studios s where s.id = p_studio;
  v_today := app.today(p_studio);
  v_mon := v_today - (extract(isodow from v_today)::int - 1) - case when p_week = 'last' then 7 else 0 end;
  v_levels := app.member_levels(p_studio);
  return (
    with m as (
      select m.id, m.gender, app.age_group(m.date_of_birth, v_today) as age, m.level
      from public.members m
      where m.studio_id = p_studio and m.deleted_at is null
        and (cardinality(coalesce(p_genders, '{}')) = 0 or m.gender = any (p_genders))
        and (cardinality(coalesce(p_ages, '{}')) = 0 or app.age_group(m.date_of_birth, v_today) = any (p_ages))
        and (cardinality(coalesce(p_levels, '{}')) = 0 or m.level = any (p_levels))
    ), a as (
      select a.member_id, a.date, a.check_out, m.gender, m.age, m.level,
             extract(hour from a.check_in at time zone v_tz)::int as h
      from public.attendance a join m on m.id = a.member_id
      where a.studio_id = p_studio and a.status = 'present'
    ), r as (select * from a where a.date between p_from and p_to)
    select jsonb_build_object(
      'today', v_today,
      'present', (select jsonb_build_object('total', count(*), 'male', count(*) filter (where gender = 'male'),
                    'female', count(*) filter (where gender = 'female'), 'other', count(*) filter (where gender = 'other'))
                  from a where a.date = v_today and a.check_out is null),
      'capacity', v_cap,
      'all_total', (select count(*) from a),
      'all_unique', (select count(distinct member_id) from a),
      'range_total', (select count(*) from r),
      'range_unique', (select count(distinct member_id) from r),
      'days', p_to - p_from + 1,
      'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', g.d, 'n', coalesce(c.n, 0)) order by g.d), '[]'::jsonb)
                from (select d::date as d from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d) g
                left join (select date, count(*) as n from r group by date) c on c.date = g.d),
      'parts', (select jsonb_build_object(
                  'morning', count(*) filter (where h >= 5 and h < 12), 'afternoon', count(*) filter (where h >= 12 and h < 17),
                  'evening', count(*) filter (where h >= 17 and h < 21), 'late_night', count(*) filter (where h >= 21 or h < 5)) from r),
      'gender', (select jsonb_build_object('male', count(*) filter (where gender = 'male'), 'female', count(*) filter (where gender = 'female'),
                   'other', count(*) filter (where gender = 'other'), 'unknown', count(*) filter (where gender is null)) from r),
      'ages', (select jsonb_agg(x order by k) from (
                 select g.g as k, jsonb_build_object('label', g.g, 'total', count(r.member_id),
                   'male', count(r.member_id) filter (where r.gender = 'male'), 'female', count(r.member_id) filter (where r.gender = 'female'),
                   'other', count(r.member_id) filter (where r.gender = 'other')) as x
                 from unnest(array['18-24', '25-34', '35-44', '45-54', '55-64']) g(g) left join r on r.age = g.g group by g.g) t),
      'levels', (select jsonb_agg(x order by k) from (
                 select g.i as k, jsonb_build_object('label', g.g, 'total', count(r.member_id),
                   'male', count(r.member_id) filter (where r.gender = 'male'), 'female', count(r.member_id) filter (where r.gender = 'female'),
                   'other', count(r.member_id) filter (where r.gender = 'other')) as x
                 from unnest(v_levels) with ordinality g(g, i) left join r on r.level = g.g group by g.g, g.i) t),
      'week_start', v_mon,
      'week', (select jsonb_agg(x order by k) from (
                 select g.d as k, jsonb_build_object('date', g.d, 'total', count(a.member_id),
                   'male', count(a.member_id) filter (where a.gender = 'male'), 'female', count(a.member_id) filter (where a.gender = 'female'),
                   'other', count(a.member_id) filter (where a.gender = 'other'), 'unknown', count(a.member_id) filter (where a.member_id is not null and a.gender is null)) as x
                 from (select (v_mon + i) as d from generate_series(0, 6) i) g left join a on a.date = g.d group by g.d) t)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 2. Members Analysis (YDL /gym-members-report/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_members(p_studio uuid, p_year int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date; v_levels text[];
begin
  perform app.analysis_require(p_studio, 'Members Analysis', true, 'members_insight');
  v_today := app.today(p_studio);
  v_levels := app.member_levels(p_studio);
  return (
    with m as (
      select m.id, m.gender, m.level, app.age_group(m.date_of_birth, v_today) as age,
             coalesce(m.joined_on, (m.converted_at at time zone 'Asia/Kolkata')::date, m.created_at::date) as joined
      from public.members m where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null
    ), s as (
      select s.member_id, s.start_date, s.end_date, app.subscription_state(s) as st
      from public.subscriptions s join m on m.id = s.member_id
      where s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null
    ), live as (
      select distinct member_id from s where st in ('active', 'frozen')
    ), bounced as (   -- members with no live or upcoming plan: days since their last plan ended
      select s.member_id, greatest(v_today - max(s.end_date), 0) as days
      from s group by s.member_id
      having not bool_or(s.st in ('active', 'frozen', 'pending'))
    ), att as (
      select a.member_id, max(a.date) as last_date
      from public.attendance a join m on m.id = a.member_id where a.status = 'present' group by a.member_id
    ), firsts as (
      select member_id, min(start_date) as first_start from s group by member_id
    ), st as (
      select m.*, (l.member_id is not null) as is_live,
        case when t.member_id is null then 'never' when t.last_date >= v_today - 14 then 'active' else 'inactive' end as checkins
      from m left join live l on l.member_id = m.id left join att t on t.member_id = m.id
    )
    select jsonb_build_object(
      'today', v_today,
      'members', (select jsonb_build_object('total', count(*), 'male', count(*) filter (where gender = 'male'),
                    'female', count(*) filter (where gender = 'female'), 'other', count(*) filter (where gender = 'other')) from st),
      'live', (select jsonb_build_object('total', count(*), 'male', count(*) filter (where gender = 'male'),
                 'female', count(*) filter (where gender = 'female'), 'other', count(*) filter (where gender = 'other')) from st where is_live),
      'bounced', (select jsonb_build_object('d7', count(*) filter (where days <= 7), 'd15', count(*) filter (where days <= 15),
                    'd30', count(*) filter (where days <= 30), 'over30', count(*) filter (where days > 30)) from bounced),
      'new_30', (select count(*) from m where joined > v_today - 30 and joined <= v_today),
      'status', (select jsonb_object_agg(c, jsonb_build_object('total', n, 'male', nm, 'female', nf, 'other', no_)) from (
                   select c.c, count(st.id) as n, count(st.id) filter (where st.gender = 'male') as nm,
                     count(st.id) filter (where st.gender = 'female') as nf, count(st.id) filter (where st.gender = 'other') as no_
                   from unnest(array['active', 'inactive', 'never']) c(c) left join st on st.checkins = c.c group by c.c) t),
      'ages', (select jsonb_agg(x order by k) from (
                 select g.g as k, jsonb_build_object('label', g.g, 'total', count(m.id), 'male', count(m.id) filter (where m.gender = 'male'),
                   'female', count(m.id) filter (where m.gender = 'female'), 'other', count(m.id) filter (where m.gender = 'other')) as x
                 from unnest(array['18-24', '25-34', '35-44', '45-54', '55-64']) g(g) left join m on m.age = g.g group by g.g) t),
      'levels', (select jsonb_agg(x order by k) from (
                 select g.i as k, jsonb_build_object('label', g.g, 'total', count(m.id), 'male', count(m.id) filter (where m.gender = 'male'),
                   'female', count(m.id) filter (where m.gender = 'female'), 'other', count(m.id) filter (where m.gender = 'other')) as x
                 from unnest(v_levels) with ordinality g(g, i) left join m on m.level = g.g group by g.g, g.i) t),
      'year', p_year,
      'months', (select jsonb_agg(jsonb_build_object('month', k,
                   'new_active', case when ms > v_today then 0 else (select count(*) from firsts f where f.first_start between ms and me) end,
                   'all_active', case when ms > v_today then 0 else (select count(distinct s.member_id) from s
                                   where s.start_date <= me and s.end_date >= ms and s.st not in ('transferred', 'upgraded', 'downgraded')) end) order by k)
                 from (select k, make_date(p_year, k, 1) as ms, (make_date(p_year, k, 1) + interval '1 month')::date - 1 as me
                       from generate_series(1, 12) k) mm)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. Enquiry FollowUp Stage Analysis (YDL /gym-enquiry-report/)
--    Stage of each open enquiry: on a trial, expected to join (convertibility "Expected"), or still in follow-up.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_enquiry_stages(p_studio uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date; v_levels text[]; v_expected text[];
begin
  perform app.analysis_require(p_studio, 'Enquiry FollowUp Stage Analysis', true);
  v_today := app.today(p_studio);
  v_levels := app.member_levels(p_studio);
  select coalesce(array_agg(lower(l.label)), '{}') || array['expected'] into v_expected
  from public.list_items l where l.studio_id = p_studio and l.list = 'convertibility' and l.kind = 'expected';
  return (
    with e as (
      select m.id, m.gender, m.level, m.lead_status, m.enquiry_date, app.age_group(m.date_of_birth, v_today) as age,
        case when m.lead_status <> 'open' then null
             when exists (select 1 from public.subscriptions s where s.member_id = m.id and s.kind = 'trial' and s.deleted_at is null and s.cancelled_at is null) then 'trial'
             when lower(coalesce(m.convertibility, '')) = any (v_expected) then 'expected'
             else 'followup' end as stage
      from public.members m where m.studio_id = p_studio and m.kind = 'enquiry' and m.deleted_at is null
    )
    select jsonb_build_object(
      'enquiries', (select jsonb_build_object('total', count(*), 'male', count(*) filter (where gender = 'male'),
                      'female', count(*) filter (where gender = 'female'), 'other', count(*) filter (where gender = 'other')) from e),
      'stages', (select jsonb_object_agg(c, jsonb_build_object('total', n, 'male', nm, 'female', nf, 'other', no_)) from (
                   select c.c, count(e.id) as n, count(e.id) filter (where e.gender = 'male') as nm,
                     count(e.id) filter (where e.gender = 'female') as nf, count(e.id) filter (where e.gender = 'other') as no_
                   from unnest(array['followup', 'trial', 'expected']) c(c) left join e on e.stage = c.c group by c.c) t),
      'not_interested', (select count(*) from e where lead_status = 'not_interested'),
      'new_30', (select count(*) from e where enquiry_date > v_today - 30 and enquiry_date <= v_today),
      'ages', (select jsonb_agg(x order by k) from (
                 select g.g as k, jsonb_build_object('label', g.g, 'total', count(e.id), 'male', count(e.id) filter (where e.gender = 'male'),
                   'female', count(e.id) filter (where e.gender = 'female'), 'other', count(e.id) filter (where e.gender = 'other')) as x
                 from unnest(array['18-24', '25-34', '35-44', '45-54', '55-64']) g(g) left join e on e.age = g.g group by g.g) t),
      'levels', (select jsonb_agg(x order by k) from (
                 select g.i as k, jsonb_build_object('label', g.g, 'total', count(e.id), 'male', count(e.id) filter (where e.gender = 'male'),
                   'female', count(e.id) filter (where e.gender = 'female'), 'other', count(e.id) filter (where e.gender = 'other')) as x
                 from unnest(v_levels) with ordinality g(g, i) left join e on e.level = g.g group by g.g, g.i) t)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Collections for a period, split the way YDL's Collection, Billing and P&L pages split them.
-- p_filter (Billing Analysis): plan, service, created_by, mode, status (paid|cancelled), client_rep,
-- gender, sub_status (active|pending|expired), batch.
-- ---------------------------------------------------------------------------
create or replace function app.collection_rows(p_studio uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns table (amount numeric, mode text, purpose text, kind text, is_renewal boolean, source text, bill_rep uuid, client_rep uuid,
               added_by uuid, receipt_date date, subscription_id uuid, member_id uuid)
language sql stable security definer set search_path = '' as $$
  select x.amount, coalesce(nullif(trim(x.mode), ''), 'Not given'), x.purpose,
    case when x.purpose <> 'subscription' or s.id is null then 'other' when s.kind = 'trial' then 'gym' else s.kind end,
    coalesce(s.is_renewal, false), coalesce(nullif(trim(m.source_promotion), ''), 'Unknown'),
    coalesce(x.bill_rep_id, s.bill_rep_id), s.client_rep_id, x.added_by, x.receipt_date, s.id, x.member_id
  from public.payments x
  join public.members m on m.id = x.member_id
  left join public.subscriptions s on s.id = x.subscription_id
  left join public.plans p on p.id = s.plan_id
  where x.studio_id = p_studio and x.kind = 'payment' and x.receipt_date between p_from and p_to
    and x.status = case when coalesce(p_filter->>'status', '') = 'cancelled' then 'cancelled' else 'paid' end
    and (coalesce(p_filter->>'plan', '') = '' or s.plan_id = (p_filter->>'plan')::uuid)
    and (coalesce(p_filter->>'service', '') = '' or (p_filter->>'service')::uuid = any (p.service_ids))
    and (coalesce(p_filter->>'created_by', '') = '' or x.added_by = (p_filter->>'created_by')::uuid)
    and (coalesce(p_filter->>'mode', '') = '' or lower(x.mode) = lower(p_filter->>'mode'))
    and (coalesce(p_filter->>'client_rep', '') = '' or s.client_rep_id = (p_filter->>'client_rep')::uuid)
    and (coalesce(p_filter->>'bill_rep', '') = '' or coalesce(x.bill_rep_id, s.bill_rep_id) = (p_filter->>'bill_rep')::uuid)
    and (coalesce(p_filter->>'gender', '') = '' or m.gender = p_filter->>'gender')
    and (coalesce(p_filter->>'batch', '') = '' or s.batch_id = (p_filter->>'batch')::uuid)
    and (coalesce(p_filter->>'sub_status', '') = '' or (s.id is not null and case p_filter->>'sub_status'
           when 'active' then app.subscription_state(s) in ('active', 'frozen')
           when 'pending' then app.subscription_state(s) = 'pending'
           when 'expired' then app.subscription_state(s) in ('expired', 'used') else true end));
$$;
revoke execute on function app.collection_rows(uuid, date, date, jsonb) from public;

-- Gym/PT × new/renewal, by payment mode and by the client's source of promotion.
create or replace function app.collection_summary(p_studio uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns jsonb language sql stable security definer set search_path = '' as $$
  with x as (select * from app.collection_rows(p_studio, p_from, p_to, p_filter))
  select jsonb_build_object(
    'services', (select jsonb_build_object(
        'gym_new', coalesce(sum(amount) filter (where kind = 'gym' and not is_renewal), 0),
        'gym_renewal', coalesce(sum(amount) filter (where kind = 'gym' and is_renewal), 0),
        'pt_new', coalesce(sum(amount) filter (where kind = 'pt' and not is_renewal), 0),
        'pt_renewal', coalesce(sum(amount) filter (where kind = 'pt' and is_renewal), 0),
        'other', coalesce(sum(amount) filter (where kind = 'other'), 0),
        'total', coalesce(sum(amount), 0), 'receipts', count(*)) from x),
    'modes', (select coalesce(jsonb_agg(jsonb_build_object('label', mode, 'amount', amt, 'n', n) order by amt desc, mode), '[]'::jsonb)
              from (select mode, sum(amount) as amt, count(*) as n from x group by mode) t),
    'promotion', (select coalesce(jsonb_agg(jsonb_build_object('label', source, 'amount', amt, 'n', n) order by amt desc, source), '[]'::jsonb)
                  from (select source, sum(amount) as amt, count(*) as n from x group by source) t)
  );
$$;
revoke execute on function app.collection_summary(uuid, date, date, jsonb) from public;

-- Collections per staff member (bill rep, client rep or receipt maker), split gym/PT × new/renewal.
create or replace function app.collection_by_staff(p_studio uuid, p_from date, p_to date, p_filter jsonb, p_by text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with x as (select *, case p_by when 'bill_rep' then bill_rep when 'client_rep' then client_rep else added_by end as who
             from app.collection_rows(p_studio, p_from, p_to, p_filter))
  select coalesce(jsonb_agg(jsonb_build_object('staff_id', t.who, 'name', coalesce(st.full_name, 'Not set'), 'staff_code', st.staff_code,
           'role', st.role, 'pt_renewal', t.pt_r, 'pt_new', t.pt_n, 'gym_renewal', t.gym_r, 'gym_new', t.gym_n, 'other', t.oth, 'total', t.total)
         order by t.total desc, st.full_name), '[]'::jsonb)
  from (select who, coalesce(sum(amount) filter (where kind = 'pt' and is_renewal), 0) as pt_r, coalesce(sum(amount) filter (where kind = 'pt' and not is_renewal), 0) as pt_n,
          coalesce(sum(amount) filter (where kind = 'gym' and is_renewal), 0) as gym_r, coalesce(sum(amount) filter (where kind = 'gym' and not is_renewal), 0) as gym_n,
          coalesce(sum(amount) filter (where kind = 'other'), 0) as oth, sum(amount) as total
        from x group by who) t
  left join public.staff st on st.id = t.who;
$$;
revoke execute on function app.collection_by_staff(uuid, date, date, jsonb, text) from public;

-- ---------------------------------------------------------------------------
-- 4. Collection Analysis (YDL /gym-collection-analysis/): one side of "This v/s That".
-- ---------------------------------------------------------------------------
create or replace function public.analysis_collection(p_studio uuid, p_from date, p_to date, p_client_rep uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Collection Analysis');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return app.collection_summary(p_studio, p_from, p_to,
    case when p_client_rep is null then '{}'::jsonb else jsonb_build_object('client_rep', p_client_rep) end);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Subscriptions Analysis (YDL /gym-subscription-analysis/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_subscriptions(p_studio uuid, p_year int, p_from date default null, p_to date default null,
  p_client_rep uuid default null, p_gender text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_n int;
begin
  perform app.analysis_require(p_studio, 'Subscriptions Analysis', true, 'subscription_insight');
  v_n := greatest(app.months_elapsed(p_studio, p_year), 1);
  return (
    with y as (
      select s.kind, extract(month from s.invoice_date)::int as k
      from public.subscriptions s
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null
        and s.invoice_date >= make_date(p_year, 1, 1) and s.invoice_date < make_date(p_year + 1, 1, 1)
    ), months as (
      select k, count(y.k) filter (where y.kind = 'gym') as gym, count(y.k) filter (where y.kind = 'pt') as pt
      from generate_series(1, 12) k left join y using (k) group by k
    ), o as (
      select o.plan_id, o.state, o.total_amount, o.paid_amount, o.balance_amount
      from public.subscription_overview o
      where o.studio_id = p_studio and o.kind in ('gym', 'pt', 'trial') and o.deleted_at is null and o.cancelled_at is null
        and (p_from is null or o.invoice_date >= p_from) and (p_to is null or o.invoice_date <= p_to)
        and (p_client_rep is null or o.client_rep_id = p_client_rep)
        and (coalesce(p_gender, '') = '' or o.member_gender = p_gender)
    )
    select jsonb_build_object(
      'year', p_year, 'months_elapsed', v_n,
      'months', (select jsonb_agg(jsonb_build_object('month', k, 'gym', gym, 'pt', pt, 'total', gym + pt) order by k) from months),
      'average', (select jsonb_build_object('total', round(sum(gym + pt)::numeric / v_n, 1), 'gym', round(sum(gym)::numeric / v_n, 1),
                    'pt', round(sum(pt)::numeric / v_n, 1)) from months),
      'max', (select jsonb_build_object('month', k, 'total', gym + pt) from months order by gym + pt desc, k limit 1),
      'plans', (select coalesce(jsonb_agg(jsonb_build_object('plan_id', p.id, 'name', p.name, 'active_plan', p.active,
                   'subscriptions', t.n, 'active', t.act, 'pending', t.pen, 'inactive', t.ina,
                   'billing', t.bill, 'received', t.paid, 'balance', t.bal) order by t.n desc, p.name), '[]'::jsonb)
                from public.plans p
                join (select plan_id, count(*) as n, count(*) filter (where state in ('active', 'frozen')) as act,
                        count(*) filter (where state = 'pending') as pen, count(*) filter (where state in ('expired', 'used')) as ina,
                        sum(total_amount) as bill, sum(paid_amount) as paid, sum(balance_amount) as bal
                      from o group by plan_id) t on t.plan_id = p.id)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 6. Follow up Analysis (YDL /followup-analysis/), by due date.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_follow_ups(p_studio uuid, p_from date, p_to date, p_staff uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tz text;
begin
  perform app.analysis_require(p_studio, 'Follow up Analysis', true);
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  select s.timezone into v_tz from public.studios s where s.id = p_studio;
  return (
    with f as (
      select f.status, f.assigned_to,
        case
          when k.kind in ('enquiry', 'balance_due', 'renewal', 'birthday', 'anniversary', 'feedback', 'freeze', 'measurement', 'pt_renewal', 'irregular') then k.kind
          when k.kind in ('trial', 'pt_trial') then 'trial'
          when lower(f.type) = 'commitment' then 'commitment'
          else 'other' end as grp
      from public.follow_ups f
      join public.members m on m.id = f.member_id and m.deleted_at is null
      left join public.list_items k on k.studio_id = f.studio_id and k.list = 'followup_type' and k.label = f.type
      where f.studio_id = p_studio and (f.due_at at time zone v_tz)::date between p_from and p_to
        and (p_staff is null or f.assigned_to = p_staff)
    )
    select jsonb_build_object(
      'status', (select jsonb_build_object('open', count(*) filter (where status = 'open'), 'successful', count(*) filter (where status = 'successful'),
                   'not_interested', count(*) filter (where status = 'not_interested'), 'done', count(*) filter (where status = 'done'), 'total', count(*)) from f),
      'types', (select jsonb_object_agg(g, n) from (
                  select g.g, count(f.grp) as n
                  from unnest(array['enquiry', 'balance_due', 'renewal', 'birthday', 'anniversary', 'feedback', 'freeze', 'measurement',
                                    'pt_renewal', 'irregular', 'trial', 'other', 'commitment']) g(g)
                  left join f on f.grp = g.g group by g.g) t),
      'staff', (select coalesce(jsonb_agg(jsonb_build_object('staff_id', t.assigned_to, 'name', coalesce(st.full_name, 'Not assigned'),
                   'open', t.o, 'successful', t.s, 'not_interested', t.ni, 'done', t.d, 'total', t.n) order by t.n desc, st.full_name), '[]'::jsonb)
                from (select assigned_to, count(*) filter (where status = 'open') as o, count(*) filter (where status = 'successful') as s,
                        count(*) filter (where status = 'not_interested') as ni, count(*) filter (where status = 'done') as d, count(*) as n
                      from f group by assigned_to) t
                left join public.staff st on st.id = t.assigned_to)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 7. Conversion Analysis (YDL /conversion-analysis/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_conversion(p_studio uuid, p_year int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Conversion Analysis', true);
  return (
    with e as (
      select m.id, m.enquiry_date from public.members m
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null
    ), c as (
      select s.member_id, s.kind, s.invoice_date, s.total_amount
      from public.subscriptions s
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and not s.is_renewal and s.deleted_at is null and s.cancelled_at is null
        and s.invoice_date >= make_date(p_year, 1, 1) and s.invoice_date < make_date(p_year + 1, 1, 1)
    ), mm as (
      select k, make_date(p_year, k, 1) as ms, (make_date(p_year, k, 1) + interval '1 month')::date - 1 as me from generate_series(1, 12) k
    )
    select jsonb_build_object(
      'year', p_year,
      'ratio', (select jsonb_build_object('enquiries', count(*), 'converted', count(*) filter (where m.kind = 'member'))
                from public.members m where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null),
      'months', (select jsonb_agg(jsonb_build_object('month', mm.k,
                   'enquiries', (select count(*) from e where e.enquiry_date between mm.ms and mm.me),
                   'same_month', (select jsonb_build_object('n', count(*), 'amount', coalesce(sum(c.total_amount), 0))
                                  from c join e on e.id = c.member_id where c.invoice_date between mm.ms and mm.me and e.enquiry_date between mm.ms and mm.me),
                   'overall', (select jsonb_build_object('n', count(*), 'amount', coalesce(sum(c.total_amount), 0)) from c where c.invoice_date between mm.ms and mm.me),
                   'gym', (select jsonb_build_object('n', count(*), 'amount', coalesce(sum(c.total_amount), 0)) from c where c.kind = 'gym' and c.invoice_date between mm.ms and mm.me),
                   'pt', (select jsonb_build_object('n', count(*), 'amount', coalesce(sum(c.total_amount), 0)) from c where c.kind = 'pt' and c.invoice_date between mm.ms and mm.me)
                 ) order by mm.k) from mm)
    )
  );
end $$;

-- One side of "This v/s That": conversions in a period, optionally for one client rep.
create or replace function public.analysis_conversion_compare(p_studio uuid, p_from date, p_to date, p_staff uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Conversion Analysis', true);
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return (
    with c as (
      select s.id, s.member_id, s.created_at, m.gender, coalesce(nullif(trim(m.source_promotion), ''), 'Unknown') as source,
        (select count(*) from public.follow_ups f where f.member_id = s.member_id and f.created_at <= s.created_at) as fus
      from public.subscriptions s join public.members m on m.id = s.member_id and m.deleted_at is null
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and not s.is_renewal and s.deleted_at is null and s.cancelled_at is null
        and s.invoice_date between p_from and p_to and (p_staff is null or s.client_rep_id = p_staff)
    )
    select jsonb_build_object(
      'total', (select count(*) from c), 'male', (select count(*) from c where gender = 'male'),
      'female', (select count(*) from c where gender = 'female'), 'other', (select count(*) from c where gender = 'other'),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('label', source, 'n', n) order by n desc, source), '[]'::jsonb)
                  from (select source, count(*) as n from c group by source) t),
      'followups', (select jsonb_build_object('b0_1', count(*) filter (where fus <= 1), 'b2_5', count(*) filter (where fus between 2 and 5),
                      'b6_10', count(*) filter (where fus between 6 and 10), 'over10', count(*) filter (where fus > 10)) from c)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 8. Enquiry Analysis (YDL /enquiry-analysis/)
--    "Bounced" enquiries: open ones nobody has touched (no follow-up due ahead) for 15 days or more.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_enquiries(p_studio uuid, p_year int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date; v_tz text; v_n int;
begin
  perform app.analysis_require(p_studio, 'Enquiry Analysis', true);
  v_today := app.today(p_studio);
  select s.timezone into v_tz from public.studios s where s.id = p_studio;
  v_n := greatest(app.months_elapsed(p_studio, p_year), 1);
  return (
    with cur as (
      select m.id, m.gender, m.lead_status, m.enquiry_date,
        v_today - greatest(m.enquiry_date, coalesce((select max(greatest((f.due_at at time zone v_tz)::date, coalesce((f.responded_at at time zone v_tz)::date, '-infinity'::date)))
                                                     from public.follow_ups f where f.member_id = m.id and (f.due_at at time zone v_tz)::date <= v_today), m.enquiry_date)) as idle,
        exists (select 1 from public.follow_ups f where f.member_id = m.id and f.status = 'open' and (f.due_at at time zone v_tz)::date >= v_today) as planned
      from public.members m where m.studio_id = p_studio and m.kind = 'enquiry' and m.deleted_at is null
    ), added as (
      select m.enquiry_date from public.members m
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null
    ), b as (select idle from cur where lead_status = 'open' and not planned and idle >= 15)
    select jsonb_build_object(
      'year', p_year, 'months_elapsed', v_n,
      'total', (select count(*) from cur), 'open', (select count(*) from cur where lead_status = 'open'),
      'not_interested', (select count(*) from cur where lead_status = 'not_interested'),
      'bounced', (select jsonb_build_object('d15_30', count(*) filter (where idle < 30), 'd30_60', count(*) filter (where idle >= 30 and idle < 60),
                    'd60_90', count(*) filter (where idle >= 60 and idle < 90), 'over90', count(*) filter (where idle >= 90)) from b),
      'new_30', (select count(*) from added where enquiry_date > v_today - 30 and enquiry_date <= v_today),
      'gender', (select jsonb_build_object(
                   'total', jsonb_build_object('male', count(*) filter (where gender = 'male'), 'female', count(*) filter (where gender = 'female'), 'other', count(*) filter (where gender = 'other')),
                   'open', jsonb_build_object('male', count(*) filter (where gender = 'male' and lead_status = 'open'), 'female', count(*) filter (where gender = 'female' and lead_status = 'open'),
                                              'other', count(*) filter (where gender = 'other' and lead_status = 'open')),
                   'not_interested', jsonb_build_object('male', count(*) filter (where gender = 'male' and lead_status = 'not_interested'),
                                              'female', count(*) filter (where gender = 'female' and lead_status = 'not_interested'),
                                              'other', count(*) filter (where gender = 'other' and lead_status = 'not_interested'))) from cur),
      'months', (select jsonb_agg(jsonb_build_object('month', k, 'n', (select count(*) from added a where extract(year from a.enquiry_date) = p_year
                   and extract(month from a.enquiry_date) = k)) order by k) from generate_series(1, 12) k),
      'average', (select round(count(*)::numeric / v_n, 1) from added a where extract(year from a.enquiry_date) = p_year)
    )
  );
end $$;

-- One side of "This v/s That": enquiries added in a period, optionally by one staff member.
create or replace function public.analysis_enquiry_compare(p_studio uuid, p_from date, p_to date, p_staff uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Enquiry Analysis', true);
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return (
    with e as (
      select m.id, m.gender, m.kind, coalesce(nullif(trim(m.source_promotion), ''), 'Unknown') as source,
        coalesce(nullif(initcap(trim(m.city)), ''), 'Not given') as city,
        (select count(*) from public.follow_ups f where f.member_id = m.id) as fus
      from public.members m
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null
        and m.enquiry_date between p_from and p_to and (p_staff is null or m.added_by = p_staff)
    )
    select jsonb_build_object(
      'total', (select count(*) from e), 'male', (select count(*) from e where gender = 'male'),
      'female', (select count(*) from e where gender = 'female'), 'other', (select count(*) from e where gender = 'other'),
      'converted', (select count(*) from e where kind = 'member'),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('label', source, 'n', n) order by n desc, source), '[]'::jsonb)
                  from (select source, count(*) as n from e group by source) t),
      'followups', (select jsonb_build_object('b0_1', count(*) filter (where fus <= 1), 'b2_5', count(*) filter (where fus between 2 and 5),
                      'b6_10', count(*) filter (where fus between 6 and 10), 'over10', count(*) filter (where fus > 10)) from e),
      'locations', (select coalesce(jsonb_agg(jsonb_build_object('label', city, 'n', n) order by n desc, city), '[]'::jsonb)
                    from (select city, count(*) as n from e group by city) t)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 9. Enquiry Conversion Report (YDL /staff-conversion-analysis/): per staff member.
--    Enquiries they added in the period and how many joined; bills where they are the client rep.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_enquiry_conversion(p_studio uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Enquiry Conversion Report');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return (
    with e as (
      select m.added_by as who, count(*) as enq, count(*) filter (where m.kind = 'member') as conv
      from public.members m
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null and m.enquiry_date between p_from and p_to
      group by m.added_by
    ), s as (
      select o.client_rep_id as who, count(*) as units, count(*) filter (where o.kind = 'pt') as pt_n,
        coalesce(sum(o.total_amount) filter (where o.kind = 'pt'), 0) as pt_amt, count(*) filter (where o.kind = 'gym') as gym_n,
        coalesce(sum(o.total_amount) filter (where o.kind = 'gym'), 0) as gym_amt,
        sum(o.total_amount) as sale, sum(o.paid_amount) as received, sum(o.balance_amount) as balance
      from public.subscription_overview o
      where o.studio_id = p_studio and o.kind in ('gym', 'pt') and o.deleted_at is null and o.cancelled_at is null
        and o.invoice_date between p_from and p_to
      group by o.client_rep_id
    ), j as (   -- one row per person (or "not set"), from either side
      select who, sum(enq) as enq, sum(conv) as conv, sum(units) as units, sum(pt_n) as pt_n, sum(pt_amt) as pt_amt,
        sum(gym_n) as gym_n, sum(gym_amt) as gym_amt, sum(sale) as sale, sum(received) as received, sum(balance) as balance
      from (select who, enq, conv, 0 as units, 0 as pt_n, 0 as pt_amt, 0 as gym_n, 0 as gym_amt, 0 as sale, 0 as received, 0 as balance from e
            union all
            select who, 0, 0, units, pt_n, pt_amt, gym_n, gym_amt, sale, received, balance from s) u
      group by who
    )
    select coalesce(jsonb_agg(jsonb_build_object('staff_id', j.who, 'name', coalesce(st.full_name, 'Not set'), 'staff_code', st.staff_code,
             'enquiries', j.enq, 'conversions', j.conv, 'units', j.units, 'pt_units', j.pt_n, 'pt_amount', j.pt_amt,
             'gym_units', j.gym_n, 'gym_amount', j.gym_amt, 'sale', j.sale, 'received', j.received, 'balance', j.balance)
           order by j.sale desc, j.enq desc, st.full_name), '[]'::jsonb)
    from j left join public.staff st on st.id = j.who
  );
end $$;

-- ---------------------------------------------------------------------------
-- Expenses for a period, the way YDL splits them: salary (Payroll Register, plus Salary
-- expenses typed by hand) and vendor expenses (everything else on the Expense page).
-- ---------------------------------------------------------------------------
create or replace function app.expense_rows(p_studio uuid, p_from date, p_to date)
returns table (d date, amount numeric, salary boolean, staff_id uuid, vendor_id uuid, category text)
language sql stable security definer set search_path = '' as $$
  select pe.paid_date, pe.payable, true, pe.staff_id, null::uuid, 'Salary'
  from public.payroll_entries pe
  where pe.studio_id = p_studio and pe.paid_date between p_from and p_to
  union all
  select e.expense_date, e.final_amount, lower(e.category) in ('salary', 'advance salary'), null, e.vendor_id, e.category
  from public.expenses e
  where e.studio_id = p_studio and e.expense_date between p_from and p_to
    and not exists (select 1 from public.payroll_entries pe where pe.expense_id = e.id);
$$;
revoke execute on function app.expense_rows(uuid, date, date) from public;

-- ---------------------------------------------------------------------------
-- 10. Expense Analysis (YDL /gym-expense-analysis/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_expenses(p_studio uuid, p_year int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Expense Analysis');
  return (
    with x as (select extract(month from d)::int as k, amount from app.expense_rows(p_studio, make_date(p_year, 1, 1), make_date(p_year, 12, 31))),
    months as (select k, coalesce(sum(x.amount), 0) as amount, count(x.k) as n from generate_series(1, 12) k left join x using (k) group by k)
    select jsonb_build_object(
      'year', p_year,
      'months', (select jsonb_agg(jsonb_build_object('month', k, 'amount', amount, 'n', n) order by k) from months),
      'year_avg', (select jsonb_build_object('amount', round(sum(amount) / 12, 2), 'n', sum(n)) from months),
      'quarters', (select jsonb_agg(jsonb_build_object('quarter', q, 'amount', round(a / 3, 2), 'n', n) order by q) from (
                     select (k - 1) / 3 + 1 as q, sum(amount) as a, sum(n) as n from months group by 1) t)
    )
  );
end $$;

-- One side of "This v/s That".
create or replace function public.analysis_expense_compare(p_studio uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Expense Analysis');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return (
    with x as (
      select r.*, st.role, st.employee_type, st.access_type, v.name as vendor
      from app.expense_rows(p_studio, p_from, p_to) r
      left join public.staff st on st.id = r.staff_id
      left join public.vendors v on v.id = r.vendor_id
    ), sal as (
      select amount, case when role in ('coach', 'doctor') then 'trainer' when role is not null then 'staff' else 'unlinked' end as who,
        case when role in ('coach', 'doctor') then coalesce(nullif(employee_type, ''), case when role = 'doctor' then 'Doctor' else 'Trainer' end)
             when role = 'owner' then 'Gym Owner'
             else case access_type when 'manager' then 'Manager' when 'floor_manager' then 'Floor Manager' when 'admin' then 'Admin'
                    when 'sales' then 'Sales' when 'helper' then 'Helper' when 'sales_manager' then 'Sales Manager' when 'hr' then 'HR'
                    else 'Front Desk Executive' end end as type
      from x where salary
    )
    select jsonb_build_object(
      'salary', (select coalesce(sum(amount), 0) from x where salary),
      'vendor', (select coalesce(sum(amount), 0) from x where not salary),
      'total', (select coalesce(sum(amount), 0) from x),
      'trainer', (select coalesce(sum(amount), 0) from sal where who = 'trainer'),
      'staff', (select coalesce(sum(amount), 0) from sal where who = 'staff'),
      'unlinked', (select coalesce(sum(amount), 0) from sal where who = 'unlinked'),
      'staff_types', (select coalesce(jsonb_agg(jsonb_build_object('label', type, 'amount', a) order by a desc, type), '[]'::jsonb)
                      from (select type, sum(amount) as a from sal where who = 'staff' group by type) t),
      'trainer_types', (select coalesce(jsonb_agg(jsonb_build_object('label', type, 'amount', a) order by a desc, type), '[]'::jsonb)
                        from (select type, sum(amount) as a from sal where who = 'trainer' group by type) t),
      'vendors', (select coalesce(jsonb_agg(jsonb_build_object('label', vendor, 'amount', a) order by a desc, vendor), '[]'::jsonb)
                  from (select vendor, sum(amount) as a from x where not salary and vendor is not null group by vendor) t),
      'non_registered', (select coalesce(sum(amount), 0) from x where not salary and vendor is null),
      'categories', (select coalesce(jsonb_agg(jsonb_build_object('label', category, 'amount', a) order by a desc, category), '[]'::jsonb)
                     from (select category, sum(amount) as a from x where not salary group by category) t)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 11. Profit & Loss Analysis (YDL /profit-loss-analysis/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_profit_loss(p_studio uuid, p_year int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.analysis_require(p_studio, 'Profit & Loss Analysis');
  return (
    with c as (select extract(month from receipt_date)::int as k, amount, kind, is_renewal
               from app.collection_rows(p_studio, make_date(p_year, 1, 1), make_date(p_year, 12, 31), '{}')),
    x as (select extract(month from d)::int as k, amount, salary from app.expense_rows(p_studio, make_date(p_year, 1, 1), make_date(p_year, 12, 31))),
    months as (
      select k,
        (select coalesce(sum(amount), 0) from c where c.k = g.k and c.kind <> 'other' and not c.is_renewal) as new,
        (select coalesce(sum(amount), 0) from c where c.k = g.k and c.kind <> 'other' and c.is_renewal) as renewal,
        (select coalesce(sum(amount), 0) from c where c.k = g.k and c.kind = 'other') as other,
        (select coalesce(sum(amount), 0) from x where x.k = g.k and x.salary) as salary,
        (select coalesce(sum(amount), 0) from x where x.k = g.k and not x.salary) as vendor
      from generate_series(1, 12) g(k)
    )
    select jsonb_build_object(
      'year', p_year,
      'months', (select jsonb_agg(jsonb_build_object('month', k, 'new', new, 'renewal', renewal, 'other', other, 'collection', new + renewal + other,
                   'salary', salary, 'vendor', vendor, 'expense', salary + vendor, 'profit', new + renewal + other - salary - vendor) order by k) from months),
      'totals', (select jsonb_build_object('collection', sum(new + renewal + other), 'expense', sum(salary + vendor),
                   'profit', sum(new + renewal + other - salary - vendor)) from months)
    )
  );
end $$;

-- Targets set for staff in the months a period touches, with what they achieved (Staff › Targets).
create or replace function app.targets_in(p_studio uuid, p_from date, p_to date, p_roles text[] default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('staff_id', t.staff_id, 'name', t.staff_name, 'staff_code', t.staff_code, 'role', t.staff_role,
           'year', t.year, 'month', t.month, 'target_type', t.target_type, 'achieved', t.achieved, 'tier_reached', t.tier_reached,
           'commission', t.commission_earned,
           'targets', (select jsonb_agg((x ->> 'target')::numeric order by i) from jsonb_array_elements(t.tiers) with ordinality e(x, i)),
           'highest', (select max((x ->> 'target')::numeric) from jsonb_array_elements(t.tiers) x))
         order by t.staff_name, t.year, t.month), '[]'::jsonb)
  from public.target_overview t
  where t.studio_id = p_studio and make_date(t.year, t.month, 1) <= p_to
    and (make_date(t.year, t.month, 1) + interval '1 month')::date > p_from
    and (p_roles is null or t.staff_role = any (p_roles));
$$;
revoke execute on function app.targets_in(uuid, date, date, text[]) from public;

-- ---------------------------------------------------------------------------
-- 12. Billing Analysis (YDL /customers/payments-graph/) and 13. Sales Leaderboard (/sales-leaderboard/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_billing(p_studio uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_f jsonb := coalesce(p_filter, '{}');
begin
  perform app.analysis_require(p_studio, 'Billing Analysis');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  return (
    with o as (
      select o.* from public.subscription_overview o
      left join public.plans p on p.id = o.plan_id
      where o.studio_id = p_studio and o.kind in ('gym', 'pt', 'trial') and o.deleted_at is null and o.cancelled_at is null
        and o.invoice_date between p_from and p_to
        and (coalesce(v_f->>'plan', '') = '' or o.plan_id = (v_f->>'plan')::uuid)
        and (coalesce(v_f->>'service', '') = '' or (v_f->>'service')::uuid = any (p.service_ids))
        and (coalesce(v_f->>'created_by', '') = '' or o.created_by = (v_f->>'created_by')::uuid)
        and (coalesce(v_f->>'client_rep', '') = '' or o.client_rep_id = (v_f->>'client_rep')::uuid)
        and (coalesce(v_f->>'gender', '') = '' or o.member_gender = v_f->>'gender')
        and (coalesce(v_f->>'batch', '') = '' or o.batch_id = (v_f->>'batch')::uuid)
        and (coalesce(v_f->>'sub_status', '') = '' or case v_f->>'sub_status' when 'active' then o.state in ('active', 'frozen')
               when 'pending' then o.state = 'pending' when 'expired' then o.state in ('expired', 'used') else true end)
    ), hi as (
      select (x->>'staff_id')::uuid as staff_id, max((x->>'highest')::numeric) as highest
      from jsonb_array_elements(app.targets_in(p_studio, p_from, p_to)) x group by 1
    )
    select app.collection_summary(p_studio, p_from, p_to, v_f) || jsonb_build_object(
      'plans', (select coalesce(jsonb_agg(jsonb_build_object('plan_id', t.plan_id, 'name', t.plan_name, 'subscriptions', t.n, 'active', t.act,
                   'pending', t.pen, 'inactive', t.ina, 'new', t.nw, 'renewal', t.rn, 'paid', t.paid, 'bill', t.bill) order by t.n desc, t.plan_name), '[]'::jsonb)
                from (select plan_id, plan_name, count(*) as n, count(*) filter (where state in ('active', 'frozen')) as act,
                        count(*) filter (where state = 'pending') as pen, count(*) filter (where state in ('expired', 'used')) as ina,
                        count(*) filter (where not is_renewal) as nw, count(*) filter (where is_renewal) as rn,
                        sum(paid_amount) as paid, sum(total_amount) as bill from o group by plan_id, plan_name) t),
      'billing', (select coalesce(sum(total_amount), 0) from o),
      'balance', (select coalesce(sum(balance_amount), 0) from o),
      'bill_rep', (select coalesce(jsonb_agg(r.r || jsonb_build_object('highest', hi.highest,
                      'pct', case when coalesce(hi.highest, 0) > 0 then round((r.r->>'total')::numeric * 100 / hi.highest, 1) end) order by r.i), '[]'::jsonb)
                   from jsonb_array_elements(app.collection_by_staff(p_studio, p_from, p_to, v_f, 'bill_rep')) with ordinality r(r, i)
                   left join hi on hi.staff_id = (r.r->>'staff_id')::uuid),
      'client_rep', app.collection_by_staff(p_studio, p_from, p_to, v_f, 'client_rep'),
      'created_by', app.collection_by_staff(p_studio, p_from, p_to, v_f, 'added_by'),
      'targets', app.targets_in(p_studio, p_from, p_to)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 14. Daily Collection Analysis (YDL /daily-collection-analysis/): one row per day of a month.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_daily_collection(p_studio uuid, p_year int, p_month int,
  p_created_by uuid default null, p_bill_rep uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_from date; v_to date; v_f jsonb;
begin
  perform app.analysis_require(p_studio, 'Daily Collection Analysis', true);
  if p_month not between 1 and 12 then raise exception 'Choose a month'; end if;
  v_from := make_date(p_year, p_month, 1);
  v_to := (v_from + interval '1 month')::date - 1;
  v_f := jsonb_strip_nulls(jsonb_build_object('created_by', p_created_by, 'bill_rep', p_bill_rep));
  return (
    with pay as (select * from app.collection_rows(p_studio, v_from, v_to, v_f)),
    subs as (
      select s.invoice_date as d, s.kind, s.is_renewal, s.total_amount, (m.enquiry_code is not null and m.enquiry_date = s.invoice_date) as spot
      from public.subscriptions s join public.members m on m.id = s.member_id
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null
        and s.invoice_date between v_from and v_to
        and (p_created_by is null or s.created_by = p_created_by) and (p_bill_rep is null or s.bill_rep_id = p_bill_rep)
    ), enq as (
      select m.enquiry_date as d from public.members m
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null and m.enquiry_date between v_from and v_to
        and (p_created_by is null or m.added_by = p_created_by)
    ), days as (
      select g.d::date as d from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') g(d)
    ), rows_ as (
      select days.d,
        (select count(*) from enq where enq.d = days.d) as enquiries,
        (select coalesce(sum(total_amount), 0) from subs where subs.d = days.d) as billing,
        (select coalesce(sum(amount), 0) from pay where pay.receipt_date = days.d) as received,
        (select jsonb_build_object('amount', coalesce(sum(total_amount), 0), 'n', count(*)) from subs where subs.d = days.d and spot and not is_renewal) as spot,
        (select count(*) from subs where subs.d = days.d and kind = 'gym' and not is_renewal) as conv_gym,
        (select count(*) from subs where subs.d = days.d and kind = 'pt' and not is_renewal) as conv_pt,
        (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where pay.receipt_date = days.d and kind = 'gym' and not is_renewal) as new_gym,
        (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where pay.receipt_date = days.d and kind = 'pt' and not is_renewal) as new_pt,
        (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where pay.receipt_date = days.d and kind = 'gym' and is_renewal) as ren_gym,
        (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where pay.receipt_date = days.d and kind = 'pt' and is_renewal) as ren_pt
      from days
    )
    select jsonb_build_object(
      'from', v_from, 'to', v_to,
      'summary', jsonb_build_object(
        'enquiries', (select count(*) from enq),
        'open_enquiries', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'enquiry' and m.lead_status = 'open' and m.deleted_at is null),
        'billing', (select coalesce(sum(total_amount), 0) from subs),
        'received', (select coalesce(sum(amount), 0) from pay),
        'conv_gym', (select count(*) from subs where kind = 'gym' and not is_renewal),
        'conv_pt', (select count(*) from subs where kind = 'pt' and not is_renewal),
        'new_gym', (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where kind = 'gym' and not is_renewal),
        'new_pt', (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where kind = 'pt' and not is_renewal),
        'ren_gym', (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where kind = 'gym' and is_renewal),
        'ren_pt', (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'n', count(*)) from pay where kind = 'pt' and is_renewal)),
      'days', (select jsonb_agg(to_jsonb(r) order by r.d) from rows_ r)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 15. PT Analysis (YDL /pt-analysis/)
-- ---------------------------------------------------------------------------
create or replace function public.analysis_pt(p_studio uuid, p_trainer uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date;
begin
  perform app.analysis_require(p_studio, 'PT Analysis');
  v_today := app.today(p_studio);
  return (
    with pt as (
      select s.id, s.member_id, s.trainer_id, s.start_date, s.end_date, app.subscription_state(s) as st, m.gender
      from public.subscriptions s join public.members m on m.id = s.member_id and m.deleted_at is null
      where s.studio_id = p_studio and s.kind = 'pt' and s.deleted_at is null and s.cancelled_at is null
        and (p_trainer is null or s.trainer_id = p_trainer)
    ), mem as (   -- each PT client: live now, or how long since their last PT plan ended
      select member_id, min(gender) as gender, bool_or(st in ('active', 'frozen', 'pending')) as live,
        greatest(v_today - max(end_date), 0) as days, min(start_date) as first_start
      from pt group by member_id
    )
    select jsonb_build_object(
      'total', (select count(*) from pt),
      'active', (select count(*) from pt where st in ('active', 'frozen')),
      'inactive', (select count(*) from mem where not live),
      'bounced', (select jsonb_build_object('d0_15', count(*) filter (where days < 15), 'd15_30', count(*) filter (where days >= 15 and days < 30),
                    'd30_60', count(*) filter (where days >= 30 and days < 60), 'd60_90', count(*) filter (where days >= 60 and days < 90),
                    'over90', count(*) filter (where days >= 90)) from mem where not live),
      'new_30', (select count(*) from mem where first_start > v_today - 30 and first_start <= v_today),
      'gender', jsonb_build_object(
        'total', (select jsonb_build_object('male', count(*) filter (where gender = 'male'), 'female', count(*) filter (where gender = 'female'),
                    'other', count(*) filter (where gender = 'other')) from pt),
        'active', (select jsonb_build_object('male', count(*) filter (where gender = 'male'), 'female', count(*) filter (where gender = 'female'),
                     'other', count(*) filter (where gender = 'other')) from pt where st in ('active', 'frozen')),
        'inactive', (select jsonb_build_object('male', count(*) filter (where gender = 'male'), 'female', count(*) filter (where gender = 'female'),
                       'other', count(*) filter (where gender = 'other')) from mem where not live)),
      'trainers', (select coalesce(jsonb_agg(jsonb_build_object('staff_id', st.id, 'name', coalesce(st.full_name, 'No trainer'), 'staff_code', st.staff_code,
                     'current', coalesce(st.active and st.deleted_at is null, true),
                     'total', t.n, 'active', t.act, 'inactive', t.ina) order by t.n desc, st.full_name), '[]'::jsonb)
                   from (select trainer_id, count(*) as n, count(*) filter (where pt.st in ('active', 'frozen')) as act,
                           count(*) filter (where pt.st in ('expired', 'used')) as ina from pt group by trainer_id) t
                   left join public.staff st on st.id = t.trainer_id)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 16. Leaderboard (YDL /tr-sales-leaderboard/): trainers' sales for a month and their targets.
--     Sales count the way Staff › Targets does: bills where the trainer is the bill rep or the trainer.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_leaderboard(p_studio uuid, p_year int, p_month int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_from date; v_to date;
begin
  perform app.analysis_require(p_studio, 'Leaderboard');
  if p_month not between 1 and 12 then raise exception 'Choose a month'; end if;
  v_from := make_date(p_year, p_month, 1);
  v_to := (v_from + interval '1 month')::date - 1;
  return (
    with tr as (
      select st.id, st.full_name, st.staff_code from public.staff st
      where st.studio_id = p_studio and st.role in ('coach', 'doctor') and st.deleted_at is null
    ), b as (
      select tr.id, s.kind, s.is_renewal, s.net_amount
      from tr join public.subscriptions s on (s.bill_rep_id = tr.id or s.trainer_id = tr.id)
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null
        and s.invoice_date between v_from and v_to
    )
    select jsonb_build_object(
      'from', v_from, 'to', v_to,
      'board', (select coalesce(jsonb_agg(jsonb_build_object('staff_id', tr.id, 'name', tr.full_name, 'staff_code', tr.staff_code,
                   'sales', t.total, 'pt_renewal', t.pt_r, 'pt_new', t.pt_n, 'gym_renewal', t.gym_r, 'gym_new', t.gym_n) order by t.total desc, tr.full_name), '[]'::jsonb)
                from (select id, sum(net_amount) as total, coalesce(sum(net_amount) filter (where kind = 'pt' and is_renewal), 0) as pt_r,
                        coalesce(sum(net_amount) filter (where kind = 'pt' and not is_renewal), 0) as pt_n,
                        coalesce(sum(net_amount) filter (where kind = 'gym' and is_renewal), 0) as gym_r,
                        coalesce(sum(net_amount) filter (where kind = 'gym' and not is_renewal), 0) as gym_n from b group by id) t
                join tr on tr.id = t.id),
      'targets', app.targets_in(p_studio, v_from, v_to, array['coach', 'doctor'])
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 17. Revenue Forecast (YDL /revenue-forecast/): the next twelve months.
--     Renewals: gym and PT plans ending that month that haven't been renewed, at what the client paid last time.
--     Balance: unpaid balances by their scheduled payment date (overdue and undated ones count this month).
-- ---------------------------------------------------------------------------
create or replace function public.analysis_revenue_forecast(p_studio uuid, p_category uuid default null, p_created_by uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_start date;
begin
  perform app.analysis_require(p_studio, 'Revenue Forecast');
  v_start := date_trunc('month', app.today(p_studio))::date;
  return (
    with mm as (
      select i, (v_start + make_interval(months => i))::date as ms, (v_start + make_interval(months => i + 1))::date - 1 as me
      from generate_series(0, 11) i
    ), ren as (
      select s.end_date, s.total_amount, p.service_ids
      from public.subscriptions s join public.plans p on p.id = s.plan_id
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.status = 'live' and s.deleted_at is null and s.cancelled_at is null
        and s.end_date >= v_start and s.end_date < (v_start + interval '12 months')::date
        and (p_category is null or p_category = any (p.service_ids)) and (p_created_by is null or s.created_by = p_created_by)
        and not exists (select 1 from public.subscriptions r where r.member_id = s.member_id and r.kind = s.kind and r.id <> s.id
                          and r.start_date > s.start_date and r.deleted_at is null and r.cancelled_at is null)
    ), bal as (
      select greatest(coalesce(o.balance_due_date, v_start), v_start) as due, o.balance_amount
      from public.subscription_overview o join public.plans p on p.id = o.plan_id
      where o.studio_id = p_studio and o.balance_amount > 0 and o.deleted_at is null and o.cancelled_at is null
        and o.status = 'live' and o.state not in ('transferred', 'upgraded', 'downgraded')
        and (p_category is null or p_category = any (p.service_ids)) and (p_created_by is null or o.created_by = p_created_by)
    ), cats as (
      select sv.id, coalesce(nullif(sv.custom_name, ''), sv.name) as name, sv.sort
      from public.services sv where sv.studio_id = p_studio and sv.active
    )
    select jsonb_build_object(
      'categories', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by sort, name), '[]'::jsonb) from cats),
      'months', (select jsonb_agg(jsonb_build_object('month', mm.ms,
                   'renewal', (select jsonb_build_object('amount', coalesce(sum(total_amount), 0), 'n', count(*)) from ren where end_date between mm.ms and mm.me),
                   'balance', (select jsonb_build_object('amount', coalesce(sum(balance_amount), 0), 'n', count(*)) from bal where due between mm.ms and mm.me),
                   'by_category', (select coalesce(jsonb_object_agg(cats.id, jsonb_build_object('amount', coalesce(c.amt, 0), 'n', coalesce(c.n, 0))), '{}'::jsonb)
                                   from cats left join lateral (select sum(ren.total_amount) as amt, count(*) as n from ren
                                     where ren.end_date between mm.ms and mm.me and cats.id = any (ren.service_ids)) c on true)
                 ) order by mm.i) from mm)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 18. Lead Source Analysis (YDL /lead-source-analysis/), by enquiry date.
--     Spot conversion: joined the day they enquired. Prices come from their first gym or PT bill.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_lead_sources(p_studio uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tz text;
begin
  perform app.analysis_require(p_studio, 'Lead Source Analysis');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  select s.timezone into v_tz from public.studios s where s.id = p_studio;
  return (
    with e as (
      select m.id, m.kind, m.lead_status, coalesce(nullif(trim(m.source_promotion), ''), 'Unknown') as source,
        m.kind = 'member' and coalesce((m.converted_at at time zone v_tz)::date, m.joined_on) <= m.enquiry_date as spot,
        f.base_price, f.net_amount
      from public.members m
      left join lateral (select s.base_price, s.net_amount from public.subscriptions s
                         where s.member_id = m.id and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null
                         order by s.invoice_date, s.created_at limit 1) f on m.kind = 'member'
      where m.studio_id = p_studio and m.deleted_at is null and m.enquiry_code is not null and m.enquiry_date between p_from and p_to
    ), g as (
      select source, count(*) as total, count(*) filter (where kind = 'enquiry' and lead_status = 'open') as open,
        count(*) filter (where kind = 'enquiry' and lead_status = 'not_interested') as ni,
        count(*) filter (where spot) as spot, count(*) filter (where kind = 'member' and not spot) as followup,
        count(*) filter (where kind = 'member') as conv,
        coalesce(sum(base_price) filter (where kind = 'member'), 0) as base, coalesce(sum(net_amount) filter (where kind = 'member'), 0) as sale
      from e group by source
    )
    select jsonb_build_object(
      'rows', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'total', total, 'open', open, 'not_interested', ni, 'spot', spot,
                 'followup', followup, 'conversions', conv, 'pct', round(conv * 100.0 / nullif(total, 0), 2), 'base_price', base, 'sale_price', sale)
               order by total desc, source), '[]'::jsonb) from g),
      'total', (select jsonb_build_object('total', coalesce(sum(total), 0), 'open', coalesce(sum(open), 0), 'not_interested', coalesce(sum(ni), 0),
                 'spot', coalesce(sum(spot), 0), 'followup', coalesce(sum(followup), 0), 'conversions', coalesce(sum(conv), 0),
                 'pct', round(sum(conv) * 100.0 / nullif(sum(total), 0), 2), 'base_price', coalesce(sum(base), 0), 'sale_price', coalesce(sum(sale), 0)) from g)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 19. Branch Analysis (YDL /multi-branch-analysis/): one row per branch (Shaan Fitness has one).
-- ---------------------------------------------------------------------------
create or replace function public.analysis_branches(p_studio uuid, p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date;
begin
  perform app.analysis_require(p_studio, 'Branch Analysis');
  v_today := app.today(p_studio);
  return (
    select jsonb_agg(jsonb_build_object(
      'studio_id', st.id, 'name', st.name, 'branch', st.branch_name, 'area', coalesce(nullif(st.locality, ''), st.street2, st.city),
      'open_enquiries', (select count(*) from public.members m where m.studio_id = st.id and m.kind = 'enquiry' and m.lead_status = 'open' and m.deleted_at is null),
      'enquiries_today', (select count(*) from public.members m where m.studio_id = st.id and m.enquiry_code is not null and m.deleted_at is null and m.enquiry_date = v_today),
      'enquiries_yesterday', (select count(*) from public.members m where m.studio_id = st.id and m.enquiry_code is not null and m.deleted_at is null and m.enquiry_date = v_today - 1),
      'collection_today', (select coalesce(sum(x.amount), 0) from public.payments x where x.studio_id = st.id and x.kind = 'payment' and x.status = 'paid' and x.receipt_date = v_today),
      'collection_yesterday', (select coalesce(sum(x.amount), 0) from public.payments x where x.studio_id = st.id and x.kind = 'payment' and x.status = 'paid' and x.receipt_date = v_today - 1),
      'collection', (select coalesce(sum(x.amount), 0) from public.payments x where x.studio_id = st.id and x.kind = 'payment' and x.status = 'paid'
                       and (p_from is null or x.receipt_date >= p_from) and (p_to is null or x.receipt_date <= p_to)),
      'balance', (select coalesce(sum(o.balance_amount), 0) from public.subscription_overview o where o.studio_id = st.id and o.deleted_at is null and o.cancelled_at is null
                    and o.kind in ('gym', 'pt', 'trial') and (p_from is null or o.invoice_date >= p_from) and (p_to is null or o.invoice_date <= p_to)),
      'billing', (select coalesce(sum(o.total_amount), 0) from public.subscription_overview o where o.studio_id = st.id and o.deleted_at is null and o.cancelled_at is null
                    and o.kind in ('gym', 'pt', 'trial') and (p_from is null or o.invoice_date >= p_from) and (p_to is null or o.invoice_date <= p_to))
    ) order by st.name)
    from public.studios st where st.id = p_studio
  );
end $$;

call app.apply_grants();
$u20261011000013$;
  insert into app.schema_migrations (version) values ('20261011000013_analysis');
end $bu20261011000013$;

-- ===== 20261011000014_training =====
do $bu20261011000014$ begin
  if exists (select 1 from app.schema_migrations where version = '20261011000014_training') then raise notice 'already has 20261011000014_training'; return; end if;
  execute $u20261011000014$
-- Shaan Fitness app · 14. Workouts, diet and body measurements (YDL App Settings › Workouts & Diet)
-- Workout plans: a few days a week, each day a list of exercises with sets, reps or time.
-- Diet plans: meals by time of day, for every day or for a weekday, each item with its macros.
-- Coaches and the front desk assign them to clients; members see them in the app, tick off
-- exercises and add their measurements. Progress photos are seen only by the owner, the
-- client's own coach and doctor, and the client.

-- ---------------------------------------------------------------------------
-- Dropdown lists (editable in Settings › Lists)
-- ---------------------------------------------------------------------------
create or replace function app.default_training_lists()
returns table (list text, label text, sort int)
language sql immutable as $$
  with src(list, items) as (values
    ('exercise_type', array['Weight Training','Cardio','Stretching','Power Yoga','Yoga','Zumba','Crossfit','Functional','Free Body','Core',
                            'Strength Training','Aerobic Training','Abdominal conditioning','Meditation & Relaxation','Rest']),
    ('body_part', array['Chest','Shoulder','Arms','Triceps','Back','Biceps','Full Legs','Quadriceps','Calves','Hamstrings','Cardio','Abs',
                        'Glutes','Forearms','Traps','Lower Back','Full Body','Neck']),
    ('workout_goal', array['Fat Loss','Muscle Gain','Weight Gain','General Fitness','Over all fitness','Sports Specific','Marathon Training',
                           'Lean Toning','ABS','Strength building','Calisthenics','Stamina building','Maintain Weight']),
    ('plan_level', array['General','Beginner','Intermediate','Advanced']),
    ('meal_time', array['Early Morning','Breakfast','Mid Morning','Lunch','Evening Snack','Pre Workout','Post Workout','Dinner','Bed Time']),
    ('food_unit', array['g','ml','piece','cup','bowl','katori','glass','tbsp','tsp','slice','scoop','serving'])
  )
  select s.list, x.item, (x.ord * 10)::int from src s, unnest(s.items) with ordinality as x(item, ord);
$$;

create or replace function app.seed_training_lists()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.list_items (studio_id, list, label, sort)
  select new.id, d.list, d.label, d.sort from app.default_training_lists() d
  on conflict (studio_id, list, label) do nothing;
  return new;
end $$;
drop trigger if exists studios_seed_training on public.studios;
create trigger studios_seed_training after insert on public.studios for each row execute function app.seed_training_lists();

insert into public.list_items (studio_id, list, label, sort)
select s.id, d.list, d.label, d.sort from public.studios s cross join app.default_training_lists() d
where not exists (select 1 from public.list_items x where x.studio_id = s.id and x.list = d.list)
on conflict (studio_id, list, label) do nothing;

-- ---------------------------------------------------------------------------
-- Who may look at and work on a client's training
-- ---------------------------------------------------------------------------
-- Staff who can see the client (same rule as the client lists).
create or replace function app.sees_member(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.id = p_member and m.deleted_at is null
      and (app.can_see_client(m.studio_id, m.added_by, m.trainer_id) or app.in_care_team(m.id) or app.has_follow_up_for(m.id))
  );
$$;

-- The owner, front desk who can see the client, and the client's own coaches.
create or replace function app.trains_member(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.in_care_team(p_member, array['coach']::public.care_role[]) or exists (
    select 1 from public.members m
    where m.id = p_member and m.deleted_at is null and app.can_see_client(m.studio_id, m.added_by, m.trainer_id)
  );
$$;

-- A coach's app switches (Trainers › Allow Workout / Allow Diet in Coach App). Owner and front desk always.
create or replace function app.may_plan(p_studio uuid, p_switch text)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_desk(p_studio) or exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.role = 'coach'
      and coalesce((s.permissions->>p_switch)::boolean, true)
  );
$$;

grant execute on function app.sees_member(uuid), app.trains_member(uuid), app.may_plan(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Exercises: YDL's "General Exercise List" (shared, studio_id null) plus the studio's own
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  exercise_type text not null,
  body_part text not null,
  equipment text,
  instructions text,
  image_url text,
  video_url text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index exercises_name_uq on public.exercises (coalesce(studio_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index exercises_studio_idx on public.exercises (studio_id, body_part);

-- "Exclude in App": general exercises a studio hides from its coaches and members.
create table public.exercise_exclusions (
  studio_id uuid not null references public.studios(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (studio_id, exercise_id)
);

-- ---------------------------------------------------------------------------
-- Workout plans
-- ---------------------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  goal text not null,
  level text not null default 'General',
  trainer_id uuid references public.staff(id) on delete set null,     -- "Assign By Trainer"
  days_per_week smallint not null check (days_per_week between 1 and 7),
  total_days int check (total_days is null or total_days > 0),
  instructions text,                                                  -- "Important Instruction"
  is_public boolean not null default false,                           -- members can browse it in the app
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_plans_studio_idx on public.workout_plans (studio_id, active);

create table public.workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day smallint not null check (day between 1 and 7),
  seq int not null default 0,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null check (length(trim(exercise_name)) > 0),
  exercise_type text,
  body_part text,
  sets int check (sets is null or sets between 0 and 100),
  reps int check (reps is null or reps between 0 and 1000),
  time numeric(8,2) check (time is null or time >= 0),
  time_unit text not null default 'secs' check (time_unit in ('secs', 'mins', 'hours')),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  rest_secs int check (rest_secs is null or rest_secs >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index workout_plan_items_plan_idx on public.workout_plan_items (plan_id, day, seq);

-- ---------------------------------------------------------------------------
-- Foods, recipes and diet plans
-- ---------------------------------------------------------------------------
-- Macros are for the stated quantity of the food (e.g. 100 g, or 1 piece).
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,      -- null: the general list
  name text not null check (length(trim(name)) > 0),
  quantity numeric(8,2) not null default 100 check (quantity > 0),
  unit text not null default 'g',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  fats numeric(8,2) not null default 0 check (fats >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fibre numeric(8,2) not null default 0 check (fibre >= 0),
  is_veg boolean not null default true,
  is_verified boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index foods_name_uq on public.foods (coalesce(studio_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit text not null default 'serving',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  fats numeric(8,2) not null default 0 check (fats >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fibre numeric(8,2) not null default 0 check (fibre >= 0),
  prep_time_mins int check (prep_time_mins is null or prep_time_mins >= 0),
  ingredients text,
  method text,
  notes text,
  image_url text,
  pdf_url text,
  is_veg boolean not null default true,
  member_id uuid references public.members(id) on delete cascade,    -- a client's own recipe, waiting for the gym to verify it
  is_verified boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index recipes_studio_idx on public.recipes (studio_id, is_verified);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  goal text not null default 'General Fitness',
  level text not null default 'General',
  trainer_id uuid references public.staff(id) on delete set null,
  calories_target int check (calories_target is null or calories_target > 0),
  instructions text,
  is_public boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diet_plans_studio_idx on public.diet_plans (studio_id, active);

create table public.diet_plan_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  plan_id uuid not null references public.diet_plans(id) on delete cascade,
  weekday smallint not null default 0 check (weekday between 0 and 7),  -- 0 = every day, 1-7 = Monday-Sunday
  meal text not null,
  meal_time time,
  seq int not null default 0,
  food_id uuid references public.foods(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  item_name text not null check (length(trim(item_name)) > 0),
  quantity numeric(8,2) check (quantity is null or quantity > 0),
  unit text,
  calories numeric(8,2) not null default 0,
  protein numeric(8,2) not null default 0,
  fats numeric(8,2) not null default 0,
  carbs numeric(8,2) not null default 0,
  fibre numeric(8,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index diet_plan_items_plan_idx on public.diet_plan_items (plan_id, weekday, meal_time, seq);

-- ---------------------------------------------------------------------------
-- A client's plans, workout ticks and measurements
-- ---------------------------------------------------------------------------
create table public.member_workouts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  weekdays smallint[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  start_date date not null default current_date,
  end_date date,
  goal text,
  level text,
  assigned_by uuid references public.staff(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index member_workouts_one_active on public.member_workouts (member_id) where active;
create index member_workouts_plan_idx on public.member_workouts (plan_id);

create table public.member_diets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.diet_plans(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  assigned_by uuid references public.staff(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index member_diets_one_active on public.member_diets (member_id) where active;
create index member_diets_plan_idx on public.member_diets (plan_id);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  item_id uuid not null references public.workout_plan_items(id) on delete cascade,
  date date not null,
  sets_done int check (sets_done is null or sets_done >= 0),
  reps_done int check (reps_done is null or reps_done >= 0),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  created_at timestamptz not null default now(),
  unique (member_id, item_id, date)
);
create index workout_logs_member_idx on public.workout_logs (member_id, date desc);

-- Measurements: the studio's Measurement Settings decide which fields are asked for.
-- Body circumferences are in inches, height in cm, weight and masses in kg.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  measured_on date not null default current_date,
  vals jsonb not null default '{}'::jsonb check (jsonb_typeof(vals) = 'object'),
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  note text,
  recorded_by uuid references public.staff(id) on delete set null,   -- null when the client added it in the app
  created_at timestamptz not null default now()
);
create index measurements_member_idx on public.measurements (member_id, measured_on desc);
create index measurements_studio_idx on public.measurements (studio_id, measured_on);

create table public.measurement_photos (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index measurement_photos_member_idx on public.measurement_photos (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger exercises_fill before insert on public.exercises for each row when (new.studio_id is not null) execute function app.fill_created_by();
create trigger workout_plans_fill before insert on public.workout_plans for each row execute function app.fill_created_by();
create trigger workout_plans_touch before update on public.workout_plans for each row execute function app.touch_updated_at();
create trigger diet_plans_fill before insert on public.diet_plans for each row execute function app.fill_created_by();
create trigger diet_plans_touch before update on public.diet_plans for each row execute function app.touch_updated_at();
create trigger foods_fill before insert on public.foods for each row when (new.studio_id is not null) execute function app.fill_created_by();
create trigger recipes_fill before insert on public.recipes for each row execute function app.fill_created_by();
create trigger workout_plans_log after insert or update or delete on public.workout_plans for each row execute function app.log_activity();
create trigger diet_plans_log after insert or update or delete on public.diet_plans for each row execute function app.log_activity();
create trigger member_workouts_log after insert or update on public.member_workouts for each row execute function app.log_activity();
create trigger member_diets_log after insert or update on public.member_diets for each row execute function app.log_activity();
create trigger measurements_log after delete on public.measurements for each row execute function app.log_activity();

-- Items belong to their plan's studio, and a workout day fits the plan's week.
create or replace function app.check_plan_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_studio uuid; v_days int;
begin
  if tg_table_name = 'workout_plan_items' then
    select p.studio_id, p.days_per_week into v_studio, v_days from public.workout_plans p where p.id = new.plan_id;
    if new.day > v_days then raise exception 'This plan has % day(s) a week; there is no Day %', v_days, new.day; end if;
    if new.exercise_id is not null and (new.exercise_type is null or new.body_part is null) then
      select coalesce(new.exercise_type, e.exercise_type), coalesce(new.body_part, e.body_part) into new.exercise_type, new.body_part
      from public.exercises e where e.id = new.exercise_id;
    end if;
  else
    select p.studio_id into v_studio from public.diet_plans p where p.id = new.plan_id;
  end if;
  new.studio_id := v_studio;
  return new;
end $$;
create trigger workout_plan_items_check before insert or update on public.workout_plan_items for each row execute function app.check_plan_item();
create trigger diet_plan_items_check before insert or update on public.diet_plan_items for each row execute function app.check_plan_item();

-- Only the owner and front desk can mark foods and recipes verified. Staff recipes start verified;
-- a client's own recipe waits for the gym.
create or replace function app.guard_verified()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'recipes' then
      -- (a separate IF: foods have no member_id)
      if new.member_id is null then new.is_verified := true; else new.is_verified := false; end if;
    elsif not app.is_desk(new.studio_id) then new.is_verified := false;
    end if;
  elsif new.is_verified is distinct from old.is_verified and not app.is_desk(new.studio_id) then
    raise exception 'Only the owner or front desk can verify';
  end if;
  return new;
end $$;
create trigger foods_verified before insert or update on public.foods for each row when (new.studio_id is not null) execute function app.guard_verified();
create trigger recipes_verified before insert or update on public.recipes for each row execute function app.guard_verified();

-- A workout tick belongs to the client's own plan.
create or replace function app.check_workout_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select m.studio_id into new.studio_id from public.members m where m.id = new.member_id;
  if not exists (
    select 1 from public.workout_plan_items i join public.member_workouts w on w.plan_id = i.plan_id and w.member_id = new.member_id
    where i.id = new.item_id
  ) then raise exception 'That exercise is not in this client''s workout plan'; end if;
  if new.date > app.today(new.studio_id) then raise exception 'You can''t tick off a future workout'; end if;
  return new;
end $$;
create trigger workout_logs_check before insert or update on public.workout_logs for each row execute function app.check_workout_log();

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.exercise_exclusions enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_items enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.diet_plans enable row level security;
alter table public.diet_plan_items enable row level security;
alter table public.member_workouts enable row level security;
alter table public.member_diets enable row level security;
alter table public.workout_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.measurement_photos enable row level security;

create policy exercises_read on public.exercises for select to authenticated using (studio_id is null or app.in_studio(studio_id));
create policy exercises_write on public.exercises for all to authenticated
  using (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy exercise_exclusions_read on public.exercise_exclusions for select to authenticated using (app.in_studio(studio_id));
create policy exercise_exclusions_write on public.exercise_exclusions for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));

-- Plans: every staff member reads them; members read the ones assigned to them and public ones.
create or replace function app.can_read_workout_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_plans p where p.id = p_plan and (
      app.is_staff(p.studio_id)
      or (p.is_public and p.active and app.in_studio(p.studio_id))
      or exists (select 1 from public.member_workouts w join public.members m on m.id = w.member_id
                 where w.plan_id = p.id and m.user_id = (select auth.uid())))
  );
$$;
create or replace function app.can_edit_workout_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_plans p where p.id = p_plan and (
      app.is_desk(p.studio_id)
      or (app.may_plan(p.studio_id, 'allow_workout') and (p.created_by in (select app.my_staff_ids()) or p.trainer_id in (select app.my_staff_ids()))))
  );
$$;
create or replace function app.can_read_diet_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.diet_plans p where p.id = p_plan and (
      app.is_staff(p.studio_id)
      or (p.is_public and p.active and app.in_studio(p.studio_id))
      or exists (select 1 from public.member_diets w join public.members m on m.id = w.member_id
                 where w.plan_id = p.id and m.user_id = (select auth.uid())))
  );
$$;
create or replace function app.can_edit_diet_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.diet_plans p where p.id = p_plan and (
      app.is_desk(p.studio_id)
      or (app.may_plan(p.studio_id, 'allow_diet') and (p.created_by in (select app.my_staff_ids()) or p.trainer_id in (select app.my_staff_ids()))))
  );
$$;
grant execute on function app.can_read_workout_plan(uuid), app.can_edit_workout_plan(uuid), app.can_read_diet_plan(uuid), app.can_edit_diet_plan(uuid)
  to authenticated, service_role;

-- A plan assigned to the signed-in member (now or before).
create or replace function app.assigned_plan(p_kind text, p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_kind = 'workout' then exists (
      select 1 from public.member_workouts w join public.members m on m.id = w.member_id where w.plan_id = p_plan and m.user_id = (select auth.uid()))
    else exists (
      select 1 from public.member_diets w join public.members m on m.id = w.member_id where w.plan_id = p_plan and m.user_id = (select auth.uid()))
    end;
$$;
grant execute on function app.assigned_plan(text, uuid) to authenticated, service_role;
-- The read rules use the row's own columns, so a new plan can be read back as it is saved (insert … returning).
create policy workout_plans_read on public.workout_plans for select to authenticated
  using (app.is_staff(studio_id) or (is_public and active and app.in_studio(studio_id)) or app.assigned_plan('workout', id));
create policy workout_plans_insert on public.workout_plans for insert to authenticated with check (app.may_plan(studio_id, 'allow_workout'));
create policy workout_plans_update on public.workout_plans for update to authenticated using (app.can_edit_workout_plan(id)) with check (app.may_plan(studio_id, 'allow_workout'));
create policy workout_plans_delete on public.workout_plans for delete to authenticated using (app.can_edit_workout_plan(id));
create policy workout_items_read on public.workout_plan_items for select to authenticated using (app.can_read_workout_plan(plan_id));
create policy workout_items_write on public.workout_plan_items for all to authenticated using (app.can_edit_workout_plan(plan_id)) with check (app.can_edit_workout_plan(plan_id));

create policy diet_plans_read on public.diet_plans for select to authenticated
  using (app.is_staff(studio_id) or (is_public and active and app.in_studio(studio_id)) or app.assigned_plan('diet', id));
create policy diet_plans_insert on public.diet_plans for insert to authenticated with check (app.may_plan(studio_id, 'allow_diet'));
create policy diet_plans_update on public.diet_plans for update to authenticated using (app.can_edit_diet_plan(id)) with check (app.may_plan(studio_id, 'allow_diet'));
create policy diet_plans_delete on public.diet_plans for delete to authenticated using (app.can_edit_diet_plan(id));
create policy diet_items_read on public.diet_plan_items for select to authenticated using (app.can_read_diet_plan(plan_id));
create policy diet_items_write on public.diet_plan_items for all to authenticated using (app.can_edit_diet_plan(plan_id)) with check (app.can_edit_diet_plan(plan_id));

create policy foods_read on public.foods for select to authenticated using (studio_id is null or app.in_studio(studio_id));
create policy foods_write on public.foods for all to authenticated
  using (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));

create policy recipes_read on public.recipes for select to authenticated
  using (app.is_staff(studio_id) or (app.in_studio(studio_id) and is_verified and active) or app.is_self(member_id));
create policy recipes_staff on public.recipes for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy recipes_member_insert on public.recipes for insert to authenticated with check (member_id is not null and app.is_self(member_id) and not is_verified);
create policy recipes_member_update on public.recipes for update to authenticated using (app.is_self(member_id) and not is_verified) with check (app.is_self(member_id) and not is_verified);
create policy recipes_member_delete on public.recipes for delete to authenticated using (app.is_self(member_id) and not is_verified);

-- Assignments go through assign_workout / assign_diet; anyone who can see the client reads them.
create policy member_workouts_read on public.member_workouts for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy member_diets_read on public.member_diets for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));

create policy workout_logs_read on public.workout_logs for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy workout_logs_write on public.workout_logs for all to authenticated
  using (app.is_self(member_id) or app.trains_member(member_id)) with check (app.is_self(member_id) or app.trains_member(member_id));

-- Measurements are added through save_measurement (it checks the values).
create policy measurements_read on public.measurements for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy measurements_delete on public.measurements for delete to authenticated
  using (app.is_owner(studio_id) or recorded_by in (select app.my_staff_ids()) or (recorded_by is null and app.is_self(member_id)));
create policy measurement_photos_read on public.measurement_photos for select to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy measurement_photos_delete on public.measurement_photos for delete to authenticated
  using (app.is_owner(studio_id) or app.is_self(member_id));

-- ---------------------------------------------------------------------------
-- Copying days, duplicating plans, assigning, measurements
-- ---------------------------------------------------------------------------
-- YDL "Copy Exercise for Day" and "Copy From Another Workout": adds the source day's exercises to a day.
create or replace function public.copy_workout_day(p_plan uuid, p_from_plan uuid, p_from_day int, p_to_day int)
returns int language plpgsql security definer set search_path = '' as $$
declare n int; v_seq int;
begin
  if not app.can_edit_workout_plan(p_plan) then raise exception 'You can''t change this workout plan'; end if;
  if not app.can_read_workout_plan(p_from_plan) then raise exception 'Workout plan not found'; end if;
  if (select studio_id from public.workout_plans where id = p_plan) is distinct from (select studio_id from public.workout_plans where id = p_from_plan) then
    raise exception 'Copy from a plan of this fitness center';
  end if;
  if p_plan = p_from_plan and p_from_day = p_to_day then raise exception 'Choose a different day to copy to'; end if;
  select coalesce(max(seq), 0) into v_seq from public.workout_plan_items where plan_id = p_plan and day = p_to_day;
  insert into public.workout_plan_items (studio_id, plan_id, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes)
  select i.studio_id, p_plan, p_to_day, v_seq + i.seq, i.exercise_id, i.exercise_name, i.exercise_type, i.body_part, i.sets, i.reps, i.time, i.time_unit, i.weight_kg, i.rest_secs, i.notes
  from public.workout_plan_items i where i.plan_id = p_from_plan and i.day = p_from_day
  order by i.seq;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Day % has no exercises to copy', p_from_day; end if;
  return n;
end $$;

create or replace function public.copy_diet_day(p_plan uuid, p_from_plan uuid, p_from_weekday int, p_to_weekday int)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not app.can_edit_diet_plan(p_plan) then raise exception 'You can''t change this diet plan'; end if;
  if not app.can_read_diet_plan(p_from_plan) then raise exception 'Diet plan not found'; end if;
  if (select studio_id from public.diet_plans where id = p_plan) is distinct from (select studio_id from public.diet_plans where id = p_from_plan) then
    raise exception 'Copy from a plan of this fitness center';
  end if;
  if p_plan = p_from_plan and p_from_weekday = p_to_weekday then raise exception 'Choose a different day to copy to'; end if;
  insert into public.diet_plan_items (studio_id, plan_id, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes)
  select i.studio_id, p_plan, p_to_weekday, i.meal, i.meal_time, i.seq, i.food_id, i.recipe_id, i.item_name, i.quantity, i.unit, i.calories, i.protein, i.fats, i.carbs, i.fibre, i.notes
  from public.diet_plan_items i where i.plan_id = p_from_plan and i.weekday = p_from_weekday;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'That day has no meals to copy'; end if;
  return n;
end $$;

-- A copy of a plan (with every day), e.g. to adapt one client's diet for another.
create or replace function public.duplicate_plan(p_kind text, p_plan uuid, p_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_new uuid; v_studio uuid;
begin
  if p_kind = 'workout' then
    select studio_id into v_studio from public.workout_plans where id = p_plan;
    if v_studio is null or not app.can_read_workout_plan(p_plan) or not app.may_plan(v_studio, 'allow_workout') then raise exception 'You can''t copy this workout plan'; end if;
    insert into public.workout_plans (studio_id, name, goal, level, trainer_id, days_per_week, total_days, instructions, created_by)
    select studio_id, coalesce(nullif(trim(p_name), ''), name || ' (copy)'), goal, level, trainer_id, days_per_week, total_days, instructions, app.my_staff_id(studio_id)
    from public.workout_plans where id = p_plan returning id into v_new;
    insert into public.workout_plan_items (studio_id, plan_id, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes)
    select studio_id, v_new, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes
    from public.workout_plan_items where plan_id = p_plan;
  elsif p_kind = 'diet' then
    select studio_id into v_studio from public.diet_plans where id = p_plan;
    if v_studio is null or not app.can_read_diet_plan(p_plan) or not app.may_plan(v_studio, 'allow_diet') then raise exception 'You can''t copy this diet plan'; end if;
    insert into public.diet_plans (studio_id, name, goal, level, trainer_id, calories_target, instructions, created_by)
    select studio_id, coalesce(nullif(trim(p_name), ''), name || ' (copy)'), goal, level, trainer_id, calories_target, instructions, app.my_staff_id(studio_id)
    from public.diet_plans where id = p_plan returning id into v_new;
    insert into public.diet_plan_items (studio_id, plan_id, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes)
    select studio_id, v_new, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes
    from public.diet_plan_items where plan_id = p_plan;
  else
    raise exception 'Unknown plan kind';
  end if;
  return v_new;
end $$;

-- YDL "Add Workout": the client's weight and height, goal, level, plan and workout days.
create or replace function public.assign_workout(p_member uuid, p_plan uuid, p_weekdays int[], p_weight numeric default null,
  p_height_cm numeric default null, p_goal text default null, p_level text default null, p_start date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; p public.workout_plans; v_id uuid; v_days smallint[];
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  select * into p from public.workout_plans where id = p_plan;
  if m.id is null or p.id is null or p.studio_id <> m.studio_id then raise exception 'Client or workout plan not found'; end if;
  if not app.trains_member(p_member) or not app.may_plan(m.studio_id, 'allow_workout') then
    raise exception 'You can''t assign workouts to this client';
  end if;
  if not p.active then raise exception 'This workout plan is deactivated'; end if;
  select array_agg(distinct d order by d)::smallint[] into v_days from unnest(p_weekdays) d where d between 1 and 7;
  if coalesce(cardinality(v_days), 0) = 0 then raise exception 'Choose the workout days'; end if;
  update public.member_workouts set active = false, end_date = coalesce(end_date, app.today(m.studio_id)) where member_id = p_member and active;
  insert into public.member_workouts (studio_id, member_id, plan_id, weekdays, start_date, goal, level, assigned_by)
  values (m.studio_id, p_member, p_plan, v_days, coalesce(p_start, app.today(m.studio_id)), coalesce(nullif(p_goal, ''), p.goal),
          coalesce(nullif(p_level, ''), p.level), app.my_staff_id(m.studio_id))
  returning id into v_id;
  if p_weight is not null or p_height_cm is not null then
    perform public.save_measurement(jsonb_build_object('member_id', p_member,
      'values', jsonb_strip_nulls(jsonb_build_object('weight_kg', p_weight, 'height', p_height_cm)), 'note', 'With the workout plan'));
  end if;
  return v_id;
end $$;

create or replace function public.assign_diet(p_member uuid, p_plan uuid, p_start date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; p public.diet_plans; v_id uuid;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  select * into p from public.diet_plans where id = p_plan;
  if m.id is null or p.id is null or p.studio_id <> m.studio_id then raise exception 'Client or diet plan not found'; end if;
  if not app.trains_member(p_member) or not app.may_plan(m.studio_id, 'allow_diet') then raise exception 'You can''t assign diets to this client'; end if;
  if not p.active then raise exception 'This diet plan is deactivated'; end if;
  update public.member_diets set active = false, end_date = coalesce(end_date, app.today(m.studio_id)) where member_id = p_member and active;
  insert into public.member_diets (studio_id, member_id, plan_id, start_date, assigned_by)
  values (m.studio_id, p_member, p_plan, coalesce(p_start, app.today(m.studio_id)), app.my_staff_id(m.studio_id))
  returning id into v_id;
  return v_id;
end $$;

-- Ends a client's current workout or diet.
create or replace function public.end_member_plan(p_kind text, p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_studio uuid;
begin
  select studio_id into v_studio from public.members where id = p_member;
  if not app.trains_member(p_member) then raise exception 'You can''t change this client''s plans'; end if;
  if p_kind = 'workout' then
    update public.member_workouts set active = false, end_date = app.today(v_studio) where member_id = p_member and active;
  elsif p_kind = 'diet' then
    update public.member_diets set active = false, end_date = app.today(v_studio) where member_id = p_member and active;
  else raise exception 'Unknown plan kind'; end if;
end $$;

-- Keys a measurement may have (YDL's 82), and the ones that hold text.
create or replace function app.measurement_keys()
returns text[] language sql immutable as $$
  select array_agg(x->>'key') from jsonb_array_elements(app.default_measurement_settings()) x
  where x->>'key' not in ('image', 'image_two', 'image_three');
$$;

-- Adds a measurement. p: member_id, measured_on, values {key: value}, note, photos [storage paths].
-- Staff who train the client, or the client, may add one. BMI fills in from weight and height.
create or replace function public.save_measurement(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_vals jsonb := '{}'::jsonb; k text; v jsonb; n numeric; v_id uuid; v_date date; v_height numeric; v_weight numeric;
  v_self boolean; v_path text;
begin
  select * into m from public.members where id = (p->>'member_id')::uuid and deleted_at is null;
  if m.id is null then raise exception 'Client not found'; end if;
  v_self := app.is_self(m.id);
  if not (v_self or app.trains_member(m.id)) then raise exception 'You can''t add measurements for this client'; end if;
  v_date := coalesce(nullif(p->>'measured_on', '')::date, app.today(m.studio_id));
  if v_date > app.today(m.studio_id) then raise exception 'The date can''t be in the future'; end if;
  for k, v in select * from jsonb_each(coalesce(p->'values', '{}'::jsonb)) loop
    continue when v is null or v = 'null'::jsonb or trim(v #>> '{}') = '';
    if not (k = any (app.measurement_keys())) then raise exception 'Unknown measurement: %', k; end if;
    if k in ('blood_presure', 'deviation_note') then
      if length(v #>> '{}') > 500 then raise exception 'Keep % under 500 characters', k; end if;
      v_vals := v_vals || jsonb_build_object(k, trim(v #>> '{}'));
    else
      begin n := (v #>> '{}')::numeric;
      exception when others then raise exception 'Enter a number for %', replace(k, '_', ' '); end;
      if n < 0 or n > 1000 then raise exception 'Check the value for %', replace(k, '_', ' '); end if;
      if k = 'weight_kg' and (n < 10 or n > 350) then raise exception 'Weight should be in kg (10 to 350)'; end if;
      if k = 'height' and (n < 50 or n > 260) then raise exception 'Height should be in cm (50 to 260)'; end if;
      v_vals := v_vals || jsonb_build_object(k, round(n, 2));
    end if;
  end loop;
  if v_vals = '{}'::jsonb and coalesce(jsonb_array_length(p->'photos'), 0) = 0 then raise exception 'Enter at least one measurement'; end if;
  v_weight := (v_vals->>'weight_kg')::numeric;
  v_height := coalesce((v_vals->>'height')::numeric,
    (select x.height_cm from public.measurements x where x.member_id = m.id and x.height_cm is not null order by x.measured_on desc, x.created_at desc limit 1));
  if v_weight is not null and v_height is not null and not v_vals ? 'bmi' then
    v_vals := v_vals || jsonb_build_object('bmi', round(v_weight / ((v_height / 100) ^ 2), 1));
  end if;
  insert into public.measurements (studio_id, member_id, measured_on, vals, weight_kg, height_cm, note, recorded_by)
  values (m.studio_id, m.id, v_date, v_vals, v_weight, (v_vals->>'height')::numeric, nullif(trim(p->>'note'), ''),
          case when v_self then null else app.my_staff_id(m.studio_id) end)
  returning id into v_id;
  for v_path in select jsonb_array_elements_text(coalesce(p->'photos', '[]'::jsonb)) loop
    if split_part(v_path, '/', 1) <> m.studio_id::text or split_part(v_path, '/', 2) <> m.id::text then raise exception 'Photo is not this client''s'; end if;
    insert into public.measurement_photos (studio_id, member_id, measurement_id, path) values (m.studio_id, m.id, v_id, v_path);
  end loop;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Weight Loss Analysis (YDL "Client Weight Loss List"): first and latest weight in the dates.
-- p_filter: gender, client_type, source, employment, lead (convertibility), rep (added_by),
-- coach (trainer_id), batch, ages [], lead_status [], search.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_weight_loss(p_studio uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_f jsonb := coalesce(p_filter, '{}'); v_today date;
begin
  -- Owner; front desk unless the page is hidden for them; coaches see their own clients.
  if app.is_owner(p_studio) then null;
  elsif app.has_role(p_studio, array['front_desk']::public.staff_role[]) then perform app.analysis_require(p_studio, 'Weight Loss Analysis', true);
  elsif not app.has_role(p_studio, array['coach']::public.staff_role[]) then
    raise exception 'You don''t have access to Weight Loss Analysis.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  v_today := app.today(p_studio);
  return (
    with w as (
      select x.member_id, x.measured_on, x.weight_kg, x.created_at, (x.vals->>'waist')::numeric as waist
      from public.measurements x
      where x.studio_id = p_studio and x.weight_kg is not null and x.measured_on between p_from and p_to
    ), per as (
      select member_id, count(*) as n,
        (array_agg(weight_kg order by measured_on, created_at))[1] as first_w, (array_agg(measured_on order by measured_on, created_at))[1] as first_d,
        (array_agg(weight_kg order by measured_on desc, created_at desc))[1] as last_w, (array_agg(measured_on order by measured_on desc, created_at desc))[1] as last_d,
        (array_agg(waist order by measured_on, created_at) filter (where waist is not null))[1] as first_waist,
        (array_agg(waist order by measured_on desc, created_at desc) filter (where waist is not null))[1] as last_waist
      from w group by member_id
    ), rows_ as (
      select m.id, m.full_name, coalesce(m.member_code, m.enquiry_code) as code, m.country_code, m.phone, m.email, m.gender, m.kind,
        tr.full_name as coach, per.*
      from per join public.members m on m.id = per.member_id and m.deleted_at is null
      left join public.staff tr on tr.id = m.trainer_id
      where (app.can_see_client(m.studio_id, m.added_by, m.trainer_id) or app.in_care_team(m.id))
        and (coalesce(v_f->>'gender', '') = '' or m.gender = v_f->>'gender')
        and (coalesce(v_f->>'client_type', '') = '' or m.kind = v_f->>'client_type')
        and (coalesce(v_f->>'source', '') = '' or m.source_promotion = v_f->>'source')
        and (coalesce(v_f->>'employment', '') = '' or m.employment_status = v_f->>'employment')
        and (coalesce(v_f->>'lead', '') = '' or lower(m.convertibility) like lower(v_f->>'lead') || '%')
        and (coalesce(v_f->>'rep', '') = '' or m.added_by = (v_f->>'rep')::uuid)
        and (coalesce(v_f->>'coach', '') = '' or m.trainer_id = (v_f->>'coach')::uuid)
        and (coalesce(v_f->>'batch', '') = '' or exists (select 1 from public.batch_members bm where bm.member_id = m.id and bm.batch_id = (v_f->>'batch')::uuid))
        and (jsonb_array_length(coalesce(v_f->'ages', '[]')) = 0 or app.age_group(m.date_of_birth, v_today) in (select jsonb_array_elements_text(v_f->'ages')))
        and (jsonb_array_length(coalesce(v_f->'lead_status', '[]')) = 0 or m.lead_status in (select jsonb_array_elements_text(v_f->'lead_status')))
        and (coalesce(v_f->>'search', '') = '' or m.full_name ilike '%' || (v_f->>'search') || '%' or m.phone like '%' || (v_f->>'search') || '%'
             or m.email ilike '%' || (v_f->>'search') || '%')
    )
    select coalesce(jsonb_agg(jsonb_build_object('member_id', id, 'name', full_name, 'code', code, 'country_code', country_code, 'phone', phone, 'email', email,
             'gender', gender, 'kind', kind, 'coach', coach, 'count', n, 'first_date', first_d, 'first_weight', first_w, 'last_date', last_d, 'last_weight', last_w,
             'lost', round(first_w - last_w, 2), 'lost_pct', round((first_w - last_w) * 100 / nullif(first_w, 0), 1),
             'waist_lost', round(first_waist - last_waist, 2)) order by (first_w - last_w) desc, full_name), '[]'::jsonb)
    from rows_
  );
end $$;

-- ---------------------------------------------------------------------------
-- Progress photos: private files, <studio_id>/<member_id>/<file>
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
  execute $p$ drop policy if exists progress_photos_read on storage.objects $p$;
  execute $p$ create policy progress_photos_read on storage.objects for select to authenticated
    using (bucket_id = 'progress-photos' and (app.is_owner((split_part(name, '/', 1))::uuid)
           or app.in_care_team((split_part(name, '/', 2))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
  execute $p$ drop policy if exists progress_photos_write on storage.objects $p$;
  execute $p$ create policy progress_photos_write on storage.objects for insert to authenticated
    with check (bucket_id = 'progress-photos' and (app.trains_member((split_part(name, '/', 2))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
  execute $p$ drop policy if exists progress_photos_delete on storage.objects $p$;
  execute $p$ create policy progress_photos_delete on storage.objects for delete to authenticated
    using (bucket_id = 'progress-photos' and (app.is_owner((split_part(name, '/', 1))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
end $$;

-- ---------------------------------------------------------------------------
-- The general exercise list (names, type and body part; studios add pictures and their own)
-- ---------------------------------------------------------------------------
insert into public.exercises (studio_id, name, exercise_type, body_part, equipment)
select null, x.name, x.t, x.b, x.e from (values
  ('Barbell Bench Press (Flat)', 'Weight Training', 'Chest', 'Barbell'), ('Barbell Bench Press (Incline)', 'Weight Training', 'Chest', 'Barbell'),
  ('Barbell Bench Press (Decline)', 'Weight Training', 'Chest', 'Barbell'), ('Dumbbell Bench Press (Flat)', 'Weight Training', 'Chest', 'Dumbbells'),
  ('Dumbbell Bench Press (Incline)', 'Weight Training', 'Chest', 'Dumbbells'), ('Dumbbell Fly (Flat)', 'Weight Training', 'Chest', 'Dumbbells'),
  ('Dumbbell Fly (Incline)', 'Weight Training', 'Chest', 'Dumbbells'), ('Cable Crossover', 'Weight Training', 'Chest', 'Cable'),
  ('Pec Deck', 'Weight Training', 'Chest', 'Machine'), ('Chest Press Machine', 'Weight Training', 'Chest', 'Machine'),
  ('Dumbbell Pullover', 'Weight Training', 'Chest', 'Dumbbell'), ('Push-up', 'Free Body', 'Chest', null), ('Incline Push-up', 'Free Body', 'Chest', null),
  ('Decline Push-up', 'Free Body', 'Chest', null), ('Chest Dips', 'Free Body', 'Chest', 'Dip bars'),
  ('Lat Pull Down (Wide Grip)', 'Weight Training', 'Back', 'Cable'), ('Lat Pull Down (Close Grip)', 'Weight Training', 'Back', 'Cable'),
  ('Seated Cable Row', 'Weight Training', 'Back', 'Cable'), ('Bent Over Barbell Row', 'Weight Training', 'Back', 'Barbell'),
  ('Bent Over Dumbbell Row', 'Weight Training', 'Back', 'Dumbbells'), ('Single Arm Dumbbell Row', 'Weight Training', 'Back', 'Dumbbell'),
  ('T-Bar Row', 'Weight Training', 'Back', 'Barbell'), ('Machine Row', 'Weight Training', 'Back', 'Machine'), ('Pull-up', 'Free Body', 'Back', 'Pull-up bar'),
  ('Chin-up', 'Free Body', 'Back', 'Pull-up bar'), ('Assisted Pull-up', 'Weight Training', 'Back', 'Machine'), ('Deadlift', 'Strength Training', 'Back', 'Barbell'),
  ('Rack Pull', 'Strength Training', 'Back', 'Barbell'), ('Straight Arm Pulldown', 'Weight Training', 'Back', 'Cable'),
  ('Back Extension', 'Weight Training', 'Lower Back', 'Hyperextension bench'), ('Good Morning', 'Weight Training', 'Lower Back', 'Barbell'),
  ('Barbell Overhead Press', 'Weight Training', 'Shoulder', 'Barbell'), ('Dumbbell Shoulder Press', 'Weight Training', 'Shoulder', 'Dumbbells'),
  ('Arnold Press', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Machine Shoulder Press', 'Weight Training', 'Shoulder', 'Machine'),
  ('Dumbbell Lateral Raise', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Cable Lateral Raise', 'Weight Training', 'Shoulder', 'Cable'),
  ('Dumbbell Front Raise', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Rear Delt Fly', 'Weight Training', 'Shoulder', 'Dumbbells'),
  ('Reverse Pec Deck', 'Weight Training', 'Shoulder', 'Machine'), ('Upright Row', 'Weight Training', 'Shoulder', 'Barbell'), ('Face Pull', 'Weight Training', 'Shoulder', 'Cable'),
  ('Barbell Shrug', 'Weight Training', 'Traps', 'Barbell'), ('Dumbbell Shrug', 'Weight Training', 'Traps', 'Dumbbells'),
  ('Barbell Biceps Curl', 'Weight Training', 'Biceps', 'Barbell'), ('EZ Bar Curl', 'Weight Training', 'Biceps', 'EZ bar'),
  ('Dumbbell Biceps Curl', 'Weight Training', 'Biceps', 'Dumbbells'), ('Dumbbell Hammer Curl', 'Weight Training', 'Biceps', 'Dumbbells'),
  ('Preacher Curl', 'Weight Training', 'Biceps', 'EZ bar'), ('Concentration Curl', 'Weight Training', 'Biceps', 'Dumbbell'),
  ('Incline Dumbbell Curl', 'Weight Training', 'Biceps', 'Dumbbells'), ('Cable Biceps Curl', 'Weight Training', 'Biceps', 'Cable'),
  ('Triceps Pushdown (Rope)', 'Weight Training', 'Triceps', 'Cable'), ('Triceps Pushdown (Bar)', 'Weight Training', 'Triceps', 'Cable'),
  ('Overhead Dumbbell Triceps Extension', 'Weight Training', 'Triceps', 'Dumbbell'), ('Skull Crusher', 'Weight Training', 'Triceps', 'EZ bar'),
  ('Close Grip Bench Press', 'Weight Training', 'Triceps', 'Barbell'), ('Bench Dips', 'Free Body', 'Triceps', 'Bench'),
  ('Triceps Kickback', 'Weight Training', 'Triceps', 'Dumbbell'), ('Cable Overhead Triceps Extension', 'Weight Training', 'Triceps', 'Cable'),
  ('Wrist Curl', 'Weight Training', 'Forearms', 'Dumbbells'), ('Reverse Wrist Curl', 'Weight Training', 'Forearms', 'Dumbbells'),
  ('Farmer''s Walk', 'Functional', 'Forearms', 'Dumbbells'),
  ('Barbell Back Squat', 'Strength Training', 'Quadriceps', 'Barbell'), ('Front Squat', 'Strength Training', 'Quadriceps', 'Barbell'),
  ('Goblet Squat', 'Weight Training', 'Quadriceps', 'Dumbbell'), ('Leg Press', 'Weight Training', 'Quadriceps', 'Machine'),
  ('Hack Squat', 'Weight Training', 'Quadriceps', 'Machine'), ('Leg Extension', 'Weight Training', 'Quadriceps', 'Machine'),
  ('Bodyweight Squat', 'Free Body', 'Quadriceps', null), ('Sumo Squat', 'Weight Training', 'Full Legs', 'Dumbbell'),
  ('Walking Lunges', 'Weight Training', 'Full Legs', 'Dumbbells'), ('Bulgarian Split Squat', 'Weight Training', 'Full Legs', 'Dumbbells'),
  ('Step-up', 'Weight Training', 'Full Legs', 'Box'), ('Romanian Deadlift', 'Weight Training', 'Hamstrings', 'Barbell'),
  ('Lying Leg Curl', 'Weight Training', 'Hamstrings', 'Machine'), ('Seated Leg Curl', 'Weight Training', 'Hamstrings', 'Machine'),
  ('Standing Calf Raise', 'Weight Training', 'Calves', 'Machine'), ('Seated Calf Raise', 'Weight Training', 'Calves', 'Machine'),
  ('Hip Thrust', 'Weight Training', 'Glutes', 'Barbell'), ('Glute Bridge', 'Free Body', 'Glutes', null), ('Cable Glute Kickback', 'Weight Training', 'Glutes', 'Cable'),
  ('Hip Abduction Machine', 'Weight Training', 'Glutes', 'Machine'), ('Hip Adduction Machine', 'Weight Training', 'Full Legs', 'Machine'),
  ('Crunches', 'Core', 'Abs', null), ('Bicycle Crunch', 'Core', 'Abs', null), ('Reverse Crunch', 'Core', 'Abs', null), ('Cable Crunch', 'Core', 'Abs', 'Cable'),
  ('Plank', 'Core', 'Abs', null), ('Side Plank', 'Core', 'Abs', null), ('Hanging Leg Raise', 'Core', 'Abs', 'Pull-up bar'), ('Lying Leg Raise', 'Core', 'Abs', null),
  ('Russian Twist', 'Core', 'Abs', null), ('Ab Wheel Rollout', 'Core', 'Abs', 'Ab wheel'), ('Dead Bug', 'Core', 'Abs', null), ('Bird Dog', 'Core', 'Lower Back', null),
  ('Flutter Kicks', 'Core', 'Abs', null), ('V-up', 'Core', 'Abs', null), ('Mountain Climbers', 'Core', 'Full Body', null),
  ('Treadmill Walk', 'Cardio', 'Cardio', 'Treadmill'), ('Treadmill Run', 'Cardio', 'Cardio', 'Treadmill'), ('Exercise Bike', 'Cardio', 'Cardio', 'Bike'),
  ('Spin Bike', 'Cardio', 'Cardio', 'Spin bike'), ('Cross Trainer', 'Cardio', 'Cardio', 'Elliptical'), ('Rowing Machine', 'Cardio', 'Cardio', 'Rower'),
  ('Stair Climber', 'Cardio', 'Cardio', 'Stair climber'), ('Skipping Rope', 'Cardio', 'Cardio', 'Rope'), ('Jumping Jacks', 'Cardio', 'Full Body', null),
  ('Burpees', 'Cardio', 'Full Body', null), ('High Knees', 'Cardio', 'Cardio', null), ('Butt Kicks', 'Cardio', 'Cardio', null),
  ('Box Jumps', 'Functional', 'Full Legs', 'Box'), ('Battle Ropes', 'Functional', 'Full Body', 'Battle ropes'), ('Kettlebell Swing', 'Functional', 'Full Body', 'Kettlebell'),
  ('Kettlebell Goblet Squat', 'Functional', 'Quadriceps', 'Kettlebell'), ('Sled Push', 'Functional', 'Full Body', 'Sled'), ('Medicine Ball Slam', 'Functional', 'Full Body', 'Medicine ball'),
  ('Wall Ball', 'Functional', 'Full Body', 'Medicine ball'), ('Turkish Get-up', 'Functional', 'Full Body', 'Kettlebell'), ('TRX Row', 'Functional', 'Back', 'Suspension trainer'),
  ('Bear Crawl', 'Functional', 'Full Body', null),
  ('Hamstring Stretch', 'Stretching', 'Hamstrings', null), ('Quadriceps Stretch', 'Stretching', 'Quadriceps', null), ('Chest Stretch', 'Stretching', 'Chest', null),
  ('Shoulder Stretch', 'Stretching', 'Shoulder', null), ('Triceps Stretch', 'Stretching', 'Triceps', null), ('Cat-Cow Stretch', 'Stretching', 'Lower Back', null),
  ('Hip Flexor Stretch', 'Stretching', 'Glutes', null), ('Calf Stretch', 'Stretching', 'Calves', null), ('Cobra Stretch', 'Stretching', 'Abs', null),
  ('Butterfly Stretch', 'Stretching', 'Full Legs', null), ('Neck Stretch', 'Stretching', 'Neck', null), ('Child''s Pose', 'Stretching', 'Lower Back', null),
  ('Surya Namaskar', 'Yoga', 'Full Body', null), ('Tadasana', 'Yoga', 'Full Body', null), ('Vrikshasana', 'Yoga', 'Full Legs', null),
  ('Bhujangasana', 'Yoga', 'Lower Back', null), ('Trikonasana', 'Yoga', 'Full Body', null), ('Adho Mukha Svanasana', 'Yoga', 'Full Body', null),
  ('Setu Bandhasana', 'Yoga', 'Glutes', null), ('Shavasana', 'Meditation & Relaxation', 'Full Body', null),
  ('Anulom Vilom', 'Meditation & Relaxation', 'Full Body', null), ('Kapalbhati', 'Meditation & Relaxation', 'Abs', null)
) as x(name, t, b, e)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- The general food list: typical values for the stated quantity (check packaged foods against their label)
-- ---------------------------------------------------------------------------
insert into public.foods (studio_id, name, quantity, unit, calories, protein, fats, carbs, fibre, is_veg, is_verified)
select null, x.name, x.q, x.u, x.kcal, x.p, x.f, x.c, x.fi, x.veg, true from (values
  ('Rice, white (cooked)', 100, 'g', 130, 2.7, 0.3, 28.2, 0.4, true), ('Rice, brown (cooked)', 100, 'g', 112, 2.3, 0.8, 23.5, 1.8, true),
  ('Phulka / roti (no oil)', 1, 'piece', 85, 3.1, 0.4, 17.6, 2.6, true), ('Chapati (with oil)', 1, 'piece', 120, 3.5, 3.5, 18.5, 2.8, true),
  ('Idli', 1, 'piece', 58, 1.6, 0.4, 12.0, 0.6, true), ('Plain dosa', 1, 'piece', 165, 3.9, 4.8, 26.5, 1.1, true),
  ('Upma', 100, 'g', 115, 2.9, 4.3, 16.5, 1.4, true), ('Poha (cooked)', 100, 'g', 130, 2.5, 3.5, 22.0, 1.0, true),
  ('Oats (dry)', 100, 'g', 389, 16.9, 6.9, 66.3, 10.6, true), ('Brown bread', 1, 'slice', 70, 3.0, 1.0, 12.0, 1.9, true),
  ('White bread', 1, 'slice', 66, 2.3, 0.8, 12.5, 0.6, true), ('Ragi flour', 100, 'g', 328, 7.3, 1.3, 72.0, 11.5, true),
  ('Moong dal (cooked)', 100, 'g', 105, 7.0, 0.4, 19.2, 7.6, true), ('Masoor dal (cooked)', 100, 'g', 116, 9.0, 0.4, 20.1, 7.9, true),
  ('Toor dal (cooked)', 100, 'g', 121, 6.8, 0.4, 23.3, 6.7, true), ('Chickpeas / chana (boiled)', 100, 'g', 164, 8.9, 2.6, 27.4, 7.6, true),
  ('Rajma (boiled)', 100, 'g', 127, 8.7, 0.5, 22.8, 6.4, true), ('Moong sprouts', 100, 'g', 30, 3.0, 0.2, 5.9, 1.8, true),
  ('Soya chunks (dry)', 100, 'g', 345, 52.0, 0.5, 33.0, 13.0, true), ('Roasted chana', 100, 'g', 369, 22.5, 5.2, 58.1, 16.8, true),
  ('Peanuts (raw)', 100, 'g', 567, 25.8, 49.2, 16.1, 8.5, true),
  ('Egg, whole', 1, 'piece', 72, 6.3, 4.8, 0.4, 0, false), ('Egg white', 1, 'piece', 17, 3.6, 0.1, 0.2, 0, false),
  ('Milk, toned', 100, 'ml', 58, 3.1, 3.0, 4.7, 0, true), ('Milk, whole (cow)', 100, 'ml', 61, 3.2, 3.3, 4.8, 0, true),
  ('Curd / dahi', 100, 'g', 61, 3.5, 3.3, 4.7, 0, true), ('Greek yogurt, plain (non-fat)', 100, 'g', 59, 10.2, 0.4, 3.6, 0, true),
  ('Paneer', 100, 'g', 265, 18.3, 20.8, 1.2, 0, true), ('Buttermilk / chaas', 100, 'ml', 40, 3.3, 0.9, 4.8, 0, true),
  ('Ghee', 1, 'tsp', 45, 0, 5.0, 0, 0, true), ('Butter', 10, 'g', 72, 0.1, 8.1, 0, 0, true),
  ('Whey protein (check your brand)', 1, 'scoop', 120, 24.0, 1.5, 3.0, 0, true),
  ('Chicken breast (cooked)', 100, 'g', 165, 31.0, 3.6, 0, 0, false), ('Mutton / goat (cooked)', 100, 'g', 143, 27.1, 3.0, 0, 0, false),
  ('Fish fillet, lean (cooked)', 100, 'g', 128, 26.2, 2.7, 0, 0, false), ('Prawns (cooked)', 100, 'g', 99, 24.0, 0.3, 0.2, 0, false),
  ('Banana', 1, 'piece', 105, 1.3, 0.4, 27.0, 3.1, true), ('Apple', 1, 'piece', 95, 0.5, 0.3, 25.0, 4.4, true),
  ('Orange', 1, 'piece', 62, 1.2, 0.2, 15.4, 3.1, true), ('Papaya', 100, 'g', 43, 0.5, 0.3, 10.8, 1.7, true),
  ('Watermelon', 100, 'g', 30, 0.6, 0.2, 7.6, 0.4, true), ('Guava', 100, 'g', 68, 2.6, 1.0, 14.3, 5.4, true),
  ('Mango', 100, 'g', 60, 0.8, 0.4, 15.0, 1.6, true), ('Pomegranate', 100, 'g', 83, 1.7, 1.2, 18.7, 4.0, true),
  ('Grapes', 100, 'g', 69, 0.7, 0.2, 18.1, 0.9, true), ('Pineapple', 100, 'g', 50, 0.5, 0.1, 13.1, 1.4, true),
  ('Dates', 100, 'g', 282, 2.5, 0.4, 75.0, 8.0, true),
  ('Spinach', 100, 'g', 23, 2.9, 0.4, 3.6, 2.2, true), ('Broccoli', 100, 'g', 34, 2.8, 0.4, 6.6, 2.6, true),
  ('Cucumber', 100, 'g', 15, 0.7, 0.1, 3.6, 0.5, true), ('Tomato', 100, 'g', 18, 0.9, 0.2, 3.9, 1.2, true),
  ('Carrot', 100, 'g', 41, 0.9, 0.2, 9.6, 2.8, true), ('Onion', 100, 'g', 40, 1.1, 0.1, 9.3, 1.7, true),
  ('Potato (boiled)', 100, 'g', 87, 1.9, 0.1, 20.1, 1.8, true), ('Sweet potato (boiled)', 100, 'g', 76, 1.4, 0.1, 17.7, 2.5, true),
  ('Beetroot', 100, 'g', 43, 1.6, 0.2, 9.6, 2.8, true), ('Cabbage', 100, 'g', 25, 1.3, 0.1, 5.8, 2.5, true),
  ('Cauliflower', 100, 'g', 25, 1.9, 0.3, 5.0, 2.0, true), ('Green beans', 100, 'g', 31, 1.8, 0.2, 7.0, 2.7, true),
  ('Okra / bhindi', 100, 'g', 33, 1.9, 0.2, 7.5, 3.2, true), ('Bottle gourd / lauki', 100, 'g', 14, 0.6, 0, 3.4, 0.5, true),
  ('Mushroom', 100, 'g', 22, 3.1, 0.3, 3.3, 1.0, true), ('Green peas (boiled)', 100, 'g', 84, 5.4, 0.2, 15.6, 5.5, true),
  ('Sweet corn (boiled)', 100, 'g', 96, 3.4, 1.5, 21.0, 2.4, true),
  ('Almonds', 100, 'g', 579, 21.2, 49.9, 21.6, 12.5, true), ('Walnuts', 100, 'g', 654, 15.2, 65.2, 13.7, 6.7, true),
  ('Cashews', 100, 'g', 553, 18.2, 43.9, 30.2, 3.3, true), ('Flax seeds', 100, 'g', 534, 18.3, 42.2, 28.9, 27.3, true),
  ('Chia seeds', 100, 'g', 486, 16.5, 30.7, 42.1, 34.4, true), ('Pumpkin seeds', 100, 'g', 559, 30.2, 49.1, 10.7, 6.0, true),
  ('Peanut butter', 100, 'g', 588, 25.1, 50.4, 19.6, 6.0, true),
  ('Cooking oil', 1, 'tsp', 45, 0, 5.0, 0, 0, true), ('Sugar', 1, 'tsp', 20, 0, 0, 5.0, 0, true), ('Honey', 1, 'tbsp', 64, 0.1, 0, 17.3, 0, true),
  ('Jaggery', 100, 'g', 383, 0.4, 0.1, 95.0, 0, true), ('Tea with milk and 1 tsp sugar', 1, 'cup', 64, 2.3, 2.3, 8.5, 0, true),
  ('Black coffee', 1, 'cup', 2, 0.3, 0, 0, 0, true), ('Coconut water', 100, 'ml', 19, 0.7, 0.2, 3.7, 1.1, true)
) as x(name, q, u, kcal, p, f, c, fi, veg)
on conflict do nothing;

call app.apply_grants();
$u20261011000014$;
  insert into app.schema_migrations (version) values ('20261011000014_training');
end $bu20261011000014$;

-- ===== 20261011000015_messaging =====
do $bu20261011000015$ begin
  if exists (select 1 from app.schema_migrations where version = '20261011000015_messaging') then raise notice 'already has 20261011000015_messaging'; return; end if;
  execute $u20261011000015$
-- Shaan Fitness app · 15. Notifications, WhatsApp, SMS and email (YDL "Notification & WhatsApp")
-- Every outgoing message (automatic or bulk) is written to one outbox, public.messages. A sender
-- (a Supabase Edge Function, set up with the gym's own WhatsApp / SMS / email accounts) picks up
-- queued messages and marks them sent or failed; until it is connected, messages wait in the
-- queue and the history shows them as waiting. App notifications go straight to the member app.

-- ---------------------------------------------------------------------------
-- Secrets for the message services (write-only, like the SMTP password)
-- ---------------------------------------------------------------------------
alter table public.studio_secrets drop constraint if exists studio_secrets_key_check;
alter table public.studio_secrets add constraint studio_secrets_key_check
  check (key in ('smtp_password', 'otp_vendor_api_key', 'whatsapp_token', 'sms_api_key', 'email_api_key'));

create or replace function public.set_studio_secret(p_studio uuid, p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change this'; end if;
  if p_key not in ('smtp_password', 'otp_vendor_api_key', 'whatsapp_token', 'sms_api_key', 'email_api_key') then raise exception 'Unknown setting'; end if;
  if coalesce(p_value, '') = '' then
    delete from public.studio_secrets where studio_id = p_studio and key = p_key;
  else
    insert into public.studio_secrets (studio_id, key, value) values (p_studio, p_key, p_value)
    on conflict (studio_id, key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Settings (YDL WhatsApp Settings as Shaan Fitness has them; SMS and email sending)
-- ---------------------------------------------------------------------------
create or replace function app.default_whatsapp_settings()
returns jsonb language sql immutable as $$ select '{
  "provider": "none", "instance_id": null, "number": null,
  "birthday": true, "balance_due": true, "on_expiry": true, "before_expiry": true, "after_expiry": true, "irregular": true,
  "on_enquiry": true, "on_bill": true, "on_paid_balance": false,
  "auto_resend": true, "internationalization": true, "customized_bill": true,
  "salutation": "Dear", "before_expiry_days": 3, "after_expiry_days": 7, "irregular_days": 10,
  "birthday_template": "", "irregular_template": "", "enquiry_template": "", "customized_bill_template": "",
  "suffix_bill": "Feel free to contact us in case of any queries.",
  "suffix_before_expiry": "Renew Immediately to continue using the services.",
  "suffix_after_expiry": "Renew Immediately to continue using the services.",
  "suffix_on_expiry": "Renew Immediately to continue using the services.",
  "suffix_balance_due": "Renew Immediately to continue using the services.",
  "suffix_paid_balance": "Thank you for your payment."
}'::jsonb $$;

create or replace function app.default_sms_settings()
returns jsonb language sql immutable as $$ select '{
  "provider": "none", "sender_id": null, "entity_id": null,
  "on_enquiry": false, "on_birthday": false, "before_expiry": false, "on_expiry": false, "on_bill": false,
  "templates": []
}'::jsonb $$;

create or replace function app.whatsapp_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'whatsapp'->p_key, app.default_whatsapp_settings()->p_key) from public.studios s where s.id = p_studio;
$$;
create or replace function app.sms_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'sms'->p_key, app.default_sms_settings()->p_key) from public.studios s where s.id = p_studio;
$$;

-- Save the WhatsApp or SMS settings (owner, or front desk with Broadcast SMS & WhatsApp).
create or replace function public.save_message_settings(p_studio uuid, p_channel text, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_def jsonb; v_new jsonb; k text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'change the message settings');
  if p_channel = 'whatsapp' then v_def := app.default_whatsapp_settings();
  elsif p_channel = 'sms' then v_def := app.default_sms_settings();
  else raise exception 'Unknown channel'; end if;
  if (p ? 'provider') and not app.is_owner(p_studio) then raise exception 'Only the owner can connect a message service'; end if;
  select coalesce(settings->p_channel, '{}'::jsonb) into v_new from public.studios where id = p_studio;
  for k in select jsonb_object_keys(p) loop
    if not (v_def ? k) then raise exception 'Unknown setting: %', k; end if;
    v_new := v_new || jsonb_build_object(k, p->k);
  end loop;
  if p_channel = 'whatsapp' then
    if coalesce(v_new->>'provider', 'none') not in ('none', 'ultramsg', 'greenapi', 'cloud_api') then raise exception 'Unknown WhatsApp service'; end if;
    if coalesce(v_new->>'salutation', 'Dear') not in ('Dear', 'Hello', 'Respected', 'Hi', 'Hey', 'Greetings') then raise exception 'Unknown salutation'; end if;
    if coalesce((v_new->>'before_expiry_days')::int, 3) not between 1 and 60 or coalesce((v_new->>'after_expiry_days')::int, 7) not between 1 and 60
       or coalesce((v_new->>'irregular_days')::int, 10) not between 3 and 90 then
      raise exception 'Days should be between 1 and 60 (irregular: 3 to 90)';
    end if;
  else
    if coalesce(v_new->>'provider', 'none') not in ('none', 'msg91', 'fast2sms', 'textlocal') then raise exception 'Unknown SMS service'; end if;
    if v_new->>'sender_id' is not null and v_new->>'sender_id' !~ '^[A-Za-z]{6}$' then raise exception 'The sender ID (header) is 6 letters, e.g. SHAANF'; end if;
    if jsonb_typeof(coalesce(v_new->'templates', '[]'::jsonb)) <> 'array' then raise exception 'Templates should be a list'; end if;
  end if;
  update public.studios set settings = jsonb_set(settings, array[p_channel], v_new) where id = p_studio;
end $$;

-- ---------------------------------------------------------------------------
-- The outbox
-- ---------------------------------------------------------------------------
create table public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  title text,
  body text not null,
  template_id text,
  audience text,
  total int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index message_campaigns_studio_idx on public.message_campaigns (studio_id, channel, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  member_id uuid references public.members(id) on delete set null,
  to_name text,
  to_address text not null check (length(trim(to_address)) > 0),
  subject text,
  body text not null check (length(trim(body)) > 0),
  source text not null check (source in ('birthday', 'balance_due', 'on_expiry', 'before_expiry', 'after_expiry', 'irregular',
                                         'enquiry', 'bill', 'paid_balance', 'bulk', 'test', 'single')),
  campaign_id uuid references public.message_campaigns(id) on delete set null,
  template_id text,                       -- the DLT template for an SMS
  dedupe_key text,                        -- one automatic message per client, kind and day
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  error text,
  attempts int not null default 0,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index messages_dedupe_uq on public.messages (studio_id, channel, dedupe_key) where dedupe_key is not null;
create index messages_studio_idx on public.messages (studio_id, channel, created_at desc);
create index messages_queue_idx on public.messages (send_after) where status = 'queued';
create index messages_campaign_idx on public.messages (campaign_id) where campaign_id is not null;

-- SMS credits bought (YDL "Recharge History"); the balance is credits less SMS sent.
create table public.sms_recharges (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  credits int not null check (credits > 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_on date not null default current_date,
  reference text,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index sms_recharges_studio_idx on public.sms_recharges (studio_id, paid_on desc);
create trigger sms_recharges_fill before insert on public.sms_recharges for each row execute function app.fill_created_by();

alter table public.message_campaigns enable row level security;
alter table public.messages enable row level security;
alter table public.sms_recharges enable row level security;
create policy message_campaigns_read on public.message_campaigns for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy messages_read on public.messages for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy sms_recharges_read on public.sms_recharges for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy sms_recharges_owner on public.sms_recharges for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
-- Messages are written only by the functions below (and the sender, with the service key).

-- ---------------------------------------------------------------------------
-- Writing messages
-- ---------------------------------------------------------------------------
-- The client's WhatsApp / SMS number (country code and number, digits only) or email.
create or replace function app.member_address(m public.members, p_channel text)
returns text language sql immutable as $$
  select case
    when p_channel = 'email' then nullif(lower(trim(m.email)), '')
    when length(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g')) >= 6
      then regexp_replace(coalesce(m.country_code, '+91'), '\D', '', 'g') || regexp_replace(m.phone, '\D', '', 'g')
  end;
$$;

-- {cust_first_name} and the others: the client, the fitness center, and any extra values given.
create or replace function app.render_message(p_text text, m public.members, p_extra jsonb default '{}')
returns text language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; v text := coalesce(p_text, ''); k text; x jsonb;
begin
  select * into s from public.studios where id = m.studio_id;
  x := jsonb_build_object(
    'cust_first_name', coalesce(m.first_name, ''), 'cust_last_name', coalesce(m.last_name, ''), 'cust_name', coalesce(m.full_name, ''),
    'fitness_center_name', coalesce(s.name, ''), 'fitness_center_phone', coalesce(s.mobile, ''),
    'website_url', coalesce(app.center_setting(s.id, 'website_url') #>> '{}', app.center_setting(s.id, 'web_app_url') #>> '{}', ''),
    'web_app_url', coalesce(app.center_setting(s.id, 'web_app_url') #>> '{}', app.center_setting(s.id, 'website_url') #>> '{}', ''),
    'salutation', coalesce(app.whatsapp_setting(s.id, 'salutation') #>> '{}', 'Dear')
  ) || coalesce(p_extra, '{}'::jsonb);
  for k in select jsonb_object_keys(x) loop
    v := replace(v, '{' || k || '}', coalesce(x->>k, ''));
  end loop;
  return trim(regexp_replace(v, '[ \t]+\n', E'\n', 'g'));
end $$;

-- Puts one message in the outbox (skipped quietly if the client has no number or email,
-- or the same automatic message already went out today).
create or replace function app.queue_message(m public.members, p_channel text, p_source text, p_body text,
  p_subject text default null, p_dedupe text default null, p_campaign uuid default null, p_template text default null, p_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_to text := app.member_address(m, p_channel); v_id uuid;
begin
  if v_to is null or nullif(trim(p_body), '') is null then return null; end if;
  insert into public.messages (studio_id, channel, member_id, to_name, to_address, subject, body, source, campaign_id, template_id, dedupe_key, created_by)
  values (m.studio_id, p_channel, m.id, m.full_name, v_to, p_subject, p_body, p_source, p_campaign, p_template, p_dedupe, p_by)
  on conflict (studio_id, channel, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id;
end $$;

-- The standard WhatsApp texts (as YDL sends them), with the gym's own templates and suffixes.
create or replace function app.whatsapp_text(p_kind text, m public.members, p jsonb default '{}')
returns text language plpgsql stable security definer set search_path = '' as $$
declare w jsonb; v_tpl text; v_hi text; v_text text; v_app text;
begin
  select app.default_whatsapp_settings() || coalesce(s.settings->'whatsapp', '{}'::jsonb) into w from public.studios s where s.id = m.studio_id;
  v_app := nullif(trim(coalesce(app.center_setting(m.studio_id, 'web_app_url') #>> '{}', '')), '');
  v_hi := (w->>'salutation') || ' ' || trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) || ',';
  v_tpl := nullif(trim(coalesce(w->>(p_kind || '_template'), '')), '');
  v_text := case p_kind
    when 'birthday' then coalesce(v_tpl, v_hi || ' Hope your special day brings you all that your heart desire! Happy Birthday From {fitness_center_name} Family.')
    when 'irregular' then coalesce(v_tpl, 'Hi {cust_first_name} {cust_last_name}, ' || E'\n\n' || 'It has been long time you have visited our center. ' || E'\n\n'
                                              || 'Please visit us and let us restart this wonderful journey together - {fitness_center_name}')
    when 'enquiry' then coalesce(v_tpl, 'Welcome To {fitness_center_name}, We are glad to know that you are interested in our services.' || E'\n\n'
                                            || case when v_app is not null then 'Our App : {web_app_url}' || E'\n' else '' end
                                            || 'Visit Our Website : {website_url}' || E'\n' || 'Call Us : {fitness_center_phone}')
    when 'bill' then case when (w->>'customized_bill')::boolean and nullif(trim(coalesce(w->>'customized_bill_template', '')), '') is not null
                          then w->>'customized_bill_template'
                          else v_hi || E'\n\n' || 'Thanks for subscribing ''{membership}'', Your Total Billing Amount is Rs. {total_amount}. '
                               || case when v_app is not null then 'You can see your plan and receipts in our app : ' || E'\n' || '{web_app_url}' else '' end
                               || E'\n' || coalesce(w->>'suffix_bill', '') end
    when 'before_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) is expiring in {days} Days ({end_date}). ' || coalesce(w->>'suffix_before_expiry', '')
    when 'on_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) is expiring today. ' || coalesce(w->>'suffix_on_expiry', '')
    when 'after_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) has expired {days} Days ago. ' || coalesce(w->>'suffix_after_expiry', '')
    when 'balance_due' then v_hi || E'\n' || 'A balance of Rs. {balance_amount} is due for your Membership Plan ({membership}). ' || coalesce(w->>'suffix_balance_due', '')
    when 'paid_balance' then v_hi || E'\n' || 'We have received Rs. {amount} for your Membership Plan ({membership}). Balance remaining: Rs. {balance_amount}. '
                                 || coalesce(w->>'suffix_paid_balance', '')
  end;
  return app.render_message(v_text, m, p);
end $$;

-- A bill's balance (total less payments and write-offs).
create or replace function app.sub_balance(p_sub uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select greatest(s.total_amount - coalesce((
    select sum(case when x.kind = 'payment' then x.amount when x.kind = 'refund' then -x.amount when x.kind = 'write_off' then x.amount else 0 end)
    from public.payments x where x.subscription_id = s.id and x.status = 'paid' and x.purpose = 'subscription'), 0), 0)
  from public.subscriptions s where s.id = p_sub;
$$;

-- Fewer decimals in amounts: 3000 not 3000.00.
create or replace function app.money_text(p numeric)
returns text language sql immutable as $$ select trim(trailing '.' from trim(trailing '0' from to_char(round(coalesce(p, 0), 2), 'FM999999999990.00'))) $$;

-- ---------------------------------------------------------------------------
-- Automatic messages: scheduled (birthday, expiry, balance due, irregular) and on events
-- ---------------------------------------------------------------------------
-- Queues one kind of scheduled message for a studio, for today (YDL "SYSTEM - …" messages).
create or replace function app.queue_scheduled(p_studio uuid, p_kind text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_n int := 0; r record; mem public.members; v_days int;
begin
  if not coalesce((app.whatsapp_setting(p_studio, p_kind) #>> '{}')::boolean, false) then return 0; end if;
  if p_kind = 'birthday' then
    for mem in select m.* from public.members m
      where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null and m.active and m.date_of_birth is not null
        and (to_char(m.date_of_birth, 'MM-DD') = to_char(v_today, 'MM-DD')
             or (to_char(m.date_of_birth, 'MM-DD') = '02-29' and to_char(v_today, 'MM-DD') = '02-28' and to_char(v_today, 'YYYY')::int % 4 <> 0))
    loop
      if app.queue_message(mem, 'whatsapp', 'birthday', app.whatsapp_text('birthday', mem), null, 'birthday:' || mem.id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind in ('before_expiry', 'on_expiry', 'after_expiry') then
    v_days := case p_kind when 'on_expiry' then 0 when 'before_expiry' then (app.whatsapp_setting(p_studio, 'before_expiry_days') #>> '{}')::int
                          else -(app.whatsapp_setting(p_studio, 'after_expiry_days') #>> '{}')::int end;
    for r in select m as mem, p.name as plan_name, s.end_date as sub_end, s.id as sub_id from public.subscriptions s
      join public.members m on m.id = s.member_id and m.deleted_at is null and m.active
      join public.plans p on p.id = s.plan_id
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
        and s.end_date = v_today + v_days
        and not exists (select 1 from public.subscriptions n where n.member_id = s.member_id and n.kind in ('gym', 'pt') and n.id <> s.id
                        and n.deleted_at is null and n.cancelled_at is null and n.end_date > s.end_date)
    loop
      if app.queue_message(r.mem, 'whatsapp', p_kind,
           app.whatsapp_text(p_kind, r.mem, jsonb_build_object('membership', r.plan_name, 'days', abs(v_days), 'end_date', to_char(r.sub_end, 'DD-Mon-YYYY'))),
           null, p_kind || ':' || r.sub_id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind = 'balance_due' then
    -- On the payment date set on the bill (or a week after the bill), then every 7 days while a balance remains.
    for r in select m as mem, p.name as plan_name, s.id as sub_id, app.sub_balance(s.id) as bal from public.subscriptions s
      join public.members m on m.id = s.member_id and m.deleted_at is null and m.active
      join public.plans p on p.id = s.plan_id
      where s.studio_id = p_studio and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
        and v_today >= coalesce(s.balance_due_date, s.invoice_date + 7)
        and (v_today - coalesce(s.balance_due_date, s.invoice_date + 7)) % 7 = 0
        and app.sub_balance(s.id) > 0.009
    loop
      if app.queue_message(r.mem, 'whatsapp', 'balance_due',
           app.whatsapp_text('balance_due', r.mem, jsonb_build_object('membership', r.plan_name, 'balance_amount', app.money_text(r.bal))),
           null, 'balance_due:' || r.sub_id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind = 'irregular' then
    v_days := (app.whatsapp_setting(p_studio, 'irregular_days') #>> '{}')::int;
    for mem in select m.* from public.members m
      join lateral (select s.start_date from public.subscriptions s where s.member_id = m.id and s.kind in ('gym', 'pt') and s.deleted_at is null
                    and s.cancelled_at is null and s.status = 'live' and v_today between s.start_date and s.end_date order by s.start_date limit 1) cur on true
      where m.studio_id = p_studio and m.deleted_at is null and m.active
        and coalesce((select max(a.date) from public.attendance a where a.member_id = m.id and a.status = 'present'), cur.start_date) = v_today - v_days
    loop
      if app.queue_message(mem, 'whatsapp', 'irregular', app.whatsapp_text('irregular', mem), null, 'irregular:' || mem.id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  else
    raise exception 'Unknown message kind %', p_kind;
  end if;
  return v_n;
end $$;

-- Runs every hour: each kind at its YDL time in the studio's own time zone (Birthday 4 AM, Balance Due 5 AM,
-- Before Expiry 6 AM, After Expiry 7 AM, On Expiry and Irregular 8 AM). Safe to run more than once.
create or replace function app.run_message_schedule(p_hour int default null)
returns int language plpgsql security definer set search_path = '' as $$
declare s record; v_hour int; v_n int := 0; k text;
begin
  for s in select id, coalesce(timezone, 'Asia/Kolkata') as tz from public.studios where active loop
    v_hour := coalesce(p_hour, extract(hour from now() at time zone s.tz)::int);
    for k in select unnest(case v_hour when 4 then array['birthday'] when 5 then array['balance_due'] when 6 then array['before_expiry']
                                       when 7 then array['after_expiry'] when 8 then array['on_expiry', 'irregular'] else array[]::text[] end) loop
      v_n := v_n + app.queue_scheduled(s.id, k);
    end loop;
    -- Auto Resend: failed messages are retried a few hours later, up to three times.
    if coalesce((app.whatsapp_setting(s.id, 'auto_resend') #>> '{}')::boolean, false) then
      update public.messages set status = 'queued', send_after = now(), error = null
      where studio_id = s.id and channel = 'whatsapp' and status = 'failed' and attempts < 3 and created_at > now() - interval '2 days'
        and coalesce(sent_at, created_at) < now() - interval '2 hours';
    end if;
  end loop;
  return v_n;
end $$;

-- New enquiry: the welcome message (YDL "MESSAGE ON ENQUIRY").
create or replace function app.message_on_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'enquiry' and coalesce((app.whatsapp_setting(new.studio_id, 'on_enquiry') #>> '{}')::boolean, false) then
    perform app.queue_message(new, 'whatsapp', 'enquiry', app.whatsapp_text('enquiry', new), null, 'enquiry:' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists members_message_on_enquiry on public.members;
create trigger members_message_on_enquiry after insert on public.members for each row execute function app.message_on_enquiry();

-- New bill: sent when the billing finishes (so the first payment is counted).
create or replace function app.message_on_bill()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members; v_plan text;
begin
  if new.kind = 'trial' or new.deleted_at is not null or new.cancelled_at is not null then return null; end if;
  if not coalesce((app.whatsapp_setting(new.studio_id, 'on_bill') #>> '{}')::boolean, false) then return null; end if;
  select * into m from public.members where id = new.member_id;
  select name into v_plan from public.plans where id = new.plan_id;
  perform app.queue_message(m, 'whatsapp', 'bill', app.whatsapp_text('bill', m, jsonb_build_object(
    'membership', v_plan, 'total_amount', app.money_text(new.total_amount), 'start_date', to_char(new.start_date, 'DD-Mon-YYYY'),
    'end_date', to_char(new.end_date, 'DD-Mon-YYYY'), 'balance_amount', app.money_text(app.sub_balance(new.id)), 'receipt_link',
    coalesce(app.center_setting(new.studio_id, 'web_app_url') #>> '{}', ''))), null, 'bill:' || new.id);
  return null;
end $$;
drop trigger if exists subscriptions_message_on_bill on public.subscriptions;
create constraint trigger subscriptions_message_on_bill after insert on public.subscriptions
  deferrable initially deferred for each row execute function app.message_on_bill();

-- A balance paid later (not with the bill itself).
create or replace function app.message_on_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members; s public.subscriptions; v_plan text;
begin
  if new.kind <> 'payment' or new.status <> 'paid' or new.purpose <> 'subscription' or new.subscription_id is null then return null; end if;
  if not coalesce((app.whatsapp_setting(new.studio_id, 'on_paid_balance') #>> '{}')::boolean, false) then return null; end if;
  select * into s from public.subscriptions where id = new.subscription_id;
  if s.created_at >= now() then return null; end if;      -- paid with the bill: the bill message covers it
  select * into m from public.members where id = new.member_id;
  select name into v_plan from public.plans where id = s.plan_id;
  perform app.queue_message(m, 'whatsapp', 'paid_balance', app.whatsapp_text('paid_balance', m, jsonb_build_object(
    'membership', v_plan, 'amount', app.money_text(new.amount), 'balance_amount', app.money_text(app.sub_balance(s.id)))), null, 'paid:' || new.id);
  return null;
end $$;
drop trigger if exists payments_message_on_payment on public.payments;
create trigger payments_message_on_payment after insert on public.payments for each row execute function app.message_on_payment();

-- ---------------------------------------------------------------------------
-- Sending from the pages
-- ---------------------------------------------------------------------------
-- Clients by YDL's lists: Notification "Select Group Of User" and Email / SMS "Members Status".
create or replace function app.audience(p_studio uuid, p_group text, p_service uuid default null)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select o.id from public.member_overview o
  where o.studio_id = p_studio and o.active
    and case p_group
      when 'all' then true
      when 'enquiry' then o.kind = 'enquiry'
      when 'enquiry_male' then o.kind = 'enquiry' and o.gender = 'male'
      when 'enquiry_female' then o.kind = 'enquiry' and o.gender = 'female'
      when 'enquiry_open' then o.kind = 'enquiry' and o.lead_status = 'open'
      when 'enquiry_not_interested' then o.kind = 'enquiry' and o.lead_status = 'not_interested'
      when 'members' then o.kind = 'member'
      when 'male' then o.kind = 'member' and o.gender = 'male'
      when 'female' then o.kind = 'member' and o.gender = 'female'
      when 'active' then o.kind = 'member' and o.live_status in ('active', 'pending')
      when 'expired_membership' then o.kind = 'member' and o.live_status = 'inactive'
      else false end
    and (p_service is null or p_service = any (coalesce(o.current_service_ids, '{}'::uuid[])));
$$;

-- YDL "Send Notification": an app notification to a group (p_dry: just count them).
create or replace function public.notify_group(p_studio uuid, p_group text, p_service uuid, p_title text, p_body text, p_dry boolean default false)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform app.require(p_studio, 'notices', 'on', 'send notifications');
  if p_dry then return (select count(*) from app.audience(p_studio, p_group, p_service)); end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then raise exception 'Enter the Message Title and Message Body'; end if;
  insert into public.notifications (studio_id, member_id, title, body, sent_by)
  select p_studio, a, trim(p_title), trim(p_body), app.my_staff_id(p_studio) from app.audience(p_studio, p_group, p_service) a;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- WhatsApp, SMS or email to chosen clients (or a group). One message per client, with {cust_first_name} filled in.
create or replace function public.queue_messages(p_studio uuid, p_channel text, p_member_ids uuid[], p_body text, p_subject text default null,
  p_template_id text default null, p_group text default null, p_dry boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_campaign uuid; v_n int := 0; v_skip int := 0; m public.members; v_by uuid := app.my_staff_id(p_studio);
begin
  perform app.require(p_studio, 'broadcast', 'on', 'send WhatsApp, SMS or email');
  if p_channel not in ('whatsapp', 'sms', 'email') then raise exception 'Unknown channel'; end if;
  v_ids := case when p_group is not null then array(select app.audience(p_studio, p_group)) else coalesce(p_member_ids, '{}') end;
  if p_dry then
    return jsonb_build_object('total', (select count(*) from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null),
      'reachable', (select count(*) from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null and app.member_address(x, p_channel) is not null));
  end if;
  if nullif(trim(p_body), '') is null then raise exception 'Write the message'; end if;
  if p_channel = 'email' and nullif(trim(p_subject), '') is null then raise exception 'Enter the email subject'; end if;
  if p_channel = 'sms' and nullif(trim(p_template_id), '') is null then raise exception 'Choose the DLT template'; end if;
  if cardinality(v_ids) = 0 then raise exception 'Choose who to send it to'; end if;
  if cardinality(v_ids) > 1 then
    insert into public.message_campaigns (studio_id, channel, title, body, template_id, audience, created_by)
    values (p_studio, p_channel, nullif(trim(p_subject), ''), trim(p_body), p_template_id, coalesce(p_group, 'selected'), v_by) returning id into v_campaign;
  end if;
  for m in select * from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null loop
    if app.queue_message(m, p_channel, case when v_campaign is null then 'single' else 'bulk' end, app.render_message(p_body, m),
         case when p_subject is null then null else app.render_message(p_subject, m) end, null, v_campaign, p_template_id, v_by) is null then
      v_skip := v_skip + 1;
    else
      v_n := v_n + 1;
    end if;
  end loop;
  if v_campaign is not null then update public.message_campaigns set total = v_n where id = v_campaign; end if;
  return jsonb_build_object('queued', v_n, 'skipped', v_skip, 'campaign_id', v_campaign);
end $$;

-- QR Manager "Send Test Message".
create or replace function public.send_test_message(p_studio uuid, p_channel text, p_to text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_to text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'send test messages');
  if p_channel not in ('whatsapp', 'sms', 'email') then raise exception 'Unknown channel'; end if;
  v_to := case when p_channel = 'email' then lower(trim(p_to)) else regexp_replace(coalesce(p_to, ''), '\D', '', 'g') end;
  if p_channel <> 'email' and length(v_to) not between 10 and 15 then raise exception 'Enter the mobile number with its country code, e.g. 91 98481 20185'; end if;
  if p_channel = 'email' and v_to !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email address'; end if;
  if nullif(trim(p_body), '') is null then raise exception 'Write the message'; end if;
  insert into public.messages (studio_id, channel, to_address, body, source, created_by)
  values (p_studio, p_channel, v_to, trim(p_body), 'test', app.my_staff_id(p_studio)) returning id into v_id;
  return v_id;
end $$;

-- Messages History "Resend Selected / Today / Yesterday / All Failed" (failed ones; selected ones whatever their state).
create or replace function public.resend_messages(p_studio uuid, p_channel text, p_scope text, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_n int; v_tz text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'resend messages');
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = p_studio;
  update public.messages x set status = 'queued', send_after = now(), error = null
  where x.studio_id = p_studio and x.channel = p_channel and x.status <> 'queued'
    and case p_scope
      when 'selected' then x.id = any (coalesce(p_ids, '{}'))
      when 'today' then x.status = 'failed' and (x.created_at at time zone v_tz)::date = v_today
      when 'yesterday' then x.status = 'failed' and (x.created_at at time zone v_tz)::date = v_today - 1
      when 'failed' then x.status = 'failed'
      else false end;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- The history page's counts (YDL "Total Today / Success Today / Failed Today" and the 7 days).
create or replace function public.message_stats(p_studio uuid, p_channel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_tz text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'see the message history');
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = p_studio;
  return (
    select jsonb_build_object(
      'today_total', count(*) filter (where d = v_today), 'today_sent', count(*) filter (where d = v_today and status = 'sent'),
      'today_failed', count(*) filter (where d = v_today and status = 'failed'),
      'week_total', count(*), 'week_sent', count(*) filter (where status = 'sent'), 'week_failed', count(*) filter (where status = 'failed'),
      'queued', (select count(*) from public.messages q where q.studio_id = p_studio and q.channel = p_channel and q.status in ('queued', 'sending')),
      'sms_credits', (select coalesce(sum(credits), 0) from public.sms_recharges r where r.studio_id = p_studio),
      'sms_used', (select count(*) from public.messages u where u.studio_id = p_studio and u.channel = 'sms' and u.status = 'sent'))
    from (select (x.created_at at time zone v_tz)::date as d, x.status from public.messages x
          where x.studio_id = p_studio and x.channel = p_channel and x.created_at >= (v_today - 6)::timestamp at time zone v_tz) t
  );
end $$;

-- Bulk campaigns with how many went out (SMS "Bulk Campaigns History").
create or replace function public.message_campaign_list(p_studio uuid, p_channel text)
returns table (id uuid, title text, body text, template_id text, audience text, total int, sent bigint, failed bigint, waiting bigint, created_at timestamptz, created_by_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.body, c.template_id, c.audience, c.total,
    count(x.id) filter (where x.status = 'sent'), count(x.id) filter (where x.status = 'failed'), count(x.id) filter (where x.status in ('queued', 'sending')),
    c.created_at, st.full_name
  from public.message_campaigns c
  left join public.messages x on x.campaign_id = c.id
  left join public.staff st on st.id = c.created_by
  where c.studio_id = p_studio and c.channel = p_channel and app.can(p_studio, 'broadcast', 'on')
  group by c.id, st.full_name
  order by c.created_at desc
  limit 500;
$$;

-- The member app: notifications, newest first; marking them read.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.notifications n set read_at = now()
  where n.read_at is null and app.is_self(n.member_id) and (p_ids is null or n.id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- The hourly schedule (Supabase has pg_cron; plain Postgres for tests doesn't)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.unschedule(jobid) from cron.job where jobname = 'shaan-messages';
      perform cron.schedule('shaan-messages', '0 * * * *', 'select app.run_message_schedule()');
    exception when others then
      raise notice 'Hourly messages not scheduled (%). Turn on pg_cron in Supabase › Database › Extensions, then run this file again.', sqlerrm;
    end;
  end if;
end $$;

revoke all on function public.save_message_settings(uuid, text, jsonb), public.notify_group(uuid, text, uuid, text, text, boolean),
  public.queue_messages(uuid, text, uuid[], text, text, text, text, boolean), public.send_test_message(uuid, text, text, text),
  public.resend_messages(uuid, text, text, uuid[]), public.message_stats(uuid, text), public.message_campaign_list(uuid, text),
  public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.save_message_settings(uuid, text, jsonb), public.notify_group(uuid, text, uuid, text, text, boolean),
  public.queue_messages(uuid, text, uuid[], text, text, text, text, boolean), public.send_test_message(uuid, text, text, text),
  public.resend_messages(uuid, text, text, uuid[]), public.message_stats(uuid, text), public.message_campaign_list(uuid, text),
  public.mark_notifications_read(uuid[]) to authenticated;
revoke all on function app.run_message_schedule(int), app.queue_scheduled(uuid, text) from public, anon, authenticated;
grant execute on function app.run_message_schedule(int), app.queue_scheduled(uuid, text) to service_role;

call app.apply_grants();
$u20261011000015$;
  insert into app.schema_migrations (version) values ('20261011000015_messaging');
end $bu20261011000015$;

-- ===== 20261012000016_community =====
do $bu20261012000016$ begin
  if exists (select 1 from app.schema_migrations where version = '20261012000016_community') then raise notice 'already has 20261012000016_community'; return; end if;
  execute $u20261012000016$
-- Shaan Fitness app · 16. Community and challenges (YDL App Settings › Community and › Challenges)
-- Members post photos and thoughts in the community; the gym accepts or declines them (or they go
-- live at once when "Auto approve community" is on). Challenges run between two dates with optional
-- daily tasks worth points; members join from the app, log their tasks and post, and teams compete.
-- Other members see first names on leaderboards and posts, never phone numbers or other details.

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  video_url text check (video_url is null or video_url ~* '^https://'),
  image_url text,
  start_date date not null,
  end_date date not null,
  terms text not null check (length(trim(terms)) > 0),
  has_tasks boolean not null default false,
  client_level text,                                   -- YDL "Client Challenge Level" (LEVEL 0 to LEVEL 3)
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index challenges_studio_idx on public.challenges (studio_id, start_date desc);

create table public.challenge_tasks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  target numeric(10,2) check (target is null or target > 0),
  unit text not null default 'reps' check (unit in ('reps', 'secs', 'mins', 'km', 'kg', 'steps', 'litres', 'times')),
  points int not null default 10 check (points between 0 and 1000),
  day int check (day is null or day >= 1),            -- null: every day of the challenge
  seq int not null default 0,
  created_at timestamptz not null default now()
);
create index challenge_tasks_challenge_idx on public.challenge_tasks (challenge_id, seq);

create table public.challenge_teams (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index challenge_teams_name_uq on public.challenge_teams (challenge_id, lower(name));

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  team_id uuid references public.challenge_teams(id) on delete set null,
  added_by uuid references public.staff(id) on delete set null,   -- null: joined from the app
  joined_at timestamptz not null default now(),
  unique (challenge_id, member_id)
);
create index challenge_participants_member_idx on public.challenge_participants (member_id);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  task_id uuid references public.challenge_tasks(id) on delete cascade,
  date date not null,
  value numeric(10,2) not null check (value >= 0),
  points int not null default 0,
  note text,
  recorded_by uuid references public.staff(id) on delete set null, -- null: the member logged it
  created_at timestamptz not null default now(),
  unique (challenge_id, member_id, task_id, date)
);
create index challenge_entries_challenge_idx on public.challenge_entries (challenge_id, member_id);

-- ---------------------------------------------------------------------------
-- Community posts (and challenge posts) and claps
-- ---------------------------------------------------------------------------
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  author_member_id uuid references public.members(id) on delete cascade,
  author_staff_id uuid references public.staff(id) on delete set null,
  body text,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (author_member_id is not null or author_staff_id is not null),
  check (nullif(trim(body), '') is not null or media_path is not null),
  check ((media_path is null) = (media_type is null))
);
create index community_posts_studio_idx on public.community_posts (studio_id, status, created_at desc) where deleted_at is null;
create index community_posts_challenge_idx on public.community_posts (challenge_id) where challenge_id is not null;

create table public.post_claps (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Rules on writes
-- ---------------------------------------------------------------------------
create trigger challenges_fill before insert on public.challenges for each row execute function app.fill_created_by();
create trigger challenges_touch before update on public.challenges for each row execute function app.touch_updated_at();
create trigger challenges_log after insert or update or delete on public.challenges for each row execute function app.log_activity();
create trigger challenge_teams_fill before insert on public.challenge_teams for each row execute function app.fill_created_by();

-- Child rows take their challenge's studio.
create or replace function app.challenge_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.studio_id into new.studio_id from public.challenges c where c.id = new.challenge_id;
  if new.studio_id is null then raise exception 'Challenge not found'; end if;
  return new;
end $$;
create trigger challenge_tasks_child before insert or update on public.challenge_tasks for each row execute function app.challenge_child();
create trigger challenge_teams_child before insert or update on public.challenge_teams for each row execute function app.challenge_child();

-- A team belongs to the participant's challenge.
create or replace function app.check_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.studio_id into new.studio_id from public.challenges c where c.id = new.challenge_id;
  if not exists (select 1 from public.members m where m.id = new.member_id and m.studio_id = new.studio_id and m.deleted_at is null) then
    raise exception 'Client not found';
  end if;
  if new.team_id is not null and not exists (select 1 from public.challenge_teams t where t.id = new.team_id and t.challenge_id = new.challenge_id) then
    raise exception 'That team is in another challenge';
  end if;
  return new;
end $$;
create trigger challenge_participants_check before insert or update on public.challenge_participants for each row execute function app.check_participant();

-- An entry is a participant's, on a day of the challenge (not in the future); its points come from the task.
create or replace function app.check_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.challenges; t public.challenge_tasks;
begin
  select * into c from public.challenges where id = new.challenge_id;
  new.studio_id := c.studio_id;
  if not exists (select 1 from public.challenge_participants p where p.challenge_id = c.id and p.member_id = new.member_id) then
    raise exception 'Join the challenge first';
  end if;
  if new.date < c.start_date or new.date > c.end_date then raise exception 'That day is outside the challenge (% to %)', c.start_date, c.end_date; end if;
  if new.date > app.today(c.studio_id) then raise exception 'You can''t log a future day'; end if;
  if new.task_id is not null then
    select * into t from public.challenge_tasks where id = new.task_id and challenge_id = c.id;
    if t.id is null then raise exception 'That task is not in this challenge'; end if;
    if t.day is not null and new.date <> c.start_date + (t.day - 1) then raise exception 'That task is for Day %', t.day; end if;
    new.points := case when t.target is null or new.value >= t.target then t.points else 0 end;
  elsif tg_op = 'INSERT' and new.recorded_by is null and not app.is_staff(c.studio_id) then
    new.points := 0;   -- members can't award themselves free points
  end if;
  return new;
end $$;
create trigger challenge_entries_check before insert or update on public.challenge_entries for each row execute function app.check_entry();

-- Posts: the author's studio; staff posts go live; members' wait for approval unless auto-approve is on.
create or replace function app.check_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_auto boolean;
begin
  if new.author_member_id is not null then
    select m.studio_id into new.studio_id from public.members m where m.id = new.author_member_id;
  else
    select s.studio_id into new.studio_id from public.staff s where s.id = new.author_staff_id;
  end if;
  if new.challenge_id is not null then
    if not exists (select 1 from public.challenges c where c.id = new.challenge_id and c.studio_id = new.studio_id) then raise exception 'Challenge not found'; end if;
    if new.author_member_id is not null and not exists (select 1 from public.challenge_participants p where p.challenge_id = new.challenge_id and p.member_id = new.author_member_id) then
      raise exception 'Join the challenge first';
    end if;
  end if;
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> new.studio_id::text then raise exception 'That picture is not this gym''s'; end if;
  if new.author_staff_id is not null then
    new.status := 'active';
  else
    v_auto := coalesce((app.center_setting(new.studio_id, case when new.challenge_id is null then 'auto_approve_community' else 'auto_approve_challenge' end) #>> '{}')::boolean, false);
    new.status := case when v_auto then 'active' else 'pending' end;
  end if;
  return new;
end $$;
create trigger community_posts_check before insert on public.community_posts for each row execute function app.check_post();

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.challenge_tasks enable row level security;
alter table public.challenge_teams enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_claps enable row level security;

-- Staff see every challenge; members see the active ones of their gym.
create policy challenges_read on public.challenges for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy challenges_desk on public.challenges for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy challenge_tasks_read on public.challenge_tasks for select to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and (app.is_staff(c.studio_id) or (c.active and app.in_studio(c.studio_id)))));
create policy challenge_tasks_desk on public.challenge_tasks for all to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)));
create policy challenge_teams_read on public.challenge_teams for select to authenticated using (app.in_studio(studio_id));
create policy challenge_teams_desk on public.challenge_teams for all to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)));
-- Who joined: staff, and each member their own row (others appear only by first name on leaderboards).
create policy challenge_participants_read on public.challenge_participants for select to authenticated using (app.is_staff(studio_id) or app.is_self(member_id));
create policy challenge_participants_desk on public.challenge_participants for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy challenge_entries_read on public.challenge_entries for select to authenticated using (app.is_staff(studio_id) or app.is_self(member_id));
create policy challenge_entries_write on public.challenge_entries for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]) or app.is_self(member_id))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]) or (app.is_self(member_id) and recorded_by is null));
-- Posts are read through community_feed (it adds author names); the table itself: staff, and the author.
create policy community_posts_read on public.community_posts for select to authenticated
  using (app.is_staff(studio_id) or app.is_self(author_member_id) or (status = 'active' and deleted_at is null and app.in_studio(studio_id)));
create policy community_posts_member_insert on public.community_posts for insert to authenticated
  with check (author_member_id is not null and app.is_self(author_member_id) and author_staff_id is null);
create policy community_posts_staff_insert on public.community_posts for insert to authenticated
  with check (author_staff_id is not null and author_staff_id in (select app.my_staff_ids()) and author_member_id is null and app.is_desk(studio_id));
-- Accept / decline / delete go through decide_posts; an author may delete their own post.
create policy community_posts_author_delete on public.community_posts for delete to authenticated using (app.is_self(author_member_id));
create policy post_claps_read on public.post_claps for select to authenticated using (user_id = (select auth.uid()) or app.is_staff(studio_id));
create policy post_claps_own on public.post_claps for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A clap is on a live post of the person's own gym.
create or replace function app.check_clap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select p.studio_id into new.studio_id from public.community_posts p where p.id = new.post_id and p.status = 'active' and p.deleted_at is null;
  if new.studio_id is null or not app.in_studio(new.studio_id) then raise exception 'Post not found'; end if;
  return new;
end $$;
create trigger post_claps_check before insert on public.post_claps for each row execute function app.check_clap();

-- ---------------------------------------------------------------------------
-- Functions for the pages and the member app
-- ---------------------------------------------------------------------------
-- A name other members may see: first name and the initial of the last.
create or replace function app.public_name(m public.members)
returns text language sql immutable as $$
  select trim(coalesce(m.first_name, '') || coalesce(' ' || left(nullif(trim(m.last_name), ''), 1) || '.', ''));
$$;

-- The feed: posts with author, claps and whether I clapped. Staff can filter by status; members see
-- live posts and their own.
create or replace function public.community_feed(p_studio uuid, p_status text default 'active', p_challenge uuid default null,
  p_search text default null, p_limit int default 100, p_before timestamptz default null)
returns table (id uuid, challenge_id uuid, author_name text, author_is_staff boolean, author_member_id uuid, is_mine boolean, body text,
  media_path text, media_type text, status text, claps bigint, clapped boolean, created_at timestamptz, decided_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.challenge_id,
    case when p.author_staff_id is not null then st.full_name when app.is_staff(p_studio) then m.full_name else app.public_name(m) end,
    p.author_staff_id is not null, case when app.is_staff(p_studio) then p.author_member_id end,
    coalesce(app.is_self(p.author_member_id), false), p.body, p.media_path, p.media_type, p.status,
    (select count(*) from public.post_claps c where c.post_id = p.id),
    exists (select 1 from public.post_claps c where c.post_id = p.id and c.user_id = (select auth.uid())),
    p.created_at, p.decided_at
  from public.community_posts p
  left join public.members m on m.id = p.author_member_id
  left join public.staff st on st.id = p.author_staff_id
  where p.studio_id = p_studio and p.deleted_at is null and app.in_studio(p_studio)
    and p.challenge_id is not distinct from p_challenge
    and case
      when app.is_staff(p_studio) then p_status = 'all' or p.status = p_status
      else p.status = 'active' or app.is_self(p.author_member_id) end
    and (coalesce(trim(p_search), '') = '' or m.full_name ilike '%' || trim(p_search) || '%' or st.full_name ilike '%' || trim(p_search) || '%')
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Accept, decline or delete posts (YDL "Accept / Decline / Delete").
create or replace function public.decide_posts(p_studio uuid, p_ids uuid[], p_action text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform app.require(p_studio, 'community', 'on', 'manage community posts');
  if p_action = 'delete' then
    update public.community_posts set deleted_at = now(), decided_by = app.my_staff_id(p_studio), decided_at = now()
    where studio_id = p_studio and id = any (p_ids) and deleted_at is null;
  elsif p_action in ('active', 'declined', 'pending') then
    update public.community_posts set status = p_action, decided_by = app.my_staff_id(p_studio), decided_at = now()
    where studio_id = p_studio and id = any (p_ids) and deleted_at is null;
  else
    raise exception 'Unknown action';
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- A member joins a challenge from the app (accepting its terms).
create or replace function public.join_challenge(p_challenge uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.challenges; v_member uuid; v_id uuid;
begin
  select * into c from public.challenges where id = p_challenge and active;
  if c.id is null then raise exception 'Challenge not found'; end if;
  select m.id into v_member from public.members m where m.studio_id = c.studio_id and m.user_id = (select auth.uid()) and m.deleted_at is null limit 1;
  if v_member is null then raise exception 'Only members of this gym can join'; end if;
  if not coalesce(p_accept, false) then raise exception 'Accept the terms and conditions to join'; end if;
  if app.today(c.studio_id) > c.end_date then raise exception 'This challenge has ended'; end if;
  insert into public.challenge_participants (studio_id, challenge_id, member_id) values (c.studio_id, c.id, v_member)
  on conflict (challenge_id, member_id) do update set joined_at = public.challenge_participants.joined_at
  returning id into v_id;
  return v_id;
end $$;

-- Staff add clients to a challenge (optionally into a team), or move them between teams.
create or replace function public.add_challenge_participants(p_challenge uuid, p_member_ids uuid[], p_team uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_studio uuid; v_n int;
begin
  select studio_id into v_studio from public.challenges where id = p_challenge;
  if v_studio is null or not app.is_desk(v_studio) then raise exception 'Only the owner or front desk can add participants'; end if;
  insert into public.challenge_participants (studio_id, challenge_id, member_id, team_id, added_by)
  select v_studio, p_challenge, m.id, p_team, app.my_staff_id(v_studio)
  from public.members m where m.id = any (coalesce(p_member_ids, '{}')) and m.studio_id = v_studio and m.deleted_at is null
  on conflict (challenge_id, member_id) do update set team_id = coalesce(excluded.team_id, public.challenge_participants.team_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- YDL "Copy": the challenge and its tasks, starting deactivated so the dates can be set first.
create or replace function public.copy_challenge(p_challenge uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.challenges; v_new uuid;
begin
  select * into c from public.challenges where id = p_challenge;
  if c.id is null or not app.is_desk(c.studio_id) then raise exception 'Challenge not found'; end if;
  insert into public.challenges (studio_id, name, description, video_url, image_url, start_date, end_date, terms, has_tasks, client_level, active, created_by)
  values (c.studio_id, c.name || ' (copy)', c.description, c.video_url, c.image_url, c.start_date, c.end_date, c.terms, c.has_tasks, c.client_level, false, app.my_staff_id(c.studio_id))
  returning id into v_new;
  insert into public.challenge_tasks (studio_id, challenge_id, title, description, target, unit, points, day, seq)
  select studio_id, v_new, title, description, target, unit, points, day, seq from public.challenge_tasks where challenge_id = c.id;
  return v_new;
end $$;

-- Leaderboard: points from tasks, entries, claps on challenge posts; first names for members.
create or replace function public.challenge_leaderboard(p_challenge uuid)
returns table (member_id uuid, name text, team_id uuid, team_name text, points bigint, entries bigint, posts bigint, claps bigint, is_me boolean, rank bigint)
language sql stable security definer set search_path = '' as $$
  with c as (select * from public.challenges where id = p_challenge and (app.is_staff(studio_id) or (active and app.in_studio(studio_id)))),
  rows_ as (
    select p.member_id, case when app.is_staff(c.studio_id) then m.full_name else app.public_name(m) end as name, p.team_id, t.name as team_name,
      coalesce((select sum(e.points) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = p.member_id), 0) as points,
      (select count(*) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = p.member_id) as entries,
      (select count(*) from public.community_posts x where x.challenge_id = c.id and x.author_member_id = p.member_id and x.status = 'active' and x.deleted_at is null) as posts,
      (select count(*) from public.post_claps k join public.community_posts x on x.id = k.post_id
       where x.challenge_id = c.id and x.author_member_id = p.member_id and x.status = 'active' and x.deleted_at is null) as claps,
      coalesce(app.is_self(p.member_id), false) as is_me
    from c join public.challenge_participants p on p.challenge_id = c.id
    join public.members m on m.id = p.member_id and m.deleted_at is null
    left join public.challenge_teams t on t.id = p.team_id
  )
  select r.*, rank() over (order by r.points desc, r.claps desc) from rows_ r order by 10, r.name;
$$;

-- Teams' totals.
create or replace function public.challenge_team_board(p_challenge uuid)
returns table (team_id uuid, team_name text, members bigint, points bigint, rank bigint)
language sql stable security definer set search_path = '' as $$
  select l.team_id, l.team_name, count(*), sum(l.points)::bigint, rank() over (order by sum(l.points) desc)
  from public.challenge_leaderboard(p_challenge) l where l.team_id is not null group by l.team_id, l.team_name order by 5, 2;
$$;

-- The challenge list with counts (staff page).
create or replace function public.challenge_list(p_studio uuid)
returns table (id uuid, name text, start_date date, end_date date, active boolean, has_tasks boolean, image_url text,
  participants bigint, teams bigint, pending_posts bigint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.start_date, c.end_date, c.active, c.has_tasks, c.image_url,
    (select count(*) from public.challenge_participants p where p.challenge_id = c.id),
    (select count(*) from public.challenge_teams t where t.challenge_id = c.id and t.active),
    (select count(*) from public.community_posts x where x.challenge_id = c.id and x.status = 'pending' and x.deleted_at is null),
    c.created_at
  from public.challenges c where c.studio_id = p_studio and app.is_staff(p_studio)
  order by c.start_date desc, c.created_at desc;
$$;

-- The member app: challenges I can see, with whether I joined and my points.
create or replace function public.my_challenges()
returns table (id uuid, name text, description text, image_url text, video_url text, start_date date, end_date date, terms text, has_tasks boolean,
  joined boolean, my_points bigint, participants bigint, team_name text)
language sql stable security definer set search_path = '' as $$
  with me as (select m.id, m.studio_id from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null)
  select c.id, c.name, c.description, c.image_url, c.video_url, c.start_date, c.end_date, c.terms, c.has_tasks,
    p.id is not null, coalesce((select sum(e.points) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = me.id), 0),
    (select count(*) from public.challenge_participants x where x.challenge_id = c.id), t.name
  from me join public.challenges c on c.studio_id = me.studio_id and c.active
  left join public.challenge_participants p on p.challenge_id = c.id and p.member_id = me.id
  left join public.challenge_teams t on t.id = p.team_id
  where c.end_date >= app.today(c.studio_id) - 30
  order by (app.today(c.studio_id) between c.start_date and c.end_date) desc, c.start_date desc;
$$;

-- ---------------------------------------------------------------------------
-- Community pictures: private files, <studio_id>/<file>; anyone in the gym may open them
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('community-media', 'community-media', false) on conflict (id) do nothing;
  execute $p$ drop policy if exists community_media_read on storage.objects $p$;
  execute $p$ create policy community_media_read on storage.objects for select to authenticated
    using (bucket_id = 'community-media' and app.in_studio((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists community_media_write on storage.objects $p$;
  execute $p$ create policy community_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'community-media' and app.in_studio((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists community_media_delete on storage.objects $p$;
  execute $p$ create policy community_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'community-media' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
end $$;

revoke all on function public.community_feed(uuid, text, uuid, text, int, timestamptz), public.decide_posts(uuid, uuid[], text),
  public.join_challenge(uuid, boolean), public.add_challenge_participants(uuid, uuid[], uuid), public.copy_challenge(uuid),
  public.challenge_leaderboard(uuid), public.challenge_team_board(uuid), public.challenge_list(uuid), public.my_challenges() from public, anon;
call app.apply_grants();
$u20261012000016$;
  insert into app.schema_migrations (version) values ('20261012000016_community');
end $bu20261012000016$;

-- ===== 20261012000017_wallet_store =====
do $bu20261012000017$ begin
  if exists (select 1 from app.schema_migrations where version = '20261012000017_wallet_store') then raise notice 'already has 20261012000017_wallet_store'; return; end if;
  execute $u20261012000017$
-- Shaan Fitness app · 17. Wallet, store, appointments and help (YDL More Options › Wallet and › E-commerce,
-- Appointments, Tutorial & Help Videos)
-- Wallet: categories (e.g. Refer & Earn) and activity plans with a price, one time or by the hour; a client's
-- wallet is topped up or rewarded at the desk and pays for activities; nothing can take it below zero.
-- Store: the gym's own shop (supplements, shakers, merchandise) with categories and products; the desk places
-- orders for clients and members order from the app; stock goes down with each order and back on cancelling.
-- Appointments get a purpose and comments (YDL Schedule Appointments), more statuses, and members can ask for one.
-- Help: tutorial video links the owner adds for staff or for members.

create sequence if not exists app.code_seq;
create sequence if not exists app.order_no_seq;

-- A short code for a new row: the trigger's prefix and a running number (WC0001, AC0002, ST0003…).
create or replace function app.fill_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.code is null or trim(new.code) = '' then new.code := tg_argv[0] || lpad(nextval('app.code_seq')::text, 4, '0'); end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Wallet
-- ---------------------------------------------------------------------------
create table public.wallet_categories (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  code text not null,
  description text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index wallet_categories_name_uq on public.wallet_categories (studio_id, lower(trim(name)));

create table public.wallet_activities (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  category_id uuid not null references public.wallet_categories(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  code text not null,
  price numeric(10,2) not null check (price > 0),
  description text,
  one_time boolean not null default true,              -- YDL "Is One time"; otherwise priced per block of hours
  duration_hours numeric(5,2) check (duration_hours is null or duration_hours > 0),   -- YDL "Activity Duration (hourly basis)"
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (one_time or duration_hours is not null)
);
create unique index wallet_activities_name_uq on public.wallet_activities (studio_id, lower(trim(name)));

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('credit', 'debit')),
  source text not null check (source in ('top_up', 'reward', 'activity', 'refund', 'adjustment')),
  amount numeric(10,2) not null check (amount > 0),
  activity_id uuid references public.wallet_activities(id) on delete set null,
  activity_name text,
  category_name text,
  started_at timestamptz,
  ended_at timestamptz,
  minutes int,
  payment_method text,
  note text,
  txn_date date not null,
  client_rep uuid references public.staff(id) on delete set null,
  balance_after numeric(10,2) not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at > started_at)
);
create index wallet_transactions_member_idx on public.wallet_transactions (member_id, created_at desc);
create index wallet_transactions_studio_idx on public.wallet_transactions (studio_id, txn_date desc);

create trigger wallet_categories_code before insert on public.wallet_categories for each row execute function app.fill_code('WC');
create trigger wallet_categories_fill before insert on public.wallet_categories for each row execute function app.fill_created_by();
create trigger wallet_categories_touch before update on public.wallet_categories for each row execute function app.touch_updated_at();
create trigger wallet_activities_code before insert on public.wallet_activities for each row execute function app.fill_code('AC');
create trigger wallet_activities_fill before insert on public.wallet_activities for each row execute function app.fill_created_by();
create trigger wallet_activities_touch before update on public.wallet_activities for each row execute function app.touch_updated_at();
create trigger wallet_activities_log after insert or update or delete on public.wallet_activities for each row execute function app.log_activity();

-- An activity takes its category's gym.
create or replace function app.wallet_activity_check()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.studio_id into new.studio_id from public.wallet_categories c where c.id = new.category_id;
  if new.studio_id is null then raise exception 'Choose the activity category'; end if;
  if new.one_time then new.duration_hours := null; end if;
  return new;
end $$;
create trigger wallet_activities_check before insert or update on public.wallet_activities for each row execute function app.wallet_activity_check();

-- A wallet entry: the client's gym and rep, the direction from its source, the amount of an activity from its
-- price (one time, or per started block of hours), and never more out than the wallet holds.
create or replace function app.wallet_txn_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members; a public.wallet_activities; v_cat text; v_balance numeric; v_blocks numeric;
begin
  select * into m from public.members where id = new.member_id and deleted_at is null for update;
  if m.id is null then raise exception 'Client not found'; end if;
  new.studio_id := m.studio_id;
  new.client_rep := coalesce(new.client_rep, m.added_by);
  new.txn_date := coalesce(new.txn_date, app.today(m.studio_id));
  new.created_by := coalesce(new.created_by, app.my_staff_id(m.studio_id));
  new.kind := case new.source when 'activity' then 'debit' when 'adjustment' then coalesce(new.kind, 'credit') else 'credit' end;
  if new.activity_id is not null then
    select * into a from public.wallet_activities where id = new.activity_id and studio_id = m.studio_id;
    if a.id is null then raise exception 'Activity not found'; end if;
    select c.name into v_cat from public.wallet_categories c where c.id = a.category_id;
    new.activity_name := a.name; new.category_name := v_cat;
  end if;
  if new.source = 'activity' then
    if a.id is null then raise exception 'Choose the activity'; end if;
    if not a.active then raise exception '% is not active', a.name; end if;
    if a.one_time then
      new.amount := a.price;
    else
      if new.started_at is null or new.ended_at is null then raise exception 'Enter the start and end time of %', a.name; end if;
      if new.ended_at <= new.started_at then raise exception 'The end time should be after the start time'; end if;
      new.minutes := ceil(extract(epoch from new.ended_at - new.started_at) / 60)::int;
      v_blocks := ceil(new.minutes / (a.duration_hours * 60));
      new.amount := v_blocks * a.price;
    end if;
  elsif new.source = 'reward' and new.amount is null and a.id is not null then
    new.amount := a.price;
  end if;
  if new.amount is null or new.amount <= 0 then raise exception 'Enter the amount'; end if;
  if new.source = 'top_up' then new.payment_method := coalesce(nullif(trim(new.payment_method), ''), 'CASH'); end if;
  select coalesce(sum(case when t.kind = 'credit' then t.amount else -t.amount end), 0) into v_balance
  from public.wallet_transactions t where t.member_id = m.id;
  if new.kind = 'debit' and v_balance < new.amount then
    raise exception 'Not enough in the wallet: the balance is %, this needs %', to_char(v_balance, 'FM9999999990.00'), to_char(new.amount, 'FM9999999990.00');
  end if;
  new.balance_after := v_balance + case when new.kind = 'credit' then new.amount else -new.amount end;
  return new;
end $$;
create trigger wallet_transactions_check before insert on public.wallet_transactions for each row execute function app.wallet_txn_check();
create trigger wallet_transactions_log after insert or delete on public.wallet_transactions for each row execute function app.log_activity();

-- Wallet entries are a ledger: corrections are new entries (refund, adjustment), and only the owner may remove one.
-- Removing one that the balance after it depends on would leave the wallet below zero, so that is refused.
create or replace function app.wallet_txn_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_balance numeric;
begin
  select coalesce(sum(case when t.kind = 'credit' then t.amount else -t.amount end), 0) into v_balance
  from public.wallet_transactions t where t.member_id = old.member_id and t.id <> old.id;
  if v_balance < 0 then raise exception 'Removing this would leave the wallet below zero. Remove the later spending first.'; end if;
  return old;
end $$;
create trigger wallet_transactions_delete before delete on public.wallet_transactions for each row execute function app.wallet_txn_delete();

create view public.wallet_balances with (security_invoker = true) as
select t.studio_id, t.member_id,
  sum(case when t.kind = 'credit' then t.amount else -t.amount end) as balance,
  sum(case when t.kind = 'credit' then t.amount else 0 end) as credited,
  sum(case when t.kind = 'debit' then t.amount else 0 end) as spent,
  max(t.created_at) as last_at
from public.wallet_transactions t group by t.studio_id, t.member_id;

create view public.wallet_overview with (security_invoker = true) as
select t.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.gender as member_gender,
  r.full_name as client_rep_name, cb.full_name as created_by_name, a.one_time as activity_one_time, a.duration_hours as activity_duration_hours
from public.wallet_transactions t
join public.members m on m.id = t.member_id
left join public.staff r on r.id = t.client_rep
left join public.staff cb on cb.id = t.created_by
left join public.wallet_activities a on a.id = t.activity_id;

-- Every gym starts with YDL's "Refer & Earn" category.
create or replace function app.seed_wallet()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.wallet_categories (studio_id, name, description)
  values (new.id, 'Refer & Earn', 'Rewards for bringing a friend to the gym.') on conflict do nothing;
  return new;
end $$;
create trigger studios_seed_wallet after insert on public.studios for each row execute function app.seed_wallet();
insert into public.wallet_categories (studio_id, name, description)
select s.id, 'Refer & Earn', 'Rewards for bringing a friend to the gym.' from public.studios s on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Store
-- ---------------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  code text not null,
  name text not null check (length(trim(name)) > 0),
  company_name text not null check (length(trim(company_name)) > 0),
  tagline text,
  description text,
  logo_url text,
  cover_url text,
  address1 text, address2 text, city text, state text, country text,
  gst_no text check (gst_no is null or gst_no ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  gst_type text not null default 'inclusive' check (gst_type in ('inclusive', 'exclusive')),
  packaging_charges numeric(10,2) not null default 0 check (packaging_charges >= 0),
  delivery_charge numeric(10,2) not null default 0 check (delivery_charge >= 0),
  min_amount_for_delivery numeric(10,2) check (min_amount_for_delivery is null or min_amount_for_delivery >= 0),   -- below this the delivery charge applies
  delivers boolean not null default false,             -- pickup at the gym unless the store also delivers
  contact_no text, landline_no text, whatsapp_no text,
  website text, facebook text, instagram text, twitter text, youtube text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stores_studio_idx on public.stores (studio_id);

create table public.store_categories (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  seq int not null default 0,
  created_at timestamptz not null default now()
);
create unique index store_categories_name_uq on public.store_categories (store_id, lower(trim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.store_categories(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  description text,
  image_url text,
  sku text,
  mrp numeric(10,2) check (mrp is null or mrp >= 0),
  price numeric(10,2) not null check (price >= 0),
  gst_percent numeric(5,2) not null default 0 check (gst_percent between 0 and 40),
  stock int check (stock is null or stock >= 0),        -- empty: not counted
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_store_idx on public.products (store_id, active);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  order_no text not null unique,
  items_count int not null default 0,
  subtotal numeric(10,2) not null default 0,
  gst_amount numeric(10,2) not null default 0,
  packaging numeric(10,2) not null default 0,
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0 check (total >= 0),
  received numeric(10,2) not null default 0 check (received >= 0),
  balance numeric(10,2) generated always as (total - received) stored,
  payment_type text check (payment_type in ('online', 'cash', 'card', 'upi')),
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'collected', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('paid', 'pending', 'cancelled', 'failed')),
  delivery_address text,
  delivery_pincode text check (delivery_pincode is null or delivery_pincode ~ '^[0-9]{6}$'),
  notes text,
  placed_by_member boolean not null default false,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (received <= total)
);
create index store_orders_studio_idx on public.store_orders (studio_id, created_at desc);
create index store_orders_member_idx on public.store_orders (member_id, created_at desc);

create table public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty int not null check (qty > 0),
  price numeric(10,2) not null,
  gst_percent numeric(5,2) not null default 0,
  gst_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null
);
create index store_order_items_order_idx on public.store_order_items (order_id);

create trigger stores_code before insert on public.stores for each row execute function app.fill_code('ST');
create trigger stores_fill before insert on public.stores for each row execute function app.fill_created_by();
create trigger stores_touch before update on public.stores for each row execute function app.touch_updated_at();
create trigger stores_log after insert or update or delete on public.stores for each row execute function app.log_activity();
create trigger products_touch before update on public.products for each row execute function app.touch_updated_at();
create trigger products_log after update or delete on public.products for each row execute function app.log_activity();
create trigger store_orders_touch before update on public.store_orders for each row execute function app.touch_updated_at();
create trigger store_orders_log after update on public.store_orders for each row execute function app.log_activity();

-- Categories and products take their store's gym; a product's category is in the same store.
create or replace function app.store_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.studio_id into new.studio_id from public.stores s where s.id = new.store_id;
  if new.studio_id is null then raise exception 'Store not found'; end if;
  if tg_table_name = 'products' then
    if new.category_id is not null and not exists (select 1 from public.store_categories c where c.id = new.category_id and c.store_id = new.store_id) then
      raise exception 'That category is in another store';
    end if;
  end if;
  return new;
end $$;
create trigger store_categories_child before insert or update on public.store_categories for each row execute function app.store_child();
create trigger products_child before insert or update on public.products for each row execute function app.store_child();

-- Orders change only through the functions below (totals, stock and status stay in step).
create view public.store_order_overview with (security_invoker = true) as
select o.*, m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, m.country_code as member_country_code,
  m.phone as member_phone, s.name as store_name, cb.full_name as created_by_name
from public.store_orders o
join public.members m on m.id = o.member_id
join public.stores s on s.id = o.store_id
left join public.staff cb on cb.id = o.created_by;

-- Place an order. The desk orders for a client (by member id or code) and may take the money there and then;
-- a member orders for themself and pays at the counter. Prices, tax and stock come from the products.
create or replace function public.place_store_order(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare st public.stores; m public.members; pr public.products; it jsonb; v_desk boolean; v_order uuid; v_qty int;
        v_line numeric; v_tax numeric; v_sub numeric := 0; v_gst numeric := 0; v_count int := 0; v_pack numeric; v_deliv numeric := 0;
        v_total numeric; v_recv numeric; v_type text; v_status text; v_pay text;
begin
  select * into st from public.stores where id = nullif(p->>'store_id', '')::uuid;
  if st.id is null or not st.active then raise exception 'Store not found'; end if;
  v_desk := app.is_desk(st.studio_id);
  if v_desk then
    m := app.client_by_ref(st.studio_id, p);
  else
    select * into m from public.members where user_id = (select auth.uid()) and studio_id = st.studio_id and deleted_at is null;
    if m.id is null then raise exception 'Only members of this gym can order here'; end if;
  end if;
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'Add at least one product'; end if;
  v_type := coalesce(nullif(p->>'order_type', ''), 'pickup');
  if v_type not in ('pickup', 'delivery') then raise exception 'Choose pickup or delivery'; end if;
  if v_type = 'delivery' and not st.delivers then raise exception 'This store doesn''t deliver; collect the order at the gym'; end if;
  if v_type = 'delivery' and (nullif(trim(p->>'delivery_address'), '') is null or coalesce(p->>'delivery_pincode', '') !~ '^[0-9]{6}$') then
    raise exception 'Enter the delivery address and a 6-digit pincode';
  end if;
  insert into public.store_orders (studio_id, store_id, member_id, order_no, order_type, delivery_address, delivery_pincode, notes, placed_by_member, created_by)
  values (st.studio_id, st.id, m.id, 'ORD' || lpad(nextval('app.order_no_seq')::text, 5, '0'), v_type,
          case when v_type = 'delivery' then trim(p->>'delivery_address') end, case when v_type = 'delivery' then p->>'delivery_pincode' end,
          nullif(trim(p->>'notes'), ''), not v_desk, case when v_desk then app.my_staff_id(st.studio_id) end)
  returning id into v_order;
  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := nullif(it->>'qty', '')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Check the quantities (1 to 99)'; end if;
    select * into pr from public.products where id = nullif(it->>'product_id', '')::uuid and store_id = st.id for update;
    if pr.id is null or not pr.active then raise exception 'A product in the order is no longer available'; end if;
    if pr.stock is not null then
      if pr.stock < v_qty then raise exception 'Only % of % left', pr.stock, pr.name; end if;
      update public.products set stock = stock - v_qty where id = pr.id;
    end if;
    v_line := pr.price * v_qty;
    v_tax := case when st.gst_type = 'exclusive' then round(v_line * pr.gst_percent / 100, 2) else round(v_line * pr.gst_percent / (100 + pr.gst_percent), 2) end;
    insert into public.store_order_items (studio_id, order_id, product_id, name, qty, price, gst_percent, gst_amount, total)
    values (st.studio_id, v_order, pr.id, pr.name, v_qty, pr.price, pr.gst_percent, v_tax, v_line + case when st.gst_type = 'exclusive' then v_tax else 0 end);
    v_sub := v_sub + v_line; v_gst := v_gst + v_tax; v_count := v_count + v_qty;
  end loop;
  v_pack := st.packaging_charges;
  if v_type = 'delivery' and st.delivery_charge > 0 and (st.min_amount_for_delivery is null or v_sub < st.min_amount_for_delivery) then v_deliv := st.delivery_charge; end if;
  v_total := v_sub + case when st.gst_type = 'exclusive' then v_gst else 0 end + v_pack + v_deliv;
  v_recv := case when v_desk then coalesce(nullif(p->>'received', '')::numeric, 0) else 0 end;
  if v_recv < 0 or v_recv > v_total then raise exception 'The amount received should be between 0 and %', v_total; end if;
  v_status := case when v_desk then coalesce(nullif(p->>'status', ''), 'confirmed') else 'pending' end;
  if v_status not in ('pending', 'confirmed', 'collected') then raise exception 'Choose the order status'; end if;
  v_pay := case when v_desk then nullif(p->>'payment_type', '') end;
  if v_pay is not null and v_pay not in ('online', 'cash', 'card', 'upi') then raise exception 'Choose the payment type'; end if;
  if v_recv > 0 and v_pay is null then raise exception 'Choose how the client paid'; end if;
  update public.store_orders set items_count = v_count, subtotal = v_sub, gst_amount = v_gst, packaging = v_pack, delivery_charge = v_deliv,
    total = v_total, received = v_recv, payment_type = v_pay, status = v_status,
    payment_status = case when v_total = 0 or v_recv >= v_total then 'paid' else 'pending' end
  where id = v_order;
  return v_order;
end $$;

-- Change orders' status (desk). Cancelling puts the stock back; a cancelled order stays cancelled. The client hears
-- about it in the app.
create or replace function public.set_order_status(p_ids uuid[], p_status text)
returns int language plpgsql security definer set search_path = '' as $$
declare o public.store_orders; n int := 0;
begin
  if p_status not in ('pending', 'confirmed', 'collected', 'cancelled') then raise exception 'Choose the order status'; end if;
  for o in select * from public.store_orders where id = any(p_ids) for update loop
    if not app.is_desk(o.studio_id) then raise exception 'Only owner and front desk can change orders'; end if;
    if o.status = p_status then continue; end if;
    if o.status = 'cancelled' then raise exception 'Order % is cancelled; place a new order instead', o.order_no; end if;
    if p_status = 'cancelled' then
      update public.products pr set stock = pr.stock + i.qty
      from (select x.product_id, sum(x.qty)::int as qty from public.store_order_items x where x.order_id = o.id group by x.product_id) i
      where i.product_id = pr.id and pr.stock is not null;
    end if;
    update public.store_orders set status = p_status,
      payment_status = case when p_status = 'cancelled' and received = 0 then 'cancelled' else payment_status end
    where id = o.id;
    insert into public.notifications (studio_id, member_id, title, body, sent_by)
    values (o.studio_id, o.member_id, 'Order ' || o.order_no,
            case p_status when 'confirmed' then 'Your order is confirmed. We will tell you when it is ready.'
                          when 'collected' then 'Your order has been collected. Enjoy!'
                          when 'cancelled' then 'Your order was cancelled. Ask the front desk if you have questions.'
                          else 'Your order is waiting for the gym.' end,
            app.my_staff_id(o.studio_id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Update Payment Details (desk): the total (after a discount, say) and the amount received.
create or replace function public.update_order_payment(p_id uuid, p_total numeric, p_received numeric, p_payment_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.store_orders;
begin
  select * into o from public.store_orders where id = p_id for update;
  if o.id is null or not app.is_desk(o.studio_id) then raise exception 'Order not found'; end if;
  if o.status = 'cancelled' then raise exception 'This order is cancelled'; end if;
  if p_total is null or p_total < 0 then raise exception 'Enter the total price'; end if;
  if p_received is null or p_received < 0 or p_received > p_total then raise exception 'The amount received should be between 0 and the total'; end if;
  if p_received > 0 and coalesce(nullif(p_payment_type, ''), o.payment_type) is null then raise exception 'Choose how the client paid'; end if;
  if nullif(p_payment_type, '') is not null and p_payment_type not in ('online', 'cash', 'card', 'upi') then raise exception 'Choose the payment type'; end if;
  update public.store_orders set total = p_total, received = p_received, payment_type = coalesce(nullif(p_payment_type, ''), payment_type),
    payment_status = case when p_total = 0 or p_received >= p_total then 'paid' else 'pending' end
  where id = o.id;
end $$;

-- Money back for a cancelled order (desk): into the client's wallet, or paid back at the counter.
create or replace function public.refund_order(p_id uuid, p_to_wallet boolean)
returns numeric language plpgsql security definer set search_path = '' as $$
declare o public.store_orders; v_amount numeric;
begin
  select * into o from public.store_orders where id = p_id for update;
  if o.id is null or not app.is_desk(o.studio_id) then raise exception 'Order not found'; end if;
  if o.status <> 'cancelled' then raise exception 'Cancel the order first'; end if;
  if o.received <= 0 then raise exception 'Nothing was received for this order'; end if;
  v_amount := o.received;
  if p_to_wallet then
    insert into public.wallet_transactions (member_id, source, amount, note)
    values (o.member_id, 'refund', v_amount, 'Refund for order ' || o.order_no);
  end if;
  update public.store_orders set received = 0, payment_status = 'cancelled',
    notes = concat_ws(E'\n', notes, 'Refunded ' || to_char(v_amount, 'FM9999999990.00') || case when p_to_wallet then ' to the wallet' else ' at the counter' end)
  where id = o.id;
  return v_amount;
end $$;

-- A member cancels their own order while the gym hasn't confirmed it yet.
create or replace function public.cancel_my_order(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.store_orders;
begin
  select * into o from public.store_orders where id = p_id and app.is_self(member_id) for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status <> 'pending' then raise exception 'The gym has already confirmed this order; ask the front desk to cancel it'; end if;
  update public.products pr set stock = pr.stock + i.qty
  from (select x.product_id, sum(x.qty)::int as qty from public.store_order_items x where x.order_id = o.id group by x.product_id) i
  where i.product_id = pr.id and pr.stock is not null;
  update public.store_orders set status = 'cancelled', payment_status = case when received = 0 then 'cancelled' else payment_status end where id = o.id;
end $$;

-- Store page numbers: orders by status (all time and today).
create or replace function public.store_order_counts(p_store uuid)
returns table (status text, total bigint, today bigint)
language sql stable security definer set search_path = '' as $$
  select s.status, count(o.id), count(o.id) filter (where (o.created_at at time zone coalesce(st.timezone, 'Asia/Kolkata'))::date = app.today(st.id))
  from (values ('cancelled'), ('pending'), ('confirmed'), ('collected')) s(status)
  cross join public.stores x join public.studios st on st.id = x.studio_id
  left join public.store_orders o on o.store_id = x.id and o.status = s.status
  where x.id = p_store and app.is_desk(x.studio_id)
  group by s.status, st.id;
$$;

-- ---------------------------------------------------------------------------
-- Appointments: purpose, comments, the statuses of YDL's Schedule Appointments, and members' requests
-- ---------------------------------------------------------------------------
alter table public.appointments add column purpose text, add column comments text, add column requested_by_member boolean not null default false;
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('open', 'no_action', 'attended', 'no_show', 'cancelled', 'rescheduled', 'confirmed', 'wait_list', 'other'));
drop view if exists public.appointment_overview;
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

-- Book or change an appointment (desk; the staff member it is with may change theirs). The title is the
-- purpose when there is no title. The client hears about a new booking, a new time or a cancellation.
create or replace function public.save_appointment(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_studio uuid = (p->>'studio_id')::uuid; a public.appointments; m public.members; v_id uuid = nullif(p->>'id', '')::uuid;
        v_start time; v_end time; v_date date; v_staff uuid; v_title text; v_status text; v_purpose text; v_notify boolean;
begin
  if v_id is not null then
    select * into a from public.appointments where id = v_id;
    if a.id is null then raise exception 'Appointment not found'; end if;
    v_studio = a.studio_id;
  end if;
  if not (app.is_desk(v_studio) or (a.id is not null and a.handled_by in (select app.my_staff_ids()))) then
    raise exception 'Only owner and front desk can book appointments';
  end if;
  v_purpose = case when p ? 'purpose' then nullif(trim(p->>'purpose'), '') else a.purpose end;
  v_title = coalesce(nullif(trim(p->>'title'), ''), v_purpose, case when not (p ? 'title') then a.title end);
  if v_title is null then raise exception 'Enter the title (or choose the purpose)'; end if;
  v_start = coalesce(nullif(p->>'start_time', '')::time, case when not (p ? 'start_time') then a.start_time end);
  v_end = coalesce(nullif(p->>'end_time', '')::time, case when not (p ? 'end_time') then a.end_time end);
  if v_start is null or v_end is null then raise exception 'Enter the start and end time'; end if;
  if v_start >= v_end then raise exception 'Appointment start time should be less than end time'; end if;
  v_date = coalesce(nullif(p->>'appointment_date', '')::date, a.appointment_date);
  if v_date is null then raise exception 'Choose the appointment date'; end if;
  if a.id is null or p ? 'client_code' or p ? 'member_id' then m = app.client_by_ref(v_studio, p); else select * into m from public.members where id = a.member_id; end if;
  v_staff = case when p ? 'handled_by' then nullif(p->>'handled_by', '')::uuid else a.handled_by end;
  if v_staff is not null and not exists (select 1 from public.staff s where s.id = v_staff and s.studio_id = v_studio) then
    raise exception 'Choose who the appointment is with';
  end if;
  v_status = coalesce(nullif(p->>'status', ''), a.status, 'open');
  if v_status not in ('open', 'no_action', 'attended', 'no_show', 'cancelled', 'rescheduled', 'confirmed', 'wait_list', 'other') then
    raise exception 'Choose the status';
  end if;
  v_notify = coalesce((p->>'notify_client')::boolean, a.notify_client, true);
  if a.id is null then
    insert into public.appointments (studio_id, title, purpose, comments, batch_id, appointment_date, start_time, end_time, member_id, handled_by, room_no, status, notify_client)
    values (v_studio, v_title, v_purpose, nullif(trim(p->>'comments'), ''), nullif(p->>'batch_id', '')::uuid, v_date, v_start, v_end, m.id, v_staff,
            nullif(trim(p->>'room_no'), ''), v_status, v_notify)
    returning id into v_id;
    if v_notify then
      insert into public.notifications (studio_id, member_id, title, body, sent_by)
      values (v_studio, m.id, 'Appointment booked',
              v_title || ' on ' || to_char(v_date, 'DD Mon YYYY') || ' at ' || to_char(v_start, 'HH12:MI AM')
              || coalesce(' with ' || (select s.full_name from public.staff s where s.id = v_staff), '')
              || coalesce(', room ' || nullif(trim(p->>'room_no'), ''), '') || '.',
              app.my_staff_id(v_studio));
    end if;
  else
    update public.appointments set title = v_title, purpose = v_purpose, appointment_date = v_date, start_time = v_start, end_time = v_end,
      member_id = m.id, handled_by = v_staff,
      comments = case when p ? 'comments' then nullif(trim(p->>'comments'), '') else comments end,
      batch_id = case when p ? 'batch_id' then nullif(p->>'batch_id', '')::uuid else batch_id end,
      room_no = case when p ? 'room_no' then nullif(trim(p->>'room_no'), '') else room_no end,
      status = v_status, notify_client = v_notify
    where id = a.id;
    if a.notify_client and m.id = a.member_id and (v_date <> a.appointment_date or v_start <> a.start_time
       or (v_status in ('cancelled', 'confirmed') and v_status <> a.status)) then
      insert into public.notifications (studio_id, member_id, title, body, sent_by)
      values (v_studio, m.id, case when v_status = 'cancelled' then 'Appointment cancelled' when v_status = 'confirmed' and v_date = a.appointment_date and v_start = a.start_time then 'Appointment confirmed' else 'Appointment changed' end,
              v_title || case when v_status = 'cancelled' then ' on ' || to_char(a.appointment_date, 'DD Mon YYYY') || ' is cancelled.'
                              else ' on ' || to_char(v_date, 'DD Mon YYYY') || ' at ' || to_char(v_start, 'HH12:MI AM') || '.' end,
              app.my_staff_id(v_studio));
    end if;
  end if;
  return v_id;
end $$;

-- A member asks for an appointment from the app (when the gym allows it). It waits as "Wait List" for the desk.
create or replace function public.request_appointment(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_id uuid; v_date date = nullif(p->>'appointment_date', '')::date; v_start time = nullif(p->>'start_time', '')::time;
        v_purpose text = nullif(trim(p->>'purpose'), '');
begin
  select * into m from public.members where user_id = (select auth.uid()) and deleted_at is null order by created_at limit 1;
  if m.id is null then raise exception 'Sign in as a member to ask for an appointment'; end if;
  if not coalesce((app.center_setting(m.studio_id, 'can_book_appointment') #>> '{}')::boolean, true) then
    raise exception 'The gym takes appointments at the front desk';
  end if;
  if v_purpose is null then raise exception 'Choose what the appointment is for'; end if;
  if v_date is null or v_start is null then raise exception 'Choose the day and time'; end if;
  if v_start < time '05:00' or v_start > time '22:00' then raise exception 'Choose a time between 5 AM and 10 PM'; end if;
  if v_date < app.today(m.studio_id) then raise exception 'Choose a day from today on'; end if;
  if v_date > app.today(m.studio_id) + 60 then raise exception 'Choose a day in the next two months'; end if;
  if (select count(*) from public.appointments a where a.member_id = m.id and a.requested_by_member and a.status = 'wait_list') >= 3 then
    raise exception 'You already have 3 requests waiting; the gym will get back to you';
  end if;
  insert into public.appointments (studio_id, title, purpose, comments, appointment_date, start_time, end_time, member_id, status, notify_client, requested_by_member)
  values (m.studio_id, v_purpose, v_purpose, left(nullif(trim(p->>'comments'), ''), 500), v_date, v_start, v_start + interval '30 minutes', m.id, 'wait_list', true, true)
  returning id into v_id;
  return v_id;
end $$;

-- A member cancels their own upcoming appointment.
create or replace function public.cancel_my_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_id and app.is_self(member_id) for update;
  if a.id is null then raise exception 'Appointment not found'; end if;
  if a.appointment_date < app.today(a.studio_id) or a.status in ('attended', 'no_show', 'cancelled') then raise exception 'This appointment can''t be cancelled now'; end if;
  update public.appointments set status = 'cancelled' where id = a.id;
end $$;

-- ---------------------------------------------------------------------------
-- Help videos (YDL Tutorial & Help Videos): links the owner adds, for staff or for members
-- ---------------------------------------------------------------------------
create table public.help_videos (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  url text not null check (url ~* '^https://'),
  audience text not null default 'members' check (audience in ('staff', 'members')),
  seq int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index help_videos_studio_idx on public.help_videos (studio_id, audience, seq);

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
alter table public.wallet_categories enable row level security;
alter table public.wallet_activities enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.stores enable row level security;
alter table public.store_categories enable row level security;
alter table public.products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.help_videos enable row level security;

create policy wallet_categories_read on public.wallet_categories for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy wallet_categories_owner on public.wallet_categories for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy wallet_activities_read on public.wallet_activities for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy wallet_activities_owner on public.wallet_activities for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy wallet_transactions_read on public.wallet_transactions for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy wallet_transactions_desk on public.wallet_transactions for insert to authenticated with check (app.is_desk(studio_id));
create policy wallet_transactions_owner_delete on public.wallet_transactions for delete to authenticated using (app.is_owner(studio_id));

create policy stores_read on public.stores for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy stores_owner on public.stores for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy store_categories_read on public.store_categories for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy store_categories_owner on public.store_categories for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy products_read on public.products for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy products_owner on public.products for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy store_orders_read on public.store_orders for select to authenticated using (app.is_desk(studio_id) or app.is_self(member_id));
create policy store_order_items_read on public.store_order_items for select to authenticated
  using (app.is_desk(studio_id) or exists (select 1 from public.store_orders o where o.id = order_id and app.is_self(o.member_id)));

create policy help_videos_read on public.help_videos for select to authenticated
  using (app.in_studio(studio_id) and (app.is_staff(studio_id) or (audience = 'members' and active)));
create policy help_videos_owner on public.help_videos for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));


revoke all on function public.place_store_order(jsonb), public.set_order_status(uuid[], text), public.update_order_payment(uuid, numeric, numeric, text),
  public.cancel_my_order(uuid), public.refund_order(uuid, boolean), public.store_order_counts(uuid), public.request_appointment(jsonb), public.cancel_my_appointment(uuid) from public, anon;
call app.apply_grants();
$u20261012000017$;
  insert into app.schema_migrations (version) values ('20261012000017_wallet_store');
end $bu20261012000017$;

commit;

select (select max(version) from app.schema_migrations) as latest,
       (select count(*) from public.plans where active) as active_plans,
       (select count(*) from public.batches where active) as active_batches,
       'Shaan Fitness database is up to date' as status;
