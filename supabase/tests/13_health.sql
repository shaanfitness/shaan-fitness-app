-- Database tests: health tracking in the member app (YDL replica part 8b).
-- A separate branch: a front desk executive, a coach, and two members with the app (Meena and Raju).
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set s7 '''00000000-0000-4000-8000-000000000da0'''
\set desk '''00000000-0000-4000-8000-000000000da2'''
\set coach '''00000000-0000-4000-8000-000000000da3'''
\set meena '''00000000-0000-4000-8000-000000000db1'''
\set raju '''00000000-0000-4000-8000-000000000db2'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.studios (id, name, slug) values (:s7, 'Health Test Branch', 'health-test');
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000da2'), ('10000000-0000-4000-8000-000000000da3'),
  ('10000000-0000-4000-8000-000000000db1'), ('10000000-0000-4000-8000-000000000db2');
insert into public.staff (id, studio_id, user_id, role, first_name, access_type, employee_type) values
  (:desk, :s7, '10000000-0000-4000-8000-000000000da2', 'front_desk', 'Desk', 'front_desk_exec', null),
  (:coach, :s7, '10000000-0000-4000-8000-000000000da3', 'coach', 'Coach', null, 'Personal Trainer');
insert into public.members (id, studio_id, kind, first_name, phone, gender, user_id, added_by) values
  (:meena, :s7, 'member', 'Meena', '9100000401', 'female', '10000000-0000-4000-8000-000000000db1', :desk),
  (:raju, :s7, 'member', 'Raju', '9100000402', 'male', '10000000-0000-4000-8000-000000000db2', :desk);
insert into public.foods (id, studio_id, name, quantity, unit, calories, protein, carbs, fats) values
  ('00000000-0000-4000-8000-000000000dc1', :s7, 'Oats', 100, 'g', 389, 17, 66, 7);
insert into public.diet_plans (id, studio_id, name, is_public, active) values
  ('00000000-0000-4000-8000-000000000dd1', :s7, 'Lean Veg', true, true),
  ('00000000-0000-4000-8000-000000000dd2', :s7, 'Coach Only', false, true);
insert into public.diet_plan_items (id, studio_id, plan_id, weekday, meal, item_name, quantity, unit, calories, protein, carbs, fats) values
  ('00000000-0000-4000-8000-000000000de1', :s7, '00000000-0000-4000-8000-000000000dd1', 0, 'Breakfast', 'Idli with sambar', 3, 'piece', 250, 8, 45, 3);
insert into public.workout_plans (id, studio_id, name, goal, days_per_week, is_public, active) values
  ('00000000-0000-4000-8000-000000000df1', :s7, 'Beginner Full Body', 'General Fitness', 3, true, true),
  ('00000000-0000-4000-8000-000000000df2', :s7, 'Private Plan', 'Fat Loss', 4, false, true),
  ('00000000-0000-4000-8000-000000000df3', :s7, 'Home Cardio', 'Fat Loss', 2, true, true);
insert into public.workout_plan_items (id, studio_id, plan_id, day, exercise_name, body_part, sets, reps, weight_kg) values
  ('00000000-0000-4000-8000-000000000dfa', :s7, '00000000-0000-4000-8000-000000000df1', 1, 'Goblet Squat', 'Legs', 3, 10, 20);
select app.today(:s7) as t \gset

-- Track my diet ------------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db1', false);   -- Meena
insert into public.food_logs (member_id, date, meal, food_id, quantity, name) values (:meena, :'t', 'Breakfast', '00000000-0000-4000-8000-000000000dc1', 50, 'x');
select test.eq((select name || ' ' || calories || ' ' || protein from public.food_logs where food_id = '00000000-0000-4000-8000-000000000dc1'), 'Oats 194.50 8.50',
  '50 g of oats is half of the food''s 100 g numbers');
insert into public.food_logs (member_id, date, meal, plan_item_id, name) values (:meena, :'t', 'x', '00000000-0000-4000-8000-000000000de1', 'x');
select test.eq((select name || ' ' || meal || ' ' || calories from public.food_logs where plan_item_id is not null), 'Idli with sambar Breakfast 250.00', 'a ticked plan item copies the plan');
select test.fails($$insert into public.food_logs (member_id, date, meal, plan_item_id, name) values ('00000000-0000-4000-8000-000000000db1', app.today('00000000-0000-4000-8000-000000000da0'), 'x', '00000000-0000-4000-8000-000000000de1', 'x')$$,
  'duplicate', 'a plan item is ticked once a day');
select test.fails($$insert into public.food_logs (member_id, date, meal, name, calories) values ('00000000-0000-4000-8000-000000000db1', app.today('00000000-0000-4000-8000-000000000da0') + 1, 'Lunch', 'Rice', 200)$$,
  'future day', 'no logging tomorrow''s food');
select test.fails($$insert into public.food_logs (member_id, date, meal, name, calories) values ('00000000-0000-4000-8000-000000000db2', app.today('00000000-0000-4000-8000-000000000da0'), 'Lunch', 'Rice', 200)$$,
  'row-level security', 'not into someone else''s log');
reset role;
update public.studios set settings = jsonb_set(settings, '{app,can_add_food}', 'false') where id = :s7;
set role authenticated;
select test.fails($$insert into public.food_logs (member_id, date, meal, name, calories) values ('00000000-0000-4000-8000-000000000db1', app.today('00000000-0000-4000-8000-000000000da0'), 'Lunch', 'Rice', 200)$$,
  'turned off adding your own food', 'with Add Food off in App Settings, only the plan''s items can be ticked');
reset role;
update public.studios set settings = jsonb_set(settings, '{app,can_add_food}', 'true') where id = :s7;
set role authenticated;

-- Daily trackers, goals, diary ----------------------------------------------------------------------------------------------------
insert into public.daily_logs (member_id, date, water_ml) values (:meena, :'t', 500)
on conflict (member_id, date) do update set water_ml = public.daily_logs.water_ml + excluded.water_ml;
insert into public.daily_logs (member_id, date, water_ml) values (:meena, :'t', 250)
on conflict (member_id, date) do update set water_ml = public.daily_logs.water_ml + excluded.water_ml;
update public.daily_logs set steps = 6400, sleep_hours = 7.25, mood = 4 where member_id = :meena and date = :'t';
select test.eq((select water_ml || ' ' || steps || ' ' || sleep_hours || ' ' || mood from public.daily_logs where member_id = :meena), '750 6400 7.25 4', 'water adds up; steps, sleep and mood are saved');
insert into public.member_goals (member_id, water_ml, steps) values (:meena, 2500, 10000);
select test.eq((select studio_id from public.member_goals where member_id = :meena), :s7::uuid, 'goals take her gym');
reset role;
update public.studios set settings = jsonb_set(jsonb_set(jsonb_set(settings, '{app,can_set_goal}', 'false'), '{app,show_diary_video}', 'false'), '{app,allow_recipes}', 'false') where id = :s7;
set role authenticated;
select test.fails($$update public.member_goals set steps = 9000 where member_id = '00000000-0000-4000-8000-000000000db1'$$, 'sets your goals', 'Can Set Goal off: the gym sets goals');
select test.fails($$insert into public.diary_entries (member_id, date, body, video_url) values ('00000000-0000-4000-8000-000000000db1', app.today('00000000-0000-4000-8000-000000000da0'), 'x', 'https://youtu.be/x')$$,
  'Videos in the diary are turned off', 'Show Diary Video off: no video links');
select test.fails($$insert into public.recipes (studio_id, name, member_id) values ('00000000-0000-4000-8000-000000000da0', 'Ragi Java', '00000000-0000-4000-8000-000000000db1')$$,
  'Recipes are turned off', 'Enable Recipe off: no recipes from members');
reset role;
update public.studios set settings = jsonb_set(jsonb_set(jsonb_set(settings, '{app,can_set_goal}', 'true'), '{app,show_diary_video}', 'true'), '{app,allow_recipes}', 'true') where id = :s7;
set role authenticated;
insert into public.recipes (studio_id, name, member_id) values ('00000000-0000-4000-8000-000000000001', 'Ragi Java', :meena);
select test.eq((select studio_id from public.recipes where name = 'Ragi Java'), :s7::uuid, 'her recipe goes to her own gym, whatever gym was sent');
insert into public.diary_entries (member_id, date, body) values (:meena, :'t', 'Felt strong on squats today.');
select test.fails($$insert into public.diary_entries (member_id, date, body, video_url) values ('00000000-0000-4000-8000-000000000db1', app.today('00000000-0000-4000-8000-000000000da0'), 'x', 'http://x')$$,
  'check', 'diary videos are https links');

-- Others can't read it; the desk can (to guide her) -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db2', false);   -- Raju
select test.eq((select count(*) from public.food_logs)::int + (select count(*) from public.daily_logs)::int + (select count(*) from public.diary_entries)::int, 0,
  'Raju sees none of Meena''s logs');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000da2', false);   -- the desk
select test.eq((select count(*) from public.food_logs where member_id = :meena)::int, 2, 'the desk sees what Meena ate');
select test.eq((select count(*) from public.diary_entries)::int, 0, 'but not her diary (only her care team)');

-- PAR-Q from the app ----------------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db1', false);
select public.save_my_medical('{"heart_problem": false, "asthma": true, "made_up": true, "diabetes": "maybe"}'::jsonb, 'Inhaler before cardio');
select test.eq((select answers::text || ' ' || note || ' ' || (filled_by_member_at is not null) from public.member_medical where member_id = :meena),
  '{"asthma": true, "heart_problem": false} Inhaler before cardio true', 'only the real questions with yes/no answers are kept');

-- Free plans ---------------------------------------------------------------------------------------------------------------------------
select test.eq(public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df1') is not null, true, 'Meena starts the free beginner plan');
select test.eq((select weekdays::text from public.member_workouts where member_id = :meena and active), '{1,3,5}', 'three days a week: Monday, Wednesday, Friday');
select test.fails($$select public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df3')$$, 'already follow a workout plan', 'switching plans needs Can Change Workout Plan');
reset role;
update public.studios set settings = jsonb_set(settings, '{app,can_change_workout_plan}', 'true') where id = :s7;
set role authenticated;
select test.eq(public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df3') is not null, true, 'with it on, she switches to Home Cardio');
select test.eq((select string_agg(weekdays::text, ' ') from public.member_workouts where member_id = :meena and active), '{1,4}', 'one active plan, two days a week: Monday, Thursday');
select public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df1');
select test.fails($$select public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df2')$$, 'Plan not found', 'private plans can''t be started');
select test.eq(public.start_free_plan('diet', '00000000-0000-4000-8000-000000000dd1') is not null, true, 'and the free diet plan');
reset role;
update public.member_workouts set active = false where member_id = :raju;
insert into public.member_workouts (studio_id, member_id, plan_id, weekdays, assigned_by) values (:s7, :raju, '00000000-0000-4000-8000-000000000df2', '{1,2,4,5}', :coach);
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db2', false);   -- Raju has a coach's plan
select test.fails($$select public.start_free_plan('workout', '00000000-0000-4000-8000-000000000df1')$$, 'Your coach has given you a workout plan', 'a coach''s plan isn''t replaced');


-- Workout Analysis --------------------------------------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db1', false);   -- Meena ticks her squats
insert into public.workout_logs (member_id, item_id, date) values (:meena, '00000000-0000-4000-8000-000000000dfa', :'t');
select test.eq((select x->>'exercises' || ' ' || (x->>'volume') || ' ' || (x->>'days') from jsonb_array_elements(public.workout_analysis()->'weeks') x order by x->>'week' desc limit 1),
  '1 600.0 1', 'this week: one exercise, 3 sets × 10 reps × 20 kg = 600 kg, on one day');
select test.eq(jsonb_array_length(public.workout_analysis(null, 4)->'weeks'), 4, 'four weeks asked, four weeks back');
select test.eq((public.workout_analysis()->'parts')::text, '[{"n": 1, "part": "Legs"}]', 'by body part');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000db2', false);   -- Raju
select test.fails($$select public.workout_analysis('00000000-0000-4000-8000-000000000db1')$$, 'Client not found', 'Raju can''t see Meena''s analysis');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000da2', false);   -- the desk
select test.eq((jsonb_array_elements(public.workout_analysis(:meena)->'parts')->>'n')::int, 1, 'the desk can, to guide her');

reset role;
select 'all health tests passed';
