-- Database tests: staff and trainer accounts, access control, leave, targets, payroll,
-- transformations, coupons and combo offers (YDL Staff, Trainers, Payroll, Coupon, Combo Offer).
-- Runs after 03_classes.sql on the same database.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
create temp table t_m (k text primary key, id uuid);
grant all on t_m to authenticated;

-- Front desk executive (Krupa) follows YDL's access control ------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.eq((public.my_access(:studio)->'rights'->'coupons') is null, true, 'a front desk executive has no coupon rights by default (as in YDL)');
select test.eq((public.my_access(:studio)->>'owner')::boolean, false, 'my_access tells the app what the person may do');
select test.fails($$insert into public.coupons (studio_id, name, code, type, discount) values ('00000000-0000-4000-8000-000000000001'::uuid, 'X', 'XX10', 'flat', 10)$$,
  'row-level security', 'front desk executive can''t create coupons');
select test.fails($$insert into public.plans (studio_id, name, kind, tenure_value, tenure_unit, price) values ('00000000-0000-4000-8000-000000000001'::uuid, 'X', 'gym', 1, 'months', 100)$$,
  'row-level security', 'front desk executive can''t create plans');
select test.fails($$insert into public.staff (studio_id, role, first_name, phone, access_type) values ('00000000-0000-4000-8000-000000000001'::uuid, 'front_desk', 'New', '9000000501', 'sales')$$,
  'permission to add staff accounts', 'front desk executive can''t add staff accounts');
select test.fails($$insert into public.staff (studio_id, role, first_name, phone) values ('00000000-0000-4000-8000-000000000001'::uuid, 'owner', 'Boss', '9000000502')$$,
  'Only the owner', 'nobody but the owner adds owners');
with x as (insert into public.staff (studio_id, role, first_name, last_name, phone, email, employee_type)
  values (:studio, 'coach', 'Teja', 'Kumar', '9000000503', 'teja@example.com', 'Personal Trainer') returning id) insert into t_m select 'newcoach', id from x;
select test.eq((select staff_code from public.staff where id = (select id from t_m where k = 'newcoach')) like 'TT-%', true, 'front desk adds a trainer (YDL: Trainer › Add)');
select test.fails($$update public.staff set permissions = permissions || '{"allow_discounting": true}' where id = '00000000-0000-4000-8000-0000000000c4'$$,
  'own access', 'nobody changes their own access');
insert into t_m select 'kc', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Hari', 'phone', '9000000504', 'gender', 'male',
  'added_by', '00000000-0000-4000-8000-0000000000c4'));
insert into t_m select 'ksub', (public.sell_subscriptions(jsonb_build_object('member_id', (select id from t_m where k = 'kc'),
  'items', jsonb_build_array(jsonb_build_object('plan_id', '00000000-0000-4000-8000-0000000000b1', 'start_date', app.today(:studio)::text)),
  'balance_due_date', (app.today(:studio) + 3)::text)))[1];
select test.fails($$select public.transfer_subscription(jsonb_build_object('subscription_id', (select id from t_m where k = 'ksub'),
  'to_member_id', (select id from public.members where phone = '9000000103'), 'start_date', app.today('00000000-0000-4000-8000-000000000001'::uuid)::text))$$,
  'permission to transfer', 'front desk executive can''t transfer (YDL default)');
select test.fails($$select public.extend_subscription(jsonb_build_object('subscription_id', (select id from t_m where k = 'ksub'), 'days', 2))$$,
  'permission to extend', 'front desk executive can''t extend (YDL default)');
reset role;

