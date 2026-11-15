-- Part 11: the website's subscriptions come from the dashboard.
-- Settings › Website holds the ways to train the studio sells (name, a one-line note, people per coach, price, weeks),
-- one switch for showing prices and one for showing group sizes, and the number the website's call buttons use.
-- The website draws one figure per person from the group size, so changing 8 to 6 in the dashboard changes the picture.

create or replace function app.default_offers()
returns jsonb language sql immutable as $$
  select '[
    {"name": "Advanced Training", "note": "Group of 8 approx", "size": 8, "price": 4999, "weeks": 4, "show": true},
    {"name": "Elite Coaching", "note": "Side-by-side personal training", "size": 2, "price": 7999, "weeks": 4, "show": true},
    {"name": "VIP Coaching", "note": "One-on-one", "size": 1, "price": 13999, "weeks": 4, "show": true}
  ]'::jsonb;
$$;

create or replace function app.default_website()
returns jsonb language sql immutable as $$
  select '{
    "hero_title": null, "hero_text": null, "about": null, "hero_image_url": null,
    "opening_hours": null, "whatsapp": null, "phone": null, "instagram": null, "facebook": null, "youtube": null, "map_url": null,
    "twitter": null, "linkedin": null, "video": null,
    "show_prices": true, "show_sizes": true, "show_timings": true, "show_trainers": true, "show_results": true
  }'::jsonb || jsonb_build_object('offers', app.default_offers());
$$;

-- What the owner typed, made safe to keep: at most six subscriptions, each with a name.
create or replace function app.clean_offers(p jsonb)
returns jsonb language plpgsql immutable as $$
declare o jsonb; v_out jsonb := '[]'::jsonb; v_name text; v_size int; v_weeks int; v_price numeric;
begin
  if p is null or jsonb_typeof(p) <> 'array' then raise exception 'The subscriptions list is not valid'; end if;
  if jsonb_array_length(p) > 6 then raise exception 'The website shows at most 6 subscriptions'; end if;
  for o in select * from jsonb_array_elements(p) loop
    v_name := left(regexp_replace(trim(coalesce(o->>'name', '')), '\s+', ' ', 'g'), 60);
    if v_name = '' then raise exception 'Every subscription needs a name'; end if;
    begin
      v_size := round(nullif(trim(o->>'size'), '')::numeric)::int;
      v_weeks := round(nullif(trim(o->>'weeks'), '')::numeric)::int;
      v_price := round(nullif(trim(o->>'price'), '')::numeric);
    exception when others then
      raise exception 'Group size, price and weeks must be numbers (%)', v_name;
    end;
    if v_size is null or v_size < 1 or v_size > 30 then raise exception 'People per coach must be between 1 and 30 (%)', v_name; end if;
    if v_weeks is null or v_weeks < 1 or v_weeks > 52 then raise exception 'Weeks must be between 1 and 52 (%)', v_name; end if;
    if v_price is not null and (v_price < 0 or v_price > 9999999) then raise exception 'That price is out of range (%)', v_name; end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'name', v_name,
      'note', left(nullif(regexp_replace(trim(coalesce(o->>'note', '')), '\s+', ' ', 'g'), ''), 120),
      'size', v_size, 'price', v_price, 'weeks', v_weeks,
      'show', coalesce((o->>'show')::boolean, true)));
  end loop;
  return v_out;
end $$;

-- What visitors get: only the subscriptions switched on, without prices or sizes the owner has hidden.
create or replace function app.public_offers(w jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', o->>'name', 'note', o->>'note', 'weeks', o->'weeks',
      'size', case when coalesce((w->>'show_sizes')::boolean, true) then o->'size' end,
      'price', case when coalesce((w->>'show_prices')::boolean, true) then o->'price' end) order by ord), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(w->'offers') = 'array' then w->'offers' else app.default_offers() end)
       with ordinality as t(o, ord)
  where coalesce((o->>'show')::boolean, true);
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
        when k = 'offers' then app.clean_offers(p->'website'->'offers')
        when k like 'show_%' then to_jsonb(coalesce((p->'website'->>k)::boolean, true))
        else to_jsonb(nullif(left(trim(p->'website'->>k), 2000), '')) end);
    end if;
  end loop;
  if coalesce(v_web->>'map_url', '') <> '' and v_web->>'map_url' !~ '^https://' then raise exception 'The map link must start with https://'; end if;
  if coalesce(v_web->>'hero_image_url', '') <> '' and v_web->>'hero_image_url' !~ '^https://|^http://127\.0\.0\.1' then raise exception 'The picture link must start with https://'; end if;
  if coalesce(v_web->>'phone', '') <> '' and (v_web->>'phone' !~ '^[0-9+ ()-]{10,20}$' or length(app.digits(v_web->>'phone')) < 10) then
    raise exception 'Enter the call number with all 10 digits';
  end if;
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
revoke all on function public.save_website(uuid, jsonb) from public, anon;
grant execute on function public.save_website(uuid, jsonb) to authenticated;

-- The public summary, as before, with the subscriptions visitors may see. The studio's own mobile (kept for invoices)
-- no longer goes to visitors: the website calls the number set for it.
create or replace function public.site_info(p_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; w jsonb; v_today date;
begin
  select * into s from public.studios st
  where st.active and (p_slug is null or st.slug = p_slug)
  order by st.created_at limit 1;
  if s.id is null then return null; end if;
  w := app.default_website() || coalesce(s.settings->'website', '{}'::jsonb);
  w := w || jsonb_build_object('offers', app.public_offers(w));
  v_today := (now() at time zone coalesce(s.timezone, 'Asia/Kolkata'))::date;
  return jsonb_build_object(
    'studio', jsonb_build_object(
      'name', s.name, 'branch', s.branch_name, 'slug', s.slug, 'tag_line', s.tag_line, 'description', s.description,
      'mobile', coalesce(nullif(w->>'phone', ''), s.landline), 'landline', s.landline, 'email', s.email, 'street1', s.street1, 'street2', s.street2,
      'locality', s.locality, 'landmark', s.landmark,
      'city', s.city, 'state', s.state, 'pincode', s.pincode, 'facilities', to_jsonb(s.facilities),
      'logo_url', s.logo_url, 'currency', s.currency,
      'theme', coalesce(s.settings->'themes'->>'member', 'club'),
      'timings', s.settings->'timings',
      'can_sign_up', coalesce((s.settings->'app'->>'can_sign_up')::boolean, true)),
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

-- The studio's public numbers, set once (the owner changes them in Settings › Website from here on).
update public.studios st set settings = jsonb_set(coalesce(st.settings, '{}'::jsonb), '{website}',
    coalesce(st.settings->'website', '{}'::jsonb) || '{"phone": "+919642467896", "whatsapp": "+919963547869"}'::jsonb)
where st.id = (select id from public.studios where active order by created_at limit 1)
  and st.name ilike 'Shaan%'
  and coalesce(st.settings->'website'->>'phone', '') = '';
