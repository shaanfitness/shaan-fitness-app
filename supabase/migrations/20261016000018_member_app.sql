-- Shaan Fitness app · 18. The member app (YDL's customer app) and the gym's notifications
-- Members book and cancel classes, see their memberships, payments and invoices, ask for a freeze, see their
-- attendance and how busy the gym is, refer friends and see their trainers. The gym gets one list of everything
-- members ask for in the app (YDL Notifications Listing): sign-ups, trials, call backs, referrals, feedback,
-- appointment requests, app orders, posts to check, freeze and extension requests.

-- App settings (App Settings › On/Off Permission) are in studios.settings->'app'.
create or replace function app.app_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'app'->p_key, app.default_app_settings()->p_key) from public.studios s where s.id = p_studio;
$$;

-- ---------------------------------------------------------------------------
-- The gym's notifications
-- ---------------------------------------------------------------------------
create table public.staff_alerts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  kind text not null check (kind in ('signup', 'trial', 'callback', 'plan', 'referral', 'feedback', 'appointment', 'order', 'post', 'freeze', 'extension')),
  member_id uuid references public.members(id) on delete cascade,
  ref_id uuid,                                           -- the request it is about; handling that request closes it
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references public.staff(id) on delete set null
);
create index staff_alerts_studio_idx on public.staff_alerts (studio_id, created_at desc);
create index staff_alerts_open_idx on public.staff_alerts (studio_id) where done_at is null;
create index staff_alerts_ref_idx on public.staff_alerts (ref_id) where done_at is null;
alter table public.staff_alerts enable row level security;
create policy staff_alerts_read on public.staff_alerts for select to authenticated using (app.is_desk(studio_id));

create or replace function app.add_alert(p_studio uuid, p_kind text, p_member uuid, p_title text, p_body text, p_link text, p_ref uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.staff_alerts (studio_id, kind, member_id, ref_id, title, body, link)
  values (p_studio, p_kind, p_member, p_ref, left(p_title, 200), left(p_body, 1000), p_link);
$$;

-- When the request itself is handled (post decided, appointment confirmed, order confirmed, freeze decided,
-- follow-up answered) its notification closes by itself.
create or replace function app.close_alerts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.staff_alerts set done_at = now(), done_by = app.my_staff_id(studio_id) where ref_id = old.id and done_at is null;
  return null;
end $$;

-- What members start in the app reaches the gym's list.
create or replace function app.alert_follow_up()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_kind text; v_title text;
begin
  select m.full_name into v_name from public.members m where m.id = new.member_id;
  if new.notes like 'Joined on the website%' then v_kind := 'signup'; v_title := v_name || ' signed up on the website';
  elsif new.notes like 'Asked for a free trial in the app%' then v_kind := 'trial'; v_title := v_name || ' asked for a free trial';
  elsif new.notes like 'Asked for a call back in the app%' then v_kind := 'callback'; v_title := v_name || ' asked for a call back';
  elsif new.notes like 'Wants to join%' then v_kind := 'plan'; v_title := v_name || ' wants to join';
  elsif new.notes like 'Referred by % in the app%' then v_kind := 'referral'; v_title := 'New referral: ' || v_name;
  else return null;
  end if;
  perform app.add_alert(new.studio_id, v_kind, new.member_id, v_title, new.notes, '/clients/' || new.member_id || '/follow-ups', new.id);
  return null;
end $$;
create trigger follow_ups_alert after insert on public.follow_ups for each row when (new.source = 'system') execute function app.alert_follow_up();

create or replace function app.alert_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'feedback', new.member_id,
    'Feedback from ' || (select m.full_name from public.members m where m.id = new.member_id), new.feedback, '/centers/feedback', new.id);
  return null;
end $$;
create trigger app_feedback_alert after insert on public.app_feedback for each row execute function app.alert_feedback();

create or replace function app.alert_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'appointment', new.member_id,
    (select m.full_name from public.members m where m.id = new.member_id) || ' asked for an appointment',
    coalesce(new.purpose, new.title) || ' on ' || to_char(new.appointment_date, 'DD Mon') || ' at ' || to_char(new.start_time, 'HH12:MI AM')
    || coalesce('. ' || new.comments, ''), '/appointments', new.id);
  return null;
