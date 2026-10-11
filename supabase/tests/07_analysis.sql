-- Database tests: the analysis reports (YDL replica part 6).
-- A separate branch with a small, known set of clients, bills, receipts, check-ins, follow-ups and
-- expenses, so every number below can be worked out by hand. Dates are relative to the branch's today.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s2 '''00000000-0000-4000-8000-0000000000e0'''
\set owner '''00000000-0000-4000-8000-0000000000e1'''
\set desk '''00000000-0000-4000-8000-0000000000e2'''
\set coach '''00000000-0000-4000-8000-0000000000e3'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug, capacity) values (:s2, 'Analysis Test Branch', 'analysis-test', 20);
insert into auth.users (id) values ('10000000-0000-4000-8000-0000000000e1'), ('10000000-0000-4000-8000-0000000000e2'), ('10000000-0000-4000-8000-0000000000e3');
insert into public.staff (id, studio_id, user_id, role, first_name, access_type, employee_type) values
  (:owner, :s2, '10000000-0000-4000-8000-0000000000e1', 'owner', 'Owner', 'owner', null),
  (:desk, :s2, '10000000-0000-4000-8000-0000000000e2', 'front_desk', 'Desk', 'front_desk_exec', null),
  (:coach, :s2, '10000000-0000-4000-8000-0000000000e3', 'coach', 'Coach', null, 'Personal Trainer');
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price) values
  ('00000000-0000-4000-8000-0000000000d1', :s2, 'Gym 1 Month', 'gym', 1, 'months', 1000),
  ('00000000-0000-4000-8000-0000000000d2', :s2, 'PT 1 Month', 'pt', 1, 'months', 5000);
select app.today(:s2) as t \gset

-- Clients ---------------------------------------------------------------------------------------------
-- Asha: enquired 5 days ago (Instagram), joined today.   Bala: member, gym ended 11 days ago, PT from today.
-- Chitra: gym ended 71 days ago, never came back.        Gita: gym 35 days ago, renewed 5 days ago.
-- Hari: walked in and joined today (spot conversion).    Dev, Esha, Farhan: enquiries (expected, not interested, on trial).
insert into public.members (id, studio_id, kind, first_name, phone, gender, date_of_birth, level, source_promotion, city, enquiry_date, joined_on, added_by, lead_status, convertibility) values
  ('00000000-0000-4000-8000-0000000000f1', :s2, 'enquiry', 'Asha', '8000000001', 'female', :'t'::date - interval '20 years', 'Beginner', 'Instagram', 'kakinada', :'t'::date - 5, null, :desk, 'open', null),
  ('00000000-0000-4000-8000-0000000000f2', :s2, 'member', 'Bala', '8000000002', 'male', :'t'::date - interval '30 years', 'Advanced', null, null, :'t'::date - 40, :'t'::date - 40, null, 'open', null),
  ('00000000-0000-4000-8000-0000000000f3', :s2, 'member', 'Chitra', '8000000003', 'female', null, null, null, null, :'t'::date - 100, :'t'::date - 100, null, 'open', null),
  ('00000000-0000-4000-8000-0000000000f4', :s2, 'member', 'Gita', '8000000004', 'female', null, null, '', null, :'t'::date - 35, :'t'::date - 35, null, 'open', null),
  ('00000000-0000-4000-8000-0000000000f5', :s2, 'enquiry', 'Hari', '8000000005', 'male', :'t'::date - interval '40 years', null, 'Walk In', null, :'t'::date, null, :desk, 'open', null),
  ('00000000-0000-4000-8000-0000000000f6', :s2, 'enquiry', 'Dev', '8000000006', 'male', null, null, null, null, :'t'::date, null, :owner, 'open', 'Expected'),
  ('00000000-0000-4000-8000-0000000000f7', :s2, 'enquiry', 'Esha', '8000000007', 'female', null, null, null, null, :'t'::date - 3, null, :desk, 'not_interested', null),
  ('00000000-0000-4000-8000-0000000000f8', :s2, 'enquiry', 'Farhan', '8000000008', 'male', null, null, null, null, :'t'::date - 20, null, :owner, 'open', null);

