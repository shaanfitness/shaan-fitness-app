-- Database tests: selling, receipts and membership actions (YDL member profile and Payments Details).
-- Runs after 01_access_rules.sql on the same database.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''

-- Front desk (Gangada) adds two clients and sells the group plan with a part payment --------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
create temp table t_ids (k text primary key, id uuid);
insert into t_ids select 'rahul', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Rahul', 'last_name', 'Varma',
  'phone', '9000000101', 'gender', 'male'));
insert into t_ids select 'sita', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Sita', 'phone', '9000000102', 'gender', 'female'));
select test.eq((select kind from public.members where id = (select id from t_ids where k = 'rahul')), 'enquiry', 'a new client starts as an enquiry (YDL "Member Status: New Enquiry")');

select test.fails($$select public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_ids where k = 'rahul'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', (select id from public.plans where tier = 'group'))),
  'paid_amount', 1000, 'mode', 'UPI'))$$, 'next balance due date', 'a part payment needs the next balance due date');

insert into t_ids select 'sub1', (public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_ids where k = 'rahul'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', (select id from public.plans where tier = 'group'), 'start_date', app.today(:studio)::text)),
  'batch_ids', (select jsonb_agg(id) from public.batches where name = '7:00 AM Group'),
  'paid_amount', 1000, 'mode', 'UPI', 'balance_due_date', (app.today(:studio) + 7)::text)))[1];
select test.eq((select kind from public.members where id = (select id from t_ids where k = 'rahul')), 'member', 'selling a plan turns the enquiry into a member');
select test.eq((select invoice_no is not null from public.subscriptions where id = (select id from t_ids where k = 'sub1')), true, 'the bill gets an invoice number');
select test.eq((select paid_amount from public.subscription_overview where id = (select id from t_ids where k = 'sub1'))::numeric, 1000::numeric, 'the first receipt is recorded');
select test.eq((select balance_amount = total_amount - 1000 from public.subscription_overview where id = (select id from t_ids where k = 'sub1')), true, 'the rest is the balance');
select test.eq((select count(*) from public.follow_ups where subscription_id = (select id from t_ids where k = 'sub1') and type = 'Balance due' and status = 'open')::int, 1,
  'a "Balance due" follow-up is scheduled, like YDL');
select test.eq((select expected_date from public.follow_ups where subscription_id = (select id from t_ids where k = 'sub1') and status = 'open'), app.today(:studio) + 7,
  'the follow-up is on the next balance due date');
select test.eq((select count(*) from public.batch_members where member_id = (select id from t_ids where k = 'rahul'))::int, 1, 'the chosen batch is assigned');

select test.fails($$select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'amount', 999999, 'mode', 'CASH'))$$,
  'more than the balance', 'a receipt can''t be more than the balance');
select test.fails($$select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'amount', 100, 'status', 'write_off'))$$,
  'Only the owner can write off', 'front desk cannot write off');
select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'),
  'amount', (select balance_amount from public.subscription_overview where id = (select id from t_ids where k = 'sub1')), 'mode', 'CASH', 'reference', 'Counter'));
select test.eq((select payment_status from public.subscription_overview where id = (select id from t_ids where k = 'sub1')), 'paid', 'the balance is paid');
select test.eq((select count(*) from public.follow_ups where subscription_id = (select id from t_ids where k = 'sub1') and type = 'Balance due' and status = 'open')::int, 0,
  'the balance follow-up closes when paid');

-- Freeze and extension with fees -----------------------------------------------------------------
select public.freeze_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'days', 4, 'fee', 200, 'mode', 'CASH', 'note', 'Exams'));
select test.eq((select frozen_days from public.subscriptions where id = (select id from t_ids where k = 'sub1')), 4, 'freeze adds days');
select test.eq((select count(*) from public.payments where subscription_id = (select id from t_ids where k = 'sub1') and purpose = 'freeze_fee')::int, 1, 'freeze fee gets a receipt');
select test.fails($$select public.freeze_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'days', 2))$$,
  'overlaps', 'two freezes cannot overlap');
