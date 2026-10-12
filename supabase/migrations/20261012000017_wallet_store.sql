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
