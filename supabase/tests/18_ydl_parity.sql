-- Database tests: behaviour copied from YDL's live system (21 Nov 2026): its own renewal follow-ups, automatic
-- check-out 90 minutes after check-in, and the dashboard numbers that depend on today's traffic.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s7 '''00000000-0000-4000-8000-0000000007a0'''
\set rep '''00000000-0000-4000-8000-0000000007a1'''
\set a7 '''00000000-0000-4000-8000-0000000007b1'''
\set b3 '''00000000-0000-4000-8000-0000000007b2'''
\set c0 '''00000000-0000-4000-8000-0000000007b3'''
\set d9 '''00000000-0000-4000-8000-0000000007b4'''
\set e3 '''00000000-0000-4000-8000-0000000007b5'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug, capacity) values (:s7, 'Parity Branch', 'parity', 40);
insert into auth.users (id) values ('10000000-0000-4000-8000-0000000007a1');
insert into public.staff (id, studio_id, user_id, role, first_name, access_type) values
  (:rep, :s7, '10000000-0000-4000-8000-0000000007a1', 'owner', 'Sabir', 'owner');
insert into public.members (id, studio_id, kind, first_name, phone, gender, added_by) values
  (:a7, :s7, 'member', 'Seven', '9200000001', 'male', :rep),
  (:b3, :s7, 'member', 'Three', '9200000002', 'female', :rep),
  (:c0, :s7, 'member', 'Today', '9200000003', 'female', :rep),
  (:d9, :s7, 'member', 'Renewed', '9200000004', 'male', :rep),
  (:e3, :s7, 'member', 'Expired', '9200000005', null, :rep);
insert into public.services (id, studio_id, name, sort) values ('00000000-0000-4000-8000-0000000007c1', :s7, 'Strength', 1);
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price, service_ids) values
  ('00000000-0000-4000-8000-0000000007d1', :s7, '1 Month Strengthening', 'gym', 30, 'days', 1499, array['00000000-0000-4000-8000-0000000007c1']::uuid[]),
  ('00000000-0000-4000-8000-0000000007d2', :s7, 'Elite Training [4 Weeks]', 'pt', 28, 'days', 7999, array['00000000-0000-4000-8000-0000000007c1']::uuid[]);
select app.today(:s7) as t \gset
-- base_end_date is the last day: ends in 7 days, in 3 days (PT), today, in 3 days but renewed, and ended 5 days ago.
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price, coupon_discount) values
  ('00000000-0000-4000-8000-0000000007e1', :s7, :a7, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 22, :'t'::date - 22, :'t'::date + 7, 1499, 499),
  ('00000000-0000-4000-8000-0000000007e2', :s7, :b3, '00000000-0000-4000-8000-0000000007d2', 'pt', :'t'::date - 24, :'t'::date - 24, :'t'::date + 3, 7999, 0),
  ('00000000-0000-4000-8000-0000000007e3', :s7, :c0, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 29, :'t'::date - 29, :'t'::date, 1499, 0),
  ('00000000-0000-4000-8000-0000000007e4', :s7, :d9, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 26, :'t'::date - 26, :'t'::date + 3, 1499, 0),
  ('00000000-0000-4000-8000-0000000007e5', :s7, :d9, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date, :'t'::date + 4, :'t'::date + 33, 1499, 0),
  ('00000000-0000-4000-8000-0000000007e6', :s7, :e3, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 35, :'t'::date - 35, :'t'::date - 5, 1499, 0);