end $$;
create trigger appointments_alert after insert on public.appointments for each row when (new.requested_by_member) execute function app.alert_appointment();

create or replace function app.alert_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'order', new.member_id,
    'App order ' || new.order_no || ' from ' || (select m.full_name from public.members m where m.id = new.member_id),
    'Confirm it and keep it ready at the front desk.', '/store/orders', new.id);
  return null;
end $$;
create trigger store_orders_alert after insert on public.store_orders for each row when (new.placed_by_member) execute function app.alert_order();

create or replace function app.alert_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'post', new.author_member_id,
    (select m.full_name from public.members m where m.id = new.author_member_id) || ' posted' || case when new.challenge_id is null then ' in the community' else ' in a challenge' end,
    left(coalesce(new.body, 'A photo'), 200), case when new.challenge_id is null then '/community' else '/challenges/' || new.challenge_id end, new.id);
  return null;
end $$;
create trigger community_posts_alert after insert on public.community_posts for each row when (new.status = 'pending') execute function app.alert_post();

create or replace function app.alert_freeze()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'freeze', new.member_id,
    (select m.full_name from public.members m where m.id = new.member_id) || ' asked to freeze',
    new.days || ' days from ' || to_char(new.start_date, 'DD Mon YYYY') || coalesce('. ' || new.note, ''), '/registers/freezes', new.id);
  return null;
end $$;
create or replace function app.alert_extension()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.add_alert(new.studio_id, 'extension', new.member_id,
    (select m.full_name from public.members m where m.id = new.member_id) || ': extension to approve',
    new.days || ' days' || coalesce('. ' || new.note, ''), '/registers/extensions', new.id);
  return null;
end $$;
create trigger freezes_alert after insert on public.freezes for each row when (new.status = 'requested') execute function app.alert_freeze();
create trigger extensions_alert after insert on public.extensions for each row when (new.status = 'requested') execute function app.alert_extension();

create trigger follow_ups_close_alert after update of status on public.follow_ups for each row when (old.status = 'open' and new.status <> 'open') execute function app.close_alerts();
create trigger appointments_close_alert after update of status on public.appointments for each row when (old.status = 'wait_list' and new.status <> 'wait_list') execute function app.close_alerts();
create trigger store_orders_close_alert after update of status on public.store_orders for each row when (old.status = 'pending' and new.status <> 'pending') execute function app.close_alerts();
create trigger community_posts_close_alert after update of status on public.community_posts for each row when (old.status = 'pending' and new.status <> 'pending') execute function app.close_alerts();
create trigger freezes_close_alert after update of status on public.freezes for each row when (old.status = 'requested' and new.status <> 'requested') execute function app.close_alerts();
create trigger extensions_close_alert after update of status on public.extensions for each row when (old.status = 'requested' and new.status <> 'requested') execute function app.close_alerts();

