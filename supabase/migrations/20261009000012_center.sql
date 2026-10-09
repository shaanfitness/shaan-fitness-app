-- Shaan Fitness app · 12. Fitness Center and App Settings (YDL replica part 5)
-- YDL's "Fitness Center" menu (My Fitness Centers with its four-step profile, Fitness Center
-- Settings, Invoice Settings, Biometric Manager and Extended Biometric Manager, DLT OTP Manager,
-- Email Manager, Holiday, Equipment, Notices, Rules, Currency, Feedback) and "App Settings"
-- (On/Off Permission, Services List, Gallery, Action Items, Quick Action Items, Banners,
-- Social Links & QR, Measurement Settings). Defaults are Shaan Fitness's own YDL values,
-- read on 9 October 2026.

-- ---------------------------------------------------------------------------
-- Fitness center profile: address details and timings live on the studio (the website shows
-- them); billing, bank, owner and manager details are owner-only (studio_private).
-- ---------------------------------------------------------------------------
alter table public.studios
  add column if not exists locality text,
  add column if not exists landmark text;

create table public.studio_private (
  studio_id uuid primary key references public.studios(id) on delete cascade,
  company_name text,
  billing jsonb not null default '{}'::jsonb,   -- address1, address2, city, state, pincode, country
  company_pan text,
  bank jsonb not null default '{}'::jsonb,      -- account_no, holder, ifsc, bank_name, branch
  owner jsonb not null default '{}'::jsonb,     -- name, email, mobile
  manager jsonb not null default '{}'::jsonb,   -- name, email, mobile
  support jsonb not null default '{}'::jsonb,   -- email, mobile, toll_free
  updated_at timestamptz not null default now()
);
alter table public.studio_private enable row level security;
create policy studio_private_owner on public.studio_private for all to authenticated
  using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create trigger studio_private_log after insert or update or delete on public.studio_private for each row execute function app.log_activity();

-- Passwords and API keys (SMTP password, SMS vendor key): written, never read back by the app.
create table public.studio_secrets (
  studio_id uuid not null references public.studios(id) on delete cascade,
  key text not null check (key in ('smtp_password', 'otp_vendor_api_key')),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (studio_id, key)
);
alter table public.studio_secrets enable row level security;   -- no policies: only the functions below touch it
revoke all on public.studio_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Default settings sections (YDL values for Shaan Fitness)
-- ---------------------------------------------------------------------------
create or replace function app.default_center_settings()
returns jsonb language sql immutable as $$ select '{
  "sms_on_enquiry": true, "sms_on_expiry": true, "sms_on_birthday": true, "email_on_bill": true,
  "app_live_traffic": true, "app_diet_plan": true, "app_workout_plan": true, "app_cardio_plan": true,
  "freeze_membership": true, "multi_centre_sessions": false,
  "bio_deactivate_on_balance": true, "bio_deactivate_on_expiry": true, "has_essl": true, "essl_server": "ETIME",
  "bio_serial": "CUB7235300639", "bio_serial_two": null, "bio_block_pt_expiry": false, "bio_email_alert": true,
  "bio_alert_email": "shaanfitnessgym@gmail.com",
  "vital_block_pt_expiry": false, "has_vital": false,
  "vital_device_id": null, "vital_mqtt_client_id": null, "vital_display_message": null, "vital_display_ou_id": null,
  "vital_device_id_two": null, "vital_mqtt_client_id_two": null, "vital_display_message_two": null, "vital_display_ou_id_two": null,
  "website_url": "https://whatsapp.com/channel/0029VauYch34Y9lhmttjwv0l", "web_app_url": null,
  "android_app_url": "https://play.google.com/store/apps/details?id=com.ydl.shaanfitness",
  "ios_app_url": "https://apps.apple.com/app/shaan-fitness/id6479194523",
  "export_emails": null, "class_limiter": true, "auto_approve_challenge": false, "auto_approve_community": false,
  "dashboard_design": "H", "nav_left_align": false, "checkin_search_by": null,
  "pt_request_cancel_only": false, "pt_cancel_access": ["Head Trainer", "Owner"],
  "enrollment_terms": null, "upgrade_block_days": 0,
  "push_to_coaches": ["CLASSBOOKED", "CLASSCANCELLED", "WAITINGLIST", "FREEZED", "MAKEPAY"],
  "custom_exercise_only": true, "share_custom_exercise": false,
  "exercise_coach": ["anatomy", "youtube", "gif"], "exercise_customer": ["anatomy", "youtube", "gif"]
}'::jsonb $$;

