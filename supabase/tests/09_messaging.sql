-- Database tests: notifications, WhatsApp, SMS and email (YDL replica part 7b).
-- A separate branch: an owner, a front desk executive (no Broadcast right), a manager (has it) and a coach.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s3 '''00000000-0000-4000-8000-0000000009a0'''
\set owner '''00000000-0000-4000-8000-0000000009a1'''
\set desk '''00000000-0000-4000-8000-0000000009a2'''
\set manager '''00000000-0000-4000-8000-0000000009a3'''
\set coach '''00000000-0000-4000-8000-0000000009a4'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug, mobile) values (:s3, 'Messages Test Branch', 'messages-test', '9000000000');
insert into auth.users (id) values ('10000000-0000-4000-8000-0000000009a1'), ('10000000-0000-4000-8000-0000000009a2'),
  ('10000000-0000-4000-8000-0000000009a3'), ('10000000-0000-4000-8000-0000000009a4'), ('10000000-0000-4000-8000-0000000009b1');
insert into public.staff (id, studio_id, user_id, role, first_name, access_type, employee_type) values
  (:owner, :s3, '10000000-0000-4000-8000-0000000009a1', 'owner', 'Owner', 'owner', null),
  (:desk, :s3, '10000000-0000-4000-8000-0000000009a2', 'front_desk', 'Desk', 'front_desk_exec', null),
  (:manager, :s3, '10000000-0000-4000-8000-0000000009a3', 'front_desk', 'Manager', 'manager', null),
  (:coach, :s3, '10000000-0000-4000-8000-0000000009a4', 'coach', 'Coach', null, 'Personal Trainer');
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price) values
  ('00000000-0000-4000-8000-0000000009d1', :s3, 'Gym 1 Month', 'gym', 1, 'months', 2000);
select app.today(:s3) as t \gset

-- New enquiry: the welcome message goes out on its own ------------------------------------------------------
insert into public.members (id, studio_id, kind, first_name, last_name, phone, gender) values
  ('00000000-0000-4000-8000-0000000009f1', :s3, 'enquiry', 'Ravi', 'Kumar', '98480 11111', 'male');
select test.eq((select to_address || '|' || source from public.messages where member_id = '00000000-0000-4000-8000-0000000009f1'), '919848011111|enquiry',
  'a new enquiry gets the welcome WhatsApp, to the number with its country code');
select test.eq((select body like 'Welcome To Messages Test Branch, We are glad%' from public.messages where member_id = '00000000-0000-4000-8000-0000000009f1'), true,
  'the welcome text names the fitness center');
insert into public.members (id, studio_id, kind, first_name, phone, phone_withheld, gender) values ('00000000-0000-4000-8000-0000000009f9', :s3, 'enquiry', 'NoPhone', null, true, 'female');
select test.eq((select count(*) from public.messages where member_id = '00000000-0000-4000-8000-0000000009f9')::int, 0, 'no number, no message (and no error)');

-- Members ----------------------------------------------------------------------------------------------------
-- Sita: birthday today, bill ends in 3 days.  Mohan: bill ends today, owes 500.  Lata: ended 7 days ago.
-- Kiran: active, last came 10 days ago.       Nina: active, came yesterday.
insert into public.members (id, studio_id, kind, first_name, last_name, phone, email, gender, date_of_birth) values
  ('00000000-0000-4000-8000-0000000009f2', :s3, 'member', 'Sita', 'Rao', '9000000002', 'sita@example.com', 'female', (:'t'::date - interval '25 years')::date),
  ('00000000-0000-4000-8000-0000000009f3', :s3, 'member', 'Mohan', null, '9000000003', null, 'male', null),
  ('00000000-0000-4000-8000-0000000009f4', :s3, 'member', 'Lata', null, '9000000004', null, 'female', null),
  ('00000000-0000-4000-8000-0000000009f5', :s3, 'member', 'Kiran', null, '9000000005', 'kiran@example.com', 'male', null),
  ('00000000-0000-4000-8000-0000000009f6', :s3, 'member', 'Nina', null, '9000000006', null, 'female', null);
begin;
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price) values
  ('00000000-0000-4000-8000-0000000009c1', :s3, '00000000-0000-4000-8000-0000000009f2', '00000000-0000-4000-8000-0000000009d1', 'gym', :'t'::date - 27, :'t'::date - 27, :'t'::date + 3, 2000);
insert into public.payments (studio_id, member_id, subscription_id, receipt_date, amount, mode) values
  (:s3, '00000000-0000-4000-8000-0000000009f2', '00000000-0000-4000-8000-0000000009c1', :'t'::date - 27, 2000, 'CASH');
commit;
select test.eq((select count(*) from public.messages where member_id = '00000000-0000-4000-8000-0000000009f2' and source = 'bill')::int, 1, 'a new bill sends the bill message once');
select test.eq((select body like 'Dear Sita Rao,%Thanks for subscribing ''Gym 1 Month'', Your Total Billing Amount is Rs. 2000.%Feel free to contact us%'
  from public.messages where member_id = '00000000-0000-4000-8000-0000000009f2' and source = 'bill'), true, 'the bill message reads like YDL''s');
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price, balance_due_date) values
  ('00000000-0000-4000-8000-0000000009c2', :s3, '00000000-0000-4000-8000-0000000009f3', '00000000-0000-4000-8000-0000000009d1', 'gym', :'t'::date - 30, :'t'::date - 30, :'t'::date, 2000, :'t'::date),
  ('00000000-0000-4000-8000-0000000009c3', :s3, '00000000-0000-4000-8000-0000000009f4', '00000000-0000-4000-8000-0000000009d1', 'gym', :'t'::date - 37, :'t'::date - 37, :'t'::date - 7, 2000, null),
  ('00000000-0000-4000-8000-0000000009c4', :s3, '00000000-0000-4000-8000-0000000009f5', '00000000-0000-4000-8000-0000000009d1', 'gym', :'t'::date - 20, :'t'::date - 20, :'t'::date + 10, 2000, null),
  ('00000000-0000-4000-8000-0000000009c5', :s3, '00000000-0000-4000-8000-0000000009f6', '00000000-0000-4000-8000-0000000009d1', 'gym', :'t'::date - 20, :'t'::date - 20, :'t'::date + 10, 2000, null);
insert into public.payments (studio_id, member_id, subscription_id, receipt_date, amount, mode) values
  (:s3, '00000000-0000-4000-8000-0000000009f3', '00000000-0000-4000-8000-0000000009c2', :'t'::date - 30, 1500, 'CASH'),
  (:s3, '00000000-0000-4000-8000-0000000009f4', '00000000-0000-4000-8000-0000000009c3', :'t'::date - 37, 2000, 'CASH'),
  (:s3, '00000000-0000-4000-8000-0000000009f5', '00000000-0000-4000-8000-0000000009c4', :'t'::date - 20, 2000, 'CASH'),
  (:s3, '00000000-0000-4000-8000-0000000009f6', '00000000-0000-4000-8000-0000000009c5', :'t'::date - 20, 2000, 'CASH');
select test.eq((select count(*) from public.messages where source = 'paid_balance' and studio_id = :s3)::int, 0, 'Paid Balance messages are off, as in YDL');
insert into public.attendance (studio_id, member_id, date, check_in) values
  (:s3, '00000000-0000-4000-8000-0000000009f5', :'t'::date - 10, (:'t'::date - 10) + time '07:00'),
  (:s3, '00000000-0000-4000-8000-0000000009f6', :'t'::date - 1, (:'t'::date - 1) + time '07:00');

-- The scheduled messages, each once a day --------------------------------------------------------------------
select test.eq(app.queue_scheduled(:s3, 'birthday'), 1, 'one birthday today');
select test.eq((select body from public.messages where source = 'birthday' and studio_id = :s3),
  'Dear Sita Rao, Hope your special day brings you all that your heart desire! Happy Birthday From Messages Test Branch Family.', 'YDL''s birthday wish');
select test.eq(app.queue_scheduled(:s3, 'birthday'), 0, 'running it again sends nothing new');
select test.eq(app.queue_scheduled(:s3, 'before_expiry'), 1, 'one plan ends in 3 days');
select test.eq((select body like 'Dear Sita Rao,' || E'\n' || 'Your Membership Plan (Gym 1 Month) is expiring in 3 Days (%). Renew Immediately%'
  from public.messages where source = 'before_expiry' and studio_id = :s3), true, 'before expiry says when');
select test.eq(app.queue_scheduled(:s3, 'on_expiry'), 1, 'one plan ends today');
select test.eq(app.queue_scheduled(:s3, 'after_expiry'), 1, 'one plan ended 7 days ago');
select test.eq((select body like '%has expired 7 Days ago.%' from public.messages where source = 'after_expiry' and studio_id = :s3), true, 'after expiry says 7 days');
select test.eq(app.queue_scheduled(:s3, 'balance_due'), 1, 'Mohan owes 500 and today is his payment date');
select test.eq((select body like '%A balance of Rs. 500 is due%' from public.messages where source = 'balance_due' and studio_id = :s3), true, 'the balance is in the message');
select test.eq(app.queue_scheduled(:s3, 'irregular'), 1, 'Kiran has not come for 10 days (Nina came yesterday)');
select test.eq((select string_agg(m.first_name, ',') from public.messages x join public.members m on m.id = x.member_id where x.source = 'irregular' and x.studio_id = :s3), 'Kiran', 'the irregular member is Kiran');
-- Turned off: nothing goes out.
update public.studios set settings = jsonb_set(settings, '{whatsapp}', '{"irregular": false}') where id = :s3;
delete from public.messages where source = 'irregular' and studio_id = :s3;
select test.eq(app.queue_scheduled(:s3, 'irregular'), 0, 'switched off in WhatsApp Settings, irregular messages stop');
-- The hourly run picks the kinds due at each hour (birthday at 4 AM, already sent today).
select test.eq(app.run_message_schedule(4) >= 0, true, 'the hourly run works');
select test.eq((select count(*) from public.messages where source = 'birthday' and studio_id = :s3)::int, 1, 'and does not repeat a message');

-- A balance paid later, with Paid Balance turned on --------------------------------------------------------------
update public.studios set settings = jsonb_set(settings, '{whatsapp}', '{"on_paid_balance": true}') where id = :s3;
insert into public.payments (studio_id, member_id, subscription_id, receipt_date, amount, mode) values
  (:s3, '00000000-0000-4000-8000-0000000009f3', '00000000-0000-4000-8000-0000000009c2', :'t'::date, 500, 'UPI');
select test.eq((select body like 'Dear Mohan,%We have received Rs. 500 for your Membership Plan (Gym 1 Month). Balance remaining: Rs. 0.%'
  from public.messages where source = 'paid_balance' and studio_id = :s3), true, 'a later payment sends the Paid Balance message');

-- Settings -------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000009a2', false);  -- the desk executive
select test.fails($$select public.save_message_settings('00000000-0000-4000-8000-0000000009a0', 'whatsapp', '{"birthday": false}')$$, 'permission',
  'a front desk executive without Broadcast can''t change WhatsApp settings');
select test.eq((select count(*) from public.messages where studio_id = '00000000-0000-4000-8000-0000000009a0')::int, 0, 'nor read the message history');
select test.fails($$select public.queue_messages('00000000-0000-4000-8000-0000000009a0', 'whatsapp', null, 'Hi', null, null, 'members')$$, 'permission',
  'nor send bulk messages');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000009a3', false);  -- the manager
select public.save_message_settings(:s3, 'whatsapp', '{"salutation": "Hi", "before_expiry_days": 5}');
select test.eq((select settings->'whatsapp'->>'salutation' from public.studios where id = :s3), 'Hi', 'a manager with Broadcast changes the salutation');
select test.fails($$select public.save_message_settings('00000000-0000-4000-8000-0000000009a0', 'whatsapp', '{"provider": "ultramsg"}')$$, 'Only the owner',
  'only the owner connects a WhatsApp service');
select test.fails($$select public.save_message_settings('00000000-0000-4000-8000-0000000009a0', 'whatsapp', '{"birthday_tpl": "x"}')$$, 'Unknown setting', 'unknown settings are refused');
select test.fails($$select public.save_message_settings('00000000-0000-4000-8000-0000000009a0', 'sms', '{"sender_id": "SHAAN1"}')$$, '6 letters', 'the SMS header is 6 letters');
select test.eq((select count(*) > 5 from public.messages where studio_id = :s3), true, 'the manager reads the message history');

-- Sending from the pages -------------------------------------------------------------------------------------
select test.eq((public.queue_messages(:s3, 'whatsapp', null, 'Hello {cust_first_name}, the gym is closed tomorrow.', null, null, 'members', true))->>'total', '5',
  'All Members counts the five members');
select public.queue_messages(:s3, 'whatsapp', null, 'Hello {cust_first_name}, the gym is closed tomorrow.', null, null, 'members') as r \gset
select test.eq((:'r'::jsonb)->>'queued', '5', 'a bulk WhatsApp goes to each of them');
select test.eq((select body from public.messages where source = 'bulk' and member_id = '00000000-0000-4000-8000-0000000009f6'), 'Hello Nina, the gym is closed tomorrow.',
  'the first name is filled in');
select test.eq((select total from public.message_campaigns where id = ((:'r'::jsonb)->>'campaign_id')::uuid), 5, 'and it is kept as a campaign');
select test.fails($$select public.queue_messages('00000000-0000-4000-8000-0000000009a0', 'email', array['00000000-0000-4000-8000-0000000009f2']::uuid[], 'Hi')$$, 'subject',
  'an email needs a subject');
select test.eq((public.queue_messages(:s3, 'email', array['00000000-0000-4000-8000-0000000009f2', '00000000-0000-4000-8000-0000000009f3']::uuid[], 'Hi {cust_first_name}', 'Offer'))->>'skipped', '1',
  'clients without an email are skipped');
select test.fails($$select public.queue_messages('00000000-0000-4000-8000-0000000009a0', 'sms', array['00000000-0000-4000-8000-0000000009f2']::uuid[], 'Hi')$$, 'DLT template',
  'an SMS needs its DLT template');
select test.fails($$select public.send_test_message('00000000-0000-4000-8000-0000000009a0', 'whatsapp', '12345', 'Test')$$, 'country code', 'a test needs a full number');
select test.eq(public.send_test_message(:s3, 'whatsapp', '+91 98480 22222', 'Test') is not null, true, 'a test message is queued');
-- Resending.
reset role;
update public.messages set status = 'failed', error = 'WhatsApp not connected', attempts = 1 where studio_id = :s3 and source = 'birthday';
set role authenticated;
select test.eq(public.resend_messages(:s3, 'whatsapp', 'failed'), 1, 'Resend All Failed queues the failed one again');
select test.eq((select status from public.messages where studio_id = :s3 and source = 'birthday'), 'queued', 'it is waiting again');
select test.eq(((public.message_stats(:s3, 'whatsapp'))->>'today_total')::int > 5, true, 'today''s counts');

-- App notifications to a group ---------------------------------------------------------------------------------
select test.eq(public.notify_group(:s3, 'enquiry', null, 'x', 'y', true), 2, 'All Enquires counts the two enquiries');
select test.eq(public.notify_group(:s3, 'female', null, 'Ladies batch', 'A new ladies batch starts on Monday.'), 3, 'All Female Members: Sita, Lata and Nina');
select test.eq(public.notify_group(:s3, 'expired_membership', null, 'x', 'y', true), 1, 'Expired Membership: Lata');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000009a4', false);  -- the coach
select test.fails($$select public.notify_group('00000000-0000-4000-8000-0000000009a0', 'members', null, 'x', 'y')$$, 'permission', 'a coach can''t send notifications');
select test.eq((select count(*) from public.messages where studio_id = '00000000-0000-4000-8000-0000000009a0')::int, 0, 'nor read messages');

-- The member reads and clears her notifications ------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.members set user_id = '10000000-0000-4000-8000-0000000009b1' where id = '00000000-0000-4000-8000-0000000009f2';
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000009b1', false);
select test.eq((select count(*) from public.notifications where read_at is null)::int, 1, 'Sita has one unread notification');
select test.eq(public.mark_notifications_read(), 1, 'she reads it');
select test.eq((select count(*) from public.notifications where read_at is null)::int, 0, 'nothing unread');
reset role;
select set_config('request.jwt.claim.sub', '', false);

select 'all messaging tests passed';
