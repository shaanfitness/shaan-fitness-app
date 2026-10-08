-- Database tests: batches, class bookings and the waiting list, check-ins, appointments,
-- staff attendance (YDL "Batches & Classes", "Daily Booking Appointment", "Attendance Reports").
-- Runs after 02_billing.sql on the same database.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''

-- Dates: next Monday (batches run Monday to Saturday), the Monday before it, and a Sunday.
create temp table t_d as select
  app.today(:studio) + (8 - extract(isodow from app.today(:studio))::int) as mon,
  app.today(:studio) + (8 - extract(isodow from app.today(:studio))::int) - 7 as prev_mon,
  app.today(:studio) + (8 - extract(isodow from app.today(:studio))::int) + 6 as sun;
grant select on t_d to authenticated;
create temp table t_c (k text primary key, id uuid);
grant all on t_c to authenticated;

-- Front desk: batches, clients, bookings ------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
update public.batches set room = 'Hall 1' where name = '7:00 AM Group';
select test.eq((select room from public.batches where name = '7:00 AM Group'), 'Hall 1', 'front desk can edit a batch (YDL Add Batch is a front-desk page)');
insert into t_c select 'arjun', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Arjun', 'phone', '9000000301', 'gender', 'male'));
insert into t_c select 'bala', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Bala', 'phone', '9000000302', 'gender', 'male'));
insert into t_c select 'chitra', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Chitra', 'phone', '9000000303', 'gender', 'female'));
select public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_c where k = 'arjun'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', '00000000-0000-4000-8000-0000000000b1', 'start_date', app.today(:studio)::text)),
  'batch_ids', (select jsonb_agg(id) from public.batches where name = '7:00 AM Group'), 'balance_due_date', (app.today(:studio) + 3)::text));
insert into t_c values ('b7', (select id from public.batches where name = '7:00 AM Group')), ('elite', (select id from public.batches where name = '10:00 AM Elite'));

insert into t_c select 'bk1', public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'member_id', (select id from t_c where k = 'arjun'), 'class_date', (select mon from t_d)::text));
select test.eq((select booking_state || '/' || plan_name from public.class_booking_overview where id = (select id from t_c where k = 'bk1')), 'booked/Group',
  'a booking uses the plan that covers the class');
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'member_id', (select id from t_c where k = 'arjun'), 'class_date', (select mon from t_d)::text))$$, 'already booked', 'no double booking');
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'member_id', (select id from t_c where k = 'arjun'), 'class_date', (select sun from t_d)::text))$$, 'no class on', 'no booking on a day the batch doesn''t run');
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'client_code', 'NOPE-1', 'class_date', (select mon from t_d)::text))$$, 'No client with code', 'booking by an unknown customer code');
select test.fails($$insert into public.class_bookings (studio_id, batch_id, member_id, class_date)
  values ('00000000-0000-4000-8000-000000000001'::uuid, (select id from t_c where k = 'b7'), (select id from t_c where k = 'bala'), (select mon from t_d))$$,
  'permission denied', 'bookings change only through the booking functions');

-- Capacity and the waiting list (the Elite batch takes one client)
select public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'elite'), 'member_id', (select id from t_c where k = 'arjun'), 'class_date', (select mon from t_d)::text));
insert into t_c select 'wait', public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'elite'),
  'client_code', (select coalesce(member_code, enquiry_code) from public.members where id = (select id from t_c where k = 'bala')), 'class_date', (select mon from t_d)::text));
select test.eq((select booking_state from public.class_booking_overview where id = (select id from t_c where k = 'wait')), 'pending', 'a full class puts the client on the waiting list');
select test.eq((select booked || '/' || waiting from public.class_schedule(:studio, (select mon from t_d), (select mon from t_d)) where batch_id = (select id from t_c where k = 'elite')),
  '1/1', 'the timetable counts bookings and the waiting list');
select public.decide_waiting_list(array[(select id from t_c where k = 'wait')], true);
select test.eq((select booking_state from public.class_booking_overview where id = (select id from t_c where k = 'wait')), 'approved', 'approving moves the client off the waiting list');

-- A men-only batch
update public.batches set gender = 'male' where name = '4:00 PM Group';
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from public.batches where name = '4:00 PM Group'),
  'member_id', (select id from t_c where k = 'chitra'), 'class_date', (select mon from t_d)::text))$$, 'for men only', 'a men-only batch takes only men');
update public.batches set gender = 'all' where name = '4:00 PM Group';

-- One day's change to a class
select public.save_class_session(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'), 'class_date', (select mon from t_d)::text,
  'title', 'Holiday Bootcamp', 'start_time', '07:30', 'end_time', '08:30'));
select test.eq((select title || ' ' || start_time::text || ' ' || changed::text from public.class_schedule(:studio, (select mon from t_d), (select mon from t_d))
  where batch_id = (select id from t_c where k = 'b7')), 'Holiday Bootcamp 07:30:00 true', 'a class can be changed for one day');
