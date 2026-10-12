-- Made-up clients, plans, receipts and follow-ups for local testing and screenshots.
-- Never run this on the real database.
do $$
declare
  st uuid = '00000000-0000-4000-8000-000000000001';
  d date = app.today('00000000-0000-4000-8000-000000000001');
  firsts text[] = array['Aarav','Diya','Kiran','Meera','Rohit','Sneha','Vikram','Lakshmi','Arjun','Pooja','Naveen','Swathi','Rahul','Anjali','Sai','Divya','Harish','Keerthi','Manoj','Priya','Teja','Bhavana','Suresh','Ramya','Ajay','Kavitha','Nikhil','Sravani','Vamsi','Haritha','Ganesh','Mounika','Pavan','Sowmya','Ravi','Deepika','Charan','Lavanya','Akhil','Tejaswini'];
  lasts text[] = array['Reddy','Varma','Naidu','Rao','Chowdary','Sharma','Kumar','Prasad','Raju','Murthy'];
  sources text[] = array['Walk In','Instagram','Word Of Mouth','Google Ads','Member Referral','Facebook','Just Dial','Banner'];
  conv text[] = array['Hot','Warm / Maybe','Cold / Not so interested','Expected'];
  staff_ids uuid[];
  desk uuid; coach1 uuid; coach2 uuid;
  m uuid; s uuid; i int; plan uuid; price numeric; start date;
