-- Database tests: the coach app (YDL replica part 8c).
-- A separate branch: a front desk executive, two coaches (Kiran runs the class, Sunil stands in one day), and three members.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s8 '''00000000-0000-4000-8000-000000000ea0'''
\set desk '''00000000-0000-4000-8000-000000000ea2'''
\set kiran '''00000000-0000-4000-8000-000000000ea3'''
\set sunil '''00000000-0000-4000-8000-000000000ea4'''
\set anu '''00000000-0000-4000-8000-000000000eb1'''
\set bhanu '''00000000-0000-4000-8000-000000000eb2'''
\set chitra '''00000000-0000-4000-8000-000000000eb3'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s8, 'Coach Test Branch', 'coach-test');
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000ea2'), ('10000000-0000-4000-8000-000000000ea3'), ('10000000-0000-4000-8000-000000000ea4');
insert into public.staff (id, studio_id, user_id, role, first_name, last_name, access_type, employee_type) values
  (:desk, :s8, '10000000-0000-4000-8000-000000000ea2', 'front_desk', 'Desk', null, 'front_desk_exec', null),
  (:kiran, :s8, '10000000-0000-4000-8000-000000000ea3', 'coach', 'Kiran', 'K', null, 'Personal Trainer'),
  (:sunil, :s8, '10000000-0000-4000-8000-000000000ea4', 'coach', 'Sunil', 'S', null, 'Personal Trainer');
insert into public.members (id, studio_id, kind, first_name, last_name, phone, gender) values
  (:anu, :s8, 'member', 'Anu', 'A', '9100000501', 'female'),
  (:bhanu, :s8, 'member', 'Bhanu', 'B', '9100000502', 'male'),
  (:chitra, :s8, 'member', 'Chitra', 'C', '9100000503', 'female');
select app.today(:s8) as t \gset
select extract(isodow from :'t'::date)::int as dow \gset
insert into public.batches (id, studio_id, name, capacity, trainer_ids, days, start_time, end_time, service_ids, gender) values
  ('00000000-0000-4000-8000-000000000ec1', :s8, 'Morning Strength', 10, array[:kiran]::uuid[], array[:dow]::smallint[], '06:00', '07:00', '{}', 'all'),
  ('00000000-0000-4000-8000-000000000ec2', :s8, 'Evening Yoga', 10, array[:sunil]::uuid[], array[:dow]::smallint[], '18:00', '19:00', '{}', 'all');
insert into public.batch_members (batch_id, member_id, studio_id) values ('00000000-0000-4000-8000-000000000ec1', :anu, :s8);
insert into public.class_bookings (studio_id, batch_id, member_id, class_date) values (:s8, '00000000-0000-4000-8000-000000000ec1', :bhanu, :'t');
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price, session_count) values
  ('00000000-0000-4000-8000-000000000ed1', :s8, 'PT 12 Sessions', 'pt', 1, 'months', 12000, 12);
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price, sessions_total, trainer_id) values
  ('00000000-0000-4000-8000-000000000ee1', :s8, :chitra, '00000000-0000-4000-8000-000000000ed1', 'pt', :'t'::date - 3, :'t'::date - 3, :'t'::date + 27, 12000, 12, :kiran);
insert into public.appointments (studio_id, title, appointment_date, start_time, end_time, member_id, handled_by, status) values
  (:s8, 'Fitness Assessment', :'t', '09:00', '09:30', :anu, :kiran, 'open');

-- Kiran's day ------------------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ea3', false);   -- Kiran
select test.eq((select string_agg(c->>'name' || ' ' || (c->>'expected') || ' ' || (c->>'present'), ', ') from jsonb_array_elements(public.coach_day()->'classes') c),
  'Morning Strength 2 0', 'Kiran sees his class: Anu (batch) and Bhanu (booked) expected, no one in yet');
select test.eq((select string_agg(x->>'name' || ' ' || (x->>'done_today'), ', ') from jsonb_array_elements(public.coach_day()->'pt') x), 'Chitra C false', 'and his PT client, no session yet today');
select test.eq((select string_agg(x->>'title' || ' ' || (x->>'member_name'), ', ') from jsonb_array_elements(public.coach_day()->'appointments') x), 'Fitness Assessment Anu A', 'and his appointment');
select test.eq(public.coach_day()->'shift', 'null'::jsonb, 'he hasn''t checked in');

-- His own check-in ---------------------------------------------------------------------------------------------------------------
select test.eq(public.staff_check_in(:kiran) is not null, true, 'Kiran checks himself in');
select test.eq((public.coach_day()->'shift'->>'check_out'), null, 'the day shows him in');
select test.fails($$select public.staff_check_in('00000000-0000-4000-8000-000000000ea4')$$, 'only mark your own', 'not Sunil');

-- Class attendance from the phone ----------------------------------------------------------------------------------------------
select test.eq((select string_agg(name || ' ' || booked || ' ' || in_batch || ' ' || present, ', ' order by name) from public.coach_roster('00000000-0000-4000-8000-000000000ec1', :'t')),
  'Anu A false true false, Bhanu B true false false', 'the roster: Anu from the batch, Bhanu booked');
select test.eq(public.class_check_in('00000000-0000-4000-8000-000000000ec1', :'t', array[:anu, :bhanu]::uuid[]), 2, 'Kiran checks both in');
select test.eq((select count(*) from public.coach_roster('00000000-0000-4000-8000-000000000ec1', :'t') where present)::int, 2, 'both show in');
select test.eq((select (c->>'present')::int from jsonb_array_elements(public.coach_day()->'classes') c), 2, 'and his day says 2 in');
select test.fails($$select * from public.coach_roster('00000000-0000-4000-8000-000000000ec2', app.today('00000000-0000-4000-8000-000000000ea0'))$$, 'Class not found', 'not Sunil''s class');

-- A PT session ---------------------------------------------------------------------------------------------------------------------
select test.eq(public.record_session(jsonb_build_object('subscription_id', '00000000-0000-4000-8000-000000000ee1', 'activity', 'Upper body')) is not null, true, 'Kiran records Chitra''s session');
select test.eq((select (x->>'done_today') || ' ' || (x->>'sessions_used') from jsonb_array_elements(public.coach_day()->'pt') x), 'true 1', 'done today, 1 of 12 used');

-- Appointment and leave --------------------------------------------------------------------------------------------------------------
select public.save_appointment(jsonb_build_object('id', (select id from public.appointments where title = 'Fitness Assessment'), 'status', 'attended'));
select test.eq((select x->>'status' from jsonb_array_elements(public.coach_day()->'appointments') x), 'attended', 'he marks the appointment attended');
insert into public.leave_requests (studio_id, staff_id, start_date, end_date, mode, reason) values (:s8, :kiran, :'t'::date + 5, :'t'::date + 6, 'full', 'Family function');
select test.eq((select x->>'status' || ' ' || (x->>'days') from jsonb_array_elements(public.coach_day()->'leave') x), 'pending 2.0', 'his leave request waits for the owner');
select test.fails($$insert into public.leave_requests (studio_id, staff_id, start_date, end_date) values ('00000000-0000-4000-8000-000000000ea0', '00000000-0000-4000-8000-000000000ea4', app.today('00000000-0000-4000-8000-000000000ea0'), app.today('00000000-0000-4000-8000-000000000ea0'))$$,
  'row-level security', 'not leave for Sunil');

-- A substitute coach for one day ----------------------------------------------------------------------------------------------------
reset role;
insert into public.class_sessions (batch_id, class_date, studio_id, trainer_ids) values ('00000000-0000-4000-8000-000000000ec1', :'t', :s8, array[:sunil]::uuid[]);
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ea4', false);   -- Sunil
select test.eq((select string_agg(c->>'name', ', ' order by c->>'start_time') from jsonb_array_elements(public.coach_day()->'classes') c), 'Morning Strength, Evening Yoga',
  'Sunil stands in for Morning Strength today, on top of his own class');
select test.eq((select count(*) from public.coach_roster('00000000-0000-4000-8000-000000000ec1', :'t'))::int, 2, 'and can see its roster');
select test.eq(public.class_check_in('00000000-0000-4000-8000-000000000ec1', :'t', array[:anu]::uuid[]), 0, 'and mark it (Anu is already in)');
select test.eq(jsonb_array_length(public.coach_day()->'pt'), 0, 'Chitra isn''t his PT client');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ea3', false);   -- Kiran
select test.eq(jsonb_array_length(public.coach_day()->'classes'), 0, 'Kiran''s class went to Sunil today');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ea2', false);   -- the desk
select test.fails($$select public.coach_day()$$, 'Sign in as a coach', 'the coach day is for coaches');
select test.eq((select count(*) from public.coach_roster('00000000-0000-4000-8000-000000000ec1', :'t'))::int, 2, 'the desk can see any roster');

reset role;
select 'all coach app tests passed';
