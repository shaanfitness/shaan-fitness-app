-- One-time clean-up for databases set up before 8 Oct 2026 evening: the made-up starter plans
-- (Group, Semi-Private, 1:1 Elite) and their 8 batches make way for the plans and batches copied
-- from YDL (seed-ydl.sql). Anything already used — sold, or with check-ins or batch members — is
-- kept but switched off. Safe to run more than once.
delete from public.plans p
where p.id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3')
  and not exists (select 1 from public.subscriptions s where s.plan_id = p.id);
update public.plans set active = false
where id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3');

delete from public.batches b
where b.studio_id = '00000000-0000-4000-8000-000000000001'
  and b.name in ('5:30 AM Group', '7:00 AM Group', '8:30 AM Semi-Private', '10:00 AM Elite', '4:00 PM Group', '5:30 PM Semi-Private', '7:00 PM Group', '8:30 PM Elite')
  and not exists (select 1 from public.attendance a where a.batch_id = b.id)
  and not exists (select 1 from public.batch_members m where m.batch_id = b.id)
  and not exists (select 1 from public.subscriptions s where s.batch_id = b.id);
update public.batches set active = false
where studio_id = '00000000-0000-4000-8000-000000000001'
  and name in ('5:30 AM Group', '7:00 AM Group', '8:30 AM Semi-Private', '10:00 AM Elite', '4:00 PM Group', '5:30 PM Semi-Private', '7:00 PM Group', '8:30 PM Elite');
