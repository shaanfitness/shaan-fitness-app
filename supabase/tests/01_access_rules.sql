-- Database tests: YDL-model behaviour and access rules for every role.
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
-- Runs a statement that must fail with a message containing p_like.
create function test.fails(p_sql text, p_like text, msg text)
returns text language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (statement succeeded)', msg;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm not ilike '%' || p_like || '%' then
    raise exception 'FAIL: % (wrong error: %)', msg, sqlerrm;
  end if;
  return 'ok  ' || msg;
end $$;
grant usage on schema test to authenticated, anon;
grant execute on all functions in schema test to authenticated, anon;

\set studio '''00000000-0000-4000-8000-000000000001'''

-- Seed --------------------------------------------------------------------------
select test.eq((select count(*) > 40 from public.list_items where studio_id = :studio and list = 'source_promotion'), true, 'YDL source-of-promotion list is seeded');
select test.eq((select kind from public.list_items where list = 'followup_response' and label = 'Not Interested - Wrong number'), 'not_interested', 'response kinds are seeded');
select test.eq((select string_agg(label, ',' order by sort) from public.list_items where list = 'convertibility'),
  'Hot,Warm / Maybe,Cold / Not so interested,Expected,Successful Follow up,Unpitched', 'convertibility list keeps YDL order');
select test.eq((select count(*) from public.services where studio_id = :studio and active)::int, 12, 'the 12 services Shaan Fitness uses are active');
select test.eq((select staff_code from public.staff where id = '00000000-0000-4000-8000-0000000000a1'), 'ST-001', 'staff code');
select test.eq((select staff_code from public.staff where id = '00000000-0000-4000-8000-0000000000a2'), 'TT-001', 'trainer code');
select test.eq((select count(*) from public.batches)::int, 8, 'eight batches');
select test.eq((select batch_code from public.batches order by start_time limit 1), 'Batch-001', 'batch code');
select test.eq((select plan_code from public.plans where id = '00000000-0000-4000-8000-0000000000b1'), 'MP-001', 'plan code');

-- More staff, then their logins --------------------------------------------------
insert into public.staff (id, studio_id, role, first_name, last_name, phone, permissions) values
  ('00000000-0000-4000-8000-0000000000c1', :studio, 'front_desk', 'Gangada', 'Pavithra', '9000000002', default),
  ('00000000-0000-4000-8000-0000000000c2', :studio, 'coach', 'Varun', 'Yadav', '9000000003', default),
  ('00000000-0000-4000-8000-0000000000c3', :studio, 'doctor', 'Dr', 'Rao', '9000000004', default),
  ('00000000-0000-4000-8000-0000000000c4', :studio, 'front_desk', 'Krupa', 'Mosa', '9000000008',
   '{"only_his_clients": true, "allow_discounting": false}');

insert into auth.users (id, phone, email) values
  ('10000000-0000-4000-8000-000000000001', null, 'ShaanFitnessGym@gmail.com'),  -- Sabir by email
  ('10000000-0000-4000-8000-000000000002', '919000000002', null),
  ('10000000-0000-4000-8000-000000000003', '919000000003', null),
  ('10000000-0000-4000-8000-000000000004', '919000000004', null),
  ('10000000-0000-4000-8000-000000000008', '919000000008', null);
select test.eq((select count(*) from public.staff where user_id = '10000000-0000-4000-8000-000000000001')::int, 2, 'owner login (email) links to both owner and coach records');
select test.eq((select user_id from public.staff where id = '00000000-0000-4000-8000-0000000000c2'), '10000000-0000-4000-8000-000000000003'::uuid, '10-digit staff phone links to +91 login');

-- Anonymous key reads nothing ------------------------------------------------------
set role anon;
select test.fails('select count(*) from public.members', 'permission denied', 'anonymous key cannot read clients');
select test.fails('select count(*) from public.list_items', 'permission denied', 'anonymous key cannot read lists');
reset role;

