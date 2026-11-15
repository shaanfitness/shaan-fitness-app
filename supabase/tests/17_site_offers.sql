-- Database tests: the website's subscriptions, their switches and the call number, set from the dashboard (part 11).
-- Runs after the earlier tests on the same database; uses the main studio.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
reset role;

-- Before the owner touches anything: the three subscriptions ---------------------------------------------------------
set role anon;
select test.eq(jsonb_array_length(public.site_info()->'website'->'offers'), 3, 'the website starts with three subscriptions');
select test.eq(public.site_info()->'website'->'offers'->0->>'name', 'Advanced Training', 'Advanced Training first');
select test.eq((public.site_info()->'website'->'offers'->0->>'size')::int, 8, 'with eight people to a coach');
select test.eq((public.site_info()->'website'->'offers'->1->>'price')::int, 7999, 'Elite Coaching at its price');
select test.eq((public.site_info()->'website'->'offers'->2->>'weeks')::int, 4, 'for four weeks');
select test.eq(public.site_info()->'website'->'offers'->0 ? 'show', false, 'the on/off switch itself is not sent');
reset role;
create temp table t_o as select mobile from public.studios where id = :studio;
update public.studios set mobile = '9000000999' where id = :studio;
select test.eq(position('9000000999' in public.site_info()::text) > 0, false,
  'the studio''s own mobile (kept for invoices) is not sent to visitors');
update public.studios set mobile = (select mobile from t_o) where id = :studio;

-- Only the owner changes them, and only with sensible values ------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": []}}')$$,
  'Only the owner', 'front desk can''t change the subscriptions');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": [{"name": " ", "size": 6, "weeks": 4}]}}')$$,
  'needs a name', 'a subscription needs a name');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": [{"name": "A", "size": 0, "weeks": 4}]}}')$$,
  'between 1 and 30', 'the group size must be at least one');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": [{"name": "A", "size": "many", "weeks": 4}]}}')$$,
  'must be numbers', 'and a number');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": [{"name": "A", "size": 4, "weeks": 99}]}}')$$,
  'between 1 and 52', 'weeks stay within a year');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": {"name": "A"}}}')$$,
  'not valid', 'the list must be a list');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"offers": [
  {"name": "A", "size": 1, "weeks": 4}, {"name": "B", "size": 1, "weeks": 4}, {"name": "C", "size": 1, "weeks": 4}, {"name": "D", "size": 1, "weeks": 4},
  {"name": "E", "size": 1, "weeks": 4}, {"name": "F", "size": 1, "weeks": 4}, {"name": "G", "size": 1, "weeks": 4}]}}')$$,
  'at most 6', 'no more than six');
select test.fails($$select public.save_website('00000000-0000-4000-8000-000000000001', '{"website": {"phone": "call me"}}')$$,
  '10 digits', 'the call number must be a number');

-- The owner sets a group of six, hides one subscription ------------------------------------------------------------
select public.save_website(:studio, '{"website": {"offers": [
  {"name": " Advanced   Training ", "note": "Group of 6 approx", "size": "6", "price": 5499, "weeks": 4, "show": true},
  {"name": "VIP Coaching", "note": "One-on-one", "size": 1, "price": 13999, "weeks": 4, "show": false}],
  "phone": "+91 96424 67896"}}');
reset role;
set role anon;
select test.eq(jsonb_array_length(public.site_info()->'website'->'offers'), 1, 'a subscription switched off is not sent to visitors');
select test.eq(public.site_info()->'website'->'offers'->0->>'name', 'Advanced Training', 'names are tidied');
select test.eq((public.site_info()->'website'->'offers'->0->>'size')::int, 6, 'the group size follows the dashboard');
select test.eq((public.site_info()->'website'->'offers'->0->>'price')::int, 5499, 'and so does the price');
select test.eq(public.site_info()->'studio'->>'mobile', '+91 96424 67896', 'the call number follows the dashboard');
reset role;

-- Prices and sizes each have a switch -----------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.save_website(:studio, '{"website": {"show_prices": false}}');
reset role;
set role anon;
select test.eq(public.site_info()->'website'->'offers'->0->>'price' is null, true, 'with prices off, no price leaves the database');
select test.eq((public.site_info()->'website'->'offers'->0->>'size')::int, 6, 'sizes still show');
select test.eq(public.site_info()::text like '%5499%', false, 'the hidden price is nowhere in the summary');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.save_website(:studio, '{"website": {"show_prices": true, "show_sizes": false}}');
reset role;
set role anon;
select test.eq(public.site_info()->'website'->'offers'->0->>'size' is null, true, 'with sizes off, no group size leaves the database');
select test.eq((public.site_info()->'website'->'offers'->0->>'price')::int, 5499, 'prices show again');
reset role;

-- Back to the starting three for whatever runs next -------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.save_website(:studio, jsonb_build_object('website', jsonb_build_object('offers', app.default_offers(), 'show_sizes', true, 'phone', '+919642467896')));
reset role;
select set_config('request.jwt.claim.sub', '', false);
select test.eq(jsonb_array_length(public.site_info()->'website'->'offers'), 3, 'and the three are back');