-- Owner turns off direct freezing for front desk executives: freezes become requests ------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select test.fails($$select public.save_access_control('00000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb)$$, 'Only the owner', 'only the owner changes access control');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.save_access_control(:studio, jsonb_set(app.access_control(:studio), '{front_desk_exec,allow_freeze}', '[]'::jsonb));
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.fails($$select public.freeze_subscription(jsonb_build_object('subscription_id', (select id from t_m where k = 'ksub'), 'days', 3, 'fee', 100, 'mode', 'CASH'))$$,
  'can''t take a fee', 'a freeze request has no fee');
insert into t_m select 'freq', public.freeze_subscription(jsonb_build_object('subscription_id', (select id from t_m where k = 'ksub'), 'days', 3));
select test.eq((select status from public.freezes where id = (select id from t_m where k = 'freq')), 'requested', 'without Allow Freeze the freeze is a request');
select test.eq((select frozen_days from public.subscriptions where id = (select id from t_m where k = 'ksub')), 0, 'a request doesn''t move the end date yet');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.decide_request('freeze', (select id from t_m where k = 'freq'), true);
select test.eq((select frozen_days from public.subscriptions where id = (select id from t_m where k = 'ksub')), 3, 'the owner approves and the freeze applies');
select public.save_access_control(:studio, app.default_access_control());

-- Leave requests -------------------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
with x as (insert into public.leave_requests (studio_id, staff_id, start_date, end_date, mode, reason)
  values (:studio, '00000000-0000-4000-8000-0000000000c2', app.today(:studio) + 2, app.today(:studio) + 3, 'full', 'Family function') returning id) insert into t_m select 'leave', id from x;
select test.eq((select days from public.leave_requests where id = (select id from t_m where k = 'leave')), 2.0, 'a trainer asks for two days of leave');
select test.fails($$insert into public.leave_requests (studio_id, staff_id, start_date, end_date) values ('00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-0000000000c1', current_date, current_date)$$, 'row-level security', 'a trainer asks leave only for himself');
select test.fails($$select public.decide_leave(array[(select id from t_m where k = 'leave')], 'approved', true)$$, 'permission to decide leave', 'a trainer can''t approve leave');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.decide_leave(array[(select id from t_m where k = 'leave')], 'approved', true);
select test.eq((select status || '/' || paid::text || '/' || decided_by_name from public.leave_overview where id = (select id from t_m where k = 'leave')),
  'approved/true/Gangada Pavithra', 'the manager approves it as paid leave');

-- Targets ---------------------------------------------------------------------------------------------
with x as (insert into public.staff_targets (studio_id, staff_id, year, month, target_type, commission_type, tiers)
  values (:studio, '00000000-0000-4000-8000-0000000000c1', extract(year from app.today(:studio))::int, extract(month from app.today(:studio))::int, 'both', 'flat',
          '[{"target": 1, "commission": 100}, {"target": 100000000, "commission": 900}]') returning id) insert into t_m select 'target', id from x;
select test.eq((select achieved = (select sum(net_amount) from public.subscriptions s where (s.bill_rep_id = '00000000-0000-4000-8000-0000000000c1' or s.trainer_id = '00000000-0000-4000-8000-0000000000c1')
    and s.deleted_at is null and s.cancelled_at is null and s.kind in ('gym', 'pt') and date_trunc('month', s.invoice_date) = date_trunc('month', app.today(:studio)))
  from public.target_overview where id = (select id from t_m where k = 'target')), true, 'target achievement counts the month''s sales by bill rep or trainer');
select test.eq((select tier_reached || '/' || commission_earned from public.target_overview where id = (select id from t_m where k = 'target')), '1/100',
  'the slab reached gives its commission');
reset role;

-- Payroll ---------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.fails($$select * from public.payroll_calculate('00000000-0000-4000-8000-000000000001'::uuid, date_trunc('month', current_date)::date, current_date)$$,
  'payroll calculator', 'front desk executive has no payroll access (YDL default)');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
insert into public.staff_payroll (staff_id, studio_id, basic_pay, pay_per, deduct_for_absent, late_penalty)
values ('00000000-0000-4000-8000-0000000000c2', :studio, 31000, 'month', true, 50)
on conflict (staff_id) do update set basic_pay = excluded.basic_pay, deduct_for_absent = true, late_penalty = 50;
create temp table t_pay as select * from public.payroll_calculate(:studio, date_trunc('month', app.today(:studio))::date,
  (date_trunc('month', app.today(:studio)) + interval '1 month - 1 day')::date);
select test.eq((select present_days >= 1 and paid_leaves = 0 and basic_salary = 31000 from t_pay where staff_id = '00000000-0000-4000-8000-0000000000c2'), true,
  'payroll counts the trainer''s days present');
select test.eq((select payable = basic_salary + pt_commission + sales_commission - deduction and deduction >= 0 from t_pay where staff_id = '00000000-0000-4000-8000-0000000000c2'), true,
  'payable salary = basic + commissions - deductions');
select test.eq((select sales_commission from t_pay where staff_id = '00000000-0000-4000-8000-0000000000c1'), 100::numeric, 'target commission shows in payroll');
select test.eq(public.add_payroll(:studio, jsonb_build_object('from_date', date_trunc('month', app.today(:studio))::date, 'to_date', app.today(:studio),
  'paid_date', app.today(:studio), 'mode', 'NEFT', 'as_expense', true,
  'rows', (select jsonb_agg(to_jsonb(t) || '{"bonus": 0}') from t_pay t where staff_id = '00000000-0000-4000-8000-0000000000c2'))), 1, 'added to the payroll register');
select test.eq((select e.category from public.payroll_entries p join public.expenses e on e.id = p.expense_id where p.staff_id = '00000000-0000-4000-8000-0000000000c2'), 'Salary',
  'and recorded as a Salary expense');
select test.fails($$insert into public.payroll_entries (studio_id, staff_id, from_date, to_date, paid_date) values ('00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-0000000000c2', current_date, current_date, current_date)$$, 'permission denied', 'payroll entries are added only through the calculator');

-- Transformations (clients' consent required) ---------------------------------------------------------
select test.fails($$insert into public.transformations (studio_id, client_name, period_value, title, description)
  values ('00000000-0000-4000-8000-000000000001'::uuid, 'R', 3, 'Fat loss', 'Lost 8 kg')$$, 'consent', 'a transformation needs the client''s consent');
insert into public.transformations (studio_id, client_name, period_value, period_unit, trainer_id, title, description, consent)
values (:studio, 'Ravi T.', 3, 'months', '00000000-0000-4000-8000-0000000000c2', 'Fat loss', 'Lost 8 kg', true);
select test.eq((select trainer_name from public.transformation_overview where title = 'Fat loss'), 'Varun Yadav', 'transformation with its trainer');

-- Manual staff time; login linking; delete & migrate ---------------------------------------------------
select public.staff_add_time('00000000-0000-4000-8000-0000000000c1', now() - interval '9 hours', now() - interval '1 hour');
select test.eq((select count(*) from public.staff_attendance where staff_id = '00000000-0000-4000-8000-0000000000c1')::int >= 1, true, 'manual check-in and check-out time');
select test.fails($$select public.staff_add_time('00000000-0000-4000-8000-0000000000c1', now(), now() - interval '1 hour')$$, 'before check in', 'check out can''t be before check in');
reset role;
insert into auth.users (id, phone, email) values ('10000000-0000-4000-8000-000000000010', null, 'late@example.com');
insert into public.staff (id, studio_id, role, first_name, email) values ('00000000-0000-4000-8000-0000000000c9', :studio, 'front_desk', 'Late', 'LATE@example.com');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq(public.link_staff_login('00000000-0000-4000-8000-0000000000c9'), true, 'a login made before the staff record is linked by email');
update public.batches set trainer_ids = array['00000000-0000-4000-8000-0000000000c2']::uuid[] where name = '8:30 AM Semi-Private';
select public.delete_staff('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a2');
select test.eq((select trainer_ids from public.batches where name = '8:30 AM Semi-Private'), array['00000000-0000-4000-8000-0000000000a2']::uuid[], 'delete & migrate moves batches');
select test.eq((select count(*) from public.members where trainer_id = '00000000-0000-4000-8000-0000000000c2')::int, 0, 'and clients');
select test.eq((select active::text || '/' || (deleted_at is not null)::text || '/' || (user_id is null)::text from public.staff where id = '00000000-0000-4000-8000-0000000000c2'),
  'false/true/true', 'the trainer is kept as deleted, without a login');
select test.fails($$select public.delete_staff('00000000-0000-4000-8000-0000000000a1', null)$$, 'owner', 'the owner can''t delete himself');
reset role;

-- Combo offers ------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
insert into public.combo_offers (studio_id, name, plan_ids, plan_prices) values (:studio, 'Couple Combo', array['00000000-0000-4000-8000-0000000000b1']::uuid[],
  '{"00000000-0000-4000-8000-0000000000b1": 3999}');
select test.eq((select (plan_prices->>'00000000-0000-4000-8000-0000000000b1')::numeric from public.combo_offers where name = 'Couple Combo'), 3999::numeric,
  'a manager makes a combo offer with its own selling price');
reset role;
select 'all team tests passed';