create or replace function app.default_app_settings()
returns jsonb language sql immutable as $$ select '{
  "is_online_training": false, "allow_workout": true, "is_allow_cardio": true, "volume": true, "is_allow_PT": true,
  "is_QR_Tab_Allowed": true, "is_Diet_PlanAllowed": true, "is_woplan_allowed": true, "can_view_parq_form": true,
  "allow_recipes": true, "is_show_batchInfo": true, "show_appointment": false, "live_gym_traffic": true,
  "show_diary": true, "show_diary_video": true, "trainer_prefix_name": "SFT", "customer_prefix_name": "SF",
  "fc_allow_freeze_memberships": true, "can_add_food": true, "can_edit_meal": true, "show_calories_breakdown": true,
  "can_book_appointment": true, "can_trainer_call": false, "can_whatsapp_trainer": false, "can_refer_friend": true,
  "ecommerce_banner": null, "can_sign_up": true, "show_browse_planoption": true, "show_slot_datewise_orderhistory": true,
  "cartnote_address_support": true, "show_subscription_price": true, "fc_allow_link_external_check_in": true,
  "show_challenge_player": true, "hide_pincode": false, "is_reference_code_compulsory": false, "whatsapp_link_url": null,
  "allow_ecommerce": true, "navigate_to_services_page": false, "is_signup_on_boarding_flow": true, "allow_recipe": true,
  "is_glucose_tracker_on": true, "allow_ydl_articles": true, "show_class": true, "is_habit_tracker_on": true,
  "show_membership_plans": true, "is_attendance_report_visible": false, "allow_expired_checkin": false,
  "show_terms_and_condition": false, "show_my_subscriptions": true, "can_set_goal": true, "show_diet_pdf": false,
  "show_workout_pdf": false, "can_change_diet_plan": false, "can_change_workout_plan": false, "show_diet_plan_history": true,
  "show_other_home_page": true, "can_see_payment_details": true, "show_subscription_payment_details": true,
  "show_diet_upcoming_plans": false, "show_membership_plans_prices": true, "show_subscription_plans_prices": true,
  "is_wellness_coach": false, "custom_screen_banner": null,
  "terms_active": true, "privacy_url": "/privacy", "terms_url": "/privacy", "terms_message": null
}'::jsonb $$;

create or replace function app.default_biometric_settings()
returns jsonb language sql immutable as $$ select '{
  "block_users_expired": true, "checkout_mode": "alternate", "block_users_balance": false, "block_users_freeze": false,
  "record_customer_checkout": false, "single_staff_checkin": false, "single_trainer_checkin": false,
  "allow_pt_access": true, "checkout_minutes": 90, "alert_email": "shaanfitnessgym@gmail.com"
}'::jsonb $$;

create or replace function app.default_otp_settings()
returns jsonb language sql immutable as $$ select '{
  "operator": null, "principal_entity_id": null, "sms_header_id": null, "sms_template_id": null, "vendor_otp_template_id": null,
  "customer_app_name": null, "customer_app_hash": null, "trainer_app_name": null, "trainer_app_hash": null,
  "otp_length": 6, "otp_expiry_minutes": 10, "sender_id": null, "otp_message": null,
  "whatsapp_otp": false, "firebase": false, "truecaller": false, "international_otp": false
}'::jsonb $$;

create or replace function app.default_email_settings()
returns jsonb language sql immutable as $$ select '{"host": null, "port": 587, "security": "TLS", "username": null, "sender_name": null}'::jsonb $$;