-- Follow-ups (before the bills, so they count as "follow-ups before joining") ----------------------------
insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status) values
  (:s2, '00000000-0000-4000-8000-0000000000f1', 'Enquiry', ((:'t'::date - 4) + time '11:00') at time zone 'Asia/Kolkata', :owner, 'successful'),
  (:s2, '00000000-0000-4000-8000-0000000000f1', 'Enquiry', ((:'t'::date - 2) + time '11:00') at time zone 'Asia/Kolkata', :owner, 'done'),
  (:s2, '00000000-0000-4000-8000-0000000000f6', 'Enquiry', (:'t'::date + time '18:00') at time zone 'Asia/Kolkata', :desk, 'open'),
  (:s2, '00000000-0000-4000-8000-0000000000f7', 'Enquiry', ((:'t'::date - 3) + time '11:00') at time zone 'Asia/Kolkata', :desk, 'not_interested'),
  (:s2, '00000000-0000-4000-8000-0000000000f2', 'Balance due', ((:'t'::date + 1) + time '11:00') at time zone 'Asia/Kolkata', :owner, 'open');

-- Bills and receipts -------------------------------------------------------------------------------------
insert into public.subscriptions (id, studio_id, member_id, plan_id, kind, invoice_date, start_date, base_end_date, selling_price, trainer_id, balance_due_date) values
  ('00000000-0000-4000-8000-00000000c001', :s2, '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date - 100, :'t'::date - 100, :'t'::date - 71, 1000, null, null),
  ('00000000-0000-4000-8000-00000000c002', :s2, '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date - 40, :'t'::date - 40, :'t'::date - 11, 800, null, null),
  ('00000000-0000-4000-8000-00000000c003', :s2, '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date - 35, :'t'::date - 35, :'t'::date - 6, 1000, null, null),
  ('00000000-0000-4000-8000-00000000c004', :s2, '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date - 5, :'t'::date - 5, :'t'::date + 24, 1200, null, null),
  ('00000000-0000-4000-8000-00000000c005', :s2, '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date, :'t'::date, :'t'::date + 29, 1000, null, null),
  ('00000000-0000-4000-8000-00000000c006', :s2, '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000d2', 'pt', :'t'::date, :'t'::date, :'t'::date + 29, 5000, :coach, :'t'::date + 10),
  ('00000000-0000-4000-8000-00000000c007', :s2, '00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-0000000000d1', 'gym', :'t'::date, :'t'::date, :'t'::date + 29, 1000, null, null),
  ('00000000-0000-4000-8000-00000000c008', :s2, '00000000-0000-4000-8000-0000000000f8', '00000000-0000-4000-8000-0000000000d1', 'trial', :'t'::date - 2, :'t'::date - 2, :'t'::date + 1, 0, null, null);
insert into public.payments (studio_id, member_id, subscription_id, receipt_date, amount, mode, bill_rep_id) values
  (:s2, '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-00000000c001', :'t'::date - 100, 1000, 'CASH', null),
  (:s2, '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000c002', :'t'::date - 40, 800, 'UPI', null),
  (:s2, '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-00000000c003', :'t'::date - 35, 1000, 'CASH', null),
  (:s2, '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-00000000c004', :'t'::date - 5, 1200, 'ONLINE', null),
  (:s2, '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000c005', :'t'::date, 1000, 'CASH', null),
  (:s2, '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000c006', :'t'::date, 3000, 'UPI', :coach),
  (:s2, '00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-00000000c007', :'t'::date, 1000, 'CASH', null);
select test.eq((select string_agg(first_name || ':' || s.kind || ':' || s.is_renewal::text, ' ' order by first_name, s.start_date)
  from public.subscriptions s join public.members m on m.id = s.member_id where s.studio_id = :s2 and s.kind in ('gym', 'pt')),
  'Asha:gym:false Bala:gym:false Bala:pt:false Chitra:gym:false Gita:gym:false Gita:gym:true Hari:gym:false', 'bills know new from renewal');
select test.eq((select string_agg(first_name, ',' order by first_name) from public.members where studio_id = :s2 and kind = 'member'),
  'Asha,Bala,Chitra,Gita,Hari', 'joining turns Asha and Hari into members; Farhan''s trial doesn''t');

-- Check-ins: Asha in now (07:00), Bala yesterday evening and the day before at 1 PM, Gita 20 days ago at 6 AM.
insert into public.attendance (studio_id, member_id, date, check_in, check_out) values
  (:s2, '00000000-0000-4000-8000-0000000000f1', :'t'::date, (:'t'::date + time '07:00') at time zone 'Asia/Kolkata', null),
  (:s2, '00000000-0000-4000-8000-0000000000f2', :'t'::date - 1, ((:'t'::date - 1) + time '18:30') at time zone 'Asia/Kolkata', ((:'t'::date - 1) + time '19:30') at time zone 'Asia/Kolkata'),
  (:s2, '00000000-0000-4000-8000-0000000000f2', :'t'::date - 2, ((:'t'::date - 2) + time '13:00') at time zone 'Asia/Kolkata', ((:'t'::date - 2) + time '14:00') at time zone 'Asia/Kolkata'),
  (:s2, '00000000-0000-4000-8000-0000000000f4', :'t'::date - 20, ((:'t'::date - 20) + time '06:00') at time zone 'Asia/Kolkata', ((:'t'::date - 20) + time '07:00') at time zone 'Asia/Kolkata');

-- Expenses, all today: a vendor bill, rent with no vendor, a salary typed by hand, and the coach's payroll.
insert into public.vendors (id, studio_id, name, contact_name) values ('00000000-0000-4000-8000-0000000000d9', :s2, 'Power Co', 'Ravi');
insert into public.expenses (studio_id, title, vendor_id, category, expense_date, payment_type, amount, final_amount) values
  (:s2, 'Power bill', '00000000-0000-4000-8000-0000000000d9', 'Electricity Bills', :'t'::date, 'CASH', 2000, 2000),
  (:s2, 'Rent', null, 'Rent', :'t'::date, 'NEFT', 10000, 10000),
  (:s2, 'Helper salary', null, 'Salary', :'t'::date, 'CASH', 5000, 5000);
insert into public.payroll_entries (studio_id, staff_id, from_date, to_date, paid_date, payable) values
  (:s2, :coach, :'t'::date - 30, :'t'::date - 1, :'t'::date, 8000);
-- The coach's PT target this month: 4,000 then 10,000.
insert into public.staff_targets (studio_id, staff_id, year, month, target_type, commission_type, tiers) values
  (:s2, :coach, extract(year from :'t'::date), extract(month from :'t'::date), 'pt', 'percentage', '[{"target": 4000, "commission": 10}, {"target": 10000, "commission": 20}]');

-- Who may look -------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000e2', false);   -- front desk executive
select test.eq((public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) ->> 'range_total')::int, 4, 'front desk sees Traffic Analysis (YDL gives it)');
select test.eq((public.analysis_enquiry_stages(:s2) -> 'enquiries' ->> 'total')::int, 3, 'and Enquiry FollowUp Stage Analysis');
select test.eq((public.analysis_daily_collection(:s2, extract(year from :'t'::date)::int, extract(month from :'t'::date)::int) -> 'summary' ->> 'open_enquiries')::int, 2, 'and Daily Collection Analysis');
select test.fails($$select public.analysis_collection('00000000-0000-4000-8000-0000000000e0', current_date - 30, current_date)$$, 'have access to Collection Analysis', 'but not Collection Analysis (owner only)');
select test.fails($$select public.analysis_expenses('00000000-0000-4000-8000-0000000000e0', 2026)$$, 'have access', 'nor expenses');
select test.fails($$select public.analysis_profit_loss('00000000-0000-4000-8000-0000000000e0', 2026)$$, 'have access', 'nor profit and loss');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000e3', false);   -- coach
select test.fails($$select public.analysis_traffic('00000000-0000-4000-8000-0000000000e0', current_date - 30, current_date)$$, 'have access', 'coaches don''t see the analysis pages');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);   -- the other branch's owner
select test.fails($$select public.analysis_members('00000000-0000-4000-8000-0000000000e0', 2026)$$, 'have access', 'an owner of another branch can''t read this one');
reset role;
update public.studios set settings = jsonb_set(settings, '{access_control}',
  app.default_access_control() || '{"nav_off": {"front_desk_exec": ["Traffic Analysis"]}}'::jsonb) where id = :s2;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000e2', false);
select test.fails($$select public.analysis_traffic('00000000-0000-4000-8000-0000000000e0', current_date - 30, current_date)$$, 'have access to Traffic Analysis',
  'when the owner hides a page from an employee type, its numbers are hidden too');
select test.eq((public.analysis_follow_ups(:s2, :'t'::date - 30, :'t'::date) -> 'status' ->> 'total')::int, 4, 'other pages stay open');

-- The owner's numbers ---------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000e1', false);

-- 1. Traffic
select test.eq(public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) -> 'present', '{"total": 1, "male": 0, "female": 1, "other": 0}'::jsonb, 'present now: Asha');
select test.eq((select format('%s/%s/%s/%s/%s', r->>'range_total', r->>'range_unique', r->>'all_total', r->>'days', jsonb_array_length(r->'daily'))
  from public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) r), '4/3/4/31/31', 'traffic: 4 check-ins by 3 people over 31 days');
