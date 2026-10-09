-- Shaan Fitness starting setup: the studio and Sabir's owner and coach records.
-- The studio insert also creates YDL's dropdown lists and service categories.
-- Plans and batches come from seed-ydl.sql (copied from YDL). Everything can be changed in the app.

insert into public.studios (id, name, branch_name, slug, email, mobile, city, state, country, capacity, facilities)
values ('00000000-0000-4000-8000-000000000001', 'Shaan Fitness', 'Godari Gunta', 'shaan-fitness',
        'shaanfitnessgym@gmail.com', '+919502318090', 'Kakinada', 'Andhra Pradesh', 'India', 30,
        array['Locker','Shower','Training','Steam','Sauna','Wifi','Toilet','Biometric','Changing Room','Separate weight loss',
              'Cardio Training area','Fat Loss','Weight Loss','Weight Gain','Cardio','Strength Training','Natural Bodybuilding',
              'Injury Rehab','Weight Training','Crossfit Workout','Calisthenics','Special Population Training',
              'Nutrition Counselling','Transformation Plans'])
on conflict (id) do nothing;

-- Sabir is the owner and also coaches, so he has both records.
insert into public.staff (id, studio_id, role, first_name, last_name, phone, email, title, employee_type, star_trainer, access_type)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'owner', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Gym Owner', false, 'owner'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'coach', 'Sabir', 'Rasool',
   '9502318090', 'shaanfitnessgym@gmail.com', 'Head Coach', 'Head Trainer/Nutritionist', true, null)
on conflict (id) do nothing;

-- Logins made before this setup (the owner's) get linked again.
select app.relink_existing_users();
