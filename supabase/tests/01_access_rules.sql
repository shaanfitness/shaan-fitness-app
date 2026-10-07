-- Access-rule tests: each role sees and changes only what it should.
-- Run with scripts/test-db.sh (local Postgres + the stubs in 00_supabase_stubs.sql).
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned

create schema test;
create function test.eq(actual anyelement, expected anyelement, msg text)
returns text language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', msg, expected, actual;
  end if;
  return 'ok  ' || msg;
end $$;
grant usage on schema test to authenticated;
grant execute on all functions in schema test to authenticated;

-- People (as the database owner) -------------------------------------------
\set studio '''00000000-0000-4000-8000-000000000001'''
insert into public.staff (id, studio_id, role, full_name, phone) values
  ('00000000-0000-4000-8000-0000000000c1', :studio, 'front_desk', 'Front Desk', '+91 90000 00002'),
  ('00000000-0000-4000-8000-0000000000c2', :studio, 'coach', 'Varun', '+91 90000 00003'),
  ('00000000-0000-4000-8000-0000000000c3', :studio, 'doctor', 'Dr Rao', '+91 90000 00004');

insert into public.members (id, studio_id, full_name, phone) values
  ('00000000-0000-4000-8000-0000000000d1', :studio, 'Ananya Reddy', '+91 90000 00005'),
  ('00000000-0000-4000-8000-0000000000d2', :studio, 'Ravi K.', '9000000006'),
  ('00000000-0000-4000-8000-0000000000d3', :studio, 'Kavya R.', '9000000007');