-- Renewal follow-ups -----------------------------------------------------------------------------
select test.eq(app.renewal_follow_ups(:s7), 3, 'three renewal follow-ups: 7 days, 3 days (PT) and today; none for the renewed or expired plan');
select test.eq((select notes from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e1'),
  'GYM Renewal Reminder - About to expire in 7 Days :1 Month Strengthening, renewal due on ' || to_char(:'t'::date + 7, 'DD-MM-YYYY'),
  'the 7-day reminder reads like YDL''s');
select test.eq((select type || ' · ' || notes from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e2'),
  'PT Renewal · PT Renewal Reminder - About to expire in 3 Days :Elite Training [4 Weeks], renewal due on ' || to_char(:'t'::date + 3, 'DD-MM-YYYY'),
  'a PT plan gets a "PT Renewal Reminder"');
select test.eq((select notes from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e3'),
  '1 Month Strengthening, renewal due on ' || to_char(:'t'::date, 'DD-MM-YYYY'), 'on the last day: "<plan>, renewal due on <date>"');
select test.eq((select expected_amount from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e1'), 1000.00::numeric(12,2),
  'the expected amount is the client''s last bill for the plan (after the discount)');
select test.eq((select expected_date from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e1'), :'t'::date,
  'expected on the day of the follow-up');
select test.eq((select bool_and(assigned_to = :rep and source = 'system' and status = 'open') from public.follow_ups where studio_id = :s7), true,
  'assigned to the client rep, "System Generated", open');
select test.eq((select to_char(due_at at time zone 'Asia/Kolkata', 'HH24:MI') from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e1'), '06:00',
  'reminders are due at 6 AM');
select test.eq(app.renewal_follow_ups(:s7), 0, 'running it again makes nothing new');
update public.follow_ups set status = 'done', response = 'Called' where subscription_id = '00000000-0000-4000-8000-0000000007e1';
select test.eq(app.renewal_follow_ups(:s7), 0, 'an answered reminder isn''t made again the same day');
-- Renewing closes the open reminder.
insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  (:s7, :c0, '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date, :'t'::date + 1, :'t'::date + 30, 1499);
select test.eq((select status from public.follow_ups where subscription_id = '00000000-0000-4000-8000-0000000007e3'), 'successful',
  'renewing closes the renewal follow-up');

-- Automatic check-out ----------------------------------------------------------------------------
insert into public.attendance (studio_id, member_id, date, check_in, source) values
  (:s7, :a7, :'t'::date, now() - interval '2 hours', 'biometric'),
  (:s7, :b3, :'t'::date, now() - interval '20 minutes', 'biometric'),
  (:s7, :e3, :'t'::date, now() - interval '10 minutes', 'biometric');
select test.eq((public.dashboard_summary(:s7)->>'present_checkins')::int, 2, 'present now: the two who checked in less than 90 minutes ago');
select test.eq(app.auto_checkout(:s7), 1, 'the one inside for over 90 minutes is checked out');
select test.eq((select check_out - check_in from public.attendance where member_id = :a7), interval '90 minutes', '… at check-in plus 90 minutes, like YDL');
update public.studios set settings = settings || '{"auto_checkout_minutes": 0}' where id = :s7;
select test.eq((public.dashboard_summary(:s7)->>'present_checkins')::int, 2, 'with automatic check-out off, open check-ins count as present');
update public.studios set settings = settings - 'auto_checkout_minutes' where id = :s7;

-- Dashboard: today's traffic ---------------------------------------------------------------------
select test.eq((public.dashboard_summary(:s7)->>'checkins_today')::int, 3, 'three clients checked in today');
select test.eq((public.dashboard_summary(:s7)->>'checkins_men')::int || '/' || (public.dashboard_summary(:s7)->>'checkins_women') || '/' ||
  (public.dashboard_summary(:s7)->>'checkins_unknown'), '1/1/1', 'today''s check-ins by gender (men / women / not given)');
select test.eq((public.dashboard_summary(:s7)->>'present_expired')::int, 1, 'one client in today''s traffic has an expired plan');
select test.eq((public.dashboard_summary(:s7)->>'present_about')::int, 2, 'two have a plan ending within 7 days');
select test.eq((public.dashboard_summary(:s7)->>'capacity')::int, 40, 'the studio''s capacity is there for the traffic rate');

-- Expired, as YDL counts it: every plan that ended and wasn't renewed (a renewed one is "Used").
insert into public.members (id, studio_id, kind, first_name, phone, gender, added_by) values
  ('00000000-0000-4000-8000-0000000007b6', :s7, 'member', 'Twice', '9200000006', 'male', :rep);
insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  (:s7, '00000000-0000-4000-8000-0000000007b6', '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 90, :'t'::date - 90, :'t'::date - 61, 1499),
  (:s7, '00000000-0000-4000-8000-0000000007b6', '00000000-0000-4000-8000-0000000007d1', 'gym', :'t'::date - 60, :'t'::date - 60, :'t'::date - 31, 1499);
select test.eq((public.dashboard_summary(:s7)->>'expired_gym')::int, 2, 'expired gym subscriptions: the two plans that ended without a renewal, not the renewed one');
select test.eq((select count(*) from public.subscription_overview where studio_id = :s7 and state = 'expired' and renewed)::int, 1,
  'the renewed one shows as "Used" in the app');

select 'ydl parity: ok';
