-- Shaan Fitness app · 20. The coach app (YDL trainer app): the coach's day in one call (own check-in, today's
-- classes, PT clients, appointments, leave), a class roster to mark attendance from the phone, and substitute
-- coaches (a class's trainer changed for one day) marking that class too.

-- A coach of the class on that day: the batch's coaches, or the coach put on that one day's class.
create or replace function app.coaches_class(p_batch uuid, p_date date)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.coaches_batch(p_batch) or exists (
    select 1 from public.class_sessions cs
    where cs.batch_id = p_batch and cs.class_date = p_date and cs.trainer_ids && array(select app.my_staff_ids())
  );
$$;

-- Check clients in to a class (YDL "Mark Customer Attendance" › Check In), now also by the day's substitute coach.
create or replace function public.class_check_in(p_batch uuid, p_date date, p_member_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare b public.batches; v_member uuid; v_att uuid; v_n int = 0; v_when timestamptz; v_start time; v_trainers uuid[];
begin
  select * into b from public.batches where id = p_batch;
  if b.id is null then raise exception 'Class not found'; end if;
  if not (app.is_desk(b.studio_id) or app.coaches_class(b.id, p_date)) then raise exception 'Only staff can mark attendance'; end if;
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

-- Who is expected in a class on a day: the batch's fixed members and the clients who booked it, with who is in.
create or replace function public.coach_roster(p_batch uuid, p_date date)
returns table (member_id uuid, name text, code text, booked boolean, in_batch boolean, present boolean, check_in timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare b public.batches;
begin
  select * into b from public.batches where id = p_batch;
  if b.id is null or not (app.is_desk(b.studio_id) or app.coaches_class(b.id, p_date)) then raise exception 'Class not found'; end if;
  return query
  with e as (
    select bm.member_id, false as booked, true as in_batch from public.batch_members bm where bm.batch_id = b.id
    union all
    select cb.member_id, true, false from public.class_bookings cb
    where cb.batch_id = b.id and cb.class_date = p_date and cb.cancelled_at is null and cb.deleted_at is null and cb.status = 'booked'
  ), g as (select e.member_id, bool_or(e.booked) as booked, bool_or(e.in_batch) as in_batch from e group by e.member_id)
  select m.id, m.full_name, coalesce(m.member_code, m.enquiry_code), g.booked, g.in_batch, a.id is not null, a.check_in
  from g join public.members m on m.id = g.member_id and m.deleted_at is null
  left join lateral (
    select at.id, at.check_in from public.attendance at
    where at.member_id = m.id and at.batch_id = b.id and at.date = p_date and at.status = 'present' order by at.check_in limit 1
  ) a on true
  order by m.full_name;
end $$;

-- The coach's day (YDL trainer app home).
create or replace function public.coach_day(p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.staff; v_date date; v_dow int;
begin
  select * into s from public.staff st where st.user_id = (select auth.uid()) and st.role = 'coach' and st.active order by st.created_at limit 1;
  if s.id is null then raise exception 'Sign in as a coach'; end if;
  v_date := coalesce(p_date, app.today(s.studio_id));
  v_dow := extract(isodow from v_date)::int;
  return jsonb_build_object(
    'date', v_date,
    'staff', jsonb_build_object('id', s.id, 'name', s.full_name),
    'shift', (select jsonb_build_object('check_in', a.check_in, 'check_out', a.check_out) from public.staff_attendance a
              where a.staff_id = s.id and a.date = v_date order by a.check_in desc limit 1),
    'classes', (
      select coalesce(jsonb_agg(x.j order by x.st, x.nm), '[]'::jsonb) from (
        select coalesce(cs.start_time, b.start_time) as st, coalesce(cs.title, b.name) as nm,
          jsonb_build_object('id', b.id, 'name', coalesce(cs.title, b.name), 'start_time', coalesce(cs.start_time, b.start_time),
            'end_time', coalesce(cs.end_time, b.end_time), 'capacity', b.capacity,
            'expected', (select count(*) from (
                select bm.member_id from public.batch_members bm join public.members m on m.id = bm.member_id and m.deleted_at is null where bm.batch_id = b.id
                union
                select cb.member_id from public.class_bookings cb
                where cb.batch_id = b.id and cb.class_date = v_date and cb.cancelled_at is null and cb.deleted_at is null and cb.status = 'booked') e),
            'present', (select count(distinct at.member_id) from public.attendance at where at.batch_id = b.id and at.date = v_date and at.status = 'present')) as j
        from public.batches b
        left join public.class_sessions cs on cs.batch_id = b.id and cs.class_date = v_date
        where b.studio_id = s.studio_id and b.active and v_dow = any (b.days) and s.id = any (coalesce(cs.trainer_ids, b.trainer_ids))
      ) x),
    'pt', (
      select coalesce(jsonb_agg(jsonb_build_object('subscription_id', sub.id, 'member_id', m.id, 'name', m.full_name, 'plan_name', p.name,
          'sessions_total', sub.sessions_total, 'sessions_used', sub.sessions_used, 'end_date', sub.end_date,
          'done_today', exists (select 1 from public.attendance at where at.subscription_id = sub.id and at.date = v_date and at.source = 'pt' and at.status <> 'absent'),
          'last_session', (select max(at.date) from public.attendance at where at.subscription_id = sub.id and at.source = 'pt'))
        order by m.full_name), '[]'::jsonb)
      from public.subscriptions sub
      join public.members m on m.id = sub.member_id and m.deleted_at is null
      join public.plans p on p.id = sub.plan_id
      where sub.studio_id = s.studio_id and sub.kind = 'pt' and sub.status = 'live' and sub.deleted_at is null and sub.cancelled_at is null
        and v_date between sub.start_date and sub.end_date and (sub.trainer_id = s.id or s.id = any (sub.second_trainer_ids))
        and app.subscription_state(sub) = 'active'),
    'appointments', (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'start_time', a.start_time, 'end_time', a.end_time,
          'status', a.status, 'member_id', a.member_id, 'member_name', m.full_name, 'room_no', a.room_no) order by a.start_time), '[]'::jsonb)
      from public.appointments a left join public.members m on m.id = a.member_id
      where a.handled_by = s.id and a.appointment_date = v_date and a.status <> 'cancelled'),
    'leave', (
      select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'start_date', l.start_date, 'end_date', l.end_date, 'mode', l.mode, 'days', l.days,
          'status', l.status, 'reason', l.reason) order by l.start_date), '[]'::jsonb)
      from public.leave_requests l where l.staff_id = s.id and not l.cancelled and l.end_date >= v_date));
end $$;

revoke all on function public.coach_roster(uuid, date), public.coach_day(date) from public, anon;
revoke all on function app.coaches_class(uuid, date) from public, anon;
grant execute on function app.coaches_class(uuid, date) to authenticated, service_role;
call app.apply_grants();