insert into public.care_team (studio_id, member_id, staff_id, role, is_primary) values
  (:studio, '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'coach', true),
  (:studio, '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c3', 'doctor', true),
  (:studio, '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000c2', 'coach', true),
  (:studio, '00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000c2', 'coach', true);

insert into public.member_health (member_id, studio_id) values
  ('00000000-0000-4000-8000-0000000000d1', :studio),
  ('00000000-0000-4000-8000-0000000000d2', :studio);

insert into public.cycles (id, studio_id, member_id, plan_id, start_date, duration_days, price) values
  ('00000000-0000-4000-8000-0000000000e1', :studio, '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b2', '2026-09-13', 28, 7999),
  ('00000000-0000-4000-8000-0000000000e2', :studio, '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000b1', '2026-10-01', 28, 4999),
  ('00000000-0000-4000-8000-0000000000e3', :studio, '00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000b1', '2026-10-01', 28, 4999);

-- Wednesday 4:00 PM group slot is Varun's.
update public.slots set coach_id = '00000000-0000-4000-8000-0000000000c2'
where studio_id = :studio and weekday = 3 and start_time = '16:00';

insert into public.payments (studio_id, member_id, cycle_id, amount, method) values
  (:studio, '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000e1', 7999, 'upi');

-- Logins arrive; the trigger links them by phone ------------------------------
insert into auth.users (id, phone) values
  ('10000000-0000-4000-8000-000000000001', '919502318090'),  -- Sabir: owner and coach
  ('10000000-0000-4000-8000-000000000002', '919000000002'),  -- front desk
  ('10000000-0000-4000-8000-000000000003', '919000000003'),  -- coach Varun
  ('10000000-0000-4000-8000-000000000004', '919000000004'),  -- doctor
  ('10000000-0000-4000-8000-000000000005', '919000000005'),  -- member Ananya
  ('10000000-0000-4000-8000-000000000006', '919000000006');  -- member Ravi (stored as a 10-digit number)

select test.eq((select count(*) from public.staff where user_id = '10000000-0000-4000-8000-000000000001')::int, 2, 'owner login links to both owner and coach records');
select test.eq((select user_id from public.members where full_name = 'Ravi K.'), '10000000-0000-4000-8000-000000000006'::uuid, '10-digit member phone links to +91 login');
select test.eq((select count(*) from public.profiles)::int, 6, 'a profile is created for every login');
select test.eq((select receipt_number from public.payments limit 1), 'SF-00001', 'first receipt number');
select test.eq((select member_code from public.members where full_name = 'Ananya Reddy'), 'SF0001', 'first member code');

-- Member: Ananya ----------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', false);
select test.eq((select count(*) from public.members)::int, 1, 'member sees only herself');
select test.eq((select count(*) from public.cycles)::int, 1, 'member sees only her own cycle');
select test.eq((select count(*) from public.payments)::int, 1, 'member sees her own receipt');
select test.eq((select count(*) from public.plans)::int, 3, 'member can browse plans');
select test.eq((select count(*) from public.staff)::int, 0, 'member cannot read the staff list');
select test.eq((select amount_due from public.cycle_overview)::numeric, 0::numeric, 'paid cycle shows nothing due');
with u as (update public.member_health set doctor_decision = 'approved' where member_id = '00000000-0000-4000-8000-0000000000d1' returning 1)
select test.eq((select count(*) from u)::int, 0, 'member cannot approve her own health');
do $$ begin
  insert into public.payments (studio_id, member_id, amount, method)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d1', 1, 'cash');
  raise exception 'FAIL: member was able to record a payment';
exception when insufficient_privilege then null;
end $$;
select 'ok  member cannot record payments';
reset role;

-- Front desk ---------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select test.eq((select count(*) from public.members)::int, 3, 'front desk sees every member');
select test.eq((select count(*) from public.member_health)::int, 0, 'front desk never sees health details');
select test.eq((select count(*) from public.activity_log)::int, 0, 'front desk cannot read the activity log');
insert into public.payments (studio_id, member_id, cycle_id, amount, method)
values (:studio, '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000e2', 2000, 'cash');
select test.eq((select amount_due from public.cycle_overview where id = '00000000-0000-4000-8000-0000000000e2')::numeric, 2999::numeric, 'part payment leaves the right balance');
-- Front desk can fill a slot past capacity; members can't.
insert into public.bookings (studio_id, member_id, slot_id)
select :studio, '00000000-0000-4000-8000-0000000000d3', id from public.slots where weekday = 3 and start_time = '10:00';
do $$ begin
  update public.plans set price = 1 where tier = 'group';
  if found then raise exception 'FAIL: front desk changed a price'; end if;
end $$;
select 'ok  front desk cannot change prices';
reset role;

-- Coach Varun ------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select test.eq((select count(*) from public.members)::int, 2, 'coach sees only his own members');
select test.eq((select count(*) from public.cycles)::int, 0, 'coach cannot read cycles or money directly');
select test.eq((select count(*) from public.care_progress())::int, 2, 'coach sees session progress for his members');
select test.eq((select count(*) from public.payments)::int, 0, 'coach never sees payments');
insert into public.attendance (studio_id, member_id, slot_id, date)
select :studio, '00000000-0000-4000-8000-0000000000d2', id, '2026-10-07' from public.slots where weekday = 3 and start_time = '16:00';
select test.eq((select sessions_used from public.care_progress() where member_id = '00000000-0000-4000-8000-0000000000d2'), 1, 'marking attendance counts the session');
do $$ begin
  insert into public.attendance (studio_id, member_id, slot_id, date)
  select '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d1', id, '2026-10-07' from public.slots where weekday = 3 and start_time = '08:30';
  raise exception 'FAIL: coach marked attendance in another coach''s slot';
exception when insufficient_privilege then null;
end $$;
select 'ok  coach cannot mark attendance in someone else''s slot';
do $$ begin
  update public.member_health set doctor_decision = 'approved' where member_id = '00000000-0000-4000-8000-0000000000d2';
  raise exception 'FAIL: coach recorded a doctor decision';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select 'ok  coach cannot record a doctor decision';
reset role;

-- Doctor -------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', false);
select test.eq((select count(*) from public.members)::int, 1, 'doctor sees only assigned members');
select test.eq((select count(*) from public.payments)::int, 0, 'doctor never sees payments');
update public.member_health set doctor_decision = 'approved_with_limits', doctor_limits = 'No jumping'
where member_id = '00000000-0000-4000-8000-0000000000d1';
select test.eq((select decided_by from public.member_health where member_id = '00000000-0000-4000-8000-0000000000d1'),
               '00000000-0000-4000-8000-0000000000c3'::uuid, 'doctor decision is recorded with the doctor''s name');
reset role;

-- Member Ravi: full slot -----------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', false);
do $$ begin
  insert into public.bookings (studio_id, member_id, slot_id)
  select '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d2', id from public.slots where weekday = 3 and start_time = '10:00';
  raise exception 'FAIL: member booked a full slot';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select 'ok  member cannot book a full slot';
insert into public.bookings (studio_id, member_id, slot_id)
select :studio, '00000000-0000-4000-8000-0000000000d2', id from public.slots where weekday = 3 and start_time = '16:00';
select test.eq((select count(*) from public.bookings)::int, 1, 'member books an open slot and sees only his booking');
reset role;

-- Owner: Sabir -----------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq((select count(*) from public.members)::int, 3, 'owner sees every member');
select test.eq((select count(*) from public.member_health)::int, 2, 'owner sees health details');
select test.eq((select count(*) > 0 from public.activity_log), true, 'owner reads the activity log');
update public.plans set price = 5499 where tier = 'group';
select test.eq((select price from public.plans where tier = 'group')::numeric, 5499::numeric, 'owner changes a price');
insert into public.extensions (studio_id, cycle_id, days, reason)
values (:studio, '00000000-0000-4000-8000-0000000000e2', 7, 'Travel');
select test.eq((select end_date from public.cycles where id = '00000000-0000-4000-8000-0000000000e2'), '2026-11-04'::date, 'a 7-day extension moves the end date');
reset role;

select 'all access tests passed';
