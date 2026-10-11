-- Database tests: workouts, diet, exercises, foods, recipes and measurements (YDL replica part 7).
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
\set studio '''00000000-0000-4000-8000-000000000001'''
\set varun '''00000000-0000-4000-8000-00000000c0c9'''
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- A coach (Wasim, called Varun's replacement here) with two clients (Tara has the app), and one he doesn't train.
insert into auth.users (id, phone) values ('10000000-0000-4000-8000-0000000000b9', '919111100009');
insert into public.staff (id, studio_id, user_id, role, first_name, phone) values (:varun, :studio, '10000000-0000-4000-8000-0000000000b9', 'coach', 'Wasim', '9111100009');
insert into auth.users (id, phone) values ('10000000-0000-4000-8000-0000000000b1', '919111100001');
insert into public.members (id, studio_id, kind, first_name, phone, gender, trainer_id, user_id) values
  ('00000000-0000-4000-8000-0000000000b1', :studio, 'member', 'Tara', '9111100001', 'female', :varun, '10000000-0000-4000-8000-0000000000b1'),
  ('00000000-0000-4000-8000-0000000000b2', :studio, 'member', 'Uday', '9111100002', 'male', :varun, null),
  ('00000000-0000-4000-8000-0000000000b3', :studio, 'member', 'Vani', '9111100003', 'female', null, null);

select test.eq((select count(*) from public.list_items where studio_id = :studio and list = 'exercise_type')::int, 15, 'exercise types are listed');
select test.eq((select count(*) from public.list_items where studio_id = :studio and list = 'meal_time')::int, 9, 'meal times are listed');
select test.eq((select count(*) >= 140 from public.exercises where studio_id is null), true, 'the general exercise list is there');
select test.eq((select count(*) >= 70 from public.foods where studio_id is null), true, 'the general food list is there');

-- Coach Wasim: plans --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b9', false);
-- Saved the way the app saves it (insert … returning), so the new row must be readable at once.
with x as (insert into public.workout_plans (id, studio_id, name, goal, level, trainer_id, days_per_week)
  values ('00000000-0000-4000-8000-00000000a001', :studio, 'Lean 3 Day', 'Fat Loss', 'Beginner', :varun, 3) returning id)
select test.eq((select count(*) from x)::int, 1, 'a coach saves a workout plan and reads it back');
insert into public.workout_plan_items (plan_id, day, seq, exercise_id, exercise_name, sets, reps)
select '00000000-0000-4000-8000-00000000a001', 1, row_number() over (order by name), id, name, 3, 12
from public.exercises where studio_id is null and name in ('Push-up', 'Goblet Squat', 'Plank');
insert into public.workout_plan_items (plan_id, day, seq, exercise_name, sets, time, time_unit)
values ('00000000-0000-4000-8000-00000000a001', 2, 1, 'Treadmill Walk', 1, 20, 'mins');
select test.eq((select string_agg(exercise_type || '/' || body_part, ',' order by seq) from public.workout_plan_items where plan_id = '00000000-0000-4000-8000-00000000a001' and day = 1),
  'Weight Training/Quadriceps,Core/Abs,Free Body/Chest', 'type and body part come from the exercise');
select test.fails($$insert into public.workout_plan_items (plan_id, day, exercise_name) values ('00000000-0000-4000-8000-00000000a001', 4, 'Burpees')$$,
  'no Day 4', 'a 3-day plan has no day 4');
select test.eq(public.copy_workout_day('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a001', 1, 3), 3, 'copy day 1 to day 3');
select test.fails($$select public.copy_workout_day('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a001', 2, 2)$$, 'different day', 'copying a day onto itself is refused');
select public.duplicate_plan('workout', '00000000-0000-4000-8000-00000000a001', 'Lean 3 Day v2') as copy_id \gset
select test.eq((select count(*) from public.workout_plan_items where plan_id = :'copy_id')::int, 7, 'a copied plan brings every day');
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.workout_plans (id, studio_id, name, goal, days_per_week) values ('00000000-0000-4000-8000-00000000a002', :studio, 'Owner Plan', 'Muscle Gain', 5);
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b9', false);
update public.workout_plans set name = 'Hacked' where id = '00000000-0000-4000-8000-00000000a002';
select test.eq((select name from public.workout_plans where id = '00000000-0000-4000-8000-00000000a002'), 'Owner Plan', 'a coach can''t change other coaches'' plans');

-- Assigning ------------------------------------------------------------------------------------
select public.assign_workout('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a001', array[1,3,5], 62, 160) is not null;
select test.eq((select weekdays::text from public.member_workouts where member_id = '00000000-0000-4000-8000-0000000000b1' and active), '{1,3,5}', 'workout days are saved');
select test.eq((select (vals->>'bmi')::numeric from public.measurements where member_id = '00000000-0000-4000-8000-0000000000b1'), 24.2,
  'weight and height go into a measurement with BMI worked out');
select test.fails($$select public.assign_workout('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-00000000a001', array[1])$$,
  'can''t assign workouts', 'a coach assigns only to clients he trains');
select public.assign_workout('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a002', array[1,2,3,4,5]) is not null;
select test.eq((select count(*) from public.member_workouts where member_id = '00000000-0000-4000-8000-0000000000b1' and active)::int, 1, 'a new plan replaces the old one');
select public.assign_workout('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a001', array[1,3,5]) is not null;

-- Diet ----------------------------------------------------------------------------------------------
with x as (insert into public.diet_plans (id, studio_id, name, goal, trainer_id, calories_target)
  values ('00000000-0000-4000-8000-00000000d001', :studio, 'Tara Diet', 'Fat Loss', :varun, 1600) returning id)
select test.eq((select count(*) from x)::int, 1, 'a coach saves a diet plan and reads it back');
insert into public.diet_plan_items (plan_id, weekday, meal, meal_time, item_name, quantity, unit, calories, protein, fats, carbs, fibre)
select '00000000-0000-4000-8000-00000000d001', 0, 'Breakfast', '08:00', name, 2, 'piece', calories * 2, protein * 2, fats * 2, carbs * 2, fibre * 2
from public.foods where studio_id is null and name = 'Idli';
select test.eq(public.copy_diet_day('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000d001', 0, 7), 1, 'copy every-day meals to Sunday');
select public.assign_diet('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000d001') is not null;

-- Foods and recipes: coaches add, the front desk verifies ------------------------------------------
insert into public.foods (studio_id, name, quantity, unit, calories, protein, is_verified) values (:studio, 'Ragi malt', 200, 'ml', 120, 3, true);
select test.eq((select is_verified from public.foods where name = 'Ragi malt'), false, 'a coach''s food waits for verification');
select test.fails($$update public.foods set is_verified = true where name = 'Ragi malt'$$, 'Only the owner or front desk', 'a coach can''t verify foods');
insert into public.recipes (studio_id, name, calories, protein) values (:studio, 'Paneer bhurji', 260, 18);
select test.eq((select is_verified from public.recipes where name = 'Paneer bhurji'), true, 'staff recipes are listed straight away');

-- Measurements and photos ---------------------------------------------------------------------------
select public.save_measurement(jsonb_build_object('member_id', '00000000-0000-4000-8000-0000000000b1',
  'values', jsonb_build_object('weight_kg', '61.2', 'waist', 31, 'deviation_note', 'Good week'),
  'photos', jsonb_build_array('00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-0000000000b1/front.jpg'))) is not null;
select test.fails($$select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b1", "values": {"weight_kg": "sixty"}}')$$, 'Enter a number', 'measurements must be numbers');
select test.fails($$select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b1", "values": {"weight_kg": 600}}')$$, 'in kg', 'weight is checked');
select test.fails($$select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b1", "values": {"shoe_size": 8}}')$$, 'Unknown measurement', 'only known measurements');
select test.fails($$select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b3", "values": {"weight_kg": 60}}')$$, 'can''t add measurements',
  'a coach measures only his own clients');
select test.eq((select count(*) from public.measurement_photos)::int, 1, 'the coach sees his client''s progress photo');
reset role;

-- Front desk (Gangada): measurements yes, photos no -----------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select test.eq((select count(*) from public.measurements where member_id = '00000000-0000-4000-8000-0000000000b1')::int, 2, 'front desk sees measurements');
select test.eq((select count(*) from public.measurement_photos)::int, 0, 'but never progress photos');
update public.foods set is_verified = true where name = 'Ragi malt';
select test.eq((select is_verified from public.foods where name = 'Ragi malt'), true, 'front desk verifies foods');
reset role;

-- Tara in the app ----------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b1', false);
select test.eq((select string_agg(name, ',' order by name) from public.workout_plans), 'Lean 3 Day,Owner Plan', 'a member sees plans she has had, not others''');
select test.eq((select count(*) from public.workout_plan_items)::int, 7, 'and its exercises');
select test.eq((select count(*) from public.diet_plan_items)::int, 2, 'and her diet');
insert into public.workout_logs (member_id, item_id, date, sets_done)
select '00000000-0000-4000-8000-0000000000b1', id, app.today(:studio), 3 from public.workout_plan_items where day = 1 and exercise_name = 'Plank';
select test.eq((select count(*) from public.workout_logs)::int, 1, 'she ticks off an exercise');
select test.fails($$insert into public.workout_logs (member_id, item_id, date)
  select '00000000-0000-4000-8000-0000000000b1', id, current_date + 3 from public.workout_plan_items where day = 1 limit 1$$, 'future', 'not ahead of time');
select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b1", "values": {"weight_kg": 60.4}}') is not null;
select test.eq((select recorded_by is null from public.measurements where weight_kg = 60.4), true, 'she adds her own weight');
select test.eq((select count(*) from public.measurement_photos)::int, 1, 'and sees her photo');
select test.fails($$select public.save_measurement('{"member_id": "00000000-0000-4000-8000-0000000000b2", "values": {"weight_kg": 70}}')$$, 'can''t add measurements',
  'but not for anyone else');
insert into public.recipes (studio_id, name, calories, member_id) values (:studio, 'My oats bowl', 320, '00000000-0000-4000-8000-0000000000b1');
select test.eq((select string_agg(name || ':' || is_verified, ',' order by name) from public.recipes), 'My oats bowl:false,Paneer bhurji:true', 'her recipe waits; the gym''s are listed');
reset role;

-- Weight Loss Analysis ---------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select test.eq((select format('%s %s→%s lost %s', r->>'name', r->>'first_weight', r->>'last_weight', r->>'lost')
  from jsonb_array_elements(public.analysis_weight_loss(:studio, app.today(:studio) - 30, app.today(:studio))) r), 'Tara 62.00→60.40 lost 1.60', 'weight lost in the dates');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', false);
select test.eq(jsonb_array_length(public.analysis_weight_loss(:studio, app.today(:studio) - 30, app.today(:studio))), 0, 'restricted front desk sees only her clients');
reset role;
update public.staff set permissions = permissions || '{"allow_workout": false}' where id = :varun;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b9', false);
select test.fails($$insert into public.workout_plans (studio_id, name, goal, days_per_week) values ('00000000-0000-4000-8000-000000000001', 'X', 'Fat Loss', 3)$$,
  'row-level security', '"Allow Workout in Coach App: No" stops a coach making plans');
reset role;
update public.staff set permissions = permissions || '{"allow_workout": true}' where id = :varun;
select 'all training tests passed';
