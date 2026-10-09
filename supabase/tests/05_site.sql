-- Database tests: the public website summary, joining from the website, verified-only logins,
-- moving a login to the right client, and requests from the member app.
-- Runs after 04_team.sql on the same database.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
reset role;
create temp table t_s (k text primary key, id uuid);
grant all on t_s to authenticated, anon;

-- The website is open to everyone, and shows nothing personal ---------------------------------------------
set role anon;
select test.eq((public.site_info()->'studio'->>'name'), 'Shaan Fitness', 'anyone can read the website summary');
select test.eq(jsonb_array_length(public.site_info()->'plans') > 0, true, 'the website lists plans shown in the app');
select test.eq(jsonb_array_length(public.site_info()->'batches') > 0, true, 'and batch timings');
select test.eq(jsonb_array_length(public.site_info()->'trainers') > 0, true, 'and coaches');
select test.eq(public.site_info()::text like '%9000000%', false, 'no member or staff mobile number reaches the website');
select test.eq(public.site_info()::text like '%@example.com%', false, 'no member or staff email reaches the website');
select test.eq(public.site_info()::text ~ 'date_of_birth|basic_pay|user_id|health', false, 'no private fields reach the website');
select test.eq(public.site_info('no-such-studio') is null, true, 'an unknown studio shows nothing');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{}')$$, 'permission denied', 'a visitor can''t change the website');
reset role;

-- Only the owner changes the website -----------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"hero_title": "X"}}')$$,
  'Only the owner', 'front desk can''t change the website');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"map_url": "javascript:alert(1)"}}')$$,
  'https://', 'the map link must be a web address');
select public.save_website(:studio, '{"website": {"hero_title": "Strong at every age", "show_prices": false, "whatsapp": "9502318090", "unknown_key": "x"},
  "studio": {"street1": "Godari Gunta", "pincode": "533003"}}');
reset role;
set role anon;
select test.eq(public.site_info()->'website'->>'hero_title', 'Strong at every age', 'the owner''s words show on the website');
select test.eq(jsonb_array_length(public.site_info()->'plans'), 0, 'prices can be hidden');
select test.eq(public.site_info()->'website' ? 'unknown_key', false, 'only known website settings are kept');
select test.eq(public.site_info()->'studio'->>'pincode', '533003', 'the address shows for directions');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.save_website(:studio, '{"website": {"show_prices": true}}');
-- A client the front desk already has (with an email), and one new trainer without a login yet.
insert into t_s select 'meena', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Meena', 'last_name', 'K',
  'phone', '9000000601', 'email', 'meena@example.com', 'gender', 'female'));
insert into public.staff (studio_id, role, first_name, last_name, phone, email, employee_type)
values (:studio, 'coach', 'Arjun', 'S', '9000000602', 'arjun.coach@example.com', 'Personal Trainer');
reset role;

-- A login only links once its email is verified ------------------------------------------------------------
insert into auth.users (id, email, phone, email_confirmed_at, phone_confirmed_at, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000501', 'meena@example.com', null, null, null,
   '{"signup": "website", "first_name": "Meena", "phone": "9000000601", "privacy_version": "2026-10-09"}'),
  ('10000000-0000-4000-8000-000000000502', 'arjun.coach@example.com', null, null, null, '{"signup": "website", "first_name": "Someone"}');
select test.eq((select user_id from public.members where id = (select id from t_s where k = 'meena')) is null, true,
  'an unverified sign-up does not reach the client with that email');
select test.eq((select user_id from public.staff where email = 'arjun.coach@example.com') is null, true,
  'an unverified sign-up does not reach a trainer either');
select test.eq((select count(*) from public.members where user_id in ('10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000502'))::int, 0,
  'and makes no enquiry yet');
update auth.users set email_confirmed_at = now() where id = '10000000-0000-4000-8000-000000000501';
select test.eq((select user_id from public.members where id = (select id from t_s where k = 'meena')), '10000000-0000-4000-8000-000000000501'::uuid,
  'once verified, the login opens her own client record');
select test.eq((select count(*) from public.members where user_id = '10000000-0000-4000-8000-000000000501')::int, 1, 'and no duplicate enquiry is made');
select test.eq((select privacy_version from public.profiles where id = '10000000-0000-4000-8000-000000000501'), '2026-10-09', 'her privacy consent is recorded');
update auth.users set email_confirmed_at = now() where id = '10000000-0000-4000-8000-000000000502';
select test.eq((select user_id from public.staff where email = 'arjun.coach@example.com'), '10000000-0000-4000-8000-000000000502'::uuid,
  'a trainer the owner added gets in after verifying his email');