select public.extend_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'days', 3, 'note', 'Goodwill'));
select test.eq((select extension_days from public.subscriptions where id = (select id from t_ids where k = 'sub1')), 3, 'extension adds days');

-- Edit Subscription ------------------------------------------------------------------------------
select public.edit_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'),
  'end_date', ((select end_date from public.subscriptions where id = (select id from t_ids where k = 'sub1')) + 2)::text,
  'second_trainer_ids', jsonb_build_array('00000000-0000-4000-8000-0000000000c2')));
select test.eq((select base_end_date - start_date from public.subscriptions where id = (select id from t_ids where k = 'sub1')),
  (select app.plan_end_date(start_date, tenure_value, tenure_unit) - start_date + 2 from public.subscription_overview o join public.plans p on p.id = o.plan_id
   where o.id = (select id from t_ids where k = 'sub1')), 'editing the end date keeps freezes and extensions on top');
select test.fails($$select public.edit_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'invoice_no', 'X-1'))$$,
  'Only the owner', 'front desk cannot change invoice numbers');

-- Upgrade: the new bill is the difference -----------------------------------------------------------
insert into t_ids select 'sub2', public.upgrade_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'),
  'plan_id', (select id from public.plans where tier = 'elite')));
select test.eq((select status from public.subscriptions where id = (select id from t_ids where k = 'sub1')), 'upgraded', 'the old subscription is marked upgraded');
select test.eq((select selling_price from public.subscriptions where id = (select id from t_ids where k = 'sub2')),
  (select total_price from public.plans where tier = 'elite') - (select app.subscription_paid((select id from t_ids where k = 'sub1'))),
  'the upgrade bill is the new price less what was paid');
select test.eq((select start_date from public.subscriptions where id = (select id from t_ids where k = 'sub2')),
  (select start_date from public.subscriptions where id = (select id from t_ids where k = 'sub1')), 'an upgrade keeps the start date');
select test.fails($$select public.freeze_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub1'), 'days', 2))$$,
  'already upgraded', 'an upgraded subscription takes no more actions');

-- Downgrade: refund recorded for the register ---------------------------------------------------------
select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub2'),
  'amount', (select balance_amount from public.subscription_overview where id = (select id from t_ids where k = 'sub2')), 'mode', 'CASH'));
insert into t_ids select 'sub3', public.downgrade_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub2'),
  'plan_id', (select id from public.plans where tier = 'group'), 'selling_price', 0, 'note', 'Moved shifts'));
select test.eq((select refund_amount > 0 from public.subscription_changes where kind = 'downgrade' and to_subscription_id = (select id from t_ids where k = 'sub3')), true,
  'downgrade records the refund amount');

-- Transfer the rest to another client -------------------------------------------------------------------
insert into t_ids select 'sub4', public.transfer_subscription(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub3'),
  'to_member_id', (select id from t_ids where k = 'sita'), 'fee', 300, 'mode', 'UPI'));
select test.eq((select member_id from public.subscriptions where id = (select id from t_ids where k = 'sub4')), (select id from t_ids where k = 'sita'), 'transfer moves the plan to the other client');
select test.eq((select status from public.subscriptions where id = (select id from t_ids where k = 'sub3')), 'transferred', 'the original is marked transferred');
select test.eq((select kind from public.members where id = (select id from t_ids where k = 'sita')), 'member', 'the receiving client becomes a member');

-- Personal training needs a trainer; front desk without discount rights can't change prices -------------
select test.fails($$select public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_ids where k = 'sita'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', (select id from public.plans where tier = 'elite')))))$$,
  'Assign a trainer', 'a PT plan needs a trainer');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Kiran', 'phone', '9000000103', 'gender', 'male',
  'added_by', '00000000-0000-4000-8000-0000000000c4'));
