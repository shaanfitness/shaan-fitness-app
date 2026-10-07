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

  -- A few members renewing soon and one expired last week.
  update public.subscriptions set base_end_date = d + 3 where id in (select id from public.subscriptions order by start_date limit 2);
  update public.members set lead_status = 'not_interested' where kind = 'enquiry' and first_name in ('Ramya', 'Ganesh');
  perform app.relink_existing_users();
end $$;
