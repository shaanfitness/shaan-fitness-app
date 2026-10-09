-- Shaan Fitness app · 11. Website, joining and logins
-- One address for everything: the public website, the member and coach app, and the CRM.
--  * The website reads one safe summary (studio contact, plans, timings, coaches, consented
--    results). Never a member's or staff member's personal details.
--  * A login joins a staff or client record only by a verified email or mobile number.
--  * Someone who joins on the website becomes an enquiry with a follow-up for the front desk.

-- ---------------------------------------------------------------------------
-- Website settings (Settings › Website): words, links and what the site shows.
-- ---------------------------------------------------------------------------
create or replace function app.default_website()
returns jsonb language sql immutable as $$
  select '{
    "hero_title": null, "hero_text": null, "about": null, "hero_image_url": null,
    "opening_hours": null, "whatsapp": null, "instagram": null, "facebook": null, "youtube": null, "map_url": null,
    "show_prices": true, "show_timings": true, "show_trainers": true, "show_results": true
  }'::jsonb;
$$;

create or replace function public.save_website(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_web jsonb; v_s jsonb := coalesce(p->'studio', '{}'::jsonb); k text;
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change the website'; end if;
  select coalesce(settings->'website', '{}'::jsonb) into v_web from public.studios where id = p_studio;
  for k in select jsonb_object_keys(app.default_website()) loop
    if (p->'website') ? k then
      v_web := v_web || jsonb_build_object(k, case
        when k like 'show_%' then to_jsonb(coalesce((p->'website'->>k)::boolean, true))
        else to_jsonb(nullif(left(trim(p->'website'->>k), 2000), '')) end);
    end if;
  end loop;
  if coalesce(v_web->>'map_url', '') <> '' and v_web->>'map_url' !~ '^https://' then raise exception 'The map link must start with https://'; end if;
  if coalesce(v_web->>'hero_image_url', '') <> '' and v_web->>'hero_image_url' !~ '^https://|^http://127\.0\.0\.1' then raise exception 'The picture link must start with https://'; end if;
  update public.studios set
    settings = jsonb_set(settings, '{website}', v_web),
    tag_line = case when v_s ? 'tag_line' then nullif(trim(v_s->>'tag_line'), '') else tag_line end,
    description = case when v_s ? 'description' then nullif(trim(v_s->>'description'), '') else description end,
    mobile = case when v_s ? 'mobile' then nullif(trim(v_s->>'mobile'), '') else mobile end,
    landline = case when v_s ? 'landline' then nullif(trim(v_s->>'landline'), '') else landline end,
    email = case when v_s ? 'email' then nullif(trim(v_s->>'email'), '') else email end,
    street1 = case when v_s ? 'street1' then nullif(trim(v_s->>'street1'), '') else street1 end,
    street2 = case when v_s ? 'street2' then nullif(trim(v_s->>'street2'), '') else street2 end,
    city = case when v_s ? 'city' then nullif(trim(v_s->>'city'), '') else city end,
    state = case when v_s ? 'state' then nullif(trim(v_s->>'state'), '') else state end,
    pincode = case when v_s ? 'pincode' then nullif(trim(v_s->>'pincode'), '') else pincode end
  where id = p_studio;
end $$;

-- ---------------------------------------------------------------------------
-- What the public website shows. Open to everyone, so it lists fields one by one.
-- ---------------------------------------------------------------------------
create or replace function public.site_info(p_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; w jsonb; v_today date;
begin
  select * into s from public.studios st
  where st.active and (p_slug is null or st.slug = p_slug)
  order by st.created_at limit 1;
  if s.id is null then return null; end if;
  w := app.default_website() || coalesce(s.settings->'website', '{}'::jsonb);
  v_today := (now() at time zone coalesce(s.timezone, 'Asia/Kolkata'))::date;
  return jsonb_build_object(
    'studio', jsonb_build_object(
      'name', s.name, 'branch', s.branch_name, 'slug', s.slug, 'tag_line', s.tag_line, 'description', s.description,
      'mobile', s.mobile, 'landline', s.landline, 'email', s.email, 'street1', s.street1, 'street2', s.street2,
      'city', s.city, 'state', s.state, 'pincode', s.pincode, 'facilities', to_jsonb(s.facilities),
      'logo_url', s.logo_url, 'currency', s.currency,
      'theme', coalesce(s.settings->'themes'->>'member', 'club')),
    'website', w,
    'services', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', coalesce(nullif(v.custom_name, ''), v.name), 'banner_url', v.banner_url)
                                order by v.sort, v.name), '[]'::jsonb)
      from public.services v where v.studio_id = s.id and v.active and v.show_in_app),
    'plans', case when coalesce((w->>'show_prices')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'kind', p.kind, 'tenure_value', p.tenure_value, 'tenure_unit', p.tenure_unit,
          'session_count', p.session_count, 'unlimited_sessions', p.unlimited_sessions, 'is_free_trial', p.is_free_trial,
          'price', p.price, 'discount_price', p.discount_price, 'total_price', p.total_price, 'image_url', p.image_url,
          'description', p.description,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (p.service_ids)))
        order by p.app_sequence, p.kind, p.total_price), '[]'::jsonb)
      from public.plans p where p.studio_id = s.id and p.active and p.show_in_app) else '[]'::jsonb end,
    'batches', case when coalesce((w->>'show_timings')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', b.id, 'name', b.name, 'start_time', b.start_time, 'end_time', b.end_time, 'days', to_jsonb(b.days), 'gender', b.gender,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (b.service_ids)))
        order by b.start_time, b.name), '[]'::jsonb)
      from public.batches b
      where b.studio_id = s.id and b.active
        and (b.end_date is null or b.end_date >= v_today)) else '[]'::jsonb end,
    'trainers', case when coalesce((w->>'show_trainers')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', t.id, 'name', t.full_name, 'title', t.title, 'designation', t.designation, 'years_experience', t.years_experience,
          'star', t.star_trainer, 'photo_url', case when t.photo_url ~ '^https?://' then t.photo_url end,
          'services', (select coalesce(jsonb_agg(coalesce(nullif(v.custom_name, ''), v.name) order by v.sort), '[]'::jsonb)
                       from public.services v where v.id = any (t.service_ids)))
        order by t.star_trainer desc, t.years_experience desc nulls last, t.full_name), '[]'::jsonb)
      from public.staff t
      where t.studio_id = s.id and t.role = 'coach' and t.active and t.deleted_at is null and t.show_in_member_app) else '[]'::jsonb end,
    'results', case when coalesce((w->>'show_results')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'client_name', r.client_name, 'image_url', r.image_url, 'period_value', r.period_value, 'period_unit', r.period_unit,
          'title', r.title, 'description', r.description,
          'trainer', (select t.full_name from public.staff t where t.id = r.trainer_id))
        order by r.created_at desc), '[]'::jsonb)
      from public.transformations r where r.studio_id = s.id and r.consent and r.show_in_app) else '[]'::jsonb end
  );