select test.eq(public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) -> 'parts', '{"morning": 2, "afternoon": 1, "evening": 1, "late_night": 0}'::jsonb, 'parts of the day (India time)');
select test.eq(public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) -> 'gender', '{"male": 2, "female": 2, "other": 0, "unknown": 0}'::jsonb, 'traffic by gender');
select test.eq((select string_agg((a->>'label') || '=' || (a->>'total') || '/' || (a->>'male') || '/' || (a->>'female'), ' ')
  from jsonb_array_elements(public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) -> 'ages') a), '18-24=1/0/1 25-34=2/2/0 35-44=0/0/0 45-54=0/0/0 55-64=0/0/0', 'traffic by age group');
select test.eq((select string_agg((a->>'label') || '=' || (a->>'total'), ' ') from jsonb_array_elements(public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date) -> 'levels') a),
  'Beginner=1 Intermediate=0 Advanced=2', 'traffic by level');
select test.eq((public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date, '{male}') ->> 'range_total')::int, 2, 'gender filter');
select test.eq((public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date, '{}', '{18-24}') ->> 'range_total')::int, 1, 'age filter');
select test.eq((public.analysis_traffic(:s2, :'t'::date - 30, :'t'::date, '{}', '{}', '{Advanced}') ->> 'range_total')::int, 2, 'level filter');
select test.eq((select count(*) from jsonb_array_elements(public.analysis_traffic(:s2, :'t'::date, :'t'::date) -> 'week') w where (w->>'date')::date = :'t'::date and (w->>'total')::int = 1)::int,
  1, 'this week has today''s check-in');

