-- Database tests: the biometric device talking to the app (eSSL / ZKTeco push). A simulated day at the studio:
-- hello, punches, users and fingerprints, the morning access check, blocking, renewing, and an older device.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s8 '''00000000-0000-4000-8000-0000000008a0'''
\set own '''00000000-0000-4000-8000-0000000008a1'''
\set dev '''00000000-0000-4000-8000-0000000008a2'''
\set ok '''00000000-0000-4000-8000-0000000008b1'''
\set lapsed '''00000000-0000-4000-8000-0000000008b2'''
\set coach '''00000000-0000-4000-8000-0000000008a3'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s8, 'Device Branch', 'device-branch');
insert into auth.users (id) values ('10000000-0000-4000-8000-0000000008a1'), ('10000000-0000-4000-8000-0000000008a3');
insert into public.staff (id, studio_id, user_id, role, first_name, access_type, phone) values
  (:own, :s8, '10000000-0000-4000-8000-0000000008a1', 'owner', 'Sabir', 'owner', '+91 90000 00001'),
  (:coach, :s8, '10000000-0000-4000-8000-0000000008a3', 'coach', 'Ravi', null, '+91 90000 00002');
-- YDL's codes: the mobile number (10 digits, too big for an integer) or a biometric code.
insert into public.members (id, studio_id, kind, first_name, last_name, phone, biometric_code, added_by) values
  (:ok, :s8, 'member', 'Anas', 'Mohammed', '+91 98480 59125', null, :own),
  (:lapsed, :s8, 'member', 'Raju', 'G B', '+91 70000 00777', '9848000777', :own);
insert into public.services (id, studio_id, name, sort) values ('00000000-0000-4000-8000-0000000008c1', :s8, 'Gym', 1);
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price, service_ids) values
  ('00000000-0000-4000-8000-0000000008d1', :s8, '1 Month', 'gym', 30, 'days', 1500, array['00000000-0000-4000-8000-0000000008c1']::uuid[]);
select app.today(:s8) as t \gset
insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  (:s8, :ok, '00000000-0000-4000-8000-0000000008d1', 'gym', :'t'::date - 5, :'t'::date - 5, :'t'::date + 24, 1500),
  (:s8, :lapsed, '00000000-0000-4000-8000-0000000008d1', 'gym', :'t'::date - 40, :'t'::date - 40, :'t'::date - 11, 1500);
insert into public.biometric_devices (id, studio_id, serial, name, created_at) values (:dev, :s8, 'CUBTEST0001', 'Front door', now() - interval '2 days');
update public.studios set settings = settings || jsonb_build_object('biometric', coalesce(settings->'biometric', '{}') || '{"record_customer_checkout": true}') where id = :s8;

select test.eq((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.members'::regclass and attname = 'biometric_code'), 'text',
  'biometric codes are text, so a 10-digit mobile number fits');
select test.eq((select biometric_code from public.member_overview where id = :lapsed), '9848000777', 'the clients view shows it');
select test.eq(position('nullif(v_bio, '''')::int' in pg_get_functiondef('app.import_member_row(uuid, jsonb)'::regprocedure)), 0,
  'the YDL import keeps long codes');
select test.eq(app.device_pin((select m from public.members m where id = :ok)), '9848059125', 'no code: the 10-digit mobile number is the code');

-- Hello ------------------------------------------------------------------------------------------
select test.eq(public.device_hello('NOT-ADDED-1', '{}'), null::text, 'a device that wasn''t added gets nothing');
select test.eq((select hits from public.device_unknown where serial = 'NOT-ADDED-1'), 1, '… and is listed for the owner to add');
select test.eq(public.device_hello('<script>', '{}'), null::text, 'something that isn''t a serial …');
select test.eq((select count(*) from public.device_unknown where serial = '<script>')::int, 0, '… isn''t listed');
select test.eq(split_part(public.device_hello('CUBTEST0001', '{"pushver": "2.4.1", "options": "all"}'), E'\n', 1), 'GET OPTION FROM: CUBTEST0001',
  'an added device gets its settings');
