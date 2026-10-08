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
