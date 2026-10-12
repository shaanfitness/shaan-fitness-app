-- Database tests: wallet, store, appointments and help videos (YDL replica part 7d).
-- A separate branch: an owner, a front desk executive, a coach and two members with the app.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s5 '''00000000-0000-4000-8000-000000000ba0'''
\set owner '''00000000-0000-4000-8000-000000000ba1'''
\set desk '''00000000-0000-4000-8000-000000000ba2'''
\set coach '''00000000-0000-4000-8000-000000000ba3'''
\set anu '''00000000-0000-4000-8000-000000000bb1'''
\set balu '''00000000-0000-4000-8000-000000000bb2'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s5, 'Store Test Branch', 'store-test');
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000ba1'), ('10000000-0000-4000-8000-000000000ba2'), ('10000000-0000-4000-8000-000000000ba3'),
  ('10000000-0000-4000-8000-000000000bb1'), ('10000000-0000-4000-8000-000000000bb2');
insert into public.staff (id, studio_id, user_id, role, first_name, last_name, access_type, employee_type) values
  (:owner, :s5, '10000000-0000-4000-8000-000000000ba1', 'owner', 'Owner', null, 'owner', null),
  (:desk, :s5, '10000000-0000-4000-8000-000000000ba2', 'front_desk', 'Devi', 'Desk', 'front_desk_exec', null),
  (:coach, :s5, '10000000-0000-4000-8000-000000000ba3', 'coach', 'Kiran', null, null, 'Personal Trainer');
insert into public.members (id, studio_id, kind, first_name, last_name, phone, gender, user_id, added_by) values
  (:anu, :s5, 'member', 'Anu', 'Reddy', '9100000201', 'female', '10000000-0000-4000-8000-000000000bb1', :desk),
  (:balu, :s5, 'member', 'Balu', 'Rao', '9100000202', 'male', '10000000-0000-4000-8000-000000000bb2', null);
select app.today(:s5) as t \gset

select test.eq((select count(*) from public.wallet_categories where studio_id = :s5 and name = 'Refer & Earn')::int, 1, 'a new gym starts with the Refer & Earn category');

-- Wallet: the owner sets up categories and activities ---------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba1', false);   -- the owner
insert into public.wallet_categories (id, studio_id, name) values ('00000000-0000-4000-8000-000000000bc1', :s5, 'Games');
select test.eq((select code like 'WC%' from public.wallet_categories where id = '00000000-0000-4000-8000-000000000bc1'), true, 'a category gets a code');
select test.fails($$insert into public.wallet_categories (studio_id, name) values ('00000000-0000-4000-8000-000000000ba0', ' games ')$$, 'duplicate', 'category names are unique');
insert into public.wallet_activities (id, studio_id, category_id, name, price, one_time, duration_hours) values
  ('00000000-0000-4000-8000-000000000bd1', :s5, '00000000-0000-4000-8000-000000000bc1', 'Badminton court', 200, false, 1),
  ('00000000-0000-4000-8000-000000000bd2', :s5, '00000000-0000-4000-8000-000000000bc1', 'Steam bath', 150, true, null),
  ('00000000-0000-4000-8000-000000000bd3', :s5, (select id from public.wallet_categories where studio_id = :s5 and name = 'Refer & Earn'), 'Referral reward', 500, true, 5);
select test.eq((select duration_hours from public.wallet_activities where id = '00000000-0000-4000-8000-000000000bd3'), null, 'a one-time activity has no duration');
select test.fails($$insert into public.wallet_activities (studio_id, category_id, name, price, one_time) values ('00000000-0000-4000-8000-000000000ba0', '00000000-0000-4000-8000-000000000bc1', 'Pool', 100, false)$$,
  'check', 'an hourly activity needs its duration');

-- The front desk can't change the setup but runs the wallet ----------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba2', false);   -- the desk
select test.fails($$insert into public.wallet_categories (studio_id, name) values ('00000000-0000-4000-8000-000000000ba0', 'Desk one')$$, 'row-level security', 'the desk can''t add categories');
select test.fails($$insert into public.wallet_transactions (member_id, source, activity_id) values ('00000000-0000-4000-8000-000000000bb1', 'activity', '00000000-0000-4000-8000-000000000bd2')$$,
  'Not enough in the wallet', 'an empty wallet can''t pay for steam');
insert into public.wallet_transactions (member_id, source, amount, payment_method) values (:anu, 'top_up', 1000, 'UPI');
insert into public.wallet_transactions (member_id, source, activity_id) values (:anu, 'reward', '00000000-0000-4000-8000-000000000bd3');
select test.eq((select balance from public.wallet_balances where member_id = :anu), 1500.00, 'top up 1000 and a 500 referral reward make 1500');
select test.eq((select client_rep from public.wallet_transactions where member_id = :anu and source = 'top_up'), :desk::uuid, 'the client''s rep goes with the entry');
insert into public.wallet_transactions (member_id, source, activity_id, started_at, ended_at)
values (:anu, 'activity', '00000000-0000-4000-8000-000000000bd1', now() - interval '90 minutes', now());
select test.eq((select amount || ' ' || minutes || ' ' || kind from public.wallet_transactions where member_id = :anu and activity_name = 'Badminton court'), '400.00 90 debit',
  '90 minutes of a 200-per-hour court costs 2 hours: 400');
insert into public.wallet_transactions (member_id, source, activity_id) values (:anu, 'activity', '00000000-0000-4000-8000-000000000bd2');
select test.eq((select balance from public.wallet_balances where member_id = :anu), 950.00, 'steam takes 150 more: 950 left');
select test.eq((select balance_after from public.wallet_transactions where member_id = :anu and activity_name = 'Steam bath'), 950.00, 'each entry keeps the balance after it');
select test.fails($$insert into public.wallet_transactions (member_id, source, activity_id) values ('00000000-0000-4000-8000-000000000bb1', 'activity', '00000000-0000-4000-8000-000000000bd1')$$,
  'start and end time', 'an hourly activity needs its times');
with x as (delete from public.wallet_transactions where member_id = :anu returning 1) select test.eq((select count(*) from x)::int, 0, 'the desk can''t remove wallet entries');

-- Owner: removing the top up would leave the wallet below zero -----------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba1', false);
select test.fails($$delete from public.wallet_transactions where member_id = '00000000-0000-4000-8000-000000000bb1' and source = 'top_up'$$, 'below zero', 'a top up already spent can''t be removed');

-- Members see their own wallet only ---------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000bb2', false);   -- Balu
select test.eq((select count(*) from public.wallet_overview)::int, 0, 'Balu doesn''t see Anu''s wallet');
select test.fails($$insert into public.wallet_transactions (member_id, source, amount) values ('00000000-0000-4000-8000-000000000bb2', 'top_up', 5000)$$, 'row-level security', 'members can''t top themselves up');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000bb1', false);   -- Anu
select test.eq((select count(*) from public.wallet_overview)::int, 4, 'Anu sees her four entries');

-- Store: the owner sets up a store, a category and products ------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba1', false);
insert into public.stores (id, studio_id, name, company_name, gst_type, packaging_charges) values ('00000000-0000-4000-8000-000000000be1', :s5, 'Fit Store', 'Fit Store', 'exclusive', 10);
select test.fails($$insert into public.stores (studio_id, name, company_name, gst_no) values ('00000000-0000-4000-8000-000000000ba0', 'Bad', 'Bad', 'not-a-gst')$$, 'check', 'a GST number has its format');
insert into public.store_categories (id, store_id, name) values ('00000000-0000-4000-8000-000000000bf1', '00000000-0000-4000-8000-000000000be1', 'Supplements');
insert into public.products (id, store_id, category_id, name, price, gst_percent, stock) values
  ('00000000-0000-4000-8000-000000000bf2', '00000000-0000-4000-8000-000000000be1', '00000000-0000-4000-8000-000000000bf1', 'Whey 1 kg', 2000, 18, 3),
  ('00000000-0000-4000-8000-000000000bf3', '00000000-0000-4000-8000-000000000be1', null, 'Shaker', 250, 0, null);
select test.eq((select studio_id from public.products where id = '00000000-0000-4000-8000-000000000bf2'), :s5::uuid, 'products take the store''s gym');

-- The desk orders for Balu and takes the money ------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba2', false);
select test.fails($$insert into public.products (store_id, name, price) values ('00000000-0000-4000-8000-000000000be1', 'Desk product', 1)$$, 'row-level security', 'the desk can''t add products');
create temp table t_o (k text, id uuid);
grant all on t_o to authenticated;
insert into t_o select 'desk', public.place_store_order(jsonb_build_object('store_id', '00000000-0000-4000-8000-000000000be1', 'member_id', :balu,
  'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-4000-8000-000000000bf2', 'qty', 1), jsonb_build_object('product_id', '00000000-0000-4000-8000-000000000bf3', 'qty', 2)),
  'received', 2860, 'payment_type', 'upi'));
select test.eq((select subtotal || ' ' || gst_amount || ' ' || total || ' ' || payment_status || ' ' || status from public.store_orders where id = (select id from t_o where k = 'desk')),
  '2500.00 360.00 2870.00 pending confirmed', 'exclusive GST 18% on whey (360) plus 10 packing: 2870; 2860 received is still pending');
select test.eq((select stock from public.products where id = '00000000-0000-4000-8000-000000000bf2'), 2, 'the stock goes down');
select public.update_order_payment((select id from t_o where k = 'desk'), 2860, 2860, null);
select test.eq((select payment_status || ' ' || balance from public.store_orders where id = (select id from t_o where k = 'desk')), 'paid 0.00', 'a 10 rupee discount makes it paid');
select test.fails($$select public.place_store_order(jsonb_build_object('store_id', '00000000-0000-4000-8000-000000000be1', 'member_id', '00000000-0000-4000-8000-000000000bb2',
  'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-4000-8000-000000000bf2', 'qty', 5))))$$, 'Only 2 of Whey 1 kg left', 'no selling more than the stock');
with x as (update public.store_orders set total = 1 returning 1) select test.eq((select count(*) from x)::int, 0, 'nobody edits an order''s total directly');

-- Anu orders from the app; she can't set what she paid --------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000bb1', false);
insert into t_o select 'anu', public.place_store_order(jsonb_build_object('store_id', '00000000-0000-4000-8000-000000000be1', 'member_id', :balu, 'received', 99999,
  'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-4000-8000-000000000bf2', 'qty', 1), jsonb_build_object('product_id', '00000000-0000-4000-8000-000000000bf2', 'qty', 1))));
select test.eq((select member_id || ' ' || received || ' ' || status || ' ' || placed_by_member from public.store_orders where id = (select id from t_o where k = 'anu')),
  :anu || ' 0.00 pending true', 'the order is Anu''s own, nothing received, waiting for the gym');
select test.eq((select stock from public.products where id = '00000000-0000-4000-8000-000000000bf2'), 0, 'her two tubs take the last of the stock');
select test.eq((select count(*) from public.store_order_overview)::int, 1, 'Anu sees only her order');
select test.eq((select count(*) from public.store_order_items)::int, 2, 'and its items');
select public.cancel_my_order((select id from t_o where k = 'anu'));
select test.eq((select stock from public.products where id = '00000000-0000-4000-8000-000000000bf2'), 2, 'cancelling puts both tubs back');
select test.fails($$select public.set_order_status(array[(select id from t_o where k = 'desk')], 'collected')$$, 'Only owner and front desk', 'members can''t change the gym''s orders');

-- The desk: statuses and the notification ----------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba2', false);
select test.eq(public.set_order_status(array[(select id from t_o where k = 'desk')], 'collected'), 1, 'the desk marks the order collected');
select test.eq((select count(*) from public.notifications where member_id = :balu and title like 'Order ORD%')::int, 1, 'Balu hears about it');
select test.fails($$select public.set_order_status(array[(select id from t_o where k = 'anu')], 'confirmed')$$, 'is cancelled', 'a cancelled order stays cancelled');
select test.eq((select string_agg(status || ':' || total, ',' order by status) from public.store_order_counts('00000000-0000-4000-8000-000000000be1')),
  'cancelled:1,collected:1,confirmed:0,pending:0', 'the store page counts orders by status');

select test.fails($$select public.refund_order((select id from t_o where k = 'desk'), true)$$, 'Cancel the order first', 'only cancelled orders are refunded');
select test.eq(public.set_order_status(array[(select id from t_o where k = 'desk')], 'cancelled'), 1, 'the desk cancels the paid order');
select test.eq(public.refund_order((select id from t_o where k = 'desk'), true), 2860.00, 'and refunds the 2860 to Balu''s wallet');
select test.eq((select balance from public.wallet_balances where member_id = :balu), 2860.00, 'his wallet has it');
select test.eq((select received || ' ' || payment_status from public.store_orders where id = (select id from t_o where k = 'desk')), '0.00 cancelled', 'the order shows nothing received');
select test.fails($$select public.refund_order((select id from t_o where k = 'desk'), false)$$, 'Nothing was received', 'no refunding twice');

-- Appointments --------------------------------------------------------------------------------------------------------------------------
create temp table t_a (k text, id uuid);
grant all on t_a to authenticated;
insert into t_a select 'desk', public.save_appointment(jsonb_build_object('studio_id', :s5, 'purpose', 'Diet Consultation', 'comments', 'Bring reports',
  'appointment_date', (:'t'::date + 1)::text, 'start_time', '10:00', 'end_time', '10:30', 'member_id', :anu, 'handled_by', :coach, 'room_no', '2'));
select test.eq((select title || ' / ' || purpose || ' / ' || comments || ' / ' || status from public.appointment_overview where id = (select id from t_a where k = 'desk')),
  'Diet Consultation / Diet Consultation / Bring reports / open', 'an appointment by purpose takes it as its title');
select test.eq((select count(*) from public.notifications where member_id = :anu and title = 'Appointment booked')::int, 1, 'Anu is told');
select public.save_appointment(jsonb_build_object('id', (select id from t_a where k = 'desk'), 'status', 'rescheduled', 'appointment_date', (:'t'::date + 2)::text));
select test.eq((select count(*) from public.notifications where member_id = :anu and title = 'Appointment changed')::int, 1, 'a new day is told too');
select test.eq((select title from public.appointments where id = (select id from t_a where k = 'desk')), 'Diet Consultation', 'and the title stays');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000bb1', false);   -- Anu asks for one
insert into t_a select 'anu', public.request_appointment(jsonb_build_object('purpose', 'BMI Check', 'appointment_date', (:'t'::date + 3)::text, 'start_time', '18:00', 'comments', 'After work'));
select test.eq((select status || ' ' || end_time || ' ' || requested_by_member from public.appointments where id = (select id from t_a where k = 'anu')), 'wait_list 18:30:00 true',
  'her request waits on the list, half an hour long');
select test.fails($$select public.request_appointment(jsonb_build_object('purpose', 'BMI Check', 'appointment_date', (app.today('00000000-0000-4000-8000-000000000ba0') - 1)::text, 'start_time', '18:00'))$$,
  'from today on', 'not in the past');
select public.cancel_my_appointment((select id from t_a where k = 'anu'));
select test.eq((select status from public.appointments where id = (select id from t_a where k = 'anu')), 'cancelled', 'she can cancel her own');
select test.eq((select count(*) from public.appointment_overview)::int, 2, 'and sees only her own two');

-- Help videos ------------------------------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba1', false);
insert into public.help_videos (studio_id, title, url, audience) values (:s5, 'How to log a workout', 'https://www.youtube.com/watch?v=abc', 'members'),
  (:s5, 'Taking a payment', 'https://www.youtube.com/watch?v=def', 'staff');
select test.fails($$insert into public.help_videos (studio_id, title, url) values ('00000000-0000-4000-8000-000000000ba0', 'Bad', 'http://x')$$, 'check', 'video links are https');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000bb1', false);
select test.eq((select string_agg(title, ',') from public.help_videos), 'How to log a workout', 'members see the members'' videos only');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ba3', false);
select test.eq((select count(*) from public.help_videos)::int, 2, 'staff see both');
select test.fails($$insert into public.help_videos (studio_id, title, url) values ('00000000-0000-4000-8000-000000000ba0', 'Coach', 'https://x')$$, 'row-level security', 'only the owner adds videos');

reset role;
select 'all store and wallet tests passed';