-- 2. Members
select test.eq((select format('%s %s %s %s', r->'members', r->'live', r->'bounced', r->>'new_30') from public.analysis_members(:s2, extract(year from :'t'::date)::int) r),
  '{"male": 2, "other": 0, "total": 5, "female": 3} {"male": 2, "other": 0, "total": 4, "female": 2} {"d7": 0, "d15": 0, "d30": 0, "over30": 1} 2',
  'members: 5, live 4, Chitra bounced 71 days ago, 2 joined in the last 30 days');
select test.eq((select format('%s/%s/%s', r->'status'->'active'->>'total', r->'status'->'inactive'->>'total', r->'status'->'never'->>'total')
  from public.analysis_members(:s2, 2026) r), '2/1/2', 'checking in regularly 2 (last 14 days), inactive 1, never 2');
select test.eq((select (m->>'new_active')::int >= 2 from public.analysis_members(:s2, extract(year from :'t'::date)::int) r, jsonb_array_elements(r->'months') m
  where (m->>'month')::int = extract(month from :'t'::date)), true, 'Asha and Hari are new active members this month');

-- 3. Enquiry stages
select test.eq((select format('%s %s %s %s', r->'enquiries'->>'total', r->'stages'->'followup'->>'total', r->'stages'->'trial'->>'total', r->'stages'->'expected'->>'total')
  from public.analysis_enquiry_stages(:s2) r), '3 0 1 1', 'enquiries: Farhan on trial, Dev expected');