select test.eq((select title from public.class_schedule(:studio, (select mon from t_d) + 1, (select mon from t_d) + 1) where batch_id = (select id from t_c where k = 'b7')),
  '7:00 AM Group', 'other days keep the batch''s own name');
select test.fails($$select public.save_class_session(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'), 'class_date', (select mon from t_d)::text,
  'start_time', '09:00', 'end_time', '08:00'))$$, 'end after it starts', 'a class can''t end before it starts');

-- Attendance for a past class: booked and checked in
insert into t_c select 'past', public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'member_id', (select id from t_c where k = 'bala'), 'class_date', (select prev_mon from t_d)::text));
select test.eq(public.class_check_in((select id from t_c where k = 'b7'), (select prev_mon from t_d), array[(select id from t_c where k = 'bala')]), 1, 'check in a booked client');
select test.eq(public.class_check_in((select id from t_c where k = 'b7'), (select prev_mon from t_d), array[(select id from t_c where k = 'bala')]), 0, 'checking in twice changes nothing');
select test.eq((select check_in is not null from public.class_booking_overview where id = (select id from t_c where k = 'past')), true, 'the booking shows the check-in');
select test.fails($$select public.cancel_class_bookings(array[(select id from t_c where k = 'past')])$$, 'checked in', 'a checked-in class can''t be cancelled');
select test.fails($$select public.class_check_in((select id from t_c where k = 'b7'), (select mon from t_d) + 7, array[(select id from t_c where k = 'bala')])$$,
  'future class', 'no attendance for a future class');

-- A check-in during a client's fixed batch counts for that batch
insert into public.batch_members (batch_id, member_id, studio_id) values ((select id from t_c where k = 'b7'), (select id from t_c where k = 'chitra'), :studio);
insert into public.attendance (studio_id, member_id, date, check_in, source)
values (:studio, (select id from t_c where k = 'chitra'), (select prev_mon from t_d), ((select prev_mon from t_d) + time '07:10') at time zone 'Asia/Kolkata', 'manual');
select test.eq((select batch_name from public.checkin_overview where member_id = (select id from t_c where k = 'chitra')), '7:00 AM Group',
  'a check-in at batch time is linked to the client''s batch');
select test.eq((select total from public.checkin_leaderboard(:studio, (select prev_mon from t_d), (select prev_mon from t_d)) where member_id = (select id from t_c where k = 'bala')), 1,
  'check-ins leaderboard counts check-ins');

-- Cancel and delete
insert into t_c select 'bk2', public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'),
  'member_id', (select id from t_c where k = 'bala'), 'class_date', (select mon from t_d)::text));
select public.cancel_class_bookings(array[(select id from t_c where k = 'bk2')]);
select test.eq((select booking_state || '/' || cancel_source || '/' || cancelled_by_name from public.class_booking_overview where id = (select id from t_c where k = 'bk2')),
  'cancelled/CRM/Gangada Pavithra', 'Cancelled Class Register shows who cancelled and from where');
select public.book_class(jsonb_build_object('batch_id', (select id from t_c where k = 'b7'), 'member_id', (select id from t_c where k = 'bala'), 'class_date', (select mon from t_d)::text));
select test.eq((select count(*) from public.class_bookings where member_id = (select id from t_c where k = 'bala') and class_date = (select mon from t_d) and batch_id = (select id from t_c where k = 'b7'))::int,
  2, 'a cancelled booking can be booked again');
reset role;

-- Coach: sees the bookings of his own batches only ---------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select test.eq((select count(*) from public.class_bookings)::int, 0, 'a coach doesn''t see other trainers'' bookings');
select test.fails($$select public.delete_class_bookings(array[(select id from t_c where k = 'bk1')])$$, 'Only owner and front desk', 'a coach can''t delete bookings');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
update public.batches set trainer_ids = trainer_ids || '00000000-0000-4000-8000-0000000000c2'::uuid where name = '7:00 AM Group';
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select test.eq((select count(*) from public.class_booking_overview where batch_id = (select id from t_c where k = 'b7') and member_name = 'Arjun')::int, 1,
  'the batch''s trainer sees its bookings and clients');
select test.eq(public.class_check_in((select id from t_c where k = 'b7'), (select prev_mon from t_d), array[(select id from t_c where k = 'arjun')]), 1,
  'the trainer can mark attendance for his batch');
reset role;

-- Front desk deletes a booking -------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.delete_class_bookings(array[(select id from t_c where k = 'wait')]);
select test.eq((select booking_state || '/' || delete_source from public.class_booking_overview where id = (select id from t_c where k = 'wait')), 'deleted/CRM',
  'deleted bookings stay in the Deleted Class Register');

-- Appointments
insert into t_c select 'appt', public.save_appointment(jsonb_build_object('studio_id', :studio, 'title', 'Diet consultation',
  'appointment_date', (select mon from t_d)::text, 'start_time', '11:00', 'end_time', '11:30',
  'client_code', (select coalesce(member_code, enquiry_code) from public.members where id = (select id from t_c where k = 'arjun')),
  'handled_by', '00000000-0000-4000-8000-0000000000c2', 'room_no', '2', 'notify_client', true));
