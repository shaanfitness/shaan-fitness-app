-- Database tests: the website's free trial form (part 10).
-- Runs after the earlier tests on the same database; uses the main studio.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
reset role;
select set_config('request.jwt.claim.sub', '', false);
create temp table t_l (k text primary key, n int);
grant all on t_l to anon, authenticated;
insert into t_l values
  ('members', (select count(*) from public.members where studio_id = :studio)),
  ('follow_ups', (select count(*) from public.follow_ups where studio_id = :studio)),
  ('alerts', (select count(*) from public.staff_alerts where studio_id = :studio and kind = 'trial'));

-- A visitor without an account asks for a trial ---------------------------------------------------------------------
set role anon;
select test.eq(public.site_enquiry('{"studio": "shaan-fitness", "name": "  Kavya   Lakshmi ", "phone": "+91 98480 70101",
  "interest": "weight_loss", "time": "morning", "message": "Knee pain   sometimes", "page": "/weight-loss-kakinada"}'), 'sent',
  'anyone can ask for a free trial without an account');
reset role;
select test.eq((select count(*) from public.members where studio_id = :studio)::int, (select n from t_l where k = 'members') + 1, 'it makes one enquiry');
select test.eq((select first_name || '|' || last_name || '|' || phone || '|' || kind || '|' || source_promotion from public.members
  where studio_id = :studio and phone = '9848070101'), 'Kavya|Lakshmi|9848070101|enquiry|Website', 'with the name, the 10-digit number and the website as its source');
select test.eq((select enquiry_code is not null from public.members where phone = '9848070101'), true, 'and an enquiry number');
select test.eq((select f.type || '|' || f.status || '|' || f.source from public.follow_ups f join public.members m on m.id = f.member_id where m.phone = '9848070101'),
  'Assign Trial|open|system', 'a follow-up to call is due now');
select test.eq((select f.notes from public.follow_ups f join public.members m on m.id = f.member_id where m.phone = '9848070101'),
  'Asked for a free trial on the website. Interested in Weight loss. Prefers mornings. Message: "Knee pain sometimes". Call to fix the trial.',
  'it says what they asked for');
select test.eq((select title from public.staff_alerts a join public.members m on m.id = a.member_id where m.phone = '9848070101' and a.kind = 'trial'),
  'Kavya Lakshmi asked for a free trial on the website', 'the front desk is notified');

-- Asking twice the same day changes nothing -----------------------------------------------------------------------------
set role anon;
select test.eq(public.site_enquiry('{"name": "Kavya", "phone": "09848070101"}'), 'already', 'the same number again the same day: already in hand');
reset role;
select test.eq((select count(*) from public.follow_ups f join public.members m on m.id = f.member_id where m.phone = '9848070101')::int, 1, 'no second follow-up');

-- Someone the gym already knows gets the follow-up on their own record ---------------------------------------------------
insert into t_l select 'known', (select count(*) from public.members where studio_id = :studio);
select set_config('t.known', (select phone from public.members where studio_id = :studio and kind = 'member' and deleted_at is null
  and phone ~ '^[6-9][0-9]{9}$' and not exists (select 1 from public.members x where x.id <> members.id and x.deleted_at is null and app.same_phone(x.phone, members.phone))
  order by created_at limit 1), false);
set role anon;
select test.eq(public.site_enquiry(jsonb_build_object('name', 'Someone Else', 'phone', current_setting('t.known'), 'interest', 'personal')), 'sent', 'a member''s number');
reset role;
select test.eq((select count(*) from public.members where studio_id = :studio)::int, (select n from t_l where k = 'known'), 'makes no new enquiry');
select test.eq((select f.notes like 'Asked for a free trial on the website. Interested in Personal training. Call to fix the trial.%' or f.notes like '%Gave the name Someone Else (already with you as %'
  from public.follow_ups f join public.members m on m.id = f.member_id where m.phone = current_setting('t.known') and f.notes like 'Asked for a free trial on the website%'), true,
  'the follow-up goes on the member and names who asked');

-- Wrong details are refused; robots get nothing ------------------------------------------------------------------------------
set role anon;
select test.fails($$select public.site_enquiry('{"name": "Ravi", "phone": "12345"}')$$, '10-digit mobile', 'a short number is refused');
select test.fails($$select public.site_enquiry('{"name": "Ravi", "phone": "5848070102"}')$$, '10-digit mobile', 'a number that isn''t an Indian mobile is refused');
select test.fails($$select public.site_enquiry('{"name": "R", "phone": "9848070102"}')$$, 'Enter your name', 'a name is needed');
select test.eq(public.site_enquiry('{"name": "Bot", "phone": "9848070103", "website": "http://spam.example"}'), 'sent', 'a robot is told it worked');
select test.fails($$select count(*) from public.site_leads$$, 'permission denied', 'visitors can''t read the requests');
reset role;
select test.eq((select count(*) from public.members where phone in ('9848070102', '9848070103'))::int, 0, 'but nothing is saved for refused or robot requests');

-- A flood stops ---------------------------------------------------------------------------------------------------------------
insert into public.site_leads (studio_id, name, phone) select :studio, 'Flood', '97000000' || lpad(g::text, 2, '0') from generate_series(1, 20) g;
set role anon;
select test.fails($$select public.site_enquiry('{"name": "Late", "phone": "9848070104"}')$$, 'Too many requests', 'more than 20 in ten minutes are refused');
reset role;
delete from public.site_leads where name = 'Flood';
update public.site_leads set created_at = now() - interval '100 days' where phone = '9848070101';
set role anon;
select test.eq(public.site_enquiry('{"name": "Late", "phone": "9848070104"}'), 'sent', 'and work again once it calms down');
reset role;
select test.eq((select count(*) from public.site_leads where phone = '9848070101')::int, 0, 'requests older than 90 days are cleared');

select 'all site lead tests passed';