select test.eq((select format('%s/%s', r->>'not_interested', r->>'new_30') from public.analysis_enquiry_stages(:s2) r), '1/3', 'one not interested; three new');

-- 4. Collection
select test.eq(public.analysis_collection(:s2, :'t'::date - 60, :'t'::date) -> 'services',
  '{"gym_new": 3800, "gym_renewal": 1200, "pt_new": 3000, "pt_renewal": 0, "other": 0, "total": 8000, "receipts": 6}'::jsonb, 'collections by service, new and renewal');
select test.eq((select string_agg((m->>'label') || '=' || (m->>'amount'), ' ') from jsonb_array_elements(public.analysis_collection(:s2, :'t'::date - 60, :'t'::date) -> 'modes') m),
  'UPI=3800.00 CASH=3000.00 ONLINE=1200.00', 'by mode of payment');
select test.eq((select string_agg((m->>'label') || '=' || (m->>'amount'), ' ') from jsonb_array_elements(public.analysis_collection(:s2, :'t'::date - 60, :'t'::date) -> 'promotion') m),
  'Unknown=6000.00 Instagram=1000.00 Walk In=1000.00', 'by source of promotion (blank counts as Unknown)');
select test.eq((public.analysis_collection(:s2, :'t'::date - 60, :'t'::date, :desk) -> 'services' ->> 'total')::numeric, 2000::numeric, 'This v/s That: one client rep');

-- 5. Subscriptions
select test.eq((select string_agg(format('%s:%s/%s/%s/%s %s/%s/%s', p->>'name', p->>'subscriptions', p->>'active', p->>'pending', p->>'inactive', p->>'billing', p->>'received', p->>'balance'), ' | ')
  from jsonb_array_elements(public.analysis_subscriptions(:s2, 2026, :'t'::date - 60, :'t'::date) -> 'plans') p),
  'Gym 1 Month:6/4/0/2 5000.00/5000.00/0.00 | PT 1 Month:1/1/0/0 5000.00/3000.00/2000.00', 'plan insights by invoice date (Farhan''s trial included, like YDL''s Free Trial row)');
select test.eq((select (p->>'subscriptions')::int from jsonb_array_elements(public.analysis_subscriptions(:s2, 2026, :'t'::date - 60, :'t'::date, null, 'female') -> 'plans') p
  where p->>'name' = 'Gym 1 Month'), 3, 'gender filter');
select test.eq((select sum((m->>'total')::int) from jsonb_array_elements(public.analysis_subscriptions(:s2, extract(year from :'t'::date)::int) -> 'months') m)::int,
  (select count(*) from public.subscriptions where studio_id = :s2 and kind in ('gym', 'pt') and extract(year from invoice_date) = extract(year from :'t'::date))::int,
  'the year''s monthly counts add up to its gym and PT bills');