select test.eq((select count(*) from public.members where user_id = '10000000-0000-4000-8000-000000000502')::int, 0, 'staff never become enquiries');

-- Someone new joins on the website --------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, phone_confirmed_at, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000503', 'lakshmi@example.com', null, null,
   '{"signup": "website", "studio": "shaan-fitness", "first_name": "Lakshmi", "last_name": "Devi", "phone": "+91 90000 00601",
     "gender": "female", "interest": "Weight Training", "full_name": "Lakshmi Devi", "plan": "00000000-0000-4000-8000-0000000000b1"}');
select test.eq((select count(*) from public.members where user_id = '10000000-0000-4000-8000-000000000503')::int, 0, 'nothing until she verifies');
update auth.users set email_confirmed_at = now() where id = '10000000-0000-4000-8000-000000000503';
insert into t_s select 'lakshmi', id from public.members where user_id = '10000000-0000-4000-8000-000000000503';
select test.eq((select kind || '/' || source_promotion || '/' || full_name || '/' || phone || '/' || (enquiry_code is not null)::text
  from public.members where id = (select id from t_s where k = 'lakshmi')), 'enquiry/Website/Lakshmi Devi/9000000601/true',
  'she becomes an enquiry from the website, with an enquiry code');
select test.eq((select cardinality(interested_service_ids) from public.members where id = (select id from t_s where k = 'lakshmi')), 1, 'with the service she chose');
select test.eq((select type || '/' || status || '/' || (notes like '%Chose the plan%Same mobile as%Meena%')::text from public.follow_ups
  where member_id = (select id from t_s where k = 'lakshmi')), 'Enquiry/open/true',
  'the front desk gets a follow-up, warned that Meena has the same mobile');
-- A sign-up that didn't come from the website (e.g. one the owner made) never makes an enquiry.
insert into auth.users (id, email, raw_user_meta_data) values ('10000000-0000-4000-8000-000000000504', 'stranger@example.com', '{}');
select test.eq((select count(*) from public.members where user_id = '10000000-0000-4000-8000-000000000504')::int, 0, 'other logins make no enquiry');

-- Requests from the member app -------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000503', false);
select test.eq(public.request_callback((select id from t_s where k = 'lakshmi'), 'trial'), 'sent', 'she asks for a free trial');
select test.eq(public.request_callback((select id from t_s where k = 'lakshmi'), 'trial'), 'already', 'asking twice in a day sends one request');
select test.eq(public.request_callback((select id from t_s where k = 'lakshmi'), 'plan', 'Gym 3 Months'), 'sent', 'she says which plan she wants');
select test.fails($$select public.request_callback((select id from t_s where k = 'meena'), 'trial')$$, 'only ask for yourself', 'nobody asks on someone else''s behalf');
select test.eq((select count(*) from public.members)::int, 1, 'a member sees only her own record');
reset role;
select test.eq((select count(*) from public.follow_ups where member_id = (select id from t_s where k = 'lakshmi') and type in ('Assign Trial', 'Ready To Sign Up'))::int, 2,
  'the requests reach the front desk as follow-ups');

-- The front desk finds she is an existing client: the login moves there ------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
insert into t_s select 'old', public.save_client(jsonb_build_object('studio_id', :studio, 'first_name', 'Lakshmi', 'last_name', 'Devi (old)',
  'phone', '9000000603', 'gender', 'female'));
update public.members set email = 'lakshmi@example.com' where id = (select id from t_s where k = 'old');
reset role;
select test.eq((select user_id from public.members where id = (select id from t_s where k = 'old')), '10000000-0000-4000-8000-000000000503'::uuid,
  'putting her verified email on the old record moves her login there');
select test.eq((select (deleted_at is not null)::text || '/' || (user_id is null)::text from public.members where id = (select id from t_s where k = 'lakshmi')),
  'true/true', 'the empty website enquiry is retired');
select test.eq((select count(*) from public.follow_ups where member_id = (select id from t_s where k = 'lakshmi') and status = 'open')::int, 0,
  'and its open follow-ups are closed');
reset role;
select 'all website tests passed';
