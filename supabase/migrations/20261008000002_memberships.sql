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