-- 6. Follow-ups
select test.eq(public.analysis_follow_ups(:s2, :'t'::date - 30, :'t'::date) -> 'status',
  '{"open": 1, "successful": 1, "not_interested": 1, "done": 1, "total": 4}'::jsonb, 'follow-ups by status (due date in range)');
select test.eq((public.analysis_follow_ups(:s2, :'t'::date - 30, :'t'::date + 1) -> 'types' ->> 'balance_due')::int, 1, 'and by type');
select test.eq((select string_agg((s->>'name') || '=' || (s->>'total'), ' ' order by s->>'name') from jsonb_array_elements(public.analysis_follow_ups(:s2, :'t'::date - 30, :'t'::date) -> 'staff') s),
  'Desk=2 Owner=2', 'and by staff');
select test.eq((public.analysis_follow_ups(:s2, :'t'::date - 30, :'t'::date, :desk) -> 'status' ->> 'total')::int, 2, 'assigned-to filter');

-- 7. Conversion
select test.eq((select format('%s %s/%s %s', r->>'total', r->>'male', r->>'female', r->'followups') from public.analysis_conversion_compare(:s2, :'t'::date - 60, :'t'::date) r),
  '5 3/2 {"b0_1": 4, "b2_5": 1, "b6_10": 0, "over10": 0}', 'conversions: 5 new bills; Asha had 2 follow-ups first');
select test.eq((select string_agg((s->>'label') || '=' || (s->>'n'), ' ') from jsonb_array_elements(public.analysis_conversion_compare(:s2, :'t'::date - 60, :'t'::date) -> 'sources') s),
  'Unknown=3 Instagram=1 Walk In=1', 'conversions by source');
select test.eq((select sum((m->'overall'->>'n')::int) from jsonb_array_elements(public.analysis_conversion(:s2, extract(year from :'t'::date)::int) -> 'months') m)::int,
  (select count(*) from public.subscriptions where studio_id = :s2 and kind in ('gym', 'pt') and not is_renewal and extract(year from invoice_date) = extract(year from :'t'::date))::int,
  'monthly conversions add up');
select test.eq(public.analysis_conversion(:s2, 2026) -> 'ratio', '{"enquiries": 5, "converted": 2}'::jsonb, 'overall enquiry-to-member ratio');

-- 8. Enquiries
select test.eq((select format('%s/%s/%s %s %s', r->>'total', r->>'open', r->>'not_interested', r->'bounced', r->>'new_30') from public.analysis_enquiries(:s2, 2026) r),
  '3/2/1 {"d15_30": 1, "d30_60": 0, "d60_90": 0, "over90": 0} 5', 'enquiries now; Farhan untouched for 20 days; five added in 30 days');
select test.eq((select format('%s %s/%s converted %s', r->>'total', r->>'male', r->>'female', r->>'converted') from public.analysis_enquiry_compare(:s2, :'t'::date - 30, :'t'::date) r),
  '5 3/2 converted 2', 'This v/s That: enquiries added');
select test.eq((select string_agg((s->>'label') || '=' || (s->>'n'), ' ') from jsonb_array_elements(public.analysis_enquiry_compare(:s2, :'t'::date - 30, :'t'::date) -> 'locations') s),
  'Not given=4 Kakinada=1', 'enquiry locations');
select test.eq((public.analysis_enquiry_compare(:s2, :'t'::date - 30, :'t'::date, :desk) ->> 'total')::int, 3, 'staff filter');

-- 9. Enquiry conversion report
select test.eq((select format('%s: %s enq, %s conv, %s units (gym %s = %s), sale %s, received %s', s->>'name', s->>'enquiries', s->>'conversions', s->>'units', s->>'gym_units', s->>'gym_amount', s->>'sale', s->>'received')
  from jsonb_array_elements(public.analysis_enquiry_conversion(:s2, :'t'::date - 30, :'t'::date)) s where s->>'name' = 'Desk'),
  'Desk: 3 enq, 2 conv, 2 units (gym 2 = 2000.00), sale 2000.00, received 2000.00', 'per staff: enquiries, conversions and bills as client rep');