-- YDL "Measurements Settings": which measurements the app asks for, in what order.
create or replace function app.default_measurement_settings()
returns jsonb language sql immutable as $$
  select jsonb_agg(jsonb_build_object('key', k, 'order', o, 'on', o2 <= 33) order by o2)
  from (values
    ('height', 1, 1), ('weight_kg', 2, 2), ('resting_heart_rate', 3, 3), ('general_body_fat', 4, 4), ('blood_presure', 5, 5),
    ('bmi', 6, 6), ('bmr', 7, 7), ('visceral_fat', 8, 8), ('sub_cutaneous_fat', 9, 9), ('body_metabolic_age', 10, 10),
    ('muscle_mass', 11, 11), ('knees', 1, 12), ('calves', 2, 13), ('upper_arm', 3, 14), ('forearm', 4, 15), ('neck', 5, 16),
    ('shoulder', 6, 17), ('upper_abdomen', 7, 18), ('lower_abdomen', 8, 19), ('wrist', 9, 20), ('bust', 10, 21), ('chest', 11, 22),
    ('waist', 23, 23), ('hips', 24, 24), ('midway', 25, 25), ('thighs', 26, 26), ('deviation_note', 16, 27), ('image', 17, 28),
    ('image_two', 18, 29), ('image_three', 19, 30),
    ('trunk_fat', 20, 34), ('fat_free_weight', 21, 35), ('protein_bar', 22, 36), ('trunk_muscle_mass', 23, 37),
    ('left_arm_muscle_mass', 24, 38), ('left_leg_fat', 25, 39), ('bone_mass', 26, 40), ('body_water', 27, 41), ('right_arm_fat', 28, 42),
    ('right_arm_muscle_mass', 29, 43), ('right_leg_fat', 30, 44), ('left_leg_muscle_mass', 31, 45), ('skeletal_muscle', 32, 46),
    ('upper_arm_left', 33, 47), ('upper_arm_right', 34, 48), ('forearm_left', 35, 49), ('forearm_right', 36, 50), ('under_bust', 37, 51),
    ('upper_waist', 38, 52), ('lower_waist', 39, 53), ('abdomen', 40, 54), ('rib_cage', 41, 55), ('back_width', 42, 56), ('glutes', 43, 57),
    ('love_handles', 44, 58), ('mid_thigh_left', 45, 59), ('mid_thigh_right', 46, 60), ('face', 47, 61), ('jawline', 48, 62),
    ('wrist_left', 49, 63), ('wrist_right', 50, 64), ('thigh_left', 51, 65), ('thigh_right', 52, 66), ('knee_left', 53, 67),
    ('knee_right', 54, 68), ('calf_left', 55, 69), ('calf_right', 56, 70), ('ankle_left', 57, 71), ('ankle_right', 58, 72),
    ('resting_metabolism', 59, 73), ('subcut_fat_trunk', 60, 74), ('subcut_fat_arms', 61, 75), ('subcut_fat_legs', 62, 76),
    ('skele_muscle_body', 63, 77), ('skele_muscle_trunk', 64, 78), ('skele_muscle_arms', 65, 79), ('skele_muscle_legs', 66, 80),
    ('left_lower_thigh', 67, 81), ('right_lower_thigh', 68, 82), ('abs_upper', 69, 83), ('abs_mid', 70, 84), ('abs_lower', 71, 85)
  ) as m(k, o, o2);
$$;

-- Fill the new sections on existing studios (keeping anything already there).
update public.studios set settings = settings
  || jsonb_build_object('center', app.default_center_settings() || coalesce(settings->'center', '{}'::jsonb))
  || jsonb_build_object('app', app.default_app_settings() || coalesce(settings->'app', '{}'::jsonb))
  || jsonb_build_object('biometric', app.default_biometric_settings() || coalesce(settings->'biometric', '{}'::jsonb))
  || jsonb_build_object('otp', app.default_otp_settings() || coalesce(settings->'otp', '{}'::jsonb))
  || jsonb_build_object('email', app.default_email_settings() || coalesce(settings->'email', '{}'::jsonb))
  || jsonb_build_object('measurements', coalesce(settings->'measurements', app.default_measurement_settings()));

-- A new studio (a new branch, or a fresh setup) starts with every section filled in.
create or replace function app.studio_setting_defaults()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.settings := new.settings
    || jsonb_build_object('center', app.default_center_settings() || coalesce(new.settings->'center', '{}'::jsonb))
    || jsonb_build_object('app', app.default_app_settings() || coalesce(new.settings->'app', '{}'::jsonb))
    || jsonb_build_object('biometric', app.default_biometric_settings() || coalesce(new.settings->'biometric', '{}'::jsonb))
    || jsonb_build_object('otp', app.default_otp_settings() || coalesce(new.settings->'otp', '{}'::jsonb))
    || jsonb_build_object('email', app.default_email_settings() || coalesce(new.settings->'email', '{}'::jsonb))
    || jsonb_build_object('measurements', coalesce(new.settings->'measurements', app.default_measurement_settings()));
  return new;
end $$;
create trigger studios_setting_defaults before insert on public.studios for each row execute function app.studio_setting_defaults();

-- Social links live with the website settings (one place for Instagram, Facebook, WhatsApp…).
create or replace function app.default_website()
returns jsonb language sql immutable as $$
  select '{
    "hero_title": null, "hero_text": null, "about": null, "hero_image_url": null,
    "opening_hours": null, "whatsapp": null, "instagram": null, "facebook": null, "youtube": null, "map_url": null,
    "twitter": null, "linkedin": null, "video": null,
    "show_prices": true, "show_timings": true, "show_trainers": true, "show_results": true
  }'::jsonb;