-- Front desk: Gangada ----------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.save_client(jsonb_build_object(
  'studio_id', :studio, 'first_name', 'Ananya', 'last_name', 'Reddy', 'phone', '9000000005', 'gender', 'female',
  'source_promotion', 'Instagram', 'source_enquiry', 'Walk In', 'interested_service_ids',
    (select jsonb_agg(id) from public.services where name in ('Cardio', 'HIIT')),
  'billing', jsonb_build_object('company_name', 'Reddy Labs', 'pan', 'abcde1234f', 'aadhaar', '3675 9834 6012'),
  'batch_ids', (select jsonb_agg(id) from public.batches where name = '8:30 AM Semi-Private'),
  'follow_up', jsonb_build_object('type', 'Enquiry', 'response', 'Open Follow up', 'convertibility', 'Hot',
    'next_at', (now() + interval '1 day')::text, 'expected_amount', 7999, 'expected_date', (current_date + 3)::text,
    'contact_type', 'Phone', 'notes', 'Call back about semi-private')
)) is not null;
select test.eq((select enquiry_code from public.members where first_name = 'Ananya'), 'ENQ0001', 'first enquiry code');
select test.eq((select added_by from public.members where first_name = 'Ananya'), '00000000-0000-4000-8000-0000000000c1'::uuid, 'handled by the staff who added it');
select test.eq((select aadhaar_last4 || ' ' || pan from public.member_billing), '6012 ABCDE1234F', 'only the last four Aadhaar digits are kept');
select test.eq((select convertibility || ' ' || tapped from public.members where first_name = 'Ananya'), 'Hot true', 'follow-up sets convertibility and marks tapped');
select test.eq((select count(*) from public.follow_ups where status = 'open')::int, 1, 'enquiry form schedules the first follow-up');
select test.eq((select count(*) from public.batch_members)::int, 1, 'enquiry keeps the chosen batch');
select test.fails($$select public.save_client(jsonb_build_object('studio_id', '00000000-0000-4000-8000-000000000001', 'first_name', 'Copy', 'phone', '+91 90000 00005'))$$,
  'DUPLICATE_PHONE', 'same mobile number is flagged as a duplicate');

select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Ravi', 'last_name', 'K', 'phone', '9000000006',
  'gender', 'male', 'trainer_id', '00000000-0000-4000-8000-0000000000c2')) is not null;
select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Kavya', 'phone', '9000000007', 'gender', 'female')) is not null;
select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Lost', 'last_name', 'Lead', 'phone', '9000000009')) is not null;
select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'No', 'last_name', 'Phone', 'phone_withheld', true)) is not null;

-- Answer the open follow-up: follow up again in two days.
select public.add_follow_up(jsonb_build_object('follow_up_id', (select id from public.follow_ups where status = 'open'),
  'response', 'Open Follow up', 'next_at', (now() + interval '2 day')::text, 'notes', 'Wants to see the studio')) is not null;
select test.eq((select string_agg(status, ',' order by created_at) from public.follow_ups), 'done,open', 'answering closes one follow-up and opens the next');
select test.eq((select previous_id is not null from public.follow_ups where status = 'open'), true, 'the next follow-up points back to the last one');
select public.add_follow_up(jsonb_build_object('member_id', (select id from public.members where first_name = 'Lost'),
  'type', 'Enquiry', 'response', 'Not Interested - Relocated')) is not null;
select test.eq((select lead_status from public.members where first_name = 'Lost'), 'not_interested', 'not-interested response closes the enquiry');
select public.add_follow_up(jsonb_build_object('member_id', (select id from public.members where first_name = 'Kavya'),
  'type', 'Enquiry', 'response', 'Open Follow up', 'next_at', (date_trunc('day', now()) + interval '30 hour')::text)) is not null;
select test.fails($$select public.add_follow_up(jsonb_build_object('member_id', (select id from public.members where first_name = 'Kavya'),
  'type', 'Enquiry', 'response', 'Open Follow up', 'next_at', (date_trunc('day', now()) + interval '31 hour')::text))$$,
  'duplicate', 'no two open follow-ups of the same type on the same day');

