-- Shaan Fitness starting setup: the studio, Sabir's owner and coach records,
-- the three membership tiers and the weekly batches. Everything can be changed in the app.
-- The studio insert also creates YDL's dropdown lists and service categories.

insert into public.studios (id, name, branch_name, slug, email, mobile, city, state, country, capacity, facilities)
values ('00000000-0000-4000-8000-000000000001', 'Shaan Fitness', 'Godari Gunta', 'shaan-fitness',
        'shaanfitnessgym@gmail.com', '+919502318090', 'Kakinada', 'Andhra Pradesh', 'India', 30,
        array['Locker','Shower','Training','Steam','Sauna','Wifi','Toilet','Biometric','Changing Room','Separate weight loss',
              'Cardio Training area','Fat Loss','Weight Loss','Weight Gain','Cardio','Strength Training','Natural Bodybuilding',
              'Injury Rehab','Weight Training','Crossfit Workout','Calisthenics','Special Population Training',
              'Nutrition Counselling','Transformation Plans'])
on conflict (id) do nothing;

-- Sabir is the owner and also coaches, so he has both records.
insert into public.staff (id, studio_id, role, first_name, last_name, phone, email, title, employee_type, star_trainer)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'owner', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Gym Owner', false),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'coach', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Head Trainer/Nutritionist', true)
on conflict (id) do nothing;

insert into public.plans (id, studio_id, name, kind, tier, service_ids, trainer_ids, session_count, tenure_value, tenure_unit,
                          price, includes_personal_coach, coach_split, app_sequence)
select v.id::uuid, '00000000-0000-4000-8000-000000000001', v.name, v.kind, v.tier,
       array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = v.service),
       array['00000000-0000-4000-8000-0000000000a2']::uuid[], 24, 28, 'days', v.price, v.pc,
       '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]'::jsonb, v.seq
from (values
  ('00000000-0000-4000-8000-0000000000b1', 'Group', 'gym', 'group', 'Group Activity', 4999, false, 1),
  ('00000000-0000-4000-8000-0000000000b2', 'Semi-Private (Side-by-Side)', 'pt', 'semi_private', 'Personal Training / Nutrition', 7999, true, 2),
  ('00000000-0000-4000-8000-0000000000b3', '1:1 Elite', 'pt', 'elite', 'Personal Training / Nutrition', 14999, true, 3)
) as v(id, name, kind, tier, service, price, pc, seq)
on conflict (id) do nothing;

-- Eight one-hour batches, Monday to Saturday.
insert into public.batches (studio_id, name, capacity, trainer_ids, service_ids, days, start_time, end_time, tier)
select '00000000-0000-4000-8000-000000000001', t.name, t.capacity,
       array['00000000-0000-4000-8000-0000000000a2']::uuid[],
       array(select s.id from public.services s where s.studio_id = '00000000-0000-4000-8000-000000000001' and s.name = t.service),
       '{1,2,3,4,5,6}', t.start_time, t.start_time + interval '1 hour', t.tier
from (values
  ('5:30 AM Group',         '05:30'::time, 9, 'group',        'Group Activity'),
  ('7:00 AM Group',         '07:00'::time, 9, 'group',        'Group Activity'),
  ('8:30 AM Semi-Private',  '08:30'::time, 2, 'semi_private', 'Personal Training / Nutrition'),
  ('10:00 AM Elite',        '10:00'::time, 1, 'elite',        'Personal Training / Nutrition'),
  ('4:00 PM Group',         '16:00'::time, 9, 'group',        'Group Activity'),
  ('5:30 PM Semi-Private',  '17:30'::time, 2, 'semi_private', 'Personal Training / Nutrition'),
  ('7:00 PM Group',         '19:00'::time, 9, 'group',        'Group Activity'),
  ('8:30 PM Elite',         '20:30'::time, 1, 'elite',        'Personal Training / Nutrition')
) as t(name, start_time, capacity, tier, service)
where not exists (select 1 from public.batches b where b.studio_id = '00000000-0000-4000-8000-000000000001');

-- Logins made before this setup (the owner's) get linked again.
select app.relink_existing_users();