select test.eq((select push_version from public.biometric_devices where id = :dev), '2.4.1', 'its push version is kept');
select test.eq(split_part(public.device_hello('cubtest0001 ', '{}'), E'\n', 1), 'GET OPTION FROM: cubtest0001', 'the serial in another case still matches');
select test.eq(position('OPERLOGStamp=0' in public.device_hello('CUBTEST0001')) > 0, true, 'it is asked for all its users and fingerprints');
select test.eq(has_function_privilege('anon', 'public.device_upload(text, text, text, text)', 'execute'), true, 'the edge worker can call it with the public key');

-- Punches ----------------------------------------------------------------------------------------
select test.eq(public.device_upload('CUBTEST0001', 'ATTLOG',
  '9848059125' || E'\t' || :'t' || E' 06:00:00\t0\t1\t0\t0\t0\n' ||
  '9848059125' || E'\t' || :'t' || E' 06:01:00\t0\t1\t0\t0\t0\n' ||
  '9848000777' || E'\t' || :'t' || E' 06:05:00\t0\t1\t0\t0\t0\n' ||
  '9000000002' || E'\t' || :'t' || E' 07:00:00\t0\t1\t0\t0\t0\n' ||
  '1234'       || E'\t' || :'t' || E' 07:10:00\t0\t1\t0\t0\t0\n' ||
  '9848059125' || E'\t' || to_char(:'t'::date - 10, 'YYYY-MM-DD') || E' 06:00:00\t0\t1\t0\t0\t0\n', '501'), 'OK: 6', 'six punches received');
select test.eq((select string_agg(result, ',' order by punched_at, pin) from public.device_punches where device_id = :dev),
  'before_switch,check_in,repeat,check_in,staff_in,unknown',
  'check-in, a second try a minute later, the lapsed member, a coach, an unknown code, and history from before the switch');
select test.eq((select count(*) from public.attendance where studio_id = :s8 and source = 'biometric' and date = :'t'::date)::int, 2, 'two check-ins today');
select test.eq((select count(*) from public.staff_attendance where staff_id = :coach and source = 'biometric')::int, 1, 'the coach''s attendance');
select test.eq((select att_stamp from public.biometric_devices where id = :dev), '501', 'the device''s stamp is kept for next time');
select test.eq((select connected_at is not null and connected_at > created_at from public.biometric_devices where id = :dev), true,
  'the device''s first call is the switch day: punches from that day on check clients in');
select test.eq(public.device_upload('CUBTEST0001', 'ATTLOG', '9848059125' || E'\t' || :'t' || E' 06:00:00\t0\t1\t0\t0\t0\n'), 'OK: 0',
  'the same punch sent again changes nothing');
select test.eq(public.device_upload('CUBTEST0001', 'ATTLOG', '9848059125' || E'\t' || :'t' || E' 06:50:00\t0\t1\t0\t0\t0\n'), 'OK: 1', 'a later punch …');
select test.eq((select to_char(check_out at time zone 'Asia/Kolkata', 'HH24:MI') from public.attendance where member_id = :ok and date = :'t'::date), '06:50',
  '… checks the member out (the studio records check-outs)');

-- Users and fingerprints the device holds -------------------------------------------------------
select test.eq(public.device_upload('CUBTEST0001', 'OPERLOG',
  E'USER PIN=9848000777\tName=Raju G B\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\n' ||
  E'FP PIN=9848000777\tFID=6\tSize=8\tValid=1\tTMP=AAAABBBB\n' ||
  E'OPLOG 4\t0\t2026-11-21 06:00:00\t0\t0\t0\t0\n' ||
  E'USER PIN=9848059125\tName=Anas\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\n', '77'), 'OK: 4', 'users, a fingerprint and an operation log line');
select test.eq((select fingers->'6'->>'tmp' from public.device_users where device_id = :dev and pin = '9848000777'), 'AAAABBBB', 'the fingerprint template is kept');

