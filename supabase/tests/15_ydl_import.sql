-- Database tests: moving the data from YDL (part 9).
-- A separate branch with YDL-style numbering and every automatic WhatsApp switched on, to prove an import sends nothing.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s9 '''00000000-0000-4000-8000-000000000fa0'''
\set owner '''00000000-0000-4000-8000-000000000fa1'''
\set desk '''00000000-0000-4000-8000-000000000fa2'''
\set ravi '''00000000-0000-4000-8000-000000000fa3'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s9, 'Import Test Branch', 'import-test');
update public.studios set settings = settings
  || '{"member_code": {"prefix": "SF", "width": 4, "zero_fill": true}, "enquiry_code": {"prefix": "ENQ", "width": 4, "zero_fill": true}}'::jsonb
  || '{"invoice": {"prefix": "SFG/", "suffix": "/25-26", "width": 5, "zero_fill": true, "restart": "year"}, "receipt": {"prefix": "SFG-R/", "suffix": "/25-26", "width": 5, "zero_fill": true, "restart": "year"}}'::jsonb
  || jsonb_build_object('whatsapp', coalesce(settings->'whatsapp', '{}'::jsonb) || '{"on_enquiry": true, "on_bill": true, "on_paid_balance": true}'::jsonb)
where id = :s9;
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000fa1'), ('10000000-0000-4000-8000-000000000fa2');
insert into public.staff (id, studio_id, user_id, role, first_name, last_name, access_type, employee_type) values
  (:owner, :s9, '10000000-0000-4000-8000-000000000fa1', 'owner', 'Owner', null, 'owner', null),
  (:desk, :s9, '10000000-0000-4000-8000-000000000fa2', 'front_desk', 'Desk', null, 'front_desk_exec', null),
  (:ravi, :s9, null, 'coach', 'Ravi', 'Kumar', null, 'Personal Trainer');
insert into public.plans (id, studio_id, name, kind, tenure_value, tenure_unit, price, session_count, active) values
  ('00000000-0000-4000-8000-000000000fb1', :s9, 'Gym 1 Month', 'gym', 1, 'months', 3000, null, true),
  ('00000000-0000-4000-8000-000000000fb2', :s9, 'PT 12 Sessions', 'pt', 1, 'months', 12000, 12, false);
select app.today(:s9) as t \gset

-- Only the owner ----------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000fa2', false);   -- the desk
select test.fails($$select public.ydl_import('00000000-0000-4000-8000-000000000fa0', 'members', '[]')$$, 'Only the owner', 'the front desk can''t import');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000fa1', false);   -- the owner
select test.fails($$select public.ydl_import('00000000-0000-4000-8000-000000000fa0', 'payroll', '[]')$$, 'Unknown import', 'only the known imports');

-- Members and enquiries ------------------------------------------------------------------------------------------------------
select public.ydl_import(:s9, 'members', jsonb_build_array(
  jsonb_build_object('_line', 2, 'member_code', 'SF0101', 'name', 'Lakshmi  Devi', 'phone', '+91 98480 11111', 'gender', 'Female', 'client_rep', 'Ravi Kumar',
    'joined_on', (:'t'::date - 60)::text, 'biometric_code', '101', 'email', 'Lakshmi@Example.com'),
  jsonb_build_object('_line', 3, 'enquiry_code', 'ENQ0050', 'name', 'Kiran Kumar', 'phone', '9848022222', 'enquiry_date', (:'t'::date - 10)::text, 'source_promotion', 'Instagram'),
  jsonb_build_object('_line', 4, 'name', '', 'phone', '9848033333'),
  jsonb_build_object('_line', 5, 'name', 'Sita Devi', 'phone', '919848011111', 'member_code', 'SF0102', 'biometric_code', '9848011111', 'active', 'Inactive'))) as r \gset
select test.eq((:'r'::jsonb - 'problems')::text, '{"same": 0, "added": 3, "updated": 0}', 'three clients added');
select test.eq((:'r'::jsonb->'problems')::text, '[{"line": 4, "message": "The name is missing"}]', 'the nameless row is reported by its line');
select test.eq((select first_name || '|' || last_name || '|' || phone || '|' || gender || '|' || email || '|' || biometric_code || '|' || (added_by = :ravi)
  from public.members where member_code = 'SF0101'), 'Lakshmi|Devi|9848011111|female|lakshmi@example.com|101|true', 'names, phone, gender, email, device code and rep come over');
select test.eq((select kind || ' ' || source_promotion || ' ' || enquiry_date from public.members where enquiry_code = 'ENQ0050'), 'enquiry Instagram ' || (:'t'::date - 10), 'the enquiry stays an enquiry');
select test.eq((select coalesce(biometric_code::text, 'none') || ' ' || active from public.members where member_code = 'SF0102'), 'none false',
  'a phone number in the device-code column is dropped; inactive members stay inactive');
select test.eq((public.ydl_import(:s9, 'members', jsonb_build_array(jsonb_build_object('member_code', 'SF0101', 'name', 'Lakshmi Devi', 'phone', '9848011111', 'date_of_birth', '1990-05-01')))->>'updated')::int,
  1, 'importing again updates instead of adding');
select test.eq((select count(*) || ' ' || max(date_of_birth) from public.members where studio_id = :s9 and phone = '9848011111'), '2 1990-05-01', 'two people share the phone, no duplicates');

-- Subscriptions -----------------------------------------------------------------------------------------------------------------
select public.ydl_import(:s9, 'subscriptions', jsonb_build_array(
  jsonb_build_object('_line', 2, 'invoice_no', 'SFG/00120/25-26', 'invoice_date', (:'t'::date - 5)::text, 'member_code', 'SF0101', 'plan', 'gym 1 month',
    'start_date', (:'t'::date - 5)::text, 'end_date', (:'t'::date + 30)::text, 'net_amount', '2,542.37', 'gst_amount', '457.63', 'total_amount', '₹3,000.00', 'bill_rep', 'Ravi Kumar'),
  jsonb_build_object('_line', 3, 'invoice_no', 'SFG/00121/25-26', 'invoice_date', (:'t'::date - 3)::text, 'phone', '9848022222', 'name', 'Kiran Kumar', 'plan', 'PT 12 Sessions',
    'start_date', (:'t'::date - 3)::text, 'end_date', (:'t'::date + 27)::text, 'total_amount', '12000', 'sessions_used', '5', 'trainer', 'Ravi'),
  jsonb_build_object('_line', 4, 'invoice_no', 'SFG/00122/25-26', 'member_code', 'SF0101', 'plan', 'Zumba Annual', 'start_date', :'t'))) as r \gset
select test.eq((:'r'::jsonb->>'added')::int, 2, 'two subscriptions added');
select test.eq(:'r'::jsonb->'problems'->0->>'message', 'Plan "Zumba Annual" not found: add it (it can be inactive) under Memberships, then import again', 'an unknown plan is reported');
select test.eq((select end_date || ' ' || total_amount || ' ' || gst_amount || ' ' || (bill_rep_id = :ravi) from public.subscriptions where invoice_no = 'SFG/00120/25-26'),
  (:'t'::date + 30) || ' 3000.00 457.63 true', 'YDL''s end date and amounts are kept');
select test.eq((select m.kind || ' ' || m.member_code || ' ' || s.sessions_used || '/' || s.sessions_total || ' ' || (s.trainer_id = :ravi)
  from public.subscriptions s join public.members m on m.id = s.member_id where s.invoice_no = 'SFG/00121/25-26'),
  'member SF0103 5/12 true', 'Kiran becomes a member with the next code; 5 of 12 PT sessions used in YDL');
reset role;
select test.eq(app.next_code(:s9, 'invoice', :'t'::date), 'SFG/00122/25-26', 'our invoices carry on after YDL''s');
set role authenticated;
select test.eq((public.ydl_import(:s9, 'subscriptions', jsonb_build_array(jsonb_build_object('invoice_no', 'SFG/00120/25-26', 'member_code', 'SF0101', 'plan', 'Gym 1 Month', 'start_date', (:'t'::date - 5)::text)))->>'same')::int,
  1, 'the same invoice twice is not doubled');
select test.eq(public.record_session(jsonb_build_object('subscription_id', (select id from public.subscriptions where invoice_no = 'SFG/00121/25-26'))) is not null, true, 'a PT session is recorded here');
select test.eq((select sessions_used from public.subscriptions where invoice_no = 'SFG/00121/25-26'), 6, 'and counts on top of YDL''s 5');

-- Receipts ---------------------------------------------------------------------------------------------------------------------------
select public.ydl_import(:s9, 'receipts', jsonb_build_array(
  jsonb_build_object('receipt_no', 'SFG-R/00200/25-26', 'receipt_date', (:'t'::date - 5)::text, 'invoice_no', 'SFG/00120/25-26', 'amount', '2000', 'mode', 'upi', 'added_by', 'Ravi Kumar'),
  jsonb_build_object('receipt_no', 'SFG-R/00201/25-26', 'receipt_date', (:'t'::date - 1)::text, 'invoice_no', 'SFG/00120/25-26', 'amount', '1000', 'mode', 'Cash'),
  jsonb_build_object('receipt_no', 'SFG-R/00200/25-26', 'receipt_date', (:'t'::date - 5)::text, 'invoice_no', 'SFG/00120/25-26', 'amount', '2000'),
  jsonb_build_object('_line', 5, 'receipt_no', 'SFG-R/00202/25-26', 'receipt_date', :'t', 'invoice_no', 'SFG/09999/25-26', 'amount', '500'))) as r \gset
select test.eq((:'r'::jsonb - 'problems')::text, '{"same": 1, "added": 2, "updated": 0}', 'two receipts in, the repeat skipped');
select test.eq(:'r'::jsonb->'problems'->0->>'message', 'Invoice SFG/09999/25-26 not found: import Subscriptions first', 'a receipt for an unknown invoice is reported');
select test.eq((select string_agg(mode || ' ' || amount, ', ' order by receipt_no) from public.payments where studio_id = :s9), 'UPI 2000.00, CASH 1000.00', 'modes and amounts');
select test.eq(app.sub_balance((select id from public.subscriptions where invoice_no = 'SFG/00120/25-26')), 0.00, 'Lakshmi has paid in full');
reset role;
select test.eq(app.next_code(:s9, 'receipt', :'t'::date), 'SFG-R/00202/25-26', 'our receipts carry on after YDL''s');
set role authenticated;

-- Follow-ups, freezes, extensions, check-ins ---------------------------------------------------------------------------------------------
select test.eq((public.ydl_import(:s9, 'follow_ups', jsonb_build_array(
  jsonb_build_object('phone', '9848022222', 'name', 'Kiran Kumar', 'type', 'PT Renewal', 'due_at', (:'t'::date + 2)::text, 'assigned_to', 'Ravi Kumar', 'notes', 'Wants evening slot'),
  jsonb_build_object('phone', '9848022222', 'name', 'Kiran Kumar', 'type', 'PT Renewal', 'due_at', (:'t'::date + 2)::text)))->>'added')::int, 1, 'an open follow-up comes over once');
select test.eq((select type || ' ' || status || ' ' || (assigned_to = :ravi) from public.follow_ups where studio_id = :s9), 'PT Renewal open true', 'with its date and owner');
select test.eq((public.ydl_import(:s9, 'freezes', jsonb_build_array(
  jsonb_build_object('member_code', 'SF0101', 'plan', 'Gym 1 Month', 'start_date', (:'t'::date - 2)::text, 'days', '5', 'note', 'Travel')))->>'added')::int, 1, 'a freeze comes over');
select test.eq((select frozen_days || ' ' || end_date from public.subscriptions where invoice_no = 'SFG/00120/25-26'), '5 ' || (:'t'::date + 30), 'the freeze shows, YDL''s end date stays');
select test.eq((public.ydl_import(:s9, 'extensions', jsonb_build_array(
  jsonb_build_object('member_code', 'SF0101', 'plan', 'Gym 1 Month', 'days', '3', 'date', (:'t'::date - 1)::text)))->>'added')::int, 1, 'an extension comes over');
select test.eq((select extension_days || ' ' || end_date from public.subscriptions where invoice_no = 'SFG/00120/25-26'), '3 ' || (:'t'::date + 30), 'and the end date still stays');
select test.eq((public.ydl_import(:s9, 'attendance', jsonb_build_array(
  jsonb_build_object('phone', '9848022222', 'name', 'Kiran Kumar', 'date', (:'t'::date - 1)::text, 'check_in', '06:05', 'check_out', '07:10'),
  jsonb_build_object('phone', '9848022222', 'name', 'Kiran Kumar', 'date', (:'t'::date - 1)::text, 'check_in', '06:05'),
  jsonb_build_object('phone', '9848022222', 'name', 'Kiran Kumar', 'date', (:'t'::date + 1)::text)))->>'added')::int, 1, 'past check-ins come over once, not future ones');
select test.eq((select sessions_used from public.subscriptions where invoice_no = 'SFG/00121/25-26'), 6, 'old check-ins don''t use up PT sessions');

-- Nothing went out, nothing was flagged ---------------------------------------------------------------------------------------------------
reset role;
select test.eq((select count(*) from public.messages where studio_id = :s9)::int, 0, 'no WhatsApp went out for imported enquiries, bills or payments');
select test.eq((select count(*) from public.staff_alerts where studio_id = :s9)::int, 0, 'no staff notifications for imported history');
set role authenticated;
select test.eq((public.ydl_import_counts(:s9)->>'members')::int || ' ' || (public.ydl_import_counts(:s9)->>'collected') || ' ' || (public.ydl_import_counts(:s9)->>'balance'),
  '3 3000.00 12000.00', 'counts to compare with YDL: 3 members, ₹3,000 collected, ₹12,000 due');
select test.fails($$select public.ydl_import('00000000-0000-4000-8000-000000000fa0', 'members', (select jsonb_agg(jsonb_build_object('name', 'x' || g)) from generate_series(1, 1001) g))$$,
  'up to 1000 rows', 'big files go in parts');

-- After the move, new things work as before (the WhatsApp on a new bill goes out) -----------------------------------------------------------------
select public.ydl_import(:s9, 'members', '[]');
reset role;
insert into public.subscriptions (studio_id, member_id, plan_id, start_date, selling_price, invoice_date)
select :s9, id, '00000000-0000-4000-8000-000000000fb1', :'t', 3000, :'t' from public.members where member_code = 'SF0101';
select test.eq((select count(*) from public.messages where studio_id = :s9 and source = 'bill')::int, 1, 'a new bill after the import sends its WhatsApp');

select 'all ydl import tests passed';
