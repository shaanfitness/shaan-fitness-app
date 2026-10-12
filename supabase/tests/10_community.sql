-- Database tests: community posts and challenges (YDL replica part 7c).
-- A separate branch: an owner, a manager (has the Community right), two members with the app and a coach.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s4 '''00000000-0000-4000-8000-000000000aa0'''
\set owner '''00000000-0000-4000-8000-000000000aa1'''
\set manager '''00000000-0000-4000-8000-000000000aa2'''
\set coach '''00000000-0000-4000-8000-000000000aa3'''
\set priya '''00000000-0000-4000-8000-000000000ab1'''
\set ramu '''00000000-0000-4000-8000-000000000ab2'''
\set kavya '''00000000-0000-4000-8000-000000000ab3'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s4, 'Community Test Branch', 'community-test');
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000aa1'), ('10000000-0000-4000-8000-000000000aa2'), ('10000000-0000-4000-8000-000000000aa3'),
  ('10000000-0000-4000-8000-000000000ab1'), ('10000000-0000-4000-8000-000000000ab2'), ('10000000-0000-4000-8000-000000000ab9');
insert into public.staff (id, studio_id, user_id, role, first_name, last_name, access_type, employee_type) values
  (:owner, :s4, '10000000-0000-4000-8000-000000000aa1', 'owner', 'Owner', null, 'owner', null),
  (:manager, :s4, '10000000-0000-4000-8000-000000000aa2', 'front_desk', 'Mona', 'Manager', 'manager', null),
  (:coach, :s4, '10000000-0000-4000-8000-000000000aa3', 'coach', 'Chandu', null, null, 'Personal Trainer');
insert into public.members (id, studio_id, kind, first_name, last_name, phone, gender, user_id) values
  (:priya, :s4, 'member', 'Priya', 'Varma', '9100000101', 'female', '10000000-0000-4000-8000-000000000ab1'),
  (:ramu, :s4, 'member', 'Ramu', 'Naidu', '9100000102', 'male', '10000000-0000-4000-8000-000000000ab2'),
  (:kavya, :s4, 'member', 'Kavya', null, '9100000103', 'female', null);
select app.today(:s4) as t \gset

-- Challenges: made by the desk, with a daily task and a Day 1 task ------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000aa2', false);   -- the manager
with x as (insert into public.challenges (id, studio_id, name, description, start_date, end_date, terms, has_tasks)
  values ('00000000-0000-4000-8000-000000000ac1', :s4, '21 Day Push', 'Push-ups every day', :'t'::date - 2, :'t'::date + 18, 'Play fair.', true) returning id)
select test.eq((select count(*) from x)::int, 1, 'the desk creates a challenge and reads it back');
insert into public.challenge_tasks (challenge_id, title, target, unit, points, day, seq) values
  ('00000000-0000-4000-8000-000000000ac1', '30 push-ups', 30, 'reps', 10, null, 1),
  ('00000000-0000-4000-8000-000000000ac1', 'Kick-off plank', 60, 'secs', 25, 1, 2);
select test.eq((select studio_id from public.challenge_tasks where title = '30 push-ups'), :s4::uuid, 'tasks take the challenge''s gym');
select test.fails($$insert into public.challenges (studio_id, name, start_date, end_date, terms) values ('00000000-0000-4000-8000-000000000aa0', 'Bad', current_date, current_date - 1, 'x')$$,
  'check', 'the end date can''t be before the start');
insert into public.challenge_teams (id, challenge_id, name) values ('00000000-0000-4000-8000-000000000ad1', '00000000-0000-4000-8000-000000000ac1', 'Team Alpha'),
  ('00000000-0000-4000-8000-000000000ad2', '00000000-0000-4000-8000-000000000ac1', 'Team Beta');
select test.fails($$insert into public.challenge_teams (challenge_id, name) values ('00000000-0000-4000-8000-000000000ac1', 'team alpha')$$, 'duplicate', 'team names are unique in a challenge');
select test.eq(public.add_challenge_participants('00000000-0000-4000-8000-000000000ac1', array['00000000-0000-4000-8000-000000000ab3']::uuid[], '00000000-0000-4000-8000-000000000ad2'), 1,
  'the desk adds Kavya (no app) into Team Beta');
select test.eq(public.copy_challenge('00000000-0000-4000-8000-000000000ac1') is not null, true, 'a challenge can be copied');
select test.eq((select count(*) from public.challenge_tasks t join public.challenges c on c.id = t.challenge_id where c.name = '21 Day Push (copy)' and not c.active)::int, 2,
  'the copy brings its tasks and starts deactivated');

-- A coach can't make challenges ------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000aa3', false);
select test.fails($$insert into public.challenges (studio_id, name, start_date, end_date, terms) values ('00000000-0000-4000-8000-000000000aa0', 'Coach one', current_date, current_date, 'x')$$,
  'row-level security', 'a coach can''t create challenges');

-- Members join and log tasks -----------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab1', false);   -- Priya
select test.eq((select count(*) from public.my_challenges())::int, 1, 'Priya sees the active challenge (not the deactivated copy)');
select test.fails($$select public.join_challenge('00000000-0000-4000-8000-000000000ac1', false)$$, 'Accept the terms', 'joining needs the terms accepted');
select test.eq(public.join_challenge('00000000-0000-4000-8000-000000000ac1', true) is not null, true, 'Priya joins');
select test.eq((select joined from public.my_challenges()), true, 'and shows as joined');
insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
select '00000000-0000-4000-8000-000000000ac1', :priya, id, :'t'::date, 35 from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1';
insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
select '00000000-0000-4000-8000-000000000ac1', :priya, id, :'t'::date - 2, 60 from public.challenge_tasks where title = 'Kick-off plank' and challenge_id = '00000000-0000-4000-8000-000000000ac1';
insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
select '00000000-0000-4000-8000-000000000ac1', :priya, id, :'t'::date - 1, 20 from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1';
select test.eq((select sum(points) from public.challenge_entries where member_id = :priya)::int, 35, 'met targets earn points (10 + 25), a missed one 0');
select test.fails($$insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
  select '00000000-0000-4000-8000-000000000ac1', '00000000-0000-4000-8000-000000000ab1', id, current_date + 1, 40 from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1'$$,
  'future', 'no logging tomorrow');
select test.fails($$insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
  select '00000000-0000-4000-8000-000000000ac1', '00000000-0000-4000-8000-000000000ab1', id, current_date, 60 from public.challenge_tasks where title = 'Kick-off plank' and challenge_id = '00000000-0000-4000-8000-000000000ac1'$$,
  'Day 1', 'a Day 1 task only on Day 1');
select test.fails($$insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
  select '00000000-0000-4000-8000-000000000ac1', '00000000-0000-4000-8000-000000000ab3', id, current_date, 40 from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1'$$,
  'row-level security', 'Priya can''t log for Kavya');
select test.eq((select count(*) from public.challenge_participants)::int, 1, 'Priya sees only her own participation row');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab2', false);   -- Ramu, not joined
select test.fails($$insert into public.challenge_entries (challenge_id, member_id, task_id, date, value)
  select '00000000-0000-4000-8000-000000000ac1', '00000000-0000-4000-8000-000000000ab2', id, current_date, 40 from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1'$$,
  'Join the challenge first', 'only participants log');
select public.join_challenge('00000000-0000-4000-8000-000000000ac1', true) is not null;

-- The desk (a judge) records Kavya's reps ----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000aa3', false);   -- the coach
insert into public.challenge_entries (challenge_id, member_id, task_id, date, value, recorded_by)
select '00000000-0000-4000-8000-000000000ac1', :kavya, id, :'t'::date, 50, :coach from public.challenge_tasks where title = '30 push-ups' and challenge_id = '00000000-0000-4000-8000-000000000ac1';
select test.eq((select points from public.challenge_entries where member_id = :kavya), 10, 'a coach records a client''s task');

-- Posts and claps ------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab1', false);   -- Priya
insert into public.community_posts (id, author_member_id, body) values ('00000000-0000-4000-8000-000000000ae1', :priya, 'First week done!');
select test.eq((select status from public.community_posts where id = '00000000-0000-4000-8000-000000000ae1'), 'pending', 'a member''s post waits for approval');
select test.fails($$insert into public.community_posts (author_member_id, body) values ('00000000-0000-4000-8000-000000000ab2', 'Pretending to be Ramu')$$,
  'row-level security', 'members post only as themselves');
insert into public.community_posts (id, challenge_id, author_member_id, body) values ('00000000-0000-4000-8000-000000000ae2', '00000000-0000-4000-8000-000000000ac1', :priya, 'Day 3: 35 push-ups');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab2', false);   -- Ramu
select test.eq((select count(*) from public.community_feed(:s4))::int, 0, 'Ramu doesn''t see Priya''s pending post');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000aa2', false);   -- the manager
select test.eq((select count(*) from public.community_feed(:s4, 'pending'))::int, 1, 'the manager sees it waiting');
select test.eq((select author_name from public.community_feed(:s4, 'pending')), 'Priya Varma', 'staff see the full name');
select test.eq(public.decide_posts(:s4, array['00000000-0000-4000-8000-000000000ae1', '00000000-0000-4000-8000-000000000ae2']::uuid[], 'active'), 2, 'and accepts both posts');
insert into public.community_posts (author_staff_id, body) values (:manager, 'Gym closed on Sunday for Dussehra.');
select test.eq((select status from public.community_posts where author_staff_id = :manager), 'active', 'staff posts go live at once');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab2', false);   -- Ramu
select test.eq((select string_agg(author_name, ',' order by created_at) from public.community_feed(:s4)), 'Priya V.,Mona Manager',
  'members see first names (and the gym''s staff); challenge posts stay in the challenge');
select test.eq((select count(*) from public.community_feed(:s4, 'active', '00000000-0000-4000-8000-000000000ac1'))::int, 1, 'the challenge has its own posts');
insert into public.post_claps (post_id) values ('00000000-0000-4000-8000-000000000ae2');
select test.eq((select claps from public.community_feed(:s4, 'active', '00000000-0000-4000-8000-000000000ac1')), 1::bigint, 'Ramu claps');
select test.eq((select clapped from public.community_feed(:s4, 'active', '00000000-0000-4000-8000-000000000ac1')), true, 'and the feed knows he did');
select test.fails($$insert into public.post_claps (post_id) values ('00000000-0000-4000-8000-000000000ae2')$$, 'duplicate', 'one clap per person');
select test.fails($$select public.decide_posts('00000000-0000-4000-8000-000000000aa0', array['00000000-0000-4000-8000-000000000ae1']::uuid[], 'declined')$$, 'permission',
  'members can''t moderate');

-- Leaderboards ----------------------------------------------------------------------------------------------------------
select test.eq((select string_agg(name || ':' || points, ',' order by rank, name) from public.challenge_leaderboard('00000000-0000-4000-8000-000000000ac1')),
  'Priya V.:35,Kavya:10,Ramu N.:0', 'the leaderboard, with first names for members');
select test.eq((select claps from public.challenge_leaderboard('00000000-0000-4000-8000-000000000ac1') where name = 'Priya V.'), 1::bigint, 'claps on challenge posts count');
select test.eq((select is_me from public.challenge_leaderboard('00000000-0000-4000-8000-000000000ac1') where name = 'Ramu N.'), true, 'Ramu is marked as himself');
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.challenge_participants set team_id = '00000000-0000-4000-8000-000000000ad1' where member_id = :priya;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000aa1', false);   -- the owner
select test.eq((select string_agg(team_name || ':' || points, ',' order by rank) from public.challenge_team_board('00000000-0000-4000-8000-000000000ac1')),
  'Team Alpha:35,Team Beta:10', 'team totals');
select test.eq((select participants from public.challenge_list(:s4) where name = '21 Day Push'), 3::bigint, 'the list counts participants');

-- Auto approve: posts go live at once ---------------------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.studios set settings = jsonb_set(settings, '{center}', '{"auto_approve_community": true}') where id = :s4;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000ab2', false);
insert into public.community_posts (author_member_id, body) values (:ramu, 'Leg day!');
select test.eq((select status from public.community_posts where body = 'Leg day!'), 'active', 'with Auto approve community on, posts go live');
reset role;
select set_config('request.jwt.claim.sub', '', false);

select 'all community tests passed';
