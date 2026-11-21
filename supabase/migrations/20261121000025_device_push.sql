-- Shaan Fitness app · 25. The biometric device talks to the app directly
-- The studio's eSSL device (ZKTeco "push" / ADMS protocol) sends its punches to www.shaanfitness.com/iclock/…
-- instead of YDL's eTime server. The website's edge worker (public/_worker.js) passes each request to the four
-- functions here, which:
--   • turn punches into check-ins (and check-outs), exactly like a check-in at the desk;
--   • keep a copy of the users and fingerprint templates the device holds;
--   • hand the device its queued commands (add, block, unblock, delete, restart, clear logs) and record the results;
--   • every morning, block members whose membership ended and let renewed members back in (YDL ran this at 5:36 AM).
-- Blocking removes the member from the device, so it is only done when the app holds their fingerprint templates:
-- unblocking puts the member and their fingerprints back, and nobody has to enrol again.
-- Only devices added in Fitness Center › Biometric Manager (by serial number) are listened to.

-- ---------------------------------------------------------------------------
-- 1. Biometric codes are text (YDL uses the mobile number, which doesn't fit an integer)
-- ---------------------------------------------------------------------------
do $$ declare v_def text; begin
  if (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.members'::regclass and attname = 'biometric_code') = 'integer' then
    v_def := pg_get_viewdef('public.member_overview'::regclass, true);
    drop view public.member_overview;
    alter table public.members alter column biometric_code type text using biometric_code::text;
    execute 'create view public.member_overview with (security_invoker = true) as ' || v_def;
    grant select, insert, update, delete on public.member_overview to authenticated;
    grant all on public.member_overview to service_role;
  end if;
end $$;
-- The YDL import keeps the code as it is (it cast it to an integer).
do $$ declare v text := pg_get_functiondef('app.import_member_row(uuid, jsonb)'::regprocedure); begin
  if position('nullif(v_bio, '''')::int' in v) > 0 then execute replace(v, 'nullif(v_bio, '''')::int', 'nullif(v_bio, '''')'); end if;
end $$;
alter table public.staff add column if not exists biometric_code text;

-- ---------------------------------------------------------------------------
-- 2. What the app knows about each device
-- ---------------------------------------------------------------------------
alter table public.biometric_devices
  add column if not exists last_seen_at timestamptz,
  add column if not exists connected_at timestamptz,   -- its first call here: the switch from YDL
  add column if not exists push_version text,
  add column if not exists info jsonb not null default '{}',
  add column if not exists att_stamp text,
  add column if not exists op_stamp text,
  add column if not exists command_style text not null default 'modern' check (command_style in ('modern', 'legacy'));

-- Users the device holds (from its uploads), with their fingerprint templates, so a blocked member can be put back.
create table if not exists public.device_users (
  device_id uuid not null references public.biometric_devices(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  pin text not null,
  name text,
  card text,
  privilege int,
  fingers jsonb not null default '{}',          -- {"<FID>": {"size": n, "valid": 1, "tmp": "…"}}
  on_device boolean not null default true,       -- false after the app removed (blocked) them
  blocked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (device_id, pin)
);

-- Every punch as the device sent it, and what the app made of it.
create table if not exists public.device_punches (
  id bigint generated always as identity primary key,
  studio_id uuid not null references public.studios(id) on delete cascade,
  device_id uuid not null references public.biometric_devices(id) on delete cascade,
  pin text not null,
  punched_at timestamptz not null,
  status int,
  verify int,
  member_id uuid references public.members(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  result text not null check (result in ('check_in', 'check_out', 'repeat', 'unknown', 'before_switch', 'staff_in', 'staff_out')),
  created_at timestamptz not null default now(),
  unique (device_id, pin, punched_at)
);
create index if not exists device_punches_studio_idx on public.device_punches (studio_id, punched_at desc);

-- Devices that called in without being added in the Biometric Manager (shown there, so the owner can add them).
create table if not exists public.device_unknown (
  serial text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  hits int not null default 1
);

-- Commands carry a number for the device ("C:<no>:…"), the line sent, and when it went and came back.
create sequence if not exists app.device_command_no;
alter table public.device_commands
  add column if not exists cmd_no bigint not null default nextval('app.device_command_no'),
  add column if not exists line text,
  add column if not exists sent_at timestamptz,
  add column if not exists done_at timestamptz,
  add column if not exists return_code int;
alter table public.device_operations
  add column if not exists cmd_no bigint not null default nextval('app.device_command_no'),
  add column if not exists sent_at timestamptz,
  add column if not exists done_at timestamptz,
  add column if not exists return_code int;
do $$ begin
  alter table public.device_commands drop constraint if exists device_commands_command_check;
  alter table public.device_commands add constraint device_commands_command_check
    check (command in ('add', 're_add', 'block', 'unblock', 'delete', 'sync', 'update_expiry', 'fingers'));
end $$;
create index if not exists device_commands_no_idx on public.device_commands (cmd_no);
create index if not exists device_operations_no_idx on public.device_operations (cmd_no);

-- Fills who added a command or a document. Each table is checked on its own: a check like
-- "tg_table_name = 'member_documents' and new.uploaded_by is null" fails on a table without that column, which
-- stopped every device command from being saved.
create or replace function app.fill_by_staff()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'member_documents' then
    if new.uploaded_by is null then new.uploaded_by = app.my_staff_id(new.studio_id); end if;
  elsif tg_table_name = 'device_commands' then
    if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  end if;
  return new;
end $$;

-- A command without a device goes to the studio's (first active) device.
create or replace function app.device_command_fill()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.device_id is null then
    select id into new.device_id from public.biometric_devices where studio_id = new.studio_id and active order by created_at limit 1;
  end if;
  -- The code is always the person's code on the device (the profile shows the mobile number with +91 and spaces).
  if new.member_id is not null then
    select app.device_pin(m) into new.biometric_code from public.members m where m.id = new.member_id;
  elsif new.staff_id is not null then
    select coalesce(nullif(trim(s.biometric_code), ''), nullif(right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10), ''))
      into new.biometric_code from public.staff s where s.id = new.staff_id;
  end if;
  return new;
end $$;

alter table public.device_users enable row level security;
alter table public.device_punches enable row level security;
alter table public.device_unknown enable row level security;
drop policy if exists device_users_read on public.device_users;
create policy device_users_read on public.device_users for select to authenticated using (app.can(studio_id, 'biometric'));
drop policy if exists device_punches_read on public.device_punches;
create policy device_punches_read on public.device_punches for select to authenticated using (app.is_desk(studio_id));
drop policy if exists device_unknown_read on public.device_unknown;
create policy device_unknown_read on public.device_unknown for select to authenticated
  using (exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'owner'));
grant select on public.device_users, public.device_punches, public.device_unknown to authenticated;
grant all on public.device_users, public.device_punches, public.device_unknown to service_role;

-- ---------------------------------------------------------------------------
-- 3. Codes: a member's code on the device is their biometric code, or their 10-digit mobile number (as in YDL)
-- ---------------------------------------------------------------------------
create or replace function app.device_pin(m public.members)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(m.biometric_code), ''), nullif(right(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g'), 10), ''));
$$;

drop trigger if exists device_commands_target on public.device_commands;
create trigger device_commands_target before insert on public.device_commands for each row execute function app.device_command_fill();

-- Names on the device: plain letters, at most 24 characters (the device's limit).
create or replace function app.device_name(p text)
returns text language sql immutable set search_path = '' as $$
  select left(trim(regexp_replace(translate(coalesce(p, ''), E'\t\r\n', '   '), '[^A-Za-z0-9 .\-]', '', 'g')), 24);
$$;

create or replace function app.device_by_serial(p_serial text)
returns public.biometric_devices language sql stable security definer set search_path = '' as $$
  select d from public.biometric_devices d where upper(trim(d.serial)) = upper(trim(p_serial)) and d.active order by d.created_at limit 1;
$$;

-- key=value pairs separated by tabs (the device's format)
create or replace function app.device_kv(p_line text)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(split_part(kv, '=', 1), substr(kv, length(split_part(kv, '=', 1)) + 2)), '{}')
  from unnest(string_to_array(p_line, E'\t')) kv where position('=' in kv) > 0;
$$;

-- ---------------------------------------------------------------------------
-- 4. The device says hello (GET /iclock/cdata?options=all): its settings for talking to the app
-- ---------------------------------------------------------------------------
create or replace function public.device_hello(p_serial text, p_query jsonb default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare d public.biometric_devices := app.device_by_serial(p_serial);
begin
  if d.id is null then
    -- Only what looks like a device serial is listed, and only the 30 latest (anyone can call this address).
    if trim(coalesce(p_serial, '')) ~ '^[A-Za-z0-9_-]{4,40}$' then
      insert into public.device_unknown (serial) values (trim(p_serial))
      on conflict (serial) do update set last_seen_at = now(), hits = public.device_unknown.hits + 1;
      delete from public.device_unknown where serial not in (select serial from public.device_unknown order by last_seen_at desc limit 30);
    end if;
    return null;
  end if;
  update public.biometric_devices set last_seen_at = now(), connected_at = coalesce(connected_at, now()),
    push_version = coalesce(nullif(p_query->>'pushver', ''), push_version),
    info = info || jsonb_strip_nulls(jsonb_build_object('language', p_query->>'language', 'options', p_query->>'options'))
  where id = d.id;
  return concat_ws(E'\n',
    'GET OPTION FROM: ' || trim(p_serial),
    'ATTLOGStamp=' || coalesce(d.att_stamp, '0'),
    'OPERLOGStamp=' || coalesce(d.op_stamp, '0'),
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog EnrollUser ChgUser EnrollFP ChgFP',
    'Realtime=1',
    'Encrypt=None') || E'\n';
end $$;

-- ---------------------------------------------------------------------------
-- 5. A punch becomes a check-in, a check-out, or nothing (a repeat), following the biometric settings
-- ---------------------------------------------------------------------------
create or replace function app.device_punch(d public.biometric_devices, p_pin text, p_at timestamptz, p_status int, p_verify int)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_tz text; v_date date; v_member uuid; v_staff uuid; v_open public.attendance; v_sopen public.staff_attendance;
  v_set jsonb; v_min int; v_out boolean; v_result text;
begin
  select coalesce(timezone, 'Asia/Kolkata'), coalesce(settings->'biometric', '{}') into v_tz, v_set from public.studios where id = d.studio_id;
  v_date := (p_at at time zone v_tz)::date;
  v_min := coalesce(nullif(v_set->>'checkout_minutes', '')::int, 90);
  v_out := coalesce((v_set->>'record_customer_checkout')::boolean, false);
  select m.id into v_member from public.members m
  where m.studio_id = d.studio_id and m.deleted_at is null and app.device_pin(m) = p_pin
  order by (m.kind = 'member') desc, m.created_at limit 1;
  if v_member is null then
    select s.id into v_staff from public.staff s
    where s.studio_id = d.studio_id and coalesce(nullif(trim(s.biometric_code), ''), right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10)) = p_pin
    limit 1;
  end if;

  -- The device sends everything it stored. Punches from before the day it was switched here (YDL already had them) are
  -- kept for reference; from that day on they check clients in, so the switch day's morning is counted too.
  if p_at < (date_trunc('day', coalesce(d.connected_at, now()) at time zone v_tz) at time zone v_tz) then
    v_result := 'before_switch';
  elsif v_member is not null then
    select * into v_open from public.attendance a
    where a.member_id = v_member and a.date = v_date and a.status = 'present' and a.check_in <= p_at
    order by a.check_in desc limit 1;
    if v_open.id is not null and v_open.check_out is null and p_at < v_open.check_in + make_interval(mins => v_min) then
      -- inside the session: a check-out when the studio records them, otherwise a repeat (a second try at the reader)
      if v_out and p_at > v_open.check_in + interval '2 minutes' then
        update public.attendance set check_out = p_at where id = v_open.id;
        v_result := 'check_out';
      else
        v_result := 'repeat';
      end if;
    elsif v_open.id is not null and p_at < v_open.check_in + interval '2 minutes' then
      v_result := 'repeat';
    else
      begin
        insert into public.attendance (studio_id, member_id, date, check_in, source, status)
        values (d.studio_id, v_member, v_date, p_at, 'biometric', 'present');
        v_result := 'check_in';
      exception when unique_violation then v_result := 'repeat';   -- already in that batch today
      end;
    end if;
  elsif v_staff is not null then
    select * into v_sopen from public.staff_attendance a where a.staff_id = v_staff and a.date = v_date and a.check_out is null
    order by a.check_in desc limit 1;
    if v_sopen.id is not null and p_at > v_sopen.check_in + interval '2 minutes' then
      update public.staff_attendance set check_out = p_at where id = v_sopen.id;
      v_result := 'staff_out';
    elsif v_sopen.id is not null then
      v_result := 'repeat';
    else
      insert into public.staff_attendance (studio_id, staff_id, date, check_in, source) values (d.studio_id, v_staff, v_date, p_at, 'biometric');
      v_result := 'staff_in';
    end if;
  else
    v_result := 'unknown';
  end if;

  insert into public.device_punches (studio_id, device_id, pin, punched_at, status, verify, member_id, staff_id, result)
  values (d.studio_id, d.id, p_pin, p_at, p_status, p_verify, v_member, v_staff, v_result)
  on conflict (device_id, pin, punched_at) do nothing;
  return v_result;
end $$;

-- ---------------------------------------------------------------------------
-- 6. The device uploads (POST /iclock/cdata?table=ATTLOG|OPERLOG|…)
-- ---------------------------------------------------------------------------
create or replace function public.device_upload(p_serial text, p_table text, p_body text, p_stamp text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  d public.biometric_devices := app.device_by_serial(p_serial);
  v_tz text; v_line text; v_f text[]; v_at timestamptz; v_n int := 0; v_kv jsonb; v_pin text;
begin
  if d.id is null then perform public.device_hello(p_serial); return 'OK'; end if;
  if length(coalesce(p_body, '')) > 4000000 then raise exception 'Upload too large'; end if;
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = d.studio_id;
  update public.biometric_devices set last_seen_at = now(), connected_at = coalesce(connected_at, now()) where id = d.id
  returning connected_at into d.connected_at;

  if upper(p_table) = 'ATTLOG' then
    foreach v_line in array string_to_array(replace(coalesce(p_body, ''), E'\r', ''), E'\n') loop
      continue when trim(v_line) = '';
      v_f := string_to_array(v_line, E'\t');
      continue when coalesce(array_length(v_f, 1), 0) < 2 or trim(v_f[1]) = '';
      begin
        v_at := (trim(v_f[2]))::timestamp at time zone v_tz;     -- the device's clock is studio time
      exception when others then continue;
      end;
      continue when v_at > now() + interval '1 day';
      continue when exists (select 1 from public.device_punches p where p.device_id = d.id and p.pin = trim(v_f[1]) and p.punched_at = v_at);
      perform app.device_punch(d, trim(v_f[1]), v_at, nullif(trim(coalesce(v_f[3], '')), '')::int, nullif(trim(coalesce(v_f[4], '')), '')::int);
      v_n := v_n + 1;
    end loop;
    if p_stamp is not null then update public.biometric_devices set att_stamp = left(p_stamp, 40) where id = d.id; end if;

  elsif upper(p_table) = 'OPERLOG' then
    foreach v_line in array string_to_array(replace(coalesce(p_body, ''), E'\r', ''), E'\n') loop
      continue when trim(v_line) = '';
      v_n := v_n + 1;
      if v_line like 'USER %' or (v_line like 'PIN=%' and v_line like '%Name=%') then
        v_kv := app.device_kv(regexp_replace(v_line, '^USER ', ''));
        v_pin := trim(v_kv->>'PIN');
        continue when coalesce(v_pin, '') = '';
        insert into public.device_users (device_id, studio_id, pin, name, card, privilege, on_device, updated_at)
        values (d.id, d.studio_id, v_pin, nullif(v_kv->>'Name', ''), nullif(v_kv->>'Card', ''), nullif(v_kv->>'Pri', '')::int, true, now())
        on conflict (device_id, pin) do update set name = excluded.name, card = excluded.card, privilege = excluded.privilege, on_device = true, updated_at = now();
      elsif v_line like 'FP %' then
        v_kv := app.device_kv(regexp_replace(v_line, '^FP ', ''));
        v_pin := trim(v_kv->>'PIN');
        continue when coalesce(v_pin, '') = '' or coalesce(v_kv->>'TMP', '') = '';
        insert into public.device_users (device_id, studio_id, pin, fingers, updated_at)
        values (d.id, d.studio_id, v_pin, jsonb_build_object(coalesce(v_kv->>'FID', '0'),
          jsonb_build_object('size', v_kv->>'Size', 'valid', coalesce(v_kv->>'Valid', '1'), 'tmp', v_kv->>'TMP')), now())
        on conflict (device_id, pin) do update set fingers = public.device_users.fingers || excluded.fingers, updated_at = now();
      end if;   -- OPLOG lines (menu use, enrolments) need nothing
    end loop;
    if p_stamp is not null then update public.biometric_devices set op_stamp = left(p_stamp, 40) where id = d.id; end if;
  end if;      -- photos and other tables: accepted, not kept
  return 'OK: ' || v_n;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Commands for the device (GET /iclock/getrequest), and what it did with them (POST /iclock/devicecmd)
-- ---------------------------------------------------------------------------
create or replace function app.device_command_lines(d public.biometric_devices, c public.device_commands)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare
  v_pin text := nullif(trim(c.biometric_code), '');
  v_name text; v_card text; u public.device_users; v_lines text[] := '{}'; f record; v_legacy boolean := d.command_style = 'legacy';
  v_user text;
begin
  if v_pin is null then return '{}'; end if;
  select app.device_name(coalesce(m.full_name, m.first_name)) into v_name from public.members m where m.id = c.member_id;
  if v_name is null then select app.device_name(s.first_name || ' ' || coalesce(s.last_name, '')) into v_name from public.staff s where s.id = c.staff_id; end if;
  v_card := coalesce(nullif(regexp_replace(coalesce(c.rfid, ''), '\D', '', 'g'), ''), '');
  select * into u from public.device_users where device_id = d.id and pin = v_pin;
  v_user := case when v_legacy
    then format(E'DATA USER PIN=%s\tName=%s\tPri=0\tPasswd=\tCard=%s\tGrp=1\tTZ=0000000000000000', v_pin, coalesce(v_name, ''), coalesce(nullif(v_card, ''), u.card, ''))
    else format(E'DATA UPDATE USERINFO PIN=%s\tName=%s\tPri=0\tPasswd=\tCard=%s\tGrp=1\tTZ=0000000000000000\tVerify=0\tViceCard=', v_pin, coalesce(v_name, ''), coalesce(nullif(v_card, ''), u.card, '')) end;
  if c.command in ('add', 'sync', 'update_expiry') then
    v_lines := array[v_user];
  elsif c.command in ('re_add', 'unblock', 'fingers') then
    if c.command <> 'fingers' then v_lines := array[v_user]; end if;
    for f in select key as fid, value as fp from jsonb_each(coalesce(u.fingers, '{}')) loop
      v_lines := v_lines || case when v_legacy
        then format(E'DATA FP PIN=%s\tFID=%s\tSize=%s\tValid=%s\tTMP=%s', v_pin, f.fid, f.fp->>'size', coalesce(f.fp->>'valid', '1'), f.fp->>'tmp')
        else format(E'DATA UPDATE FINGERTMP PIN=%s\tFID=%s\tSize=%s\tValid=%s\tTMP=%s', v_pin, f.fid, f.fp->>'size', coalesce(f.fp->>'valid', '1'), f.fp->>'tmp') end;
    end loop;
  elsif c.command in ('block', 'delete') then
    v_lines := array[case when v_legacy then 'DATA DEL_USER PIN=' || v_pin else 'DATA DELETE USERINFO PIN=' || v_pin end];
  end if;
  return v_lines;
end $$;

create or replace function public.device_poll(p_serial text, p_query jsonb default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare
  d public.biometric_devices := app.device_by_serial(p_serial);
  v_out text[] := '{}'; c public.device_commands; o public.device_operations; v_lines text[]; v_i int; v_count int := 0;
begin
  if d.id is null then perform public.device_hello(p_serial); return 'OK'; end if;
  update public.biometric_devices set last_seen_at = now(), connected_at = coalesce(connected_at, now()),
    info = info || jsonb_strip_nulls(jsonb_build_object('info', nullif(p_query->>'INFO', '')))
  where id = d.id;
  -- Device-wide operations first (restart, clear logs, …)
  for o in select * from public.device_operations where device_id = d.id and status = 'queued' order by created_at limit 5 loop
    if o.operation = 'unblock_active' then
      -- every member with a running membership who the app had blocked gets an unblock command
      insert into public.device_commands (studio_id, device_id, member_id, command, biometric_code)
      select d.studio_id, d.id, m.id, 'unblock', app.device_pin(m)
      from public.device_users u join public.members m on m.studio_id = d.studio_id and m.deleted_at is null and app.device_pin(m) = u.pin
      where u.device_id = d.id and u.blocked and app.member_has_access(m.id);
      update public.device_operations set status = 'done', sent_at = now(), done_at = now(), result = 'Unblock commands queued' where id = o.id;
    elsif o.operation = 'reset_op_stamp' then
      update public.biometric_devices set op_stamp = '0', att_stamp = coalesce(att_stamp, '0') where id = d.id;
      v_out := v_out || ('C:' || o.cmd_no || ':CHECK');
      update public.device_operations set status = 'sent', sent_at = now() where id = o.id;
    else
      v_out := v_out || ('C:' || o.cmd_no || ':' || case o.operation when 'restart' then 'REBOOT' when 'clear_logs' then 'CLEAR LOG' end);
      update public.device_operations set status = 'sent', sent_at = now() where id = o.id;
    end if;
  end loop;
  -- Then member and staff commands, a few at a time (each may be several lines: the user, then each finger)
  for c in select * from public.device_commands where device_id = d.id and status = 'queued' order by created_at limit 10 loop
    v_lines := app.device_command_lines(d, c);
    if coalesce(array_length(v_lines, 1), 0) = 0 then
      update public.device_commands set status = 'failed', done_at = now(),
        result = case when c.biometric_code is null then 'No biometric code or mobile number for this person' else 'Nothing to send' end
      where id = c.id;
      continue;
    end if;
    -- Blocking removes the person from the device: only when their fingerprints are kept here, so they can come back.
    if c.command = 'block' and not exists (select 1 from public.device_users u where u.device_id = d.id and u.pin = c.biometric_code and u.fingers <> '{}') then
      update public.device_commands set status = 'failed', done_at = now(),
        result = 'Not blocked: the device hasn''t sent this person''s fingerprints yet, so they couldn''t be put back later'
      where id = c.id;
      continue;
    end if;
    for v_i in 1 .. array_length(v_lines, 1) loop
      -- each line gets its own number: the command's number, then .1, .2 … for the fingers
      v_out := v_out || ('C:' || c.cmd_no || case when v_i > 1 then '.' || (v_i - 1) else '' end || ':' || v_lines[v_i]);
    end loop;
    update public.device_commands set status = 'sent', sent_at = now(), line = left(array_to_string(v_lines, E'\n'), 2000) where id = c.id;
    v_count := v_count + 1;
    exit when array_length(v_out, 1) >= 12;
  end loop;
  if coalesce(array_length(v_out, 1), 0) = 0 then return 'OK'; end if;
  return array_to_string(v_out, E'\n') || E'\n';
end $$;

-- "ID=<no>&Return=<code>&CMD=<name>" lines. 0 is success; a negative code is an error.
create or replace function public.device_report(p_serial text, p_body text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  d public.biometric_devices := app.device_by_serial(p_serial);
  v_line text; v_kv jsonb; v_id text; v_no bigint; v_part int; v_ret int; c public.device_commands;
begin
  if d.id is null then return 'OK'; end if;
  update public.biometric_devices set last_seen_at = now(), connected_at = coalesce(connected_at, now()) where id = d.id;
  foreach v_line in array string_to_array(replace(coalesce(p_body, ''), E'\r', ''), E'\n') loop
    continue when trim(v_line) = '';
    select coalesce(jsonb_object_agg(split_part(kv, '=', 1), substr(kv, length(split_part(kv, '=', 1)) + 2)), '{}') into v_kv
    from unnest(string_to_array(v_line, '&')) kv;
    v_id := v_kv->>'ID';
    continue when v_id is null or v_id !~ '^\d+(\.\d+)?$';
    v_no := split_part(v_id, '.', 1)::bigint;
    v_part := coalesce(nullif(split_part(v_id, '.', 2), '')::int, 0);
    v_ret := coalesce(nullif(v_kv->>'Return', '')::int, 0);
    update public.device_operations set status = case when v_ret >= 0 then 'done' else 'failed' end, done_at = now(), return_code = v_ret,
      result = case when v_ret >= 0 then 'Done on the device' else 'The device answered ' || v_ret end
    where device_id = d.id and cmd_no = v_no and status = 'sent';
    select * into c from public.device_commands where device_id = d.id and cmd_no = v_no;
    continue when c.id is null;
    if v_ret < 0 and v_part = 0 and d.command_style = 'modern' and c.command <> 'fingers' and v_ret in (-1, -1002, -1004) then
      -- The device doesn't know the newer command words: switch it to the older ones and send this again.
      update public.biometric_devices set command_style = 'legacy' where id = d.id;
      d.command_style := 'legacy';
      update public.device_commands set status = 'queued', sent_at = null, result = 'Sending again in the older command format' where id = c.id;
      continue;
    end if;
    if v_part = 0 then
      update public.device_commands set status = case when v_ret >= 0 then 'done' else 'failed' end, done_at = now(), return_code = v_ret,
        result = case when v_ret >= 0 then 'Done on the device' else 'The device answered ' || v_ret end
      where id = c.id;
      if v_ret >= 0 then
        update public.device_users set
          blocked = case c.command when 'block' then true when 'unblock' then false else blocked end,
          on_device = case when c.command in ('block', 'delete') then false when c.command in ('add', 're_add', 'unblock', 'sync') then true else on_device end,
          updated_at = now()
        where device_id = d.id and pin = c.biometric_code;
        if not found and c.command in ('add', 're_add', 'unblock', 'sync') then
          insert into public.device_users (device_id, studio_id, pin, on_device) values (d.id, d.studio_id, c.biometric_code, true)
          on conflict do nothing;
        end if;
      end if;
    elsif v_ret < 0 then
      update public.device_commands set result = coalesce(result, '') || ' Finger ' || v_part || ' not restored (' || v_ret || ').' where id = c.id;
    end if;
  end loop;
  return 'OK';
end $$;

-- ---------------------------------------------------------------------------
-- 8. Who may come in (YDL's rules in Fitness Center › Biometric settings)
-- ---------------------------------------------------------------------------
create or replace function app.member_has_access(p_member uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare m public.members; v_set jsonb; v_today date;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or m.deleted_at is not null then return false; end if;
  select coalesce(settings->'biometric', '{}') into v_set from public.studios where id = m.studio_id;
  v_today := app.today(m.studio_id);
  -- a running membership (PT plans count when "Personal training filter" allows them)
  if not exists (select 1 from public.subscriptions s where s.member_id = m.id and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
                   and (s.kind = 'gym' or (s.kind = 'pt' and coalesce((v_set->>'allow_pt_access')::boolean, true)))
                   and app.subscription_state(s) in ('active', 'frozen')) then
    return not coalesce((v_set->>'block_users_expired')::boolean, true);
  end if;
  if coalesce((v_set->>'block_users_freeze')::boolean, false) and not exists (
       select 1 from public.subscriptions s where s.member_id = m.id and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
         and app.subscription_state(s) = 'active') then
    return false;
  end if;
  if coalesce((v_set->>'block_users_balance')::boolean, false) and exists (
       select 1 from public.subscription_overview o where o.member_id = m.id and o.balance_amount > 0
         and o.state not in ('deleted', 'cancelled', 'transferred', 'upgraded', 'downgraded')) then
    return false;
  end if;
  return true;
end $$;

-- Every morning: block those who lost access, let back those who have it again. Only for devices with the expiry rule.
-- Like YDL, a member who hasn't been in this month isn't touched (they're blocked the day after they next come).
create or replace function app.device_access_check(p_studio uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare d public.biometric_devices; v_n int := 0; v_k int; v_month date := date_trunc('month', app.today(p_studio))::date;
begin
  for d in select * from public.biometric_devices where studio_id = p_studio and active and expiry_rule and last_seen_at is not null loop
    insert into public.device_commands (studio_id, device_id, member_id, command, biometric_code)
    select p_studio, d.id, m.id, 'block', u.pin
    from public.device_users u join public.members m on m.studio_id = p_studio and m.deleted_at is null and app.device_pin(m) = u.pin
    where u.device_id = d.id and u.on_device and not u.blocked and u.fingers <> '{}'
      and exists (select 1 from public.attendance a where a.member_id = m.id and a.date >= v_month)
      and not app.member_has_access(m.id)
      and not exists (select 1 from public.device_commands q where q.device_id = d.id and q.member_id = m.id and q.status in ('queued', 'sent'));
    get diagnostics v_k = row_count; v_n := v_n + v_k;
    insert into public.device_commands (studio_id, device_id, member_id, command, biometric_code)
    select p_studio, d.id, m.id, 'unblock', u.pin
    from public.device_users u join public.members m on m.studio_id = p_studio and m.deleted_at is null and app.device_pin(m) = u.pin
    where u.device_id = d.id and u.blocked and app.member_has_access(m.id)
      and not exists (select 1 from public.device_commands q where q.device_id = d.id and q.member_id = m.id and q.status in ('queued', 'sent'));
    get diagnostics v_k = row_count; v_n := v_n + v_k;
  end loop;
  return v_n;
end $$;

-- Renewing at the desk lets a blocked member in straight away (no waiting for the morning check).
create or replace function app.device_unblock_on_renewal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'live' and new.deleted_at is null and new.cancelled_at is null then
    insert into public.device_commands (studio_id, device_id, member_id, command, biometric_code)
    select new.studio_id, u.device_id, m.id, 'unblock', u.pin
    from public.members m join public.device_users u on u.studio_id = m.studio_id and u.pin = app.device_pin(m) and u.blocked
    where m.id = new.member_id and app.member_has_access(m.id)
      and not exists (select 1 from public.device_commands q where q.device_id = u.device_id and q.member_id = m.id and q.status in ('queued', 'sent'));
  end if;
  return null;
end $$;
drop trigger if exists subscriptions_device_unblock on public.subscriptions;
create trigger subscriptions_device_unblock after insert or update of status, base_end_date on public.subscriptions
  for each row execute function app.device_unblock_on_renewal();

-- ---------------------------------------------------------------------------
-- 9. Check-out time comes from the biometric settings (YDL "Default Customer Checkout Time"), and the morning check
--    runs from the hourly schedule at 5 AM.
-- ---------------------------------------------------------------------------
create or replace function app.auto_checkout_minutes(p_studio uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(nullif(s.settings->'biometric'->>'checkout_minutes', ''), nullif(s.settings->>'auto_checkout_minutes', ''))::int
                   from public.studios s where s.id = p_studio), 90);
$$;

create or replace function app.run_message_schedule(p_hour int default null)
returns int language plpgsql security definer set search_path = '' as $$
declare s record; v_hour int; v_n int := 0; k text;
begin
  for s in select id, coalesce(timezone, 'Asia/Kolkata') as tz from public.studios where active loop
    v_hour := coalesce(p_hour, extract(hour from now() at time zone s.tz)::int);
    perform app.auto_checkout(s.id);
    perform app.renewal_follow_ups(s.id);
    if v_hour = 5 then perform app.device_access_check(s.id); end if;
    for k in select unnest(case v_hour when 4 then array['birthday'] when 5 then array['balance_due'] when 6 then array['before_expiry']
                                       when 7 then array['after_expiry'] when 8 then array['on_expiry', 'irregular'] else array[]::text[] end) loop
      v_n := v_n + app.queue_scheduled(s.id, k);
    end loop;
    if coalesce((app.whatsapp_setting(s.id, 'auto_resend') #>> '{}')::boolean, false) then
      update public.messages set status = 'queued', send_after = now(), error = null
      where studio_id = s.id and channel = 'whatsapp' and status = 'failed' and attempts < 3 and created_at > now() - interval '2 days'
        and coalesce(sent_at, created_at) < now() - interval '2 hours';
    end if;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Who may call what. The device has no login: the edge worker calls these four with the public key, and they only
--     act for devices added in the Biometric Manager.
-- ---------------------------------------------------------------------------
revoke all on function public.device_hello(text, jsonb), public.device_upload(text, text, text, text), public.device_poll(text, jsonb),
  public.device_report(text, text) from public;
grant execute on function public.device_hello(text, jsonb), public.device_upload(text, text, text, text), public.device_poll(text, jsonb),
  public.device_report(text, text) to anon, authenticated, service_role;
revoke all on function app.device_punch(public.biometric_devices, text, timestamptz, int, int), app.device_access_check(uuid),
  app.device_command_lines(public.biometric_devices, public.device_commands) from public, anon, authenticated;
grant execute on function app.device_pin(public.members), app.member_has_access(uuid) to authenticated, service_role;
-- For the Biometric Manager: punches and commands with the person's name.
create or replace view public.device_punch_list with (security_invoker = true) as
select p.id, p.studio_id, p.device_id, p.pin, p.punched_at, p.result, p.member_id, p.staff_id,
       m.full_name as member_name, coalesce(m.member_code, m.enquiry_code) as client_code, nullif(trim(st.first_name || ' ' || coalesce(st.last_name, '')), '') as staff_name
from public.device_punches p
left join public.members m on m.id = p.member_id
left join public.staff st on st.id = p.staff_id;
create or replace view public.device_command_list with (security_invoker = true) as
select c.id, c.studio_id, c.device_id, c.member_id, c.staff_id, c.command, c.biometric_code, c.status, c.result, c.cmd_no,
       c.created_at, c.sent_at, c.done_at, m.full_name as member_name, nullif(trim(st.first_name || ' ' || coalesce(st.last_name, '')), '') as staff_name
from public.device_commands c
left join public.members m on m.id = c.member_id
left join public.staff st on st.id = c.staff_id;
grant select on public.device_punch_list, public.device_command_list to authenticated, service_role;

-- Importing YDL's check-ins after the device is connected: the device's punch (with seconds) and YDL's row (to the minute)
-- are the same visit, so a check-in within two minutes of one already here is the same.
create or replace function app.import_attendance_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member uuid := app.import_need_member(p_studio, r); v_date date := app.import_date(r, 'date'); v_in timestamptz; v_out timestamptz;
begin
  if v_date is null then raise exception 'The date is missing'; end if;
  if v_date > app.today(p_studio) then raise exception 'The date is in the future'; end if;
  v_in := (v_date + coalesce(nullif(trim(r->>'check_in'), '')::time, time '06:00')) at time zone 'Asia/Kolkata';
  v_out := (v_date + nullif(trim(r->>'check_out'), '')::time) at time zone 'Asia/Kolkata';
  if v_out is not null and v_out < v_in then v_out := null; end if;
  if exists (select 1 from public.attendance a where a.member_id = v_member and a.date = v_date and a.check_in between v_in - interval '2 minutes' and v_in + interval '2 minutes') then return 'same'; end if;
  insert into public.attendance (studio_id, member_id, date, check_in, check_out, source, status)
  values (p_studio, v_member, v_date, v_in, v_out, case when lower(coalesce(r->>'source', '')) like 'bio%' then 'biometric' else 'manual' end, 'present');
  return 'added';
end $$;

-- Per device: who it holds, whose fingerprints are kept here, who is blocked, punches today.
create or replace function public.device_summary(p_studio uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'device_id', d.id,
    'users', (select count(*) from public.device_users u where u.device_id = d.id and u.on_device),
    'with_fingers', (select count(*) from public.device_users u where u.device_id = d.id and u.fingers <> '{}'),
    'blocked', (select count(*) from public.device_users u where u.device_id = d.id and u.blocked),
    'punches_today', (select count(*) from public.device_punches p where p.device_id = d.id
                        and (p.punched_at at time zone coalesce((select st.timezone from public.studios st where st.id = d.studio_id), 'Asia/Kolkata'))::date = app.today(d.studio_id)),
    'waiting', (select count(*) from public.device_commands c where c.device_id = d.id and c.status in ('queued', 'sent'))
  )), '[]') from public.biometric_devices d where d.studio_id = p_studio;
$$;
grant execute on function public.device_summary(uuid) to authenticated, service_role;

-- Commands and operations added at the desk take their number from this sequence.
grant usage on sequence app.device_command_no to authenticated, service_role;