-- Subscriptions and receipts
insert into public.subscriptions (studio_id, member_id, plan_id, start_date, selling_price)
select :studio, id, '00000000-0000-4000-8000-0000000000b2', app.today(:studio), 7999 from public.members where first_name = 'Ananya';
select test.eq((select invoice_no || ' ' || kind || ' ' || sessions_total from public.subscriptions), 'SF-INV-0001 pt 24', 'invoice number, kind and sessions come from the plan');
select test.eq((select end_date - start_date from public.subscriptions), 27, 'a 28-day plan ends on day 28');
select test.eq((select kind || ' ' || member_code from public.members where first_name = 'Ananya'), 'member SF0001', 'first subscription turns the enquiry into a member');
insert into public.payments (studio_id, member_id, subscription_id, amount, mode)
select studio_id, member_id, id, 5000, 'UPI' from public.subscriptions;
select test.eq((select receipt_no from public.payments), 'SF-0001', 'first receipt number');
select test.eq((select balance_amount || ' ' || payment_status from public.subscription_overview), '2999.00 pending', 'part payment leaves the right balance');
select test.fails($$insert into public.payments (studio_id, member_id, subscription_id, amount, mode)
  select studio_id, member_id, id, 3000, 'CASH' from public.subscriptions$$, 'more than the balance', 'a receipt cannot exceed the balance');
insert into public.payments (studio_id, member_id, subscription_id, amount, mode)
select studio_id, member_id, id, 2999, 'CASH' from public.subscriptions;
select test.eq((select balance_amount || ' ' || payment_status || ' ' || state from public.subscription_overview), '0.00 paid active', 'fully paid and active');
select test.fails($$update public.subscriptions set deleted_at = now()$$, 'only the owner', 'front desk cannot delete a subscription');
update public.subscriptions set selling_price = 7500 where kind = 'pt';
select test.eq((select selling_price from public.subscriptions where kind = 'pt')::numeric, 7500::numeric, 'front desk with discount rights can change a price');
update public.subscriptions set selling_price = 7999 where kind = 'pt';

insert into public.subscriptions (studio_id, member_id, plan_id, start_date, selling_price)
select :studio, id, '00000000-0000-4000-8000-0000000000b1', app.today(:studio) - 10, 4999 from public.members where first_name = 'Ravi';
select test.eq((select is_renewal from public.subscriptions where kind = 'gym'), false, 'first gym plan is new, not a renewal');
select test.fails($$update public.members set deleted_at = now() where first_name = 'Kavya'$$, 'only the owner', 'front desk cannot delete a client');
select test.fails($$update public.members set kind = 'member' where first_name = 'Kavya'$$, 'plan is sold', 'front desk cannot make a member by hand');
select test.eq((select count(*) from public.member_health)::int, 0, 'front desk never sees health details');
select test.eq((select count(*) from public.activity_log)::int, 0, 'front desk cannot read the activity log');
select test.eq((select count(*) from public.staff_payroll)::int, 0, 'front desk cannot read salaries');
select test.eq((select (dashboard_summary->>'today_collection')::numeric from public.dashboard_summary(:studio)), 7999::numeric, 'dashboard: today''s collection');
select test.eq((select (dashboard_summary->>'open_enquiries')::int from public.dashboard_summary(:studio)), 2, 'dashboard: open enquiries (Kavya and the no-phone enquiry)');
select test.eq((select (dashboard_summary->>'active_pt')::int || '/' || (dashboard_summary->>'active_gym') from public.dashboard_summary(:studio)), '1/1', 'dashboard: active PT and gym');
select test.eq((select (dashboard_summary->>'balance_amount')::numeric from public.dashboard_summary(:studio)), 4999::numeric, 'dashboard: balance amount');
select test.eq((select live_status from public.member_overview where first_name = 'Ananya'), 'active', 'member list: live status');
select test.eq((select live_status from public.member_overview where first_name = 'Kavya'), 'none', 'member list: no subscription');
select test.eq((select count(*) from public.batch_attendance_summary(:studio, app.today(:studio) - 6, app.today(:studio)))::int, 8, 'batch summary lists the week''s batches');
select test.eq((select sum(total)::int from public.enquiry_staff_summary(:studio, app.today(:studio) - 30, app.today(:studio))), 5, 'enquiries added per staff member');
reset role;