select test.eq((select member_name || ' with ' || handled_by_name || ' ' || status from public.appointment_overview where id = (select id from t_c where k = 'appt')),
  'Arjun with Varun Yadav open', 'an appointment is booked by customer code');
select test.eq((select count(*) from public.notifications where member_id = (select id from t_c where k = 'arjun') and title = 'Appointment booked')::int, 1,
  'the client is notified');
select test.fails($$select public.save_appointment(jsonb_build_object('studio_id', '00000000-0000-4000-8000-000000000001'::uuid, 'title', 'x', 'appointment_date', (select mon from t_d)::text,
  'start_time', '12:00', 'end_time', '11:00', 'client_code', 'X'))$$, 'start time should be less', 'an appointment must end after it starts');
select test.fails($$select public.save_appointment(jsonb_build_object('studio_id', '00000000-0000-4000-8000-000000000001'::uuid, 'title', '', 'appointment_date', (select mon from t_d)::text,
  'start_time', '10:00', 'end_time', '11:00', 'client_code', 'X'))$$, 'Enter the title', 'an appointment needs a title');

-- Staff attendance
select public.staff_check_in('00000000-0000-4000-8000-0000000000c2');
select test.fails($$select public.staff_check_in('00000000-0000-4000-8000-0000000000c2')$$, 'already checked in', 'no double staff check-in');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select public.save_appointment(jsonb_build_object('id', (select id from t_c where k = 'appt'), 'title', 'Diet consultation',
  'start_time', '11:00', 'end_time', '11:45', 'status', 'attended'));
select test.eq((select status || ' ' || end_time::text from public.appointments where id = (select id from t_c where k = 'appt')), 'attended 11:45:00',
  'the trainer updates his own appointment');
select public.staff_check_in('00000000-0000-4000-8000-0000000000c2', true);
select test.fails($$select public.staff_check_in('00000000-0000-4000-8000-0000000000c1')$$, 'only mark your own', 'a coach marks only his own attendance');
select test.eq((select count(*) from public.staff_attendance)::int, 1, 'a coach sees only his own attendance');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq((select present_days from public.staff_attendance_summary(:studio, 'trainer', app.today(:studio), app.today(:studio))
  where staff_id = '00000000-0000-4000-8000-0000000000c2'), 1, 'trainer attendance report counts the day');
select test.eq((select count(*) from public.staff_attendance_summary(:studio, 'trainer', app.today(:studio), app.today(:studio))
  where role <> 'coach')::int, 0, 'trainer report lists trainers only');
reset role;

-- The client books from the app ------------------------------------------------------------------------------
insert into auth.users (id, phone, email) values ('10000000-0000-4000-8000-000000000301', '919000000301', null);
update public.plans set weekly_class_limit = 2 where id = '00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000301', false);
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from public.batches where name = '5:30 AM Group'),
  'member_id', (select id from t_c where k = 'bala'), 'class_date', (select mon from t_d)::text))$$, 'only book your own', 'a client can''t book for someone else');
select test.eq((select count(*) from public.class_bookings)::int, 2, 'a client sees only his own bookings');
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from public.batches where name = '5:30 AM Group'),
  'member_id', (select id from public.members limit 1), 'class_date', (select mon from t_d)::text))$$, 'allows 2 classes a week',
  'the plan''s weekly class limit');
reset role;
update public.plans set weekly_class_limit = 0 where id = '00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000301', false);
select test.fails($$select public.book_class(jsonb_build_object('batch_id', (select id from public.batches where name = '5:30 AM Group'),
  'member_id', (select id from public.members limit 1), 'class_date', ((select mon from t_d) + 14)::text))$$, 'days ahead', 'clients book only a week ahead');
insert into t_c select 'self', public.book_class(jsonb_build_object('batch_id', (select id from public.batches where name = '5:30 AM Group'),
  'member_id', (select id from public.members limit 1), 'class_date', (select mon from t_d)::text));
select test.eq((select source from public.class_bookings where id = (select id from t_c where k = 'self')), 'app', 'the client books a class from the app');
insert into public.class_feedback (studio_id, batch_id, member_id, class_date, rating, comment)
select :studio, (select id from public.batches where name = '5:30 AM Group'), (select id from public.members limit 1), (select mon from t_d), 5, 'Great energy';
select test.fails($$insert into public.class_feedback (studio_id, batch_id, member_id, class_date, rating)
  select '00000000-0000-4000-8000-000000000001'::uuid, (select id from public.batches where name = '8:30 PM Elite'), (select id from public.members limit 1), (select mon from t_d), 4$$,
  'row-level security', 'feedback only for a class the client booked');
select public.cancel_class_bookings(array[(select id from t_c where k = 'self')]);
select test.eq((select cancel_source from public.class_bookings where id = (select id from t_c where k = 'self')), 'Client App', 'the client cancels from the app');
reset role;

select 'all class tests passed';
