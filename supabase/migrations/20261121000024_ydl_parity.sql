-- Shaan Fitness app · 24. Matching YDL's own behaviour (live walk-through, 21 Nov 2026)
-- 1. Renewal follow-ups YDL creates by itself: 7 and 3 days before a plan ends, and on the day it ends.
-- 2. Check-out 90 minutes after check-in when nobody checks out (YDL does this; biometric devices only record entry),
--    so "present now" and the traffic numbers are right.
-- 3. Dashboard numbers YDL shows that we didn't: clients in today's traffic with an expired plan, a plan about to end
--    or a balance; yesterday's equivalents; today's check-ins by gender; how full the studio is; app installs share.
-- All of it runs from the hourly schedule (pg_cron) and is safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Renewal follow-ups (YDL "System Generated")
-- ---------------------------------------------------------------------------
-- YDL's wording, exactly:
--   7 / 3 days before, at about 6 AM: "GYM Renewal Reminder - About to expire in 7 Days :<plan>, renewal due on dd-mm-yyyy"
--                                    (PT plans: "PT Renewal Reminder - …")
--   on the last day, just after midnight: "<plan>, renewal due on dd-mm-yyyy"
-- Expected date is the follow-up's day and the expected amount the client's last bill for that plan. Assigned to the
-- client rep. A plan the client has already renewed (a later plan of the same kind) gets none.
create or replace function app.renewal_follow_ups(p_studio uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_today date;
  v_days int;
  v_type text;
  v_note text;
  v_at timestamptz;
  v_n int := 0;
  s record;
begin
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = p_studio;
  if v_tz is null then return 0; end if;
  v_today := (now() at time zone v_tz)::date;
  for s in
    select x.id, x.member_id, x.kind, x.end_date, x.total_amount, coalesce(x.client_rep_id, m.added_by, x.bill_rep_id) as rep, p.name as plan_name
    from public.subscriptions x
    join public.members m on m.id = x.member_id and m.deleted_at is null
    join public.plans p on p.id = x.plan_id
    where x.studio_id = p_studio and x.kind in ('gym', 'pt') and x.status = 'live' and x.deleted_at is null and x.cancelled_at is null
      and not x.mark_used and x.start_date <= v_today and (x.end_date - v_today) in (7, 3, 0)
      and not exists (select 1 from public.subscriptions n where n.member_id = x.member_id and n.kind = x.kind and n.id <> x.id
                        and n.status = 'live' and n.deleted_at is null and n.cancelled_at is null and n.end_date > x.end_date)
  loop
    if app.subscription_state((select y from public.subscriptions y where y.id = s.id)) not in ('active', 'frozen') then continue; end if;
    v_days := s.end_date - v_today;
    v_type := case s.kind when 'pt' then 'PT Renewal' else 'Membership Renewal' end;
    v_note := case when v_days = 0 then s.plan_name
                   else (case s.kind when 'pt' then 'PT' else 'GYM' end) || ' Renewal Reminder - About to expire in ' || v_days || ' Days :' || s.plan_name end
              || ', renewal due on ' || to_char(s.end_date, 'DD-MM-YYYY');
    -- Once per plan and day, whatever happened to it since (answered ones aren't made again).
    if exists (select 1 from public.follow_ups f where f.subscription_id = s.id and f.source = 'system' and f.type = v_type
                 and (f.due_at at time zone v_tz)::date = v_today) then continue; end if;
    v_at := (v_today + case when v_days = 0 then time '00:15' else time '06:00' end) at time zone v_tz;
    begin
      insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status, expected_date, expected_amount,
                                     contact_type, notes, subscription_id, source)
      values (p_studio, s.member_id, v_type, v_at, s.rep, 'open', v_today, s.total_amount, 'Phone', v_note, s.id, 'system');
      v_n := v_n + 1;
    exception when unique_violation then null;   -- the client already has an open follow-up of this type today
    end;
  end loop;
  return v_n;
end $$;

-- Renewing closes the reminders of the plan it renews (YDL stops reminding once the client has renewed).
create or replace function app.close_renewal_follow_ups()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind in ('gym', 'pt') and new.status = 'live' and new.deleted_at is null and new.cancelled_at is null then
    update public.follow_ups f set status = 'successful', response = 'Renewed', response_kind = 'successful', responded_at = now()
    where f.member_id = new.member_id and f.source = 'system' and f.status = 'open'
      and f.type = case new.kind when 'pt' then 'PT Renewal' else 'Membership Renewal' end
      and f.subscription_id is distinct from new.id
      and exists (select 1 from public.subscriptions o where o.id = f.subscription_id and o.kind = new.kind and o.end_date < new.end_date);
  end if;
  return null;
end $$;
drop trigger if exists subscriptions_close_renewal_follow_ups on public.subscriptions;
create trigger subscriptions_close_renewal_follow_ups after insert on public.subscriptions
  for each row execute function app.close_renewal_follow_ups();

-- ---------------------------------------------------------------------------
-- 2. Automatic check-out (YDL: 90 minutes after check-in)
-- ---------------------------------------------------------------------------
-- Fitness Center Settings › auto_checkout_minutes changes it; 0 turns it off.
create or replace function app.auto_checkout_minutes(p_studio uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(s.settings->>'auto_checkout_minutes', '')::int from public.studios s where s.id = p_studio), 90);
$$;