select test.fails($$select public.sell_subscriptions(jsonb_build_object('member_id', (select id from public.members where phone = '9000000103'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', (select id from public.plans where tier = 'group'), 'selling_price', 100))))$$,
  'not allowed to change the price', 'staff without discount rights cannot change prices');
reset role;

-- Owner: coupons, cancel, delete, write-off, edit bill amount ------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
insert into public.coupons (studio_id, name, code, type, discount, who_can_use) values (:studio, 'Diwali', 'DIWALI500', 'flat', 500, 'both');
select test.eq((select (public.check_coupon(:studio, 'diwali500', (select id from public.plans where tier = 'group'), (select id from t_ids where k = 'sita'), 4000)->>'discount')::numeric),
  500::numeric, 'a coupon code works in any letter case');
insert into t_ids select 'sub5', (public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_ids where k = 'sita'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', (select id from public.plans where tier = 'group'), 'coupon_code', 'DIWALI500', 'sign_up_fee', 250)))))[1];
select test.eq((select total_amount from public.subscriptions where id = (select id from t_ids where k = 'sub5')),
  (select total_price + 250 - 500 from public.plans where tier = 'group'), 'bill = price + sign-up fee - coupon');
select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub5'), 'amount', 1000, 'mode', 'CASH',
  'next_due_date', (app.today(:studio) + 3)::text));
select public.record_payment(jsonb_build_object('subscription_id', (select id from t_ids where k = 'sub5'), 'amount', 100, 'status', 'write_off',
  'next_due_date', (app.today(:studio) + 3)::text));
select test.eq((select written_off_amount from public.subscription_overview where id = (select id from t_ids where k = 'sub5'))::numeric, 100::numeric, 'owner writes off part of a balance');
select public.edit_bill_amount((select id from t_ids where k = 'sub5'), 3000);
select test.eq((select paid_amount from public.subscription_overview where id = (select id from t_ids where k = 'sub5'))::numeric, 0::numeric, 'editing the bill amount cancels its receipts (YDL warning)');
select public.cancel_subscription((select id from t_ids where k = 'sub5'), 'Changed mind');
select test.eq((select state from public.subscription_overview where id = (select id from t_ids where k = 'sub5')), 'cancelled', 'owner cancels a subscription');
select public.delete_subscription((select id from t_ids where k = 'sub4'), 'Duplicate');
select test.eq((select state from public.subscription_overview where id = (select id from t_ids where k = 'sub4')), 'deleted', 'owner deletes a subscription');
reset role;

-- Front desk: cancel is owner-only; medical history, notifications, check-in ---------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select test.fails($$select public.cancel_subscription((select id from t_ids where k = 'sub2'), 'x')$$, 'Only the owner', 'front desk cannot cancel');
select public.save_medical((select id from t_ids where k = 'rahul'), '{"heart_problem": false, "asthma": true}'::jsonb, 'Inhaler in bag');
select test.eq((select (answers->>'asthma')::boolean from public.member_medical where member_id = (select id from t_ids where k = 'rahul')), true, 'front desk fills the medical history');
select test.fails($$insert into public.member_medical (member_id, studio_id) values ((select id from t_ids where k = 'sita'), '00000000-0000-4000-8000-000000000001')$$,
  'permission denied', 'medical history only changes through save_medical');
select test.eq(public.send_notification(array[(select id from t_ids where k = 'rahul'), (select id from t_ids where k = 'sita')], 'Holiday', 'Closed on Sunday'), 2, 'notifications go to each client');
select public.check_in_client((select id from t_ids where k = 'rahul'));
select test.eq((select checked_in_now from public.member_overview where id = (select id from t_ids where k = 'rahul')), true, 'check in from the profile');
select test.fails($$select public.check_in_client((select id from t_ids where k = 'rahul'))$$, 'already checked in', 'no double check-in');
select public.check_in_client((select id from t_ids where k = 'rahul'), true);
select test.eq((select checked_in_now from public.member_overview where id = (select id from t_ids where k = 'rahul')), false, 'check out');
select test.eq((select count(*) from public.referral_overview)::int >= 0, true, 'referral list opens');
reset role;

-- Coach: no access to money actions ----------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select test.fails($$select public.record_payment(jsonb_build_object('subscription_id', (select id from public.subscriptions limit 1), 'amount', 1))$$,
  'not found', 'coach cannot take payments');
select test.eq((select count(*) from public.notifications)::int, 0, 'coach does not see notifications');
reset role;

select 'all billing tests passed';