-- Mark notifications as handled (some, or all that are open).
create or replace function public.mark_alerts_done(p_studio uuid, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not app.is_desk(p_studio) then raise exception 'Only owner and front desk'; end if;
  update public.staff_alerts set done_at = now(), done_by = app.my_staff_id(p_studio)
  where studio_id = p_studio and done_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- Classes in the app: the schedule with my booking and whether my membership covers each class
-- ---------------------------------------------------------------------------
create or replace function public.my_classes(p_from date, p_to date)
returns table (batch_id uuid, class_date date, title text, info text, room text, start_time time, end_time time, trainer_names text,
  service_names text, capacity int, booked int, waiting int, booking_id uuid, booking_status text, attended boolean, blocked text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select m.* from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null order by m.created_at limit 1
  )
  select s.batch_id, s.class_date, s.title, s.info, s.room, s.start_time, s.end_time, s.trainer_names,
    (select string_agg(coalesce(v.custom_name, v.name), ', ' order by v.sort) from public.services v where v.id = any (s.service_ids)),
    s.capacity, s.booked, s.waiting, cb.id, cb.status, cb.attendance_id is not null,
    case
      when s.gender <> 'all' and me.gender is not null and me.gender <> s.gender then 'gender'
      when sub.id is null then 'no_membership'
      when exists (select 1 from public.freezes f where f.subscription_id = sub.id and f.status = 'approved' and s.class_date between f.start_date and f.end_date) then 'frozen'
    end
  from me
  cross join lateral public.class_schedule(me.studio_id, p_from, least(p_to, p_from + 31)) s
  left join public.class_bookings cb on cb.batch_id = s.batch_id and cb.member_id = me.id and cb.class_date = s.class_date
    and cb.cancelled_at is null and cb.deleted_at is null and cb.status <> 'rejected'
  left join lateral (
    select x.id from public.subscriptions x join public.plans pl on pl.id = x.plan_id
    where x.member_id = me.id and x.deleted_at is null and x.cancelled_at is null and x.status = 'live' and not x.mark_used
      and s.class_date between x.start_date and x.end_date and (cardinality(s.service_ids) = 0 or pl.service_ids && s.service_ids)
    order by (x.kind = 'trial'), x.end_date desc limit 1
  ) sub on true
  order by s.class_date, s.start_time, s.title;
$$;

-- ---------------------------------------------------------------------------
-- Freeze request from the app (the owner approves it in the Freeze Register)
-- ---------------------------------------------------------------------------
create or replace function public.request_freeze(p_subscription uuid, p_start date, p_days int, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; v_plan_days int; v_max int; v_used int; v_id uuid; v_today date;
begin
  select * into s from public.subscriptions where id = p_subscription and app.is_self(member_id);
  if s.id is null then raise exception 'Membership not found'; end if;
  if not coalesce((app.app_setting(s.studio_id, 'fc_allow_freeze_memberships') #>> '{}')::boolean, true)
     or not coalesce((app.center_setting(s.studio_id, 'freeze_membership') #>> '{}')::boolean, true) then
    raise exception 'The gym takes freeze requests at the front desk';
  end if;
  v_today := app.today(s.studio_id);
  if s.deleted_at is not null or s.cancelled_at is not null or s.status <> 'live' or s.end_date < v_today then raise exception 'This membership can''t be frozen'; end if;
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Choose between 1 and 90 days'; end if;
  if p_start is null or p_start < v_today then raise exception 'The freeze can start from today'; end if;
  if p_start > s.end_date then raise exception 'The freeze must start before the membership ends (%)', to_char(s.end_date, 'DD Mon YYYY'); end if;
  if exists (select 1 from public.freezes f where f.subscription_id = s.id and f.status = 'requested') then
    raise exception 'You already have a freeze request waiting';
  end if;
  if exists (select 1 from public.freezes f where f.subscription_id = s.id and f.status = 'approved'
             and daterange(f.start_date, f.end_date, '[]') && daterange(p_start, p_start + p_days - 1, '[]')) then
    raise exception 'Those days are already frozen';
  end if;
  select coalesce(p.freeze_days, 0) into v_plan_days from public.plans p where p.id = s.plan_id;
  select coalesce((st.settings->'freeze'->>'max_days')::int, 0) into v_max from public.studios st where st.id = s.studio_id;
  v_max := case when v_plan_days > 0 then v_plan_days else v_max end;
  select coalesce(sum(f.days), 0) into v_used from public.freezes f where f.subscription_id = s.id and f.status = 'approved';
  if v_max > 0 and v_used + p_days > v_max then
    raise exception 'Your membership allows % freeze days; % left', v_max, greatest(v_max - v_used, 0);
  end if;
  insert into public.freezes (studio_id, subscription_id, member_id, start_date, days, note, status, requested_by)
  values (s.studio_id, s.id, s.member_id, p_start, p_days, left(nullif(trim(p_note), ''), 300), 'requested', (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- How busy the gym is (numbers only, never who): in now, and the usual check-ins by hour for this weekday
-- ---------------------------------------------------------------------------
create or replace function public.gym_traffic(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with tz as (select coalesce(s.timezone, 'Asia/Kolkata') as z, app.today(s.id) as today from public.studios s where s.id = p_studio and app.in_studio(p_studio))
  select jsonb_build_object(
    'now', (select count(distinct a.member_id) from public.attendance a, tz
            where a.studio_id = p_studio and a.date = tz.today and a.status = 'present' and a.check_out is null and a.check_in > now() - interval '2 hours'),
    'today', (select count(distinct a.member_id) from public.attendance a, tz where a.studio_id = p_studio and a.date = tz.today and a.status = 'present'),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'avg', round(n / 4.0, 1)) order by h), '[]'::jsonb) from (
      select extract(hour from a.check_in at time zone tz.z)::int as h, count(*) as n
      from public.attendance a, tz
      where a.studio_id = p_studio and a.status = 'present' and a.date >= tz.today - 28 and a.date < tz.today
        and extract(isodow from a.date) = extract(isodow from tz.today)
      group by 1) x)
  ) from tz;
$$;

-- ---------------------------------------------------------------------------
-- Refer a friend (App Settings › Show Refer Friends Card)
-- ---------------------------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  referrer_id uuid not null references public.members(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,      -- the friend's record (new enquiry or existing)
  name text not null,
  phone text not null,
  note text,
  created_at timestamptz not null default now()
);
create index referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
alter table public.referrals enable row level security;
create policy referrals_read on public.referrals for select to authenticated using (app.is_desk(studio_id));

create or replace function public.refer_friend(p_name text, p_phone text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare me public.members; v_phone text = right(app.digits(p_phone), 10); v_name text = left(trim(coalesce(p_name, '')), 80);
        v_friend uuid; v_first text; v_last text;
begin
  select * into me from public.members where user_id = (select auth.uid()) and deleted_at is null order by created_at limit 1;
  if me.id is null then raise exception 'Sign in as a member to refer a friend'; end if;
  if not coalesce((app.app_setting(me.studio_id, 'can_refer_friend') #>> '{}')::boolean, true) then raise exception 'Referrals are not open right now'; end if;
  if v_name = '' then raise exception 'Enter your friend''s name'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit mobile number'; end if;
  if app.same_phone(me.phone, v_phone) then raise exception 'That''s your own number'; end if;
  if (select count(*) from public.referrals r where r.referrer_id = me.id and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve referred 10 friends today. Thank you! Please add more tomorrow.';
  end if;
  if exists (select 1 from public.referrals r where r.referrer_id = me.id and right(app.digits(r.phone), 10) = v_phone) then
    raise exception 'You have already referred this number';
  end if;
  select m.id into v_friend from public.members m where m.studio_id = me.studio_id and m.deleted_at is null and app.same_phone(m.phone, v_phone)
  order by (m.kind = 'member') desc, m.created_at limit 1;
  if v_friend is null then
    v_first := split_part(v_name, ' ', 1);
    v_last := nullif(trim(substr(v_name, length(v_first) + 1)), '');
    insert into public.members (studio_id, kind, first_name, last_name, phone, source_promotion, enquiry_date, referred_by_member_id, added_by)
    values (me.studio_id, 'enquiry', v_first, v_last, v_phone, 'Member Referral', app.today(me.studio_id), me.id, me.added_by)
    returning id into v_friend;
  end if;
  insert into public.referrals (studio_id, referrer_id, member_id, name, phone, note) values (me.studio_id, me.id, v_friend, v_name, v_phone, left(nullif(trim(p_note), ''), 300));
  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (me.studio_id, v_friend, 'Referral', now(), 'open', 'Phone',
          'Referred by ' || me.full_name || ' in the app' || coalesce('. ' || left(nullif(trim(p_note), ''), 300), '') || '. Call to invite them for a trial.', 'system');
  return 'sent';
end $$;

-- The friends I referred and whether they joined (names as I typed them).
create or replace function public.my_referrals()
returns table (id uuid, name text, created_at timestamptz, joined boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.name, r.created_at,
    exists (select 1 from public.subscriptions s where s.member_id = r.member_id and s.created_at >= r.created_at and s.deleted_at is null and s.kind <> 'trial')
  from public.referrals r
  where r.referrer_id = (select m.id from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null order by m.created_at limit 1)
  order by r.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- The coaches in the app, with the buttons the gym allows (App Settings: call, WhatsApp, book an appointment)
-- ---------------------------------------------------------------------------
create or replace function public.my_coaches()
returns table (id uuid, name text, designation text, photo_url text, services text, years_experience int, phone text, can_call boolean, can_whatsapp boolean, can_book boolean)
language sql stable security definer set search_path = '' as $$
  with me as (select m.studio_id from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null order by m.created_at limit 1),
  st as (select me.studio_id,
           coalesce((app.app_setting(me.studio_id, 'can_trainer_call') #>> '{}')::boolean, false) as c,
           coalesce((app.app_setting(me.studio_id, 'can_whatsapp_trainer') #>> '{}')::boolean, false) as w,
           coalesce((app.app_setting(me.studio_id, 'can_book_appointment') #>> '{}')::boolean, true) as b
         from me)
  select t.id, t.full_name, coalesce(nullif(t.employee_type, ''), 'Trainer'), case when t.photo_url ~ '^https?://' then t.photo_url end,
    (select string_agg(coalesce(v.custom_name, v.name), ', ' order by v.sort) from public.services v where v.id = any (t.service_ids)),
    t.years_experience,
    case when st.c or st.w then nullif(t.country_code || app.digits(t.phone), '') end, st.c and t.phone is not null, st.w and t.phone is not null, st.b
  from st join public.staff t on t.studio_id = st.studio_id and t.active and t.role = 'coach'
  order by t.star_trainer desc, t.years_experience desc nulls last, t.full_name;
$$;

-- Appointment requests follow the App Settings switch, and may name the coach (the desk still confirms).
create or replace function public.request_appointment(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_id uuid; v_date date = nullif(p->>'appointment_date', '')::date; v_start time = nullif(p->>'start_time', '')::time;
        v_purpose text = nullif(trim(p->>'purpose'), ''); v_coach uuid = nullif(p->>'trainer_id', '')::uuid;
begin
  select * into m from public.members where user_id = (select auth.uid()) and deleted_at is null order by created_at limit 1;
  if m.id is null then raise exception 'Sign in as a member to ask for an appointment'; end if;
  if not coalesce((app.app_setting(m.studio_id, 'can_book_appointment') #>> '{}')::boolean, true) then
    raise exception 'The gym takes appointments at the front desk';
  end if;
  if v_purpose is null then raise exception 'Choose what the appointment is for'; end if;
  if v_date is null or v_start is null then raise exception 'Choose the day and time'; end if;
  if v_start < time '05:00' or v_start > time '22:00' then raise exception 'Choose a time between 5 AM and 10 PM'; end if;
  if v_date < app.today(m.studio_id) then raise exception 'Choose a day from today on'; end if;
  if v_date > app.today(m.studio_id) + 60 then raise exception 'Choose a day in the next two months'; end if;
  if v_coach is not null and not exists (select 1 from public.staff s where s.id = v_coach and s.studio_id = m.studio_id and s.active and s.role = 'coach') then
    raise exception 'Coach not found';
  end if;
  if (select count(*) from public.appointments a where a.member_id = m.id and a.requested_by_member and a.status = 'wait_list') >= 3 then
    raise exception 'You already have 3 requests waiting; the gym will get back to you';
  end if;
  insert into public.appointments (studio_id, title, purpose, comments, appointment_date, start_time, end_time, member_id, handled_by, status, notify_client, requested_by_member)
  values (m.studio_id, v_purpose, v_purpose, left(nullif(trim(p->>'comments'), ''), 500), v_date, v_start, v_start + interval '30 minutes', m.id, v_coach, 'wait_list', true, true)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.mark_alerts_done(uuid, uuid[]), public.my_classes(date, date), public.request_freeze(uuid, date, int, text),
  public.gym_traffic(uuid), public.refer_friend(text, text, text), public.my_referrals(), public.my_coaches() from public, anon;
call app.apply_grants();