-- Member logins arrive and link by phone -------------------------------------------
insert into auth.users (id, phone) values
  ('10000000-0000-4000-8000-000000000005', '919000000005'),
  ('10000000-0000-4000-8000-000000000006', '919000000006');
insert into public.care_team (studio_id, member_id, staff_id, role)
select :studio, id, '00000000-0000-4000-8000-0000000000c3', 'doctor' from public.members where first_name = 'Ananya';
insert into public.member_health (member_id, studio_id) select id, :studio from public.members where first_name in ('Ananya', 'Ravi');
insert into public.staff_payroll (staff_id, studio_id, basic_pay) values ('00000000-0000-4000-8000-0000000000c2', :studio, 15000);

-- Restricted front desk: Krupa sees only her own clients ---------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.eq((select count(*) from public.members)::int, 0, 'restricted front desk sees none of the others'' clients');
select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Kiran', 'phone', '9000000010')) is not null;
select test.eq((select count(*) from public.members)::int, 1, 'restricted front desk sees the client she added');
select test.fails($$update public.subscriptions set selling_price = 1 where kind = 'gym'$$, 'not allowed to change prices', 'staff without discount rights cannot change prices');
reset role;

-- Coach: Varun -----------------------------------------------------------------------------
insert into public.batches (id, studio_id, name, capacity, trainer_ids, days, start_time, end_time)
values ('00000000-0000-4000-8000-0000000000f1', :studio, 'Varun 6 AM', 9, array['00000000-0000-4000-8000-0000000000c2']::uuid[], '{1,2,3,4,5,6,7}', '06:00', '07:00');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select test.eq((select string_agg(first_name, ',') from public.members), 'Ravi', 'coach sees only the members he trains');
select test.eq((select count(*) from public.subscriptions)::int, 0, 'coach cannot read subscriptions or money directly');
select test.eq((select count(*) from public.payments)::int, 0, 'coach never sees payments');
select test.eq((select count(*) from public.member_billing)::int, 0, 'coach never sees billing identity');
select test.eq((select count(*) from public.care_progress())::int, 1, 'coach sees plan progress for his member');
insert into public.attendance (studio_id, member_id, batch_id, date)
select :studio, id, '00000000-0000-4000-8000-0000000000f1', app.today(:studio) from public.members where first_name = 'Ravi';
select test.eq((select sessions_used from public.care_progress()), 1, 'marking attendance counts the session');
select test.fails($$insert into public.attendance (studio_id, member_id, batch_id, date)
  select '00000000-0000-4000-8000-000000000001', id, (select id from public.batches where name = '7:00 AM Group'), current_date
  from public.members where first_name = 'Ravi'$$, 'row-level security', 'coach cannot mark attendance in someone else''s batch');
select public.add_follow_up(jsonb_build_object('member_id', (select id from public.members where first_name = 'Ravi'),
  'type', 'Feedback', 'response', 'Open Follow up', 'next_at', (now() + interval '3 day')::text)) is not null;
select test.fails($$select public.add_follow_up(jsonb_build_object('member_id', (select id from public.members where first_name = 'Kavya' limit 1),
  'type', 'Feedback', 'response', 'Open Follow up', 'next_at', now()::text))$$, 'not found', 'coach cannot add follow-ups for clients he cannot see');
select test.fails($$select public.add_follow_up(jsonb_build_object('member_id', '$$ || (select id from public.members where first_name = 'Ravi') || $$',
  'type', 'Feedback', 'response', 'Open Follow up', 'next_at', (now() + interval '3 day 1 minute')::text))$$, 'duplicate', 'coach''s own duplicate is blocked too');
