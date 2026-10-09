-- Shaan Fitness's fitness center details, app items and notices as set up in YDL (read 9 Oct 2026).
-- Fills in only what is still empty, so it is safe to run again and never overwrites the CRM's own
-- entries. Business details and public links only: owner, bank and staff personal details stay out.

update public.studios set
  street1 = coalesce(street1, 'Dr No. 3-17-32/9/FF, PNR Enclave, 5th Floor'),
  street2 = coalesce(street2, 'RTO Office Road'),
  locality = coalesce(locality, 'Godari Gunta'),
  landmark = coalesce(landmark, 'Near D-Mart'),
  pincode = coalesce(pincode, '533003'),
  tag_line = coalesce(tag_line, 'Your Trusted Health Partner'),
  capacity = case when capacity = 30 then 20 else capacity end,
  settings = jsonb_set(settings, '{website}', coalesce(settings->'website', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'facebook', case when coalesce(settings->'website'->>'facebook', '') = '' then 'https://www.facebook.com/ShaanFitnessGym' end,
    'instagram', case when coalesce(settings->'website'->>'instagram', '') = '' then 'https://www.instagram.com/shaanfitness.in' end,
    'twitter', case when coalesce(settings->'website'->>'twitter', '') = '' then 'https://x.com/ShaanFitnessGym' end,
    'youtube', case when coalesce(settings->'website'->>'youtube', '') = '' then 'https://www.youtube.com/@ShaanFitnessGym' end,
    'whatsapp', case when coalesce(settings->'website'->>'whatsapp', '') = '' then '+919642467896' end)))
where slug = 'shaan-fitness';

-- Fitness Center Timings: Monday to Saturday, 5 AM – 1 PM and 2 PM – 10 PM, everyone.
update public.studios set settings = jsonb_set(settings, '{timings}',
  '{"days": [1, 2, 3, 4, 5, 6], "sessions": [{"from": "05:00", "to": "13:00", "gender": "unisex"}, {"from": "14:00", "to": "22:00", "gender": "unisex"}]}'::jsonb)
where slug = 'shaan-fitness' and settings->'timings' is null;

-- YDL Email Manager (the password is never copied: the owner types it in Email Manager).
update public.studios set settings = jsonb_set(settings, '{email}', coalesce(settings->'email', '{}'::jsonb)
  || '{"host": "smtp.gmail.com", "port": 587, "security": "TLS", "username": "shaanfitnessgym@gmail.com", "sender_name": "Shaan Fitness Gym"}'::jsonb)
where slug = 'shaan-fitness' and coalesce(settings->'email'->>'host', '') = '';

-- YDL invoice and receipt numbering (SFG/00001/25-26 and SFG-R/00001/25-26), where ours were untouched.
update public.studios set settings = settings
  || jsonb_build_object('invoice', settings->'invoice' || '{"width": 5, "zero_fill": true, "restart": "year", "prefix": "SFG/", "suffix": "/25-26"}'::jsonb)
  || jsonb_build_object('receipt', settings->'receipt' || '{"width": 5, "zero_fill": true, "restart": "year", "prefix": "SFG-R/", "suffix": "/25-26"}'::jsonb)
where slug = 'shaan-fitness' and settings->'invoice'->>'prefix' = 'SF-INV-' and settings->'receipt'->>'prefix' = 'SF-';

-- The studio's ESSL face device (eTime server).
insert into public.biometric_devices (studio_id, serial, name, device_type, storage_types, scan_type, expiry_rule, server)
select s.id, 'CUB7235300639', 'Shaan Fitness Gym (Godari Gunta)', 'etime', '{customers}', 'face', true, 'ETIME'
from public.studios s where s.slug = 'shaan-fitness'
on conflict (studio_id, serial) do nothing;

-- Shaan Fitness's YDL action items and quick action items (own icons; YDL's pictures stay with YDL).
insert into public.app_actions (studio_id, kind, name, icon, color, active, link, show_to, ordering, created_at)
select s.id, a.kind, a.name, a.icon, a.color, true, a.link, 'both', 0, a.at::timestamptz
from public.studios s
cross join (values
  ('action', 'Browse Plans', 'browse_plans', '#000000', 'SUBSCRIPTIONS', '2024-03-09 10:00+05:30'),
  ('action', 'Track Workout', 'free_workout', '#000000', 'TRACK_WORKOUT', '2024-03-09 10:01+05:30'),
  ('action', 'Track Diet', 'track_diet', '#000000', 'DIET_PLAN', '2024-03-09 10:02+05:30'),
  ('action', 'Our Trainers', 'personal_trainer', '#000000', 'TRAINERS_LIST', '2024-03-09 10:03+05:30'),
  ('action', 'Recipes', 'recipes', '#000000', 'RECIPE_LIST', '2024-03-09 10:04+05:30'),
  ('action', 'About Us', 'browse_plans', '#000000', 'ABOUT_US', '2024-03-09 10:05+05:30'),
  ('action', 'Premium Free Trail', 'body_transformation', '#000000', 'FREE_TRIAL', '2024-03-22 10:00+05:30'),
  ('action', 'Friend Requests', 'refer_friend', '#000000', null, '2024-03-22 10:01+05:30'),
  ('action', 'Challenges', 'our_blogs', '#000000', 'CHALLENGE_LIST', '2024-04-02 10:00+05:30'),
  ('quick', 'Online Coach', null, '#ff0000', 'PT_TAB', '2024-04-08 10:00+05:30'),
  ('quick', 'Refer & Earn', 'claim_free_course', '#000000', null, '2025-04-01 10:00+05:30')
) as a(kind, name, icon, color, link, at)
where s.slug = 'shaan-fitness' and not exists (select 1 from public.app_actions x where x.studio_id = s.id);

-- Shaan Fitness's YDL notices.
insert into public.notices (studio_id, title, description, audience, active, created_at)
select s.id, n.title, n.description, 'customer', n.active, n.at::timestamptz
from public.studios s
cross join (values
  ('No Holiday on Ugadi & Ramadhan', E'Attention Shaan Fitness Gym Members!\n\nPush Through, No Pause on Progress!\n\nThis Ugadi and Ramadan, while we honor the festive spirit of our diverse team, we want to remind you that your fitness journey doesn''t take a holiday! \n\nPlease note:\n- Our Hindu trainers and staff will be celebrating Ugadi and will not be present.\n- Our Muslim trainers and staff will be observing Ramadan on their respective days.\n\nBut fear not, the gym will remain open for all members! This is your chance to show your dedication and keep the momentum going strong. Let''s turn these days into opportunities for self-improvement and personal victories.\n\nRemember, every day is a chance to be better than yesterday. So, let''s make these festive days count!\n\nYour Workout Waits for No One!\n\nStay strong, stay motivated, and most importantly, stay on track. We believe in you!\n\nShaan Fitness Gym Management', false, '2024-04-01 10:00+05:30'),
  ('Eid al-Fitr', 'Shaan Fitness Gym will be closed on 11th April for Eid-ul-Fitr. We’ll reopen on 12th April. Thanks for your understanding.', true, '2024-04-09 10:00+05:30'),
  ('Eid al-Fitr', 'Shaan Fitness Gym will be closed on 11th April for Eid-ul-Fitr. We’ll reopen on 12th April. Thanks for your understanding.', true, '2024-04-09 10:01+05:30')
) as n(title, description, active, at)
where s.slug = 'shaan-fitness' and not exists (select 1 from public.notices x where x.studio_id = s.id);
