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
