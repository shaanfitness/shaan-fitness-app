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
