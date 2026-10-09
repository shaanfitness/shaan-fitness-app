-- Database tests: Fitness Center and App Settings (YDL replica part 5).
-- Runs after 05_site.sql on the same database.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
reset role;

-- Every studio starts with each settings section --------------------------------------------------------
select test.eq((select settings->'center'->>'dashboard_design' from public.studios where id = :studio), 'H', 'Fitness Center Settings start with YDL''s values');
select test.eq((select (settings->'app'->>'can_sign_up')::boolean from public.studios where id = :studio), true, 'App On/Off settings start with YDL''s values');
select test.eq((select jsonb_array_length(settings->'measurements') from public.studios where id = :studio), 82, 'all 82 YDL measurements are listed');
select test.eq((select count(*) from jsonb_array_elements((select settings->'measurements' from public.studios where id = :studio)) m where (m->>'on')::boolean)::int,
  30, 'the 30 YDL turns on are on');

-- Front desk executive (Krupa): YDL gives Fitness Center edit/view ---------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select public.save_center_info(:studio, '{"tag_line": "Your Trusted Health Partner", "capacity": 20, "mobile": "9963547869"}');
select test.eq((select tag_line || '/' || capacity from public.studios where id = :studio), 'Your Trusted Health Partner/20', 'front desk edits the fitness center basics');
select test.fails($$select public.save_center_info('00000000-0000-4000-8000-000000000001', '{"name": "  "}')$$, 'fitness center name', 'the name is required');
select test.fails($$select public.save_center_info('00000000-0000-4000-8000-000000000001', '{"street1": "Road 1", "street2": "", "locality": "X", "city": "K", "state": "AP", "country": "India", "pincode": "533003"}')$$,
  'address field', 'every address field marked * is required');
select public.save_center_info(:studio, jsonb_build_object('street1', 'Dr No. 3-17-32/9/FF', 'street2', 'RTO Office Road', 'locality', 'Godari Gunta',
  'landmark', 'Near D-Mart', 'city', 'Kakinada', 'state', 'Andhra Pradesh', 'country', 'India', 'pincode', '533003'));
select test.eq((select locality || '/' || branch_name || '/' || landmark from public.studios where id = :studio), 'Godari Gunta/Godari Gunta/Near D-Mart', 'the address is saved');
select public.save_center_info(:studio, jsonb_build_object('service_ids', (select jsonb_agg(id) from public.services where studio_id = :studio and name in ('Weight Training', 'Cardio'))));
select test.eq((select count(*) from public.services where studio_id = :studio and active)::int, 2, 'fitness center categories turn services on and off');
select public.save_center_info(:studio, jsonb_build_object('service_ids', (select jsonb_agg(id) from public.services where studio_id = :studio and sort < 12)));
select public.save_studio_section(:studio, 'center', '{"freeze_membership": false, "made_up_key": 1}');
select test.eq((select settings->'center'->>'freeze_membership' from public.studios where id = :studio), 'false', 'front desk saves Fitness Center Settings');
select test.eq((select settings->'center' ? 'made_up_key' from public.studios where id = :studio), false, 'unknown settings are not kept');
select test.eq((select settings->'center'->>'dashboard_design' from public.studios where id = :studio), 'H', 'other settings are untouched');
select test.fails($$select public.save_studio_section('00000000-0000-4000-8000-000000000001', 'app', '{"can_sign_up": false}')$$, 'Only the owner', 'front desk can''t change app settings');
select test.fails($$select public.save_studio_section('00000000-0000-4000-8000-000000000001', 'biometric', '{"checkout_minutes": 30}')$$, 'permission', 'a front desk executive has no biometric rights (YDL)');
select test.fails($$select public.save_studio_section('00000000-0000-4000-8000-000000000001', 'invoice', '{"width": 0}')$$, 'width', 'invoice number width is checked');
select public.save_studio_section(:studio, 'invoice', '{"prefix": "SFG/", "suffix": "/26-27", "width": 5, "start": 1}');
select test.eq((select (settings->'invoice'->>'prefix') || (settings->'invoice'->>'suffix') from public.studios where id = :studio), 'SFG//26-27', 'invoice settings are saved');
select test.fails($$select public.save_studio_section('00000000-0000-4000-8000-000000000001', 'timings', '{"days": [1], "sessions": [{"from": "13:00", "to": "05:00"}]}')$$,
  'end after', 'a session must end after it starts');