-- 10. Expenses
select test.eq((select format('%s %s %s | trainer %s staff %s unlinked %s | %s | %s', r->>'salary', r->>'vendor', r->>'total', r->>'trainer', r->>'staff', r->>'unlinked', r->'trainer_types', r->>'non_registered')
  from public.analysis_expense_compare(:s2, :'t'::date - 30, :'t'::date) r),
  '13000.00 12000.00 25000.00 | trainer 8000.00 staff 0 unlinked 5000.00 | [{"label": "Personal Trainer", "amount": 8000.00}] | 10000.00',
  'salary (payroll + typed) v/s vendor expenses; trainer salaries by type; rent with no vendor');
select test.eq((select string_agg((v->>'label') || '=' || (v->>'amount'), ' ') from jsonb_array_elements(public.analysis_expense_compare(:s2, :'t'::date - 30, :'t'::date) -> 'vendors') v),
  'Power Co=2000.00', 'vendor-wise');
select test.eq((select (m->>'amount')::numeric from jsonb_array_elements(public.analysis_expenses(:s2, extract(year from :'t'::date)::int) -> 'months') m where (m->>'month')::int = extract(month from :'t'::date)),
  25000::numeric, 'this month''s expenses');

-- 11. Profit and loss
select test.eq((select (r->'totals'->>'profit')::numeric from public.analysis_profit_loss(:s2, extract(year from :'t'::date)::int) r),
  (select sum(amount) from public.payments where studio_id = :s2 and extract(year from receipt_date) = extract(year from :'t'::date)) - 25000, 'profit = collection - expenses');

-- 12 and 13. Billing and Sales Leaderboard
select test.eq((select format('%s %s %s', r->'services'->>'total', r->>'billing', r->>'balance') from public.analysis_billing(:s2, :'t'::date - 60, :'t'::date) r),
  '8000.00 10000.00 2000.00', 'billing: collected, billed and still due');
select test.eq((select string_agg(format('%s:%s new %s ren %s', p->>'name', p->>'subscriptions', p->>'new', p->>'renewal'), ' | ') from jsonb_array_elements(public.analysis_billing(:s2, :'t'::date - 60, :'t'::date) -> 'plans') p),
  'Gym 1 Month:6 new 5 ren 1 | PT 1 Month:1 new 1 ren 0', 'plans (trials count as bills here, like YDL)');
select test.eq((select format('%s pt_new=%s highest=%s pct=%s', b->>'name', b->>'pt_new', b->>'highest', b->>'pct') from jsonb_array_elements(public.analysis_billing(:s2, :'t'::date - 60, :'t'::date) -> 'bill_rep') b
  where b->>'name' = 'Coach'), 'Coach pt_new=3000.00 highest=10000 pct=30.0', 'bill rep with the highest target and % achieved');
select test.eq((public.analysis_billing(:s2, :'t'::date - 60, :'t'::date, '{"mode": "upi"}') -> 'services' ->> 'total')::numeric, 3800::numeric, 'payment mode filter');
select test.eq((select format('%s achieved %s tier %s', t->>'name', t->>'achieved', t->>'tier_reached') from jsonb_array_elements(public.analysis_billing(:s2, :'t'::date - 60, :'t'::date) -> 'targets') t),
  'Coach achieved 5000.00 tier 1', 'target analysis');

