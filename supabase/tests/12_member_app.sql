-- Database tests: the member app and the gym's notifications (YDL replica part 8a).
-- A separate branch: an owner, a front desk executive, a coach, and two members with the app (Asha has a plan, Bala has none).
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s6 '''00000000-0000-4000-8000-000000000ca0'''
\set owner '''00000000-0000-4000-8000-000000000ca1'''
\set desk '''00000000-0000-4000-8000-000000000ca2'''
\set coach '''00000000-0000-4000-8000-000000000ca3'''
\set asha '''00000000-0000-4000-8000-000000000cb1'''
\set bala '''00000000-0000-4000-8000-000000000cb2'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s6, 'App Test Branch', 'app-test');
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000ca1'), ('10000000-0000-4000-8000-000000000ca2'), ('10000000-0000-4000-8000-000000000ca3'),
  ('10000000-0000-4000-8000-000000000cb1'), ('10000000-0000-4000-8000-000000000cb2');
insert into public.staff (id, studio_id, user_id, role, first_name, last_name, access_type, employee_type, phone) values
  (:owner, :s6, '10000000-0000-4000-8000-000000000ca1', 'owner', 'Owner', null, 'owner', null, null),
  (:desk, :s6, '10000000-0000-4000-8000-000000000ca2', 'front_desk', 'Dina', 'Desk', 'front_desk_exec', null, null),
  (:coach, :s6, '10000000-0000-4000-8000-000000000ca3', 'coach', 'Kiran', 'Coach', null, 'Personal Trainer', '9100000300');
insert into public.members (id, studio_id, kind, first_name, last_name, phone, gender, user_id, added_by) values
  (:asha, :s6, 'member', 'Asha', 'Rani', '9100000301', 'female', '10000000-0000-4000-8000-000000000cb1', :desk),
  (:bala, :s6, 'member', 'Bala', 'Krishna', '9100000302', 'male', '10000000-0000-4000-8000-000000000cb2', null);
insert into public.services (id, studio_id, name, sort) values ('00000000-0000-4000-8000-000000000cc1', :s6, 'Strength', 1);
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price, service_ids, freeze_days) values
  ('00000000-0000-4000-8000-000000000cd1', :s6, 'Strength Month', 'gym', 1, 'months', 3000, array['00000000-0000-4000-8000-000000000cc1']::uuid[], 7);
select app.today(:s6) as t \gset
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  ('00000000-0000-4000-8000-000000000ce1', :s6, :asha, '00000000-0000-4000-8000-000000000cd1', 'gym', :'t'::date - 5, :'t'::date - 5, :'t'::date + 25, 3000);
insert into public.batches (id, studio_id, name, capacity, trainer_ids, days, start_time, end_time, service_ids, gender) values
  ('00000000-0000-4000-8000-000000000cf1', :s6, 'Evening Strength', 1, array[:coach]::uuid[], '{1,2,3,4,5,6,7}', '19:00', '20:00', array['00000000-0000-4000-8000-000000000cc1']::uuid[], 'all'),
  ('00000000-0000-4000-8000-000000000cf2', :s6, 'Men''s Boxing', 10, array[:coach]::uuid[], '{1,2,3,4,5,6,7}', '20:00', '21:00', '{}', 'male');

-- Classes in the app ------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000cb1', false);   -- Asha
select test.eq((select count(*) from public.my_classes(:'t'::date + 1, :'t'::date + 1))::int, 2, 'Asha sees tomorrow''s two classes');
select test.eq((select coalesce(blocked, 'ok') from public.my_classes(:'t'::date + 1, :'t'::date + 1) where title = 'Evening Strength'), 'ok', 'her plan covers Evening Strength');
select test.eq((select blocked from public.my_classes(:'t'::date + 1, :'t'::date + 1) where title = 'Men''s Boxing'), 'gender', 'the men''s class is not for her');
select test.eq(public.book_class(jsonb_build_object('batch_id', '00000000-0000-4000-8000-000000000cf1', 'class_date', (:'t'::date + 1)::text, 'member_id', :asha)) is not null, true, 'she books it');
select test.eq((select booking_status || ' ' || booked from public.my_classes(:'t'::date + 1, :'t'::date + 1) where title = 'Evening Strength'), 'booked 1', 'and sees her booking');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000cb2', false);   -- Bala
select test.eq((select blocked from public.my_classes(:'t'::date + 1, :'t'::date + 1) where title = 'Evening Strength'), 'no_membership', 'Bala has no plan for it');
select test.eq((select booking_id from public.my_classes(:'t'::date + 1, :'t'::date + 1) where title = 'Evening Strength'), null, 'and doesn''t see Asha''s booking');

-- Freeze request ----------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000cb1', false);
select test.fails($$select public.request_freeze('00000000-0000-4000-8000-000000000ce1', app.today('00000000-0000-4000-8000-000000000ca0') + 1, 10, 'Travel')$$,
  'allows 7 freeze days', 'the plan''s freeze days are the limit');
select test.eq(public.request_freeze('00000000-0000-4000-8000-000000000ce1', :'t'::date + 1, 5, 'Travelling home') is not null, true, 'Asha asks for 5 days');
select test.eq((select status from public.freezes where subscription_id = '00000000-0000-4000-8000-000000000ce1'), 'requested', 'it waits for the owner');
select test.eq((select end_date from public.subscriptions where id = '00000000-0000-4000-8000-000000000ce1'), :'t'::date + 25, 'and doesn''t move the end date yet');
select test.fails($$select public.request_freeze('00000000-0000-4000-8000-000000000ce1', app.today('00000000-0000-4000-8000-000000000ca0') + 10, 1, null)$$,
  'already have a freeze request waiting', 'one request at a time');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000cb2', false);
select test.fails($$select public.request_freeze('00000000-0000-4000-8000-000000000ce1', app.today('00000000-0000-4000-8000-000000000ca0') + 1, 2, null)$$,
  'Membership not found', 'Bala can''t freeze Asha''s plan');

-- Referrals -----------------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000cb1', false);
select test.fails($$select public.refer_friend('Ravi', '12345', null)$$, '10-digit mobile', 'a real mobile number');
select test.eq(public.refer_friend('Ravi Kumar', '98765 00001', 'Wants to lose weight'), 'sent', 'Asha refers Ravi');
select test.fails($$select public.refer_friend('Ravi K', '9876500001', null)$$, 'already referred this number', 'not the same number twice');
select test.eq((select joined from public.my_referrals()), false, 'Ravi hasn''t joined yet');
reset role;
select test.eq((select kind || ' ' || source_promotion || ' ' || (referred_by_member_id = :asha::uuid) || ' ' || added_by from public.members where phone = '9876500001'),
  'enquiry Member Referral true ' || :desk, 'Ravi is a new enquiry, referred by Asha, with her rep');
select test.eq((select type from public.follow_ups where member_id = (select id from public.members where phone = '9876500001')), 'Referral', 'with a referral follow-up');
set role authenticated;

-- Live traffic ----------------------------------------------------------------------------------------------------------------
reset role;
insert into public.attendance (studio_id, member_id, date, check_in, source) values (:s6, :bala, :'t'::date, now() - interval '30 minutes', 'manual');
set role authenticated;
select test.eq((public.gym_traffic(:s6)->>'now')::int, 1, 'the app shows one person in the gym now');
select test.eq(jsonb_typeof(public.gym_traffic(:s6)->'hours'), 'array', 'and the usual hours');
select test.eq(public.gym_traffic('00000000-0000-4000-8000-000000000001'), null, 'not another gym''s numbers');

-- Coaches and appointments ----------------------------------------------------------------------------------------------------
select test.eq((select name || ' ' || coalesce(phone, '-') || ' ' || can_call || ' ' || can_book from public.my_coaches()), 'Kiran Coach - false true', 'no phone until the gym allows calls');
reset role;
update public.studios set settings = jsonb_set(settings, '{app,can_trainer_call}', 'true') where id = :s6;
set role authenticated;
select test.eq((select phone || ' ' || can_call from public.my_coaches()), '+919100000300 true', 'with calls on, the coach''s number shows');
select test.eq(public.request_appointment(jsonb_build_object('purpose', 'PT Session', 'appointment_date', (:'t'::date + 2)::text, 'start_time', '07:00', 'trainer_id', :coach)) is not null, true,
  'Asha asks for a PT session with Kiran');
reset role;
select test.eq((select handled_by from public.appointments where member_id = :asha), :coach::uuid, 'the request names Kiran');
update public.studios set settings = jsonb_set(settings, '{app,can_book_appointment}', 'false') where id = :s6;
set role authenticated;
select test.fails($$select public.request_appointment(jsonb_build_object('purpose', 'BMI Check', 'appointment_date', (app.today('00000000-0000-4000-8000-000000000ca0') + 3)::text, 'start_time', '08:00'))$$,
  'at the front desk', 'the App Settings switch turns requests off');
select public.send_feedback(:asha, 'Please add a Sunday class');
select test.eq(public.request_callback(:asha, 'trial'), 'sent', 'and she asks for a trial');

-- The gym's notifications ---------------------------------------------------------------------------------------------------------
select test.eq((select count(*) from public.staff_alerts)::int, 0, 'members don''t see the gym''s notifications');
select test.fails($$select public.mark_alerts_done('00000000-0000-4000-8000-000000000ca0')$$, 'Only owner and front desk', 'or mark them done');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ca2', false);   -- the desk
select test.eq((select string_agg(kind, ',' order by kind) from public.staff_alerts where studio_id = :s6), 'appointment,feedback,freeze,referral,trial',
  'the desk sees the freeze request, the referral, the appointment request, the feedback and the trial request');
select test.eq((select link from public.staff_alerts where kind = 'freeze'), '/registers/freezes', 'each one opens the right page');
select test.eq(public.mark_alerts_done(:s6, array(select id from public.staff_alerts where kind = 'feedback')), 1, 'the desk handles one');
select public.save_appointment(jsonb_build_object('id', (select id from public.appointments where member_id = :asha), 'status', 'confirmed'));
select test.eq((select done_at is not null from public.staff_alerts where kind = 'appointment'), true, 'confirming the appointment closes its notification');
reset role;
update public.freezes set status = 'approved' where subscription_id = '00000000-0000-4000-8000-000000000ce1';
set role authenticated;
select test.eq((select done_at is not null from public.staff_alerts where kind = 'freeze'), true, 'and deciding the freeze closes that one');
select test.eq(public.mark_alerts_done(:s6), 2, 'then the rest');
select test.eq((select count(*) from public.staff_alerts where done_at is null)::int, 0, 'none left open');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ca3', false);   -- the coach
select test.eq((select count(*) from public.staff_alerts)::int, 0, 'coaches don''t see them');

reset role;
select 'all member app tests passed';
