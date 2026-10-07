-- Shaan Fitness starting setup: the studio, its owner, the three tiers and the weekly timetable.
-- Safe to run once on a fresh database. Everything here can be changed later in the app.

insert into public.studios (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Shaan Fitness', 'shaan-fitness')
on conflict (id) do nothing;

-- The owner is linked automatically when Sabir first logs in with this phone number.
insert into public.staff (id, studio_id, role, full_name, phone, email, title)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001',
        'owner', 'Sabir Rasool', '+919502318090', 'shaanfitnessgym@gmail.com', 'Head Coach')
on conflict (id) do nothing;

-- Sabir also coaches, so he gets a coach record too.
insert into public.staff (id, studio_id, role, full_name, phone, email, title)
values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001',
        'coach', 'Sabir Rasool', '+919502318090', 'shaanfitnessgym@gmail.com', 'Head Coach')
on conflict (id) do nothing;

insert into public.plans (id, studio_id, name, tier, price, sessions, duration_days, includes_personal_coach, coach_split, sort_order)
values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'Group', 'group', 4999, 24, 28, false,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 1),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001', 'Semi-Private (Side-by-Side)', 'semi_private', 7999, 24, 28, true,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 2),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001', '1:1 Elite', 'elite', 14999, 24, 28, true,
   '[{"staff_id": "00000000-0000-4000-8000-0000000000a2", "sessions": 12}]', 3)
on conflict (id) do nothing;

-- Eight daily slots, Monday to Saturday.
insert into public.slots (studio_id, weekday, start_time, capacity, tier)
select '00000000-0000-4000-8000-000000000001', d, t.start_time, t.capacity, t.tier::public.plan_tier
from generate_series(1, 6) d
cross join (values
  ('05:30'::time, 9, 'group'),
  ('07:00'::time, 9, 'group'),
  ('08:30'::time, 2, 'semi_private'),
  ('10:00'::time, 1, 'elite'),
  ('16:00'::time, 9, 'group'),
  ('17:30'::time, 2, 'semi_private'),
  ('19:00'::time, 9, 'group'),
  ('20:30'::time, 1, 'elite')
) as t(start_time, capacity, tier)
on conflict do nothing;