-- 14. Daily collection
select test.eq((select format('enq %s billing %s received %s spot %s gym-new %s pt-new %s', d->>'enquiries', d->>'billing', d->>'received', d->'spot', d->>'conv_gym', d->>'conv_pt')
  from jsonb_array_elements(public.analysis_daily_collection(:s2, extract(year from :'t'::date)::int, extract(month from :'t'::date)::int) -> 'days') d where (d->>'d')::date = :'t'::date),
  'enq 2 billing 7000.00 received 5000.00 spot {"n": 1, "amount": 1000.00} gym-new 2 pt-new 1', 'today''s row: Hari joined on the spot');
select test.eq((public.analysis_daily_collection(:s2, extract(year from :'t'::date)::int, extract(month from :'t'::date)::int, null, :coach) -> 'summary' ->> 'received')::numeric, 3000::numeric, 'bill rep filter');

-- 15. PT
select test.eq((select format('%s/%s/%s new %s %s', r->>'total', r->>'active', r->>'inactive', r->>'new_30', (select string_agg((t->>'name') || '=' || (t->>'total') || '/' || (t->>'active'), ' ') from jsonb_array_elements(r->'trainers') t))
  from public.analysis_pt(:s2) r), '1/1/0 new 1 Coach=1/1', 'PT subscriptions and trainers');

-- 16. Leaderboard
select test.eq((select format('%s sales %s pt_new %s', b->>'name', b->>'sales', b->>'pt_new') from public.analysis_leaderboard(:s2, extract(year from :'t'::date)::int, extract(month from :'t'::date)::int) r, jsonb_array_elements(r->'board') b),
  'Coach sales 5000.00 pt_new 5000.00', 'trainer sales this month (bills as trainer or bill rep)');

-- 17. Revenue forecast
select test.eq((select sum((m->'renewal'->>'amount')::numeric) from jsonb_array_elements(public.analysis_revenue_forecast(:s2) -> 'months') m),
  8200 + case when :'t'::date - 11 >= date_trunc('month', :'t'::date)::date then 800 else 0 end::numeric, 'renewals due: Asha, Bala PT, Gita, Hari (and Bala''s gym if it ended this month)');
select test.eq((select sum((m->'balance'->>'amount')::numeric) from jsonb_array_elements(public.analysis_revenue_forecast(:s2) -> 'months') m), 2000::numeric, 'balance due');
select test.eq((select sum((m->'renewal'->>'amount')::numeric) from jsonb_array_elements(public.analysis_revenue_forecast(:s2, (select id from public.services where studio_id = :s2 and name = 'Cardio')) -> 'months') m),
  0::numeric, 'category filter (no plan is in Cardio)');

-- 18. Lead sources
select test.eq((select string_agg(format('%s %s/%s/%s spot %s fu %s conv %s %s%% %s/%s', r->>'source', r->>'total', r->>'open', r->>'not_interested', r->>'spot', r->>'followup', r->>'conversions', r->>'pct', r->>'base_price', r->>'sale_price'), ' | ')
  from jsonb_array_elements(public.analysis_lead_sources(:s2, :'t'::date - 30, :'t'::date) -> 'rows') r),
  'Unknown 3/2/1 spot 0 fu 0 conv 0 0.00% 0/0 | Instagram 1/0/0 spot 0 fu 1 conv 1 100.00% 1000.00/1000.00 | Walk In 1/0/0 spot 1 fu 0 conv 1 100.00% 1000.00/1000.00',
  'lead sources: spot and follow-up conversions with prices');
select test.eq((public.analysis_lead_sources(:s2, :'t'::date - 30, :'t'::date) -> 'total' ->> 'pct')::numeric, 40.00::numeric, 'overall conversion %');

-- 19. Branch
select test.eq((select format('%s open %s today %s/%s collected %s', b->>'name', b->>'open_enquiries', b->>'enquiries_today', b->>'collection_today', b->>'collection')
  from jsonb_array_elements(public.analysis_branches(:s2, :'t'::date - 60, :'t'::date)) b), 'Analysis Test Branch open 2 today 2/5000.00 collected 8000.00', 'branch row');
reset role;
select 'all analysis tests passed';