end $$;
revoke all on function public.site_info(text) from public;
grant execute on function public.site_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Logins: link only what has been verified.
-- An email counts once its owner clicked the confirmation link; a mobile number once
-- its one-time code was entered. Until then the login reaches nothing.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;

create or replace function app.link_user(p_id uuid, p_phone text, p_email text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, email, full_name) values (p_id, p_phone, p_email, p_name)
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  update public.staff s set user_id = p_id
  where s.user_id is null and s.active
    and ((p_phone is not null and app.same_phone(s.country_code || coalesce(s.phone, ''), p_phone))
      or (p_phone is not null and app.same_phone(s.phone, p_phone))
      or (p_email is not null and lower(s.email) = lower(p_email)));

  update public.members m set user_id = p_id
  where m.user_id is null and m.deleted_at is null
    and ((p_phone is not null and app.same_phone(m.phone, p_phone))
      or (p_email is not null and lower(m.email) = lower(p_email)));
end $$;

-- Someone new who joined on the website: an enquiry, and a follow-up so the front desk calls.
create or replace function app.join_from_website(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u record; v_studio uuid; v_member uuid; v_first text; v_last text; v_phone text; v_gender text;
  v_dupe text; v_interest text; v_services uuid[]; v_plan text;
begin
  select au.id, au.email, au.email_confirmed_at, au.raw_user_meta_data as meta into u from auth.users au where au.id = p_user;
  if u.id is null or coalesce(u.meta->>'signup', '') <> 'website' then return; end if;
  if exists (select 1 from public.staff where user_id = p_user)
     or exists (select 1 from public.members where user_id = p_user and deleted_at is null) then return; end if;

  select id into v_studio from public.studios where slug = u.meta->>'studio' and active;
  if v_studio is null then select id into v_studio from public.studios where active order by created_at limit 1; end if;
  if v_studio is null then return; end if;

  v_first := left(coalesce(nullif(trim(u.meta->>'first_name'), ''), nullif(split_part(trim(coalesce(u.meta->>'full_name', '')), ' ', 1), ''), 'New client'), 60);
  v_last := left(nullif(trim(u.meta->>'last_name'), ''), 60);
  v_phone := right(app.digits(u.meta->>'phone'), 10);
  v_gender := case when u.meta->>'gender' in ('male', 'female', 'other') then u.meta->>'gender' end;
  v_interest := left(nullif(trim(u.meta->>'interest'), ''), 120);
  select coalesce(array_agg(v.id), '{}') into v_services from public.services v
  where v.studio_id = v_studio and v_interest is not null and lower(coalesce(nullif(v.custom_name, ''), v.name)) = lower(v_interest);
  if coalesce(u.meta->>'plan', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select p.name into v_plan from public.plans p where p.id = (u.meta->>'plan')::uuid and p.studio_id = v_studio and p.active;
  end if;

  insert into public.members (studio_id, user_id, kind, first_name, last_name, email, phone, gender,
                              source_promotion, enquiry_date, interested_service_ids)
  values (v_studio, p_user, 'enquiry', v_first, v_last, case when u.email_confirmed_at is not null then u.email end,
          v_phone, v_gender, 'Website', (now() at time zone 'Asia/Kolkata')::date, v_services)
  returning id into v_member;

  select string_agg(coalesce(m.member_code, m.enquiry_code, '') || ' ' || m.full_name, ', ') into v_dupe
  from public.members m
  where m.studio_id = v_studio and m.id <> v_member and m.deleted_at is null and v_phone is not null and app.same_phone(m.phone, v_phone);

  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (v_studio, v_member, 'Enquiry', now(), 'open', 'Phone',
          'Joined on the website' || coalesce('. Interested in ' || v_interest, '') || coalesce('. Chose the plan ' || v_plan, '')
          || '. Call to welcome them and book a trial.'
          || case when v_dupe is not null then ' Same mobile as ' || v_dupe || ': if it''s the same person, add this email ('
               || coalesce(u.email, '') || ') to that client and their login moves there.' else '' end,
          'system');
end $$;

create or replace function app.link_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_phone text;
begin
  if tg_op = 'UPDATE'
     and new.email_confirmed_at is not distinct from old.email_confirmed_at
     and new.phone_confirmed_at is not distinct from old.phone_confirmed_at
     and new.email is not distinct from old.email
     and new.phone is not distinct from old.phone then
    return new;
  end if;
  v_email := case when new.email_confirmed_at is not null then new.email end;
  v_phone := case when new.phone_confirmed_at is not null then new.phone end;
  perform app.link_user(new.id, v_phone, v_email, new.raw_user_meta_data->>'full_name');
  if new.raw_user_meta_data ? 'privacy_version' then
    update public.profiles set privacy_version = left(new.raw_user_meta_data->>'privacy_version', 40),
                               privacy_accepted_at = coalesce(privacy_accepted_at, new.created_at)
    where id = new.id and privacy_version is null;
  end if;
  if v_email is not null or v_phone is not null then
    -- Never let a problem here stop someone from signing up.
    begin
      perform app.join_from_website(new.id);
    exception when others then
      raise warning 'Shaan Fitness: could not make the website enquiry for %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;

-- Part 1's on_auth_user_created trigger already runs app.link_new_user() for new logins; this one
-- runs it again when an email or mobile number gets verified. (Supabase lets us add triggers to
-- auth.users but not drop them, so it's only created when missing.)
do $t$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_verified' and tgrelid = 'auth.users'::regclass) then
    create trigger on_auth_user_verified after update of email_confirmed_at, phone_confirmed_at, email, phone on auth.users
      for each row execute function app.link_new_user();
  end if;
end $t$;

-- Owner-made staff logins also wait for a verified email before they're linked automatically
-- (the owner can still link one by hand from the staff list).
create or replace function app.relink_existing_users()
returns void language plpgsql security definer set search_path = '' as $$
declare u record;
begin
  for u in select id, case when phone_confirmed_at is not null then phone end as phone,
                  case when email_confirmed_at is not null then email end as email,
                  raw_user_meta_data->>'full_name' as name from auth.users loop
    perform app.link_user(u.id, u.phone, u.email, u.name);
  end loop;
end $$;

-- When the front desk puts a verified email or mobile on a client, that person's login moves
-- there; an empty website enquiry it sat on is retired.
create or replace function app.members_relink()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_old uuid;
begin
  if new.user_id is not null or new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and new.email is not distinct from old.email and new.phone is not distinct from old.phone then return new; end if;
  select au.id into v_user from auth.users au
  where (new.email is not null and au.email_confirmed_at is not null and lower(au.email) = lower(new.email))
     or (new.phone is not null and au.phone_confirmed_at is not null and app.same_phone(new.phone, au.phone))
  order by au.created_at limit 1;
  if v_user is null then return new; end if;
  for v_old in
    select m.id from public.members m
    where m.user_id = v_user and m.studio_id = new.studio_id and m.id <> new.id and m.deleted_at is null
      and m.kind = 'enquiry' and m.source_promotion = 'Website'
      and not exists (select 1 from public.subscriptions s where s.member_id = m.id)
  loop
    update public.members set user_id = null, deleted_at = now() where id = v_old;
    update public.follow_ups set status = 'done', response_note = 'Joined with ' || new.full_name || '''s record', responded_at = now()
    where member_id = v_old and status = 'open';
  end loop;
  if exists (select 1 from public.members m where m.user_id = v_user and m.studio_id = new.studio_id and m.id <> new.id and m.deleted_at is null) then
    return new;
  end if;
  new.user_id := v_user;
  return new;
end $$;
drop trigger if exists members_relink on public.members;
create trigger members_relink before insert or update of email, phone on public.members
  for each row execute function app.members_relink();

-- ---------------------------------------------------------------------------
-- From the member app: "Book a free trial" / "Call me back" / "I want this plan".
-- ---------------------------------------------------------------------------
create or replace function public.request_callback(p_member uuid, p_what text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.members; v_type text; v_text text;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  if m.id is null or m.user_id is distinct from auth.uid() then raise exception 'You can only ask for yourself'; end if;
  if p_what not in ('trial', 'callback', 'plan') then raise exception 'Unknown request'; end if;
  v_type := case p_what when 'trial' then 'Assign Trial' when 'plan' then 'Ready To Sign Up' else 'Enquiry' end;
  v_text := case p_what when 'trial' then 'Asked for a free trial in the app'
                        when 'plan' then 'Wants to join' || coalesce(': ' || left(nullif(trim(p_note), ''), 160), '')
                        else 'Asked for a call back in the app' end;
  if exists (select 1 from public.follow_ups f where f.member_id = m.id and f.status = 'open' and f.type = v_type
             and f.source = 'system' and f.created_at > now() - interval '1 day') then
    return 'already';
  end if;
  insert into public.follow_ups (studio_id, member_id, type, due_at, status, contact_type, notes, source)
  values (m.studio_id, m.id, v_type, now(), 'open', 'Phone', v_text, 'system');
  return 'sent';
end $$;
revoke all on function public.request_callback(uuid, text, text) from public, anon;
grant execute on function public.request_callback(uuid, text, text) to authenticated;
revoke all on function public.save_website(uuid, jsonb) from public, anon;
grant execute on function public.save_website(uuid, jsonb) to authenticated;