create or replace function app.auto_checkout(p_studio uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_min int := app.auto_checkout_minutes(p_studio); v_n int;
begin
  if v_min <= 0 then return 0; end if;
  update public.attendance a set check_out = a.check_in + make_interval(mins => v_min)
  where a.studio_id = p_studio and a.status = 'present' and a.check_out is null
    and a.check_in < now() - make_interval(mins => v_min);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- In the studio now: checked in, not checked out, and within the automatic check-out time.
create or replace function app.is_inside(a public.attendance)
returns boolean language sql stable security definer set search_path = '' as $$
  select a.status = 'present' and a.check_out is null and a.date = app.today(a.studio_id)
    and (app.auto_checkout_minutes(a.studio_id) <= 0 or a.check_in > now() - make_interval(mins => app.auto_checkout_minutes(a.studio_id)));
$$;

-- ---------------------------------------------------------------------------
-- 3. The hourly schedule runs these too
-- ---------------------------------------------------------------------------
create or replace function app.run_message_schedule(p_hour int default null)
returns int language plpgsql security definer set search_path = '' as $$
declare s record; v_hour int; v_n int := 0; k text;
begin
  for s in select id, coalesce(timezone, 'Asia/Kolkata') as tz from public.studios where active loop
    v_hour := coalesce(p_hour, extract(hour from now() at time zone s.tz)::int);
    perform app.auto_checkout(s.id);
    perform app.renewal_follow_ups(s.id);
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

-- ---------------------------------------------------------------------------
-- 4. Dashboard numbers, as YDL counts them
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_summary(p_studio uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with d as (select app.today(p_studio) as today,
                    coalesce((select (s.settings->>'about_to_expire_days')::int from public.studios s where s.id = p_studio), 7) as soon,
                    (select s.capacity from public.studios s where s.id = p_studio) as capacity),
  pay as (
    select x.receipt_date, x.amount from public.payments x
    where x.studio_id = p_studio and x.kind = 'payment' and x.status = 'paid'
  ),
  subs as (
    select s.*, app.subscription_state(s) as st from public.subscriptions s
    where s.studio_id = p_studio and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
  ),
  bal as (
    select o.member_id, o.balance_amount, o.state from public.subscription_overview o
    where o.studio_id = p_studio and o.state not in ('deleted', 'cancelled', 'transferred', 'upgraded', 'downgraded')
  ),
  latest as (   -- each member's latest gym / PT subscription
    select distinct on (s.member_id, s.kind) s.member_id, s.kind, s.st, s.end_date
    from subs s where s.kind in ('gym', 'pt')
    order by s.member_id, s.kind, s.end_date desc
  ),
  live as (     -- members with a running gym / PT plan
    select distinct member_id from subs where kind in ('gym', 'pt') and st in ('active', 'frozen')
  ),
  soon as (     -- … ending within the "about to expire" days
    select distinct s.member_id from subs s, d where s.kind in ('gym', 'pt') and s.st in ('active', 'frozen') and s.end_date between d.today and d.today + d.soon
  ),
  owing as (select distinct member_id from bal where balance_amount > 0),
  had as (select distinct member_id from latest),
  -- YDL "current traffic": clients who checked in today; and yesterday's, for the quick links
  t_today as (select distinct a.member_id from public.attendance a, d where a.studio_id = p_studio and a.date = d.today and a.status = 'present'),
  t_yday as (select distinct a.member_id from public.attendance a, d where a.studio_id = p_studio and a.date = d.today - 1 and a.status = 'present'),
  inside as (select count(*) as n from public.attendance a where a.studio_id = p_studio and app.is_inside(a))
  select jsonb_build_object(
    'today', (select today from d),
    'today_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date = d.today),
    'month_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date >= date_trunc('month', d.today)::date and receipt_date <= d.today),
    'year_collection', (select coalesce(sum(amount), 0) from pay, d where receipt_date >= date_trunc('year', d.today)::date and receipt_date <= d.today),
    'balance_amount', (select coalesce(sum(balance_amount), 0) from bal),
    'balance_clients', (select count(*) from owing),
    'active_gym', (select count(*) from subs where kind = 'gym' and st in ('active', 'frozen')),
    -- YDL counts every subscription in status "Expired": ended and not renewed (a renewed one is "Used")
    'expired_gym', (select count(*) from subs s where s.kind = 'gym' and s.st = 'expired' and not exists (
                      select 1 from public.subscriptions r where r.member_id = s.member_id and r.kind = s.kind and r.id <> s.id
                        and r.start_date > s.start_date and r.deleted_at is null and r.cancelled_at is null)),
    'active_pt', (select count(*) from subs where kind = 'pt' and st in ('active', 'frozen')),
    'expired_pt', (select count(*) from subs s where s.kind = 'pt' and s.st = 'expired' and not exists (
                      select 1 from public.subscriptions r where r.member_id = s.member_id and r.kind = s.kind and r.id <> s.id
                        and r.start_date > s.start_date and r.deleted_at is null and r.cancelled_at is null)),
    'open_enquiries', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'enquiry'
                         and m.lead_status = 'open' and m.active and m.deleted_at is null),
    'active_members', (select count(*) from live),
    'members_total', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null),
    'present_checkins', (select n from inside),
    'checkins_today', (select count(*) from t_today),
    'capacity', (select capacity from d),
    'checkins_men', (select count(*) from t_today t join public.members m on m.id = t.member_id where m.gender = 'male'),
    'checkins_women', (select count(*) from t_today t join public.members m on m.id = t.member_id where m.gender = 'female'),
    'checkins_other', (select count(*) from t_today t join public.members m on m.id = t.member_id where m.gender = 'other'),
    'checkins_unknown', (select count(*) from t_today t join public.members m on m.id = t.member_id where m.gender is null),
    'app_installs', (select count(*) from public.members m where m.studio_id = p_studio and m.deleted_at is null
                       and (m.user_id is not null or m.app_installed_at is not null)),
    -- the three alerts at the top: clients in today's traffic
    'present_expired', (select count(*) from t_today t where t.member_id in (select member_id from had) and t.member_id not in (select member_id from live)),
    'present_about', (select count(*) from t_today t where t.member_id in (select member_id from soon)),
    'present_balance', (select count(*) from t_today t where t.member_id in (select member_id from owing)),
    -- quick links: yesterday's traffic
    'yesterday_expired', (select count(*) from t_yday t where t.member_id in (select member_id from had) and t.member_id not in (select member_id from live)),
    'yesterday_balance', (select count(*) from t_yday t where t.member_id in (select member_id from owing)),
    -- kept for the registers' links
    'expired_recent', (select count(distinct l.member_id) from latest l, d where l.st = 'expired' and l.end_date >= d.today - 30
                         and l.member_id not in (select member_id from live)),
    'about_to_expire', (select count(*) from soon)
  );
$$;

revoke all on function app.renewal_follow_ups(uuid), app.auto_checkout(uuid) from public, anon, authenticated;
grant execute on function app.renewal_follow_ups(uuid), app.auto_checkout(uuid) to service_role;
grant execute on function app.auto_checkout_minutes(uuid), app.is_inside(public.attendance) to authenticated, service_role;
-- No app.apply_grants() here: it would take away the website's public (anon) functions added since.
