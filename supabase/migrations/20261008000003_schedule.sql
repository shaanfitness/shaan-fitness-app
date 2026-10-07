-- Shaan Fitness app · 3. Batches and attendance
-- YDL batches (trainer, service, working days, timing, capacity), fixed batch members,
-- and check-ins (manual, live session, QR, PT session, biometric, class).

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  batch_code text,
  name text not null check (length(trim(name)) > 0),
  info text,
  capacity int check (capacity is null or capacity > 0),
  room text,
  trainer_ids uuid[] not null default '{}',
  service_ids uuid[] not null default '{}',
  start_date date,
  end_date date,
  days smallint[] not null default '{1,2,3,4,5,6}',      -- ISO weekdays, 1 = Monday
  start_time time not null,
  end_time time not null,
  gender text not null default 'all' check (gender in ('all', 'male', 'female')),
  tier text check (tier in ('group', 'semi_private', 'elite', 'custom')),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (studio_id, batch_code)
);
create index batches_studio_idx on public.batches (studio_id, active, start_time);

create table public.batch_members (
  batch_id uuid not null references public.batches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, member_id)
);
create index batch_members_member_idx on public.batch_members (member_id);

alter table public.subscriptions
  add constraint subscriptions_batch_fk foreign key (batch_id) references public.batches(id) on delete set null;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  date date not null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  source text not null default 'manual' check (source in ('manual', 'live', 'qr', 'pt', 'biometric', 'class', 'app')),
  status text not null default 'present' check (status in ('present', 'absent', 'late_cancel')),
  body_temperature numeric(4,1),
  marked_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (check_out is null or check_out >= check_in),
  unique (member_id, date, batch_id)
);
create index attendance_studio_date_idx on public.attendance (studio_id, date);
create index attendance_subscription_idx on public.attendance (subscription_id);
create index attendance_member_idx on public.attendance (member_id, date desc);

create trigger batches_touch before update on public.batches for each row execute function app.touch_updated_at();

create or replace function app.set_batch_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.batch_code is null then new.batch_code = app.next_code(new.studio_id, 'batch_code'); end if;
  return new;
end $$;
create trigger batches_code before insert on public.batches for each row execute function app.set_batch_code();

-- True when the signed-in coach takes this batch.
create or replace function app.coaches_batch(p_batch uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batches b
    where b.id = p_batch and b.trainer_ids && array(select app.my_staff_ids())
  );
$$;
grant execute on function app.coaches_batch(uuid) to authenticated, service_role;

-- A check-in counts against the plan that covers that day (gym or PT before trials).
create or replace function app.attendance_link_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.subscription_id is null then
    select s.id into new.subscription_id from public.subscriptions s
    where s.member_id = new.member_id and new.date between s.start_date and s.end_date
      and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
    order by (s.kind = 'trial'), s.start_date desc
    limit 1;
  end if;
  if new.marked_by is null then new.marked_by = app.my_staff_id(new.studio_id); end if;
  return new;
end $$;
create trigger attendance_link before insert or update of date, member_id on public.attendance
  for each row execute function app.attendance_link_subscription();

create or replace function app.recount_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  ids = array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.subscription_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.subscription_id end
  ], null);
  update public.subscriptions s set sessions_used = (
    select count(*) from public.attendance a where a.subscription_id = s.id and a.status = 'present'
  ) where s.id = any (ids);
  return null;
end $$;
create trigger attendance_recount after insert or update or delete on public.attendance
  for each row execute function app.recount_sessions();

create trigger batches_log after insert or update or delete on public.batches for each row execute function app.log_activity();
create trigger attendance_log after update or delete on public.attendance for each row execute function app.log_activity();

alter table public.batches enable row level security;
alter table public.batch_members enable row level security;
alter table public.attendance enable row level security;

create policy batches_read on public.batches for select to authenticated using (app.in_studio(studio_id));
create policy batches_owner on public.batches for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

create policy batch_members_read on public.batch_members for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.is_self(member_id));
create policy batch_members_desk on public.batch_members for all to authenticated
  using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy attendance_read on public.attendance for select to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy attendance_mark on public.attendance for insert to authenticated
  with check (app.is_desk(studio_id) or app.coaches_batch(batch_id));
create policy attendance_fix on public.attendance for update to authenticated
  using (app.is_desk(studio_id) or app.coaches_batch(batch_id))
  with check (app.is_desk(studio_id) or app.coaches_batch(batch_id));
create policy attendance_owner_delete on public.attendance for delete to authenticated using (app.is_owner(studio_id));

call app.apply_grants();