-- The morning check: the lapsed member is blocked; the member with a running plan isn't -----------
select test.eq(app.device_access_check(:s8), 1, 'one block queued');
select public.device_poll('CUBTEST0001', '{}') as poll \gset
select test.eq(:'poll' like '%:DATA DELETE USERINFO PIN=9848000777%', true, 'the device is told to remove the lapsed member');
select cmd_no as blockno from public.device_commands where member_id = :lapsed and command = 'block' \gset
select test.eq(public.device_report('CUBTEST0001', 'ID=' || :blockno || E'&Return=0&CMD=DATA\n'), 'OK', 'the device reports back');
select test.eq((select status from public.device_commands where cmd_no = :blockno), 'done', 'the block is done');
select test.eq((select blocked and not on_device from public.device_users where device_id = :dev and pin = '9848000777'), true, 'the member is blocked');
select test.eq(app.device_access_check(:s8), 0, 'the next morning nothing new is queued');

-- Nobody without fingerprints kept here is blocked (they couldn't be put back) ---------------------
insert into public.device_commands (studio_id, member_id, command) values (:s8, :ok, 'block');
select public.device_poll('CUBTEST0001', '{}') as poll2 \gset
select test.eq((select result from public.device_commands where member_id = :ok and command = 'block') like 'Not blocked:%', true,
  'a block without fingerprints here is refused, with the reason');

-- Renewing lets the member back in at once, fingerprints and all -----------------------------------
insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  (:s8, :lapsed, '00000000-0000-4000-8000-0000000008d1', 'gym', :'t'::date, :'t'::date, :'t'::date + 29, 1500);
select test.eq((select count(*) from public.device_commands where member_id = :lapsed and command = 'unblock' and status = 'queued')::int, 1, 'renewing queues an unblock');
select public.device_poll('CUBTEST0001', '{}') as poll3 \gset
select test.eq(:'poll3' like E'%:DATA UPDATE USERINFO PIN=9848000777\tName=Raju G B%' and :'poll3' like E'%.1:DATA UPDATE FINGERTMP PIN=9848000777\tFID=6\tSize=8\tValid=1\tTMP=AAAABBBB%', true,
  'the member and their fingerprint go back on the device');

-- An older device that doesn't know the newer command words ---------------------------------------
insert into public.device_commands (studio_id, member_id, command) values (:s8, :ok, 'add');
select public.device_poll('CUBTEST0001', '{}') as poll4 \gset
select cmd_no as addno from public.device_commands where member_id = :ok and command = 'add' \gset
select public.device_report('CUBTEST0001', 'ID=' || :addno || E'&Return=-1002&CMD=DATA\n') as r \gset
select test.eq((select command_style from public.biometric_devices where id = :dev), 'legacy', 'the device is switched to the older command words');
select public.device_poll('CUBTEST0001', '{}') as poll5 \gset
select test.eq(:'poll5' like E'%:DATA USER PIN=9848059125\tName=Anas Mohammed%', true, '… and the command is sent again in that format');

-- Device operations ------------------------------------------------------------------------------
insert into public.device_operations (studio_id, device_id, operation) values (:s8, :dev, 'restart');
select test.eq(public.device_poll('CUBTEST0001', '{}') like '%:REBOOT%', true, 'Restart Biometric Device sends REBOOT');

-- The automatic check-out time comes from the biometric settings (YDL's "Default Customer Checkout Time").
update public.studios set settings = jsonb_set(settings, '{biometric,checkout_minutes}', '60') where id = :s8;
select test.eq(app.auto_checkout_minutes(:s8), 60, 'check-out time from the biometric settings');

-- YDL's check-ins imported after the switch don't double the device's (YDL's time is to the minute).
select test.eq(app.import_attendance_row(:s8, jsonb_build_object('phone', '9848059125', 'date', :'t', 'check_in', '06:00')), 'same', 'the imported YDL check-in is the device''s punch');

-- The desk's summary of the device.
select test.eq((select (e->>'users')::int || '/' || (e->>'with_fingers') || '/' || (e->>'punches_today')
  from jsonb_array_elements(public.device_summary(:s8)) e where e->>'device_id' = :dev), '1/1/6',
  'the desk sees one user on the device (the other waits for the device to confirm the unblock), one with fingerprints kept here, and today''s punches');

select 'device push: ok';