begin
  insert into public.staff (id, studio_id, role, first_name, last_name, phone, email, employee_type) values
    ('00000000-0000-4000-8000-0000000000d1', st, 'front_desk', 'Asha', 'Kumari', '9100000001', 'desk@example.com', 'Front Desk Executive'),
    ('00000000-0000-4000-8000-0000000000d2', st, 'coach', 'Ravi', 'Teja', '9100000002', 'coach@example.com', 'Personal Trainer'),
    ('00000000-0000-4000-8000-0000000000d3', st, 'coach', 'Sunitha', 'Rao', '9100000003', 'coach2@example.com', 'General Trainer'),
    ('00000000-0000-4000-8000-0000000000d4', st, 'doctor', 'Dr Meena', 'Prasad', '9100000004', 'doctor@example.com', 'Doctor')
  on conflict do nothing;
  desk = '00000000-0000-4000-8000-0000000000d1'; coach1 = '00000000-0000-4000-8000-0000000000d2'; coach2 = '00000000-0000-4000-8000-0000000000d3';
  staff_ids = array['00000000-0000-4000-8000-0000000000a1'::uuid, desk];
  update public.batches set trainer_ids = array[coach1] where start_time in ('05:30', '16:00', '19:00');
  update public.batches set trainer_ids = array[coach2] where start_time in ('07:00', '08:30');

  insert into auth.users (id, email) values
    ('20000000-0000-4000-8000-000000000001', 'shaanfitnessgym@gmail.com'),
    ('20000000-0000-4000-8000-000000000002', 'desk@example.com'),
    ('20000000-0000-4000-8000-000000000003', 'coach@example.com'),
    ('20000000-0000-4000-8000-000000000004', 'doctor@example.com')
  on conflict do nothing;

  for i in 1..40 loop
    insert into public.members (studio_id, kind, first_name, last_name, phone, gender, date_of_birth, enquiry_date,
      added_by, trainer_id, source_promotion, source_enquiry, convertibility, tapped, notes, employment_status, level)
    values (st, 'enquiry', firsts[i], lasts[1 + (i % 10)], '98' || lpad((48120000 + i * 37)::text, 8, '0'),
      case when i % 3 = 0 then 'male' when i % 3 = 1 then 'female' else 'male' end,
      case when i = 7 or i = 23 then (d - interval '25 years')::date when i % 4 = 0 then null else (d - make_interval(years => 18 + (i * 7) % 40, days => i * 11))::date end,
      d - (i * 3) % 75, staff_ids[1 + i % 2], case when i % 5 = 0 then coach1 when i % 5 = 1 then coach2 else null end,
      sources[1 + i % 8], case when i % 2 = 0 then 'Walk In' else 'Call' end, conv[1 + i % 4], i % 3 <> 0,
      case when i % 6 = 0 then 'Wants mornings only' when i % 6 = 3 then 'Asked about fat loss' else null end,
      case when i % 4 = 0 then 'STUDENT' else 'WORKING' end, case when i % 3 = 0 then 'Beginner' else 'Intermediate' end)
    returning id into m;

    -- First 24 join: a plan each, with varied dates and payments.
    if i <= 24 then
      plan = case when i % 3 = 0 then '00000000-0000-4000-8000-0000000000b1'::uuid when i % 3 = 1 then '00000000-0000-4000-8000-0000000000b2'::uuid else '00000000-0000-4000-8000-0000000000b3'::uuid end;
      price = case when i % 3 = 0 then 4999 when i % 3 = 1 then 7999 else 14999 end;
      start = d - ((i * 5) % 45);
      -- The first eight are renewing: an earlier plan two months before.
      if i <= 8 then
        insert into public.subscriptions (studio_id, member_id, plan_id, start_date, base_price, selling_price, invoice_date, created_by, bill_rep_id)
        values (st, m, plan, start - 70, price, price, start - 70, staff_ids[1 + i % 2], staff_ids[1 + i % 2]) returning id into s;
        insert into public.payments (studio_id, member_id, subscription_id, amount, mode, receipt_date, added_by)
        values (st, m, s, price, case when i % 2 = 0 then 'CASH' else 'ONLINE' end, start - 70, staff_ids[1 + i % 2]);
      end if;
      insert into public.subscriptions (studio_id, member_id, plan_id, start_date, base_price, selling_price, invoice_date, created_by, bill_rep_id)
      values (st, m, plan, start, price, price, start, staff_ids[1 + i % 2], staff_ids[1 + i % 2]) returning id into s;
      insert into public.payments (studio_id, member_id, subscription_id, amount, mode, receipt_date, added_by)
      values (st, m, s, case when i % 5 = 0 then price - 2000 else price end, case when i % 2 = 0 then 'UPI' else 'CASH' end,
              case when i % 7 = 0 then d else start end, staff_ids[1 + i % 2]);
      update public.members set joined_on = start where id = m;
      insert into public.batch_members (batch_id, member_id, studio_id)
      select b.id, m, st from public.batches b where b.studio_id = st order by b.start_time offset (i % 8) limit 1;
      if i % 4 <> 0 then
        insert into public.attendance (studio_id, member_id, batch_id, date, check_in, check_out, source)
        select st, m, bm.batch_id, d, now() - interval '50 minutes', case when i % 3 = 0 then null else now() - interval '5 minutes' end, 'manual'
        from public.batch_members bm where bm.member_id = m limit 1;
      end if;
      if i % 5 = 0 then
        insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, expected_date, expected_amount, notes, source, subscription_id)
        values (st, m, 'Balance due', now() + make_interval(days => i % 3), desk, d + (i % 4), 2000, 'Balance after first payment', 'system', s);
      end if;
    else
      -- Enquiries: follow-ups due today, upcoming and missed.
      insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, convertibility, expected_date, expected_amount, contact_type, notes, created_by)
      values (st, m, 'Enquiry', date_trunc('day', now()) + make_interval(days => (i % 5) - 2, hours => 10 + i % 8), staff_ids[1 + i % 2],
              conv[1 + i % 4], case when i % 2 = 0 then d + (i % 6) end, case when i % 2 = 0 then 4999 + (i % 3) * 3000 end, 'Phone',
              case when i % 3 = 0 then 'Call back after 6 PM' when i % 3 = 1 then 'Interested in group batch' else 'Send price list on WhatsApp' end,
              staff_ids[1 + i % 2]);
    end if;
  end loop;

  -- History for the analysis pages: six weeks of check-ins in each member's batch while their plan ran,
  -- a few expenses and salaries, and a target for a coach.
  insert into public.attendance (studio_id, member_id, batch_id, date, check_in, check_out, source)
  select st, bm.member_id, bm.batch_id, d - k,
    ((d - k) + b.start_time) at time zone 'Asia/Kolkata' + (abs(hashtext(bm.member_id::text || k::text)) % 20) * interval '1 minute',
    ((d - k) + b.start_time) at time zone 'Asia/Kolkata' + interval '75 minutes', 'manual'
  from public.batch_members bm join public.batches b on b.id = bm.batch_id cross join generate_series(1, 45) k
  where bm.studio_id = st and abs(hashtext(bm.member_id::text || k::text)) % 5 < 3 and extract(isodow from d - k) <> 7
    and exists (select 1 from public.subscriptions x where x.member_id = bm.member_id and x.deleted_at is null and d - k between x.start_date and x.end_date);
  insert into public.vendors (id, studio_id, name, contact_name, phone1) values
    ('00000000-0000-4000-8000-0000000000e9', st, 'APEPDCL', 'Billing desk', '1912'),
    ('00000000-0000-4000-8000-0000000000ea', st, 'Fit Supplies', 'Naresh', '9100000099')
  on conflict do nothing;
  insert into public.expenses (studio_id, title, vendor_id, category, expense_date, payment_type, amount, final_amount) values
    (st, 'Electricity', '00000000-0000-4000-8000-0000000000e9', 'Electricity Bills', d - 35, 'ONLINE', 6400, 6400),
    (st, 'Electricity', '00000000-0000-4000-8000-0000000000e9', 'Electricity Bills', d - 5, 'ONLINE', 7100, 7100),
    (st, 'Rent', null, 'Rent', d - 40, 'NEFT', 35000, 35000),
    (st, 'Rent', null, 'Rent', d - 10, 'NEFT', 35000, 35000),
    (st, 'Resistance bands', '00000000-0000-4000-8000-0000000000ea', 'Assets Purchased', d - 18, 'UPI', 4200, 4200),
    (st, 'Cleaning supplies', null, 'Housekeeping', d - 3, 'CASH', 1800, 1800);
  insert into public.payroll_entries (studio_id, staff_id, from_date, to_date, paid_date, paid_days, present_days, basic_salary, payable, mode) values
    (st, coach1, d - 60, d - 31, d - 30, 26, 26, 18000, 18000, 'NEFT'),
    (st, coach2, d - 60, d - 31, d - 30, 25, 25, 15000, 15000, 'NEFT'),
    (st, desk, d - 60, d - 31, d - 30, 26, 26, 12000, 12000, 'NEFT');
  insert into public.staff_targets (studio_id, staff_id, year, month, target_type, commission_type, tiers)
  values (st, coach1, extract(year from d), extract(month from d), null, 'percentage',
          '[{"target": 20000, "commission": 5}, {"target": 40000, "commission": 8}, {"target": 60000, "commission": 10}]')
  on conflict do nothing;

  -- A few members renewing soon and one expired last week.
  update public.subscriptions set base_end_date = d + 3 where id in (select id from public.subscriptions where start_date > d - 50 order by start_date limit 2);
  update public.members set lead_status = 'not_interested' where kind = 'enquiry' and first_name in ('Ramya', 'Ganesh');

  -- Workouts, diet and measurements (Part 7a). A member login for the member app: Rohit.
  insert into auth.users (id, email) values ('20000000-0000-4000-8000-000000000005', 'member@example.com') on conflict do nothing;
  update public.members set email = 'member@example.com' where studio_id = st and first_name = 'Rohit';
  insert into public.workout_plans (id, studio_id, name, goal, level, trainer_id, days_per_week, instructions, is_public, created_by) values
    ('00000000-0000-4000-8000-0000000a0001', st, 'Beginner Full Body 3 Days', 'Fat Loss', 'Beginner', coach1, 3, 'Warm up for 10 minutes before every session. Rest 60 seconds between sets.', true, coach1),
    ('00000000-0000-4000-8000-0000000a0002', st, 'Muscle Gain Push Pull Legs', 'Muscle Gain', 'Intermediate', coach2, 6, null, false, coach2),
    ('00000000-0000-4000-8000-0000000a0003', st, 'Fat Loss Circuit 4 Days', 'Fat Loss', 'General', null, 4, 'Keep the heart rate up: little rest between exercises.', false, desk);
  insert into public.workout_plan_items (plan_id, day, seq, exercise_id, exercise_name, sets, reps, time, time_unit)
  select x.plan, x.day, x.seq, e.id, e.name, x.sets, x.reps, x.time, x.unit
  from (values
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 1, 1, 'Treadmill Walk', null::int, null::int, 10::numeric, 'mins'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 1, 2, 'Goblet Squat', 3, 12, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 1, 3, 'Dumbbell Bench Press (Flat)', 3, 12, null, 'secs'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 1, 4, 'Lat Pull Down (Wide Grip)', 3, 12, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 1, 5, 'Plank', 3, null, 30, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 2, 1, 'Exercise Bike', null, null, 10, 'mins'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 2, 2, 'Leg Press', 3, 15, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 2, 3, 'Seated Cable Row', 3, 12, null, 'secs'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 2, 4, 'Dumbbell Shoulder Press', 3, 10, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 2, 5, 'Crunches', 3, 15, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 3, 1, 'Cross Trainer', null, null, 12, 'mins'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 3, 2, 'Walking Lunges', 3, 10, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 3, 3, 'Push-up', 3, 10, null, 'secs'), ('00000000-0000-4000-8000-0000000a0001'::uuid, 3, 4, 'Dumbbell Biceps Curl', 3, 12, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0001'::uuid, 3, 5, 'Triceps Pushdown (Rope)', 3, 12, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0002'::uuid, 1, 1, 'Barbell Bench Press (Flat)', 4, 8, null, 'secs'), ('00000000-0000-4000-8000-0000000a0002'::uuid, 1, 2, 'Barbell Overhead Press', 4, 8, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0002'::uuid, 2, 1, 'Deadlift', 4, 6, null, 'secs'), ('00000000-0000-4000-8000-0000000a0002'::uuid, 2, 2, 'Pull-up', 4, 8, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0002'::uuid, 3, 1, 'Barbell Back Squat', 4, 8, null, 'secs'), ('00000000-0000-4000-8000-0000000a0002'::uuid, 3, 2, 'Romanian Deadlift', 4, 10, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0003'::uuid, 1, 1, 'Burpees', 4, 12, null, 'secs'), ('00000000-0000-4000-8000-0000000a0003'::uuid, 1, 2, 'Kettlebell Swing', 4, 15, null, 'secs'),
    ('00000000-0000-4000-8000-0000000a0003'::uuid, 2, 1, 'Skipping Rope', 4, null, 60, 'secs'), ('00000000-0000-4000-8000-0000000a0003'::uuid, 2, 2, 'Mountain Climbers', 4, null, 40, 'secs')
  ) as x(plan, day, seq, ex, sets, reps, time, unit)
  join public.exercises e on e.studio_id is null and e.name = x.ex;

  insert into public.foods (studio_id, name, quantity, unit, calories, protein, fats, carbs, fibre, is_veg, is_verified, created_by) values
    (st, 'Pesarattu', 1, 'piece', 160, 8, 4, 22, 3, true, true, coach1),
    (st, 'Ragi malt (with milk)', 1, 'glass', 180, 7, 4, 29, 3, true, false, coach2),
    (st, 'Chicken curry (home style)', 1, 'katori', 240, 22, 15, 5, 1, false, false, coach1);
  insert into public.recipes (id, studio_id, name, quantity, unit, calories, protein, fats, carbs, fibre, prep_time_mins, ingredients, method, is_veg, is_verified, created_by) values
    ('00000000-0000-4000-8000-0000000c0001', st, 'Moong Dal Chilla', 2, 'pieces', 230, 12, 6, 30, 5, 20, 'Moong dal, onion, green chilli, coriander', 'Soak the dal, grind, spread on a hot tawa, cook both sides.', true, true, coach1),
    ('00000000-0000-4000-8000-0000000c0002', st, 'Paneer Bhurji', 1, 'katori', 290, 18, 21, 7, 2, 15, 'Paneer, onion, tomato, spices', 'Cook onion and tomato, add crumbled paneer and spices.', true, true, coach2),
    ('00000000-0000-4000-8000-0000000c0003', st, 'Egg White Omelette', 1, 'serving', 120, 16, 4, 3, 1, 10, '4 egg whites, onion, tomato, chilli', 'Whisk, pour on a non-stick pan, fold.', false, true, desk);
  insert into public.diet_plans (id, studio_id, name, goal, level, trainer_id, calories_target, instructions, is_public, created_by) values
    ('00000000-0000-4000-8000-0000000d0001', st, '1800 kcal Fat Loss (Veg)', 'Fat Loss', 'General', coach1, 1800, 'Drink 3 to 4 litres of water a day. No sugar in tea or coffee.', false, coach1),
    ('00000000-0000-4000-8000-0000000d0002', st, '2600 kcal Muscle Gain', 'Muscle Gain', 'General', coach2, 2600, null, false, coach2);
  insert into public.diet_plan_items (plan_id, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre)
  select x.plan, x.wd, x.meal, x.t::time, x.seq, f.id, r.id, coalesce(f.name, r.name, x.item), x.q, coalesce(f.unit, r.unit, x.u),
    round(coalesce(f.calories, r.calories, 0) * x.q / coalesce(f.quantity, r.quantity, 1), 1), round(coalesce(f.protein, r.protein, 0) * x.q / coalesce(f.quantity, r.quantity, 1), 1),
    round(coalesce(f.fats, r.fats, 0) * x.q / coalesce(f.quantity, r.quantity, 1), 1), round(coalesce(f.carbs, r.carbs, 0) * x.q / coalesce(f.quantity, r.quantity, 1), 1),
    round(coalesce(f.fibre, r.fibre, 0) * x.q / coalesce(f.quantity, r.quantity, 1), 1)
  from (values
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Early Morning', '06:00', 1, 'Almonds', 15::numeric, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Breakfast', '08:30', 1, 'Moong Dal Chilla', 2, 'pieces'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Breakfast', '08:30', 2, 'Curd / dahi', 100, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Mid Morning', '11:00', 1, 'Papaya', 150, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Lunch', '13:30', 1, 'Phulka / roti (no oil)', 2, 'piece'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Lunch', '13:30', 2, 'Moong dal (cooked)', 150, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Lunch', '13:30', 3, 'Paneer Bhurji', 1, 'katori'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Evening Snack', '17:00', 1, 'Roasted chana', 30, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Evening Snack', '17:00', 2, 'Buttermilk / chaas', 200, 'ml'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Dinner', '20:30', 1, 'Rice, brown (cooked)', 120, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 0, 'Dinner', '20:30', 2, 'Toor dal (cooked)', 150, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 7, 'Lunch', '13:30', 1, 'Rice, white (cooked)', 150, 'g'),
    ('00000000-0000-4000-8000-0000000d0001'::uuid, 7, 'Lunch', '13:30', 2, 'Rajma (boiled)', 150, 'g'),
    ('00000000-0000-4000-8000-0000000d0002'::uuid, 0, 'Breakfast', '08:00', 1, 'Egg White Omelette', 2, 'serving'),
    ('00000000-0000-4000-8000-0000000d0002'::uuid, 0, 'Breakfast', '08:00', 2, 'Oats (dry)', 60, 'g'),
    ('00000000-0000-4000-8000-0000000d0002'::uuid, 0, 'Lunch', '13:00', 1, 'Chicken breast (cooked)', 200, 'g'),
    ('00000000-0000-4000-8000-0000000d0002'::uuid, 0, 'Lunch', '13:00', 2, 'Rice, white (cooked)', 250, 'g')
  ) as x(plan, wd, meal, t, seq, item, q, u)
  left join public.foods f on f.studio_id is null and f.name = x.item
  left join public.recipes r on r.studio_id = st and r.name = x.item;

  select id into m from public.members where studio_id = st and first_name = 'Rohit';
  insert into public.recipes (studio_id, name, quantity, unit, calories, protein, fats, carbs, fibre, prep_time_mins, ingredients, is_veg, member_id, is_verified)
  values (st, 'Ragi Idli (my mother''s)', 3, 'pieces', 210, 7, 2, 40, 6, 30, 'Ragi flour, idli rava, curd', true, m, false);
  insert into public.member_workouts (studio_id, member_id, plan_id, weekdays, start_date, goal, level, assigned_by)
  values (st, m, '00000000-0000-4000-8000-0000000a0001', array[1,3,5]::smallint[], d - 40, 'Fat Loss', 'Beginner', coach1);
  insert into public.member_diets (studio_id, member_id, plan_id, start_date, assigned_by) values (st, m, '00000000-0000-4000-8000-0000000d0001', d - 40, coach1);
  insert into public.workout_logs (member_id, item_id, date)
  select m, i.id, x.dt from public.workout_plan_items i
  cross join lateral (select g::date as dt from generate_series(d - 21, d - 1, interval '1 day') g) x
  where i.plan_id = '00000000-0000-4000-8000-0000000a0001'
    and extract(isodow from x.dt) in (1, 3, 5)
    and i.day = (array[1,1,2,2,3,3,1])[extract(isodow from x.dt)::int] and abs(hashtext(i.id::text || x.dt::text)) % 5 <> 0;
  insert into public.measurements (studio_id, member_id, measured_on, vals, weight_kg, height_cm, note, recorded_by)
  select st, m, d - k * 10, jsonb_build_object('weight_kg', w, 'waist', ws, 'general_body_fat', bf) || case when k = 4 then '{"height": 172}'::jsonb else '{}'::jsonb end
    || jsonb_build_object('bmi', round(w / 2.9584, 1)), w, case when k = 4 then 172 end, case when k = 0 then 'Feeling stronger' end, case when k = 2 then null else coach1 end
  from (values (4, 82.0, 36.0, 27.5), (3, 81.1, 35.6, 26.9), (2, 80.2, 35.2, 26.1), (1, 79.4, 34.9, 25.6), (0, 78.4, 34.5, 25.0)) as v(k, w, ws, bf);
  -- A few more clients weighed, for Weight Loss Analysis.
  insert into public.measurements (studio_id, member_id, measured_on, vals, weight_kg, recorded_by)
  select st, x.id, d - k * 12, jsonb_build_object('weight_kg', round((70 + (abs(hashtext(x.id::text)) % 20) - (2 - k) * ((abs(hashtext(x.id::text)) % 7) - 2) * 0.6)::numeric, 1)),
    round((70 + (abs(hashtext(x.id::text)) % 20) - (2 - k) * ((abs(hashtext(x.id::text)) % 7) - 2) * 0.6)::numeric, 1), coach2
  from (select id from public.members where studio_id = st and kind = 'member' and first_name in ('Aarav', 'Diya', 'Kiran', 'Meera', 'Sneha', 'Vikram')) x
  cross join generate_series(0, 2) k;

  -- Messages (Part 7b): the automatic WhatsApp of the last days, some sent, a few failed; app notifications for Rohit.
  perform app.queue_scheduled(st, k) from unnest(array['birthday', 'balance_due', 'before_expiry', 'on_expiry', 'after_expiry', 'irregular']) k;
  update public.messages set created_at = created_at - (abs(hashtext(id::text)) % 6) * interval '1 day' where studio_id = st;
  update public.messages set status = 'sent', sent_at = created_at + interval '2 minutes', attempts = 1 where studio_id = st and abs(hashtext(id::text)) % 6 <> 0;
  update public.messages set status = 'failed', attempts = 1, sent_at = created_at + interval '2 minutes',
    error = 'Some error occurred while connecting your WhatsApp. Message will be automatically retried in couple of hours'
  where studio_id = st and status = 'queued' and abs(hashtext(id::text)) % 2 = 0;
  update public.studios set settings = jsonb_set(settings, '{sms}', '{"sender_id": "SHAANF", "templates": [{"name": "Holiday notice", "template_id": "1107170000000000001", "text": "Dear {cust_first_name}, the gym will be closed tomorrow for the festival. - SHAAN FITNESS"}]}') where id = st;
  insert into public.sms_recharges (studio_id, credits, amount, paid_on, reference) values (st, 5000, 1250, d - 20, 'INV-2291');
  insert into public.notifications (studio_id, member_id, title, body, sent_by, created_at, read_at)
  select st, id, 'Diwali timings', 'The gym opens 6 AM to 12 noon on Diwali. Happy Diwali!', desk, now() - interval '3 days', now() - interval '2 days' from public.members where studio_id = st and first_name = 'Rohit'
  union all
  select st, id, 'New Zumba batch', 'A Zumba batch starts Monday at 7 PM. Ask the front desk to join.', desk, now() - interval '2 hours', null from public.members where studio_id = st and first_name = 'Rohit';
  perform app.relink_existing_users();
end $$;