select public.save_studio_section(:studio, 'timings', '{"days": [1,2,3,4,5,6], "sessions": [{"from": "05:00", "to": "13:00", "gender": "unisex"}, {"from": "14:00", "to": "22:00", "gender": "unisex"}]}');
select test.eq((select settings->'working_days' from public.studios where id = :studio), '[1, 2, 3, 4, 5, 6]'::jsonb, 'open days become the working days');
select test.fails($$insert into public.app_banners (studio_id, name, image_url) values ('00000000-0000-4000-8000-000000000001', 'Offer', 'https://x/y.png')$$,
  'row-level security', 'banners need App Settings rights (a front desk executive has none in YDL)');
select test.eq((select count(*) from public.app_feedback_overview)::int, 0, 'front desk executive has no Feedback right (YDL)');
select test.fails($$select public.save_center_private('00000000-0000-4000-8000-000000000001', '{"company_name": "X", "support": {"email": "a@b.c"}}')$$,
  'Only the owner', 'front desk never sees or changes bank and owner details');
select test.eq((select count(*) from public.studio_private)::int, 0, 'and can''t read them');
select test.fails($$select * from public.studio_secrets$$, 'permission denied', 'nobody reads stored passwords');
select test.eq(public.studio_secret_status(:studio) is null, true, 'front desk can''t even see which passwords are set');
reset role;

-- Freeze and upgrade rules from Fitness Center Settings ------------------------------------------------------
select test.fails($$insert into public.freezes (studio_id, subscription_id, member_id, start_date, days)
  select studio_id, id, member_id, current_date + 200, 1 from public.subscriptions limit 1$$, 'switched off', '"Freeze Memberships: No" stops freezes');
update public.studios set settings = jsonb_set(settings, '{center,freeze_membership}', 'true') where id = :studio;
update public.studios set settings = jsonb_set(settings, '{center,upgrade_block_days}', '7') where id = :studio;
update public.subscriptions set start_date = current_date - 30 where id = (select id from public.subscriptions order by created_at limit 1);
select test.fails($$insert into public.subscription_changes (studio_id, kind, from_subscription_id, from_member_id)
  select studio_id, 'upgrade', id, member_id from public.subscriptions order by created_at limit 1$$, 'within 7 days', 'upgrades are blocked after the set number of days');
update public.studios set settings = jsonb_set(settings, '{center,upgrade_block_days}', '0') where id = :studio;

-- Owner: private details, secrets, app settings, currency ---------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.fails($$select public.save_center_private('00000000-0000-4000-8000-000000000001', '{"company_name": "Shaan Fitness Gym", "gst_registered": true, "support": {"email": "x@y.in"}}')$$,
  'GST number', 'GST registered needs the GST number');
select public.save_center_private(:studio, '{"company_name": "Shaan Fitness Gym", "gst_registered": true, "gst_number": "37ABCDE1234F1Z5",
  "bank": {"bank_name": "Test Bank"}, "support": {"email": "support@example.com"}}');