select test.fails($$update public.member_health set doctor_decision = 'approved'$$, 'only the member''s doctor', 'coach cannot record a doctor decision');
select test.eq((select count(*) from public.staff_payroll)::int, 0, 'coach cannot read salaries');
reset role;

-- Doctor ------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', false);
select test.eq((select string_agg(first_name, ',') from public.members), 'Ananya', 'doctor sees only assigned members');
select test.eq((select count(*) from public.payments)::int, 0, 'doctor never sees payments');
update public.member_health set doctor_decision = 'approved_with_limits', doctor_limits = 'No jumping';
select test.eq((select decided_by from public.member_health where doctor_decision = 'approved_with_limits'),
  '00000000-0000-4000-8000-0000000000c3'::uuid, 'doctor decision is recorded with the doctor''s name');
reset role;

-- Member: Ananya --------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', false);
select test.eq((select count(*) from public.members)::int, 1, 'member sees only herself');
select test.eq((select count(*) from public.subscriptions)::int, 1, 'member sees her own subscription');
select test.eq((select count(*) from public.payments)::int, 2, 'member sees her own receipts');
select test.eq((select count(*) from public.plans)::int, 3, 'member can browse plans');
select test.eq((select count(*) from public.staff)::int, 0, 'member cannot read the staff list');
select test.eq((select count(*) from public.follow_ups)::int, 0, 'member never sees follow-ups about her');
select test.fails($$insert into public.payments (studio_id, member_id, amount, mode)
  select studio_id, id, 1, 'CASH' from public.members$$, 'row-level security', 'member cannot record a payment');
select test.eq((select has_app from public.member_overview), true, 'linked login counts as app access');
reset role;

-- Owner: Sabir ----------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq((select count(*) from public.members)::int, 6, 'owner sees every client');
select test.eq((select count(*) from public.member_health)::int, 2, 'owner sees health details');
select test.eq((select count(*) from public.staff_payroll)::int, 1, 'owner sees salaries');
select test.eq((select count(*) > 0 from public.activity_log), true, 'owner reads the activity log');
update public.plans set price = 5499 where tier = 'group';
select test.eq((select price from public.plans where tier = 'group')::numeric, 5499::numeric, 'owner changes a plan price');
insert into public.freezes (studio_id, subscription_id, start_date, days, note)
select studio_id, id, app.today(:studio), 5, 'Travel' from public.subscriptions where kind = 'pt';
select test.eq((select end_date - start_date from public.subscriptions where kind = 'pt'), 32, 'a 5-day freeze moves the end date');
select test.eq((select state from public.subscription_overview where kind = 'pt'), 'frozen', 'frozen today');
insert into public.extensions (studio_id, subscription_id, days, note)
select studio_id, id, 7, 'Goodwill' from public.subscriptions where kind = 'gym';
select test.eq((select end_date - start_date from public.subscriptions where kind = 'gym'), 34, 'a 7-day extension moves the end date');
update public.payments set amount = 4000 where receipt_no = 'SF-0001';
select test.eq((select count(*) from public.receipt_changes)::int, 1, 'receipt edits are logged');
update public.subscriptions set deleted_at = now(), delete_reason = 'Test' where kind = 'gym';
select test.eq((select state from public.subscription_overview where kind = 'gym'), 'deleted', 'owner deletes a subscription (kept for the register)');
select test.eq((select count(*) from public.list_items where list = 'payment_mode')::int > 30, true, 'owner reads the payment modes');
insert into public.list_items (studio_id, list, label, sort) values (:studio, 'source_promotion', 'Shaan Instagram Reel', 999);
select test.eq((select count(*) from public.list_items where label = 'Shaan Instagram Reel')::int, 1, 'owner adds a dropdown option');
select test.eq((select public.transfer_follow_ups(:studio, '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1')), 2, 'transfer moves open follow-ups to another staff member');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select test.fails($$insert into public.list_items (studio_id, list, label) values ('00000000-0000-4000-8000-000000000001', 'source_promotion', 'X')$$,
  'row-level security', 'front desk cannot change dropdown lists');
reset role;

select 'all database tests passed';