$$;



-- ---------------------------------------------------------------------------
-- Saving settings
-- ---------------------------------------------------------------------------
-- Only keys the section knows are kept.
create or replace function app.pick(p_defaults jsonb, p jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(k, p->k), '{}'::jsonb) from jsonb_object_keys(p_defaults) k where p ? k;
$$;

create or replace function public.save_studio_section(p_studio uuid, p_section text, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cur jsonb; v_new jsonb; v_def jsonb; k text;
begin
  case p_section
    when 'center' then perform app.require(p_studio, 'fitness_center', 'edit', 'change the fitness center settings'); v_def := app.default_center_settings();
    when 'biometric' then perform app.require(p_studio, 'biometric', 'on', 'change the biometric settings'); v_def := app.default_biometric_settings();
    when 'app' then
      if not app.can(p_studio, 'app_settings', 'on') then raise exception 'Only the owner can change the app settings'; end if;
      v_def := app.default_app_settings();
    when 'otp' then
      if not app.is_owner(p_studio) then raise exception 'Only the owner can change the OTP settings'; end if;
      v_def := app.default_otp_settings();
    when 'email' then
      if not app.is_owner(p_studio) then raise exception 'Only the owner can change the email settings'; end if;
      v_def := app.default_email_settings();
    when 'invoice', 'receipt' then
      perform app.require(p_studio, 'fitness_center', 'edit', 'change the invoice settings');
      v_def := '{"mode": "automatic", "start": 1, "width": 5, "zero_fill": true, "applicable_from": null, "restart": "year", "prefix": "", "suffix": ""}'::jsonb;
      if p ? 'mode' and p->>'mode' not in ('automatic', 'manual') then raise exception 'Choose Automatic or Manual'; end if;
      if p ? 'start' and coalesce((p->>'start')::bigint, 0) < 1 then raise exception 'The starting number must be 1 or more'; end if;
      if p ? 'width' and coalesce((p->>'width')::int, 0) not between 1 and 10 then raise exception 'The width must be between 1 and 10'; end if;
      if p ? 'restart' and coalesce(p->>'restart', 'none') not in ('year', 'financial_year', 'month', 'none') then raise exception 'Unknown restart period'; end if;
    when 'timings' then
      perform app.require(p_studio, 'fitness_center', 'edit', 'change the timings');
      if jsonb_typeof(p->'days') <> 'array' or jsonb_typeof(p->'sessions') <> 'array' then raise exception 'Timings need open days and sessions'; end if;
      if jsonb_array_length(p->'sessions') = 0 then raise exception 'Enter at least Session 1'; end if;
      if exists (select 1 from jsonb_array_elements(p->'sessions') x
                 where coalesce(x->>'from', '') !~ '^\d{2}:\d{2}$' or coalesce(x->>'to', '') !~ '^\d{2}:\d{2}$' or x->>'to' <= x->>'from') then
        raise exception 'Each session needs a start and an end time, and must end after it starts';
      end if;
      -- The open days are also the studio's working days (payroll, bookings).
      update public.studios set settings = jsonb_set(jsonb_set(settings, '{timings}',
        jsonb_build_object('days', p->'days', 'sessions', p->'sessions')), '{working_days}', p->'days') where id = p_studio;
      return;
    when 'measurements' then
      if not app.can(p_studio, 'app_settings', 'on') then raise exception 'Only the owner can change the measurement settings'; end if;
      if jsonb_typeof(p->'items') <> 'array' then raise exception 'Nothing to save'; end if;
      update public.studios set settings = jsonb_set(settings, '{measurements}', (
        select coalesce(jsonb_agg(jsonb_build_object('key', d->>'key', 'order', coalesce((x->>'order')::int, (d->>'order')::int),
                                                     'on', coalesce((x->>'on')::boolean, (d->>'on')::boolean)) order by ord), '[]'::jsonb)
        from jsonb_array_elements(app.default_measurement_settings()) with ordinality as dd(d, ord)
        left join lateral (select y from jsonb_array_elements(p->'items') y where y->>'key' = d->>'key' limit 1) yy(x) on true))
      where id = p_studio;
      return;
    else raise exception 'Unknown settings section %', p_section;
  end case;
  select coalesce(settings->p_section, '{}'::jsonb) into v_cur from public.studios where id = p_studio;
  v_new := v_def || v_cur || app.pick(v_def, p);
  update public.studios set settings = jsonb_set(settings, array[p_section], v_new) where id = p_studio;
end $$;

-- Basic information and address (steps 1 and 2 of the fitness center profile).
create or replace function public.save_center_info(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  perform app.require(p_studio, 'fitness_center', 'edit', 'edit the fitness center');
  if p ? 'name' then
    v_name := nullif(trim(p->>'name'), '');
    if v_name is null then raise exception 'Enter the fitness center name'; end if;
  end if;
  if p ? 'capacity' and coalesce((p->>'capacity')::int, 0) < 1 then raise exception 'Enter the fitness center capacity'; end if;
  if p ? 'mobile' and coalesce(app.digits(p->>'mobile'), '') = '' then raise exception 'Enter the mobile number'; end if;
  if p ? 'street1' then
    if coalesce(trim(p->>'street1'), '') = '' or coalesce(trim(p->>'street2'), '') = '' or coalesce(trim(p->>'locality'), '') = ''
       or coalesce(trim(p->>'city'), '') = '' or coalesce(trim(p->>'state'), '') = '' or coalesce(trim(p->>'country'), '') = ''
       or coalesce(trim(p->>'pincode'), '') = '' then
      raise exception 'Fill in every address field marked *';
    end if;
  end if;
  update public.studios set
    name = coalesce(v_name, name),
    tag_line = case when p ? 'tag_line' then nullif(trim(p->>'tag_line'), '') else tag_line end,
    description = case when p ? 'description' then nullif(trim(p->>'description'), '') else description end,
    capacity = case when p ? 'capacity' then (p->>'capacity')::int else capacity end,
    email = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    mobile = case when p ? 'mobile' then nullif(trim(p->>'mobile'), '') else mobile end,
    landline = case when p ? 'landline' then nullif(trim(p->>'landline'), '') else landline end,
    facilities = case when p ? 'facilities' then array(select jsonb_array_elements_text(p->'facilities')) else facilities end,
    street1 = case when p ? 'street1' then trim(p->>'street1') else street1 end,
    street2 = case when p ? 'street2' then trim(p->>'street2') else street2 end,
    locality = case when p ? 'locality' then trim(p->>'locality') else locality end,
    branch_name = case when p ? 'locality' then trim(p->>'locality') else branch_name end,
    landmark = case when p ? 'landmark' then nullif(trim(p->>'landmark'), '') else landmark end,
    city = case when p ? 'city' then trim(p->>'city') else city end,
    state = case when p ? 'state' then trim(p->>'state') else state end,
    country = case when p ? 'country' then trim(p->>'country') else country end,
    pincode = case when p ? 'pincode' then trim(p->>'pincode') else pincode end
  where id = p_studio;
  -- Fitness center categories are the services the center offers.
  if p ? 'service_ids' then
    update public.services set active = (id = any (array(select (jsonb_array_elements_text(p->'service_ids'))::uuid)))
    where studio_id = p_studio;
  end if;
end $$;

-- Step 4: primary contacts, billing, bank and owner details (owner only). GST goes to invoices.
create or replace function public.save_center_private(p_studio uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can see or change billing, bank and owner details'; end if;
  if coalesce(trim(p->>'company_name'), '') = '' then raise exception 'Enter the company name'; end if;
  if coalesce((p->>'gst_registered')::boolean, false) and coalesce(trim(p->>'gst_number'), '') = '' then raise exception 'Enter the GST number'; end if;
  if coalesce(trim(p->'support'->>'email'), '') = '' then raise exception 'Enter the support email'; end if;
  insert into public.studio_private (studio_id, company_name, billing, company_pan, bank, owner, manager, support, updated_at)
  values (p_studio, trim(p->>'company_name'), coalesce(p->'billing', '{}'), nullif(trim(p->>'company_pan'), ''),
          coalesce(p->'bank', '{}'), coalesce(p->'owner', '{}'), coalesce(p->'manager', '{}'), coalesce(p->'support', '{}'), now())
  on conflict (studio_id) do update set company_name = excluded.company_name, billing = excluded.billing, company_pan = excluded.company_pan,
    bank = excluded.bank, owner = excluded.owner, manager = excluded.manager, support = excluded.support, updated_at = now();
  update public.studios set settings = jsonb_set(settings, '{gst}', coalesce(settings->'gst', '{}'::jsonb) || jsonb_build_object(
    'enabled', coalesce((p->>'gst_registered')::boolean, false), 'number', nullif(trim(p->>'gst_number'), '')))
  where id = p_studio;
end $$;

create or replace function public.save_currency(p_studio uuid, p_currency text, p_tax text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change the currency'; end if;
  if coalesce(p_currency, '') !~ '^[A-Z]{3}$' then raise exception 'Choose a currency'; end if;
  update public.studios set currency = p_currency, tax_label = coalesce(nullif(trim(p_tax), ''), 'GST') where id = p_studio;
end $$;

create or replace function public.set_studio_secret(p_studio uuid, p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change this'; end if;
  if p_key not in ('smtp_password', 'otp_vendor_api_key') then raise exception 'Unknown setting'; end if;
  if coalesce(p_value, '') = '' then
    delete from public.studio_secrets where studio_id = p_studio and key = p_key;
  else
    insert into public.studio_secrets (studio_id, key, value) values (p_studio, p_key, p_value)
    on conflict (studio_id, key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;

-- Which secrets are set (never their values).
create or replace function public.studio_secret_status(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when app.is_owner(p_studio) then coalesce((select jsonb_object_agg(key, updated_at) from public.studio_secrets where studio_id = p_studio), '{}'::jsonb) end;
$$;

-- ---------------------------------------------------------------------------
-- Fitness Center Settings that take effect now
-- ---------------------------------------------------------------------------
create or replace function app.center_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'center'->p_key, app.default_center_settings()->p_key) from public.studios s where s.id = p_studio;
$$;

-- "Freeze Memberships: No" stops new freezes (from the desk and the member app).
create or replace function app.freeze_allowed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((app.center_setting(new.studio_id, 'freeze_membership'))::boolean, true) = false then
    raise exception 'Freezing memberships is switched off (Fitness Center › Fitness Center Settings)';
  end if;
  return new;
end $$;
create trigger freezes_allowed before insert on public.freezes for each row execute function app.freeze_allowed();

-- "Block Membership Upgrade After no of Days": upgrades only within that many days of the start.
create or replace function app.upgrade_allowed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_days int; v_start date;
begin
  if new.kind <> 'upgrade' then return new; end if;
  v_days := coalesce((app.center_setting(new.studio_id, 'upgrade_block_days'))::int, 0);
  if v_days <= 0 then return new; end if;
  select start_date into v_start from public.subscriptions where id = new.from_subscription_id;
  if app.today(new.studio_id) - v_start > v_days then
    raise exception 'Upgrades are allowed only within % days of the start (Fitness Center › Fitness Center Settings)', v_days;
  end if;
  return new;
end $$;
create trigger subscription_changes_upgrade_allowed before insert on public.subscription_changes for each row execute function app.upgrade_allowed();

-- ---------------------------------------------------------------------------
-- Biometric devices (YDL "Add Biometric Device") and device-wide operations
-- ---------------------------------------------------------------------------
alter table public.biometric_devices
  add column if not exists storage_types text[] not null default '{customers}',
  add column if not exists scan_type text not null default 'finger' check (scan_type in ('finger', 'face', 'face_ex', 'face_finger')),
  add column if not exists expiry_rule boolean not null default true,
  add column if not exists server text not null default 'ETIME';

create table public.device_operations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  device_id uuid not null references public.biometric_devices(id) on delete cascade,
  operation text not null check (operation in ('clear_logs', 'restart', 'reset_op_stamp', 'unblock_active')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'done', 'failed')),
  result text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index device_operations_idx on public.device_operations (studio_id, status, created_at);
create trigger device_operations_created_by before insert on public.device_operations for each row execute function app.fill_created_by();
alter table public.device_operations enable row level security;
create policy device_operations_read on public.device_operations for select to authenticated using (app.can(studio_id, 'biometric'));
create policy device_operations_add on public.device_operations for insert to authenticated with check (app.can(studio_id, 'biometric') and status = 'queued');

drop policy if exists devices_owner on public.biometric_devices;
create policy devices_manage on public.biometric_devices for all to authenticated
  using (app.can(studio_id, 'biometric')) with check (app.can(studio_id, 'biometric'));


-- ---------------------------------------------------------------------------
-- Holidays (YDL "Add Event Notice"), Notices, Rules, Equipment, Feedback
-- ---------------------------------------------------------------------------
alter table public.holidays add column if not exists notified_at timestamptz;
drop trigger if exists holidays_log on public.holidays;
create trigger holidays_log after update or delete on public.holidays for each row execute function app.log_activity();

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  audience text not null default 'customer' check (audience in ('customer', 'trainer')),
  active boolean not null default true,
  notified_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notices_studio_idx on public.notices (studio_id, created_at desc);
create trigger notices_created_by before insert on public.notices for each row execute function app.fill_created_by();
create trigger notices_log after update or delete on public.notices for each row execute function app.log_activity();

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index rules_studio_idx on public.rules (studio_id, created_at desc);
create trigger rules_created_by before insert on public.rules for each row execute function app.fill_created_by();
create trigger rules_log after update or delete on public.rules for each row execute function app.log_activity();

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  serial_number text not null check (length(trim(serial_number)) > 0),
  purchase_date date not null,
  status text not null default 'working' check (status in ('working', 'faulty', 'inactive')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index equipment_studio_idx on public.equipment (studio_id, purchase_date desc);
create trigger equipment_created_by before insert on public.equipment for each row execute function app.fill_created_by();
create trigger equipment_log after update or delete on public.equipment for each row execute function app.log_activity();

-- Feedback members send from the app (YDL "Feedback Listing").
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  feedback_no bigint generated always as identity,
  member_id uuid not null references public.members(id) on delete cascade,
  feedback text not null check (length(trim(feedback)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index app_feedback_studio_idx on public.app_feedback (studio_id, created_at desc);

-- Feedback Listing: each message with the client's name and email (only rows the reader may see).
create view public.app_feedback_overview with (security_invoker = true) as
select f.id, f.studio_id, f.feedback_no, f.member_id, f.feedback, f.created_at, m.full_name, m.email, m.member_code
from public.app_feedback f join public.members m on m.id = f.member_id;

create or replace function public.send_feedback(p_member uuid, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_id uuid;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  if m.id is null or m.user_id is distinct from auth.uid() then raise exception 'You can only send feedback for yourself'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'Write your feedback first'; end if;
  if (select count(*) from public.app_feedback where member_id = m.id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve sent a lot of feedback today. Please try again tomorrow.';
  end if;
  insert into public.app_feedback (studio_id, member_id, feedback) values (m.studio_id, m.id, left(trim(p_text), 2000)) returning id into v_id;
  return v_id;
end $$;

-- In-app notifications to every member (holiday wishes, notices). Returns how many were sent.
create or replace function public.notify_members(p_studio uuid, p_kind text, p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_title text; v_body text; v_n int;
begin
  if p_kind = 'notice' then
    perform app.require(p_studio, 'notices', 'on', 'send notices');
    select title, description into v_title, v_body from public.notices where id = p_id and studio_id = p_studio and active;
    if v_title is null then raise exception 'Only active notices can be sent'; end if;
    if (select audience from public.notices where id = p_id) = 'trainer' then
      update public.notices set notified_at = now() where id = p_id;
      return 0;   -- trainers see their notices in the coach app
    end if;
    update public.notices set notified_at = now() where id = p_id;
  elsif p_kind = 'holiday' then
    if not app.is_desk(p_studio) then raise exception 'Not allowed'; end if;
    select title, coalesce(nullif(trim(wish_text), ''), title || ' · ' || to_char(event_date, 'DD Mon YYYY')) into v_title, v_body
    from public.holidays where id = p_id and studio_id = p_studio and active;
    if v_title is null then raise exception 'Only active holidays can be sent'; end if;
    update public.holidays set notified_at = now() where id = p_id;
  else
    raise exception 'Unknown notification';
  end if;
  insert into public.notifications (studio_id, member_id, title, body, sent_by)
  select p_studio, m.id, v_title, v_body, app.my_staff_id(p_studio)
  from public.members m where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- App Settings: gallery, action items and quick action items, banners
-- ---------------------------------------------------------------------------
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  image_url text not null,
  is_gallery boolean not null default true,
  is_offer boolean not null default false,
  login_screen text check (login_screen in ('NUMBER_LOGIN', 'SLIDER_LOGIN')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (is_gallery or is_offer)
);
create trigger gallery_created_by before insert on public.gallery_images for each row execute function app.fill_created_by();

create table public.app_actions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  kind text not null check (kind in ('action', 'quick')),
  name text not null check (length(trim(name)) > 0),
  icon text,
  color text not null default '#000000' check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  link text,
  show_to text not null default 'both' check (show_to in ('both', 'paid', 'free', 'active_pt', 'general_no_pt', 'all_expired')),
  link_id text,
  action_id text,
  ordering int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_actions_idx on public.app_actions (studio_id, kind, ordering);
create trigger app_actions_created_by before insert on public.app_actions for each row execute function app.fill_created_by();
create trigger app_actions_log after update or delete on public.app_actions for each row execute function app.log_activity();

create table public.app_banners (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  image_url text not null,
  web_url text,
  active boolean not null default true,
  external_link boolean not null default false,
  link text,
  categories text[] not null default '{}',
  show_to text not null default 'both' check (show_to in ('both', 'paid', 'free', 'active_pt', 'general_no_pt', 'all_expired')),
  meta_description text,
  meta_keywords text,
  ordering int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_banners_idx on public.app_banners (studio_id, ordering);
create trigger app_banners_created_by before insert on public.app_banners for each row execute function app.fill_created_by();
create trigger app_banners_log after update or delete on public.app_banners for each row execute function app.log_activity();



-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.notices enable row level security;
alter table public.rules enable row level security;
alter table public.equipment enable row level security;
alter table public.app_feedback enable row level security;
alter table public.gallery_images enable row level security;
alter table public.app_actions enable row level security;
alter table public.app_banners enable row level security;

create policy notices_read on public.notices for select to authenticated using (app.is_desk(studio_id) or (app.in_studio(studio_id) and active));
create policy notices_manage on public.notices for all to authenticated using (app.can(studio_id, 'notices')) with check (app.can(studio_id, 'notices'));
create policy rules_read on public.rules for select to authenticated using (app.is_desk(studio_id) or (app.in_studio(studio_id) and active));
create policy rules_manage on public.rules for all to authenticated using (app.can(studio_id, 'rules')) with check (app.can(studio_id, 'rules'));
create policy equipment_desk on public.equipment for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy feedback_read on public.app_feedback for select to authenticated using (app.can(studio_id, 'feedback') or app.is_self(member_id));
create policy gallery_read on public.gallery_images for select to authenticated using (app.in_studio(studio_id));
create policy gallery_manage on public.gallery_images for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));
create policy actions_read on public.app_actions for select to authenticated using (app.in_studio(studio_id));
create policy actions_owner on public.app_actions for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));
create policy banners_read on public.app_banners for select to authenticated using (app.in_studio(studio_id));
create policy banners_manage on public.app_banners for all to authenticated using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));

-- Services List (App Settings): owner, or staff with App Settings rights.
create policy services_app_settings on public.services for update to authenticated
  using (app.can(studio_id, 'app_settings')) with check (app.can(studio_id, 'app_settings'));

-- Front desk with Fitness Center rights may edit the center (through save_center_info); the
-- studios row itself stays owner-only for direct writes.

revoke all on function public.save_studio_section(uuid, text, jsonb) from public, anon;
revoke all on function public.save_center_info(uuid, jsonb) from public, anon;
revoke all on function public.save_center_private(uuid, jsonb) from public, anon;
revoke all on function public.save_currency(uuid, text, text) from public, anon;
revoke all on function public.set_studio_secret(uuid, text, text) from public, anon;
revoke all on function public.studio_secret_status(uuid) from public, anon;
revoke all on function public.send_feedback(uuid, text) from public, anon;
revoke all on function public.notify_members(uuid, text, uuid) from public, anon;
grant execute on function public.save_studio_section(uuid, text, jsonb), public.save_center_info(uuid, jsonb),
  public.save_center_private(uuid, jsonb), public.save_currency(uuid, text, text), public.set_studio_secret(uuid, text, text),
  public.studio_secret_status(uuid), public.send_feedback(uuid, text), public.notify_members(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The website shows the center's own timings and full address when set.
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

-- ---------------------------------------------------------------------------
-- Grants (as in part 4, plus: stored passwords are unreachable, feedback is added only
-- through send_feedback, device operations are never edited, and the website summary
-- stays open to visitors).
-- ---------------------------------------------------------------------------
create or replace procedure app.apply_grants()
language plpgsql as $$
begin
  grant usage on schema public to authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant all on all tables in schema public to service_role;
  grant all on all sequences in schema public to authenticated, service_role;
  revoke all on all tables in schema public from anon;
  revoke execute on all functions in schema public from public, anon;
  grant execute on all functions in schema public to authenticated, service_role;
  revoke insert, update, delete on public.activity_log, public.receipt_changes, public.member_medical,
    public.attendance_deletions, public.class_bookings from authenticated;
  revoke insert, update on public.payroll_entries from authenticated;
  revoke update on public.leave_requests from authenticated;
  revoke all on public.studio_secrets from authenticated;
  revoke insert, update, delete on public.app_feedback from authenticated;
  revoke update, delete on public.device_operations from authenticated;
  grant execute on function public.site_info(text) to anon;
end $$;
call app.apply_grants();
