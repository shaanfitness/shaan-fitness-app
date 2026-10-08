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
