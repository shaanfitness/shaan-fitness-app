-- Part 10: the new public website.
-- "Book a free trial" works without an account: a visitor leaves a name and mobile number, and the front desk gets an
-- enquiry, a follow-up to call and a notification, just like a sign-up. Abuse is limited (a hidden field catches robots,
-- one request per number per day, at most 20 a studio in ten minutes) and the request log keeps 90 days only.

create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  name text not null,
  phone text not null,
  interest text,
  best_time text,
  message text,
  page text,
  created_at timestamptz not null default now()
);
create index if not exists site_leads_recent_idx on public.site_leads (studio_id, created_at desc);
create index if not exists site_leads_phone_idx on public.site_leads (studio_id, phone, created_at desc);
-- Read and written only by site_enquiry; the requests themselves show up as enquiries and follow-ups.
alter table public.site_leads enable row level security;
revoke all on public.site_leads from anon, authenticated;

create or replace function public.site_enquiry(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_studio uuid; v_name text; v_digits text; v_phone text; v_interest text; v_time text; v_msg text; v_page text;
  v_member uuid; v_known text; v_first text; v_last text; v_label text; v_like text; v_services uuid[];
begin
  -- Robots fill the hidden "website" field; they get a polite answer and nothing is saved.
  if coalesce(p->>'website', '') <> '' then return 'sent'; end if;

  select id into v_studio from public.studios where slug = p->>'studio' and active;
  if v_studio is null then select id into v_studio from public.studios where active order by created_at limit 1; end if;
  if v_studio is null then raise exception 'The gym is not taking requests right now. Please call us.'; end if;

  v_name := regexp_replace(trim(coalesce(p->>'name', '')), '\s+', ' ', 'g');
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Enter your name.'; end if;
  v_digits := coalesce(app.digits(p->>'phone'), '');
  v_phone := case when length(v_digits) = 10 then v_digits
                  when length(v_digits) = 12 and left(v_digits, 2) = '91' then right(v_digits, 10)
                  when length(v_digits) = 11 and left(v_digits, 1) = '0' then right(v_digits, 10) end;
  if v_phone is null or v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit mobile number.'; end if;
  v_interest := case when p->>'interest' in ('trial', 'personal', 'group', 'weight_loss', 'strength') then p->>'interest' else 'trial' end;
  v_time := case when p->>'time' in ('morning', 'evening', 'any') then p->>'time' else 'any' end;
  v_msg := left(nullif(regexp_replace(trim(coalesce(p->>'message', '')), '\s+', ' ', 'g'), ''), 500);
  v_page := left(nullif(trim(coalesce(p->>'page', '')), ''), 80);

  -- One at a time per studio, so the limits below count correctly.
  perform pg_advisory_xact_lock(hashtext('site_enquiry:' || v_studio::text));
  delete from public.site_leads where created_at < now() - interval '90 days';
  if exists (select 1 from public.site_leads l where l.studio_id = v_studio and l.phone = v_phone and l.created_at > now() - interval '1 day') then
    return 'already';
  end if;
  if (select count(*) from public.site_leads l where l.studio_id = v_studio and l.created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many requests right now. Please call or WhatsApp us.';
  end if;

  v_label := case v_interest when 'personal' then 'Personal training' when 'group' then 'Group training'
                             when 'weight_loss' then 'Weight loss' when 'strength' then 'Strength and muscle' end;
  v_like := case v_interest when 'personal' then '%personal%' when 'group' then '%group%'
                            when 'weight_loss' then '%weight loss%' when 'strength' then '%strength%' end;

  -- Someone the gym already knows (a member or an earlier enquiry with this number) gets the follow-up on their record.
  select m.id, coalesce(m.member_code, m.enquiry_code, '') || ' ' || m.full_name into v_member, v_known
  from public.members m
  where m.studio_id = v_studio and m.deleted_at is null and app.same_phone(m.phone, v_phone)
  order by (m.kind = 'member') desc, m.created_at desc limit 1;

  if v_member is null then
    v_first := left(split_part(v_name, ' ', 1), 60);
    v_last := left(nullif(trim(substr(v_name, length(split_part(v_name, ' ', 1)) + 1)), ''), 60);
    select coalesce(array_agg(v.id), '{}') into v_services from public.services v
    where v.studio_id = v_studio and v_like is not null and lower(coalesce(nullif(v.custom_name, ''), v.name)) like v_like;
    insert into public.members (studio_id, kind, first_name, last_name, phone, source_promotion, enquiry_date, interested_service_ids)
    values (v_studio, 'enquiry', v_first, v_last, v_phone, 'Website', (now() at time zone 'Asia/Kolkata')::date, v_services)
    returning id into v_member;
    v_known := null;
  end if;

  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (v_studio, v_member, 'Assign Trial', now(), 'open', 'Phone',
          'Asked for a free trial on the website'
          || coalesce('. Interested in ' || v_label, '')
          || case v_time when 'morning' then '. Prefers mornings' when 'evening' then '. Prefers evenings' else '' end
          || coalesce('. Message: "' || v_msg || '"', '')
          || case when v_known is not null then '. Gave the name ' || v_name || ' (already with you as ' || trim(v_known) || ')' else '' end
          || '. Call to fix the trial.',
          'system');

  insert into public.site_leads (studio_id, member_id, name, phone, interest, best_time, message, page)
  values (v_studio, v_member, v_name, v_phone, v_interest, v_time, v_msg, v_page);
  return 'sent';
end $$;
revoke all on function public.site_enquiry(jsonb) from public;
grant execute on function public.site_enquiry(jsonb) to anon, authenticated;

-- The front desk's notification for it (the rest as in part 8).
create or replace function app.alert_follow_up()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_kind text; v_title text;
begin
  select m.full_name into v_name from public.members m where m.id = new.member_id;
  if new.notes like 'Joined on the website%' then v_kind := 'signup'; v_title := v_name || ' signed up on the website';
  elsif new.notes like 'Asked for a free trial on the website%' then v_kind := 'trial'; v_title := v_name || ' asked for a free trial on the website';
  elsif new.notes like 'Asked for a free trial in the app%' then v_kind := 'trial'; v_title := v_name || ' asked for a free trial';
  elsif new.notes like 'Asked for a call back in the app%' then v_kind := 'callback'; v_title := v_name || ' asked for a call back';
  elsif new.notes like 'Wants to join%' then v_kind := 'plan'; v_title := v_name || ' wants to join';
  elsif new.notes like 'Referred by % in the app%' then v_kind := 'referral'; v_title := 'New referral: ' || v_name;
  else return null;
  end if;
  perform app.add_alert(new.studio_id, v_kind, new.member_id, v_title, new.notes, '/clients/' || new.member_id || '/follow-ups', new.id);
  return null;
end $$;