select test.eq((select company_name from public.studio_private where studio_id = :studio), 'Shaan Fitness Gym', 'the owner saves primary contacts');
select test.eq((select (settings->'gst'->>'enabled') || '/' || (settings->'gst'->>'number') from public.studios where id = :studio), 'true/37ABCDE1234F1Z5', 'GST goes to invoices');
select public.set_studio_secret(:studio, 'smtp_password', 'app-password-here');
select test.eq(public.studio_secret_status(:studio) ? 'smtp_password', true, 'the owner sees that the password is set');
select test.eq(public.studio_secret_status(:studio)::text like '%app-password-here%', false, 'but never the password itself');
select test.fails($$select public.set_studio_secret('00000000-0000-4000-8000-000000000001', 'other_key', 'x')$$, 'Unknown', 'only known secrets');
select public.save_studio_section(:studio, 'app', '{"can_sign_up": false, "trainer_prefix_name": "SFT"}');
select test.eq((public.site_info()->'studio'->>'can_sign_up')::boolean, false, '"Can Sign Up: No" reaches the website');
select public.save_studio_section(:studio, 'app', '{"can_sign_up": true}');
select public.save_studio_section(:studio, 'measurements', '{"items": [{"key": "trunk_fat", "on": true, "order": 99}, {"key": "nonsense", "on": true}]}');
select test.eq((select (m->>'on') || '/' || (m->>'order') from jsonb_array_elements((select settings->'measurements' from public.studios where id = :studio)) m where m->>'key' = 'trunk_fat'),
  'true/99', 'measurement settings are saved');
select test.eq((select jsonb_array_length(settings->'measurements') from public.studios where id = :studio), 82, 'unknown measurements are ignored');
select public.save_currency(:studio, 'INR', 'GST');
select test.fails($$select public.save_currency('00000000-0000-4000-8000-000000000001', 'rupees', 'GST')$$, 'currency', 'currency must be a currency code');

-- Notices, holidays, rules, equipment ------------------------------------------------------------------------
insert into public.notices (studio_id, title, description) values (:studio, 'Diwali', 'Open as usual on Diwali.');
select test.eq(public.notify_members(:studio, 'notice', (select id from public.notices where title = 'Diwali')) > 0, true, 'a notice goes to every member');
insert into public.holidays (studio_id, event_date, title, holiday_type, wish_text) values (:studio, current_date + 10, 'Sankranti', 'PUBLIC HOLIDAY', 'Happy Sankranti!');
select test.eq(public.notify_members(:studio, 'holiday', (select id from public.holidays where title = 'Sankranti')) > 0, true, 'so does a holiday wish');
insert into public.rules (studio_id, title, description) values (:studio, 'Re-rack weights', 'Put weights back after use.');
insert into public.equipment (studio_id, name, serial_number, purchase_date) values (:studio, 'Treadmill', 'TM-01', '2024-01-10');
select test.eq((select created_by is not null from public.equipment where serial_number = 'TM-01'), true, 'equipment remembers who added it');
insert into public.app_actions (studio_id, kind, name, icon, link) values (:studio, 'action', 'Browse Plans', 'browse_plans', 'SUBSCRIPTIONS');
select test.fails($$insert into public.app_actions (studio_id, kind, name, color) values ('00000000-0000-4000-8000-000000000001', 'action', 'X', 'red')$$, 'check', 'colours are hex codes');
reset role;

-- Members: see active notices and rules, send feedback -------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', false);
select test.eq((select count(*) from public.notices where title = 'Diwali')::int, 1, 'a member reads active notices');
select test.eq((select count(*) from public.notifications where title = 'Diwali')::int, 1, 'and gets the notification');
select test.eq((select count(*) from public.equipment)::int, 0, 'but not the equipment list');
select test.eq((select count(*) from public.studio_private)::int, 0, 'nor any private details');
select public.send_feedback((select id from public.members where user_id = '10000000-0000-4000-8000-000000000005' limit 1), 'Please add more dumbbells.');
select test.fails($$select public.send_feedback((select id from public.members where user_id <> '10000000-0000-4000-8000-000000000005' limit 1), 'x')$$,
  'only send feedback for yourself', 'feedback only as yourself');
select test.eq((select count(*) from public.app_feedback)::int, 1, 'a member sees her own feedback');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq((select count(*) from public.app_feedback where feedback like '%dumbbells%')::int, 1, 'the owner reads it in Feedback Listing');
reset role;
select 'all center tests passed';
