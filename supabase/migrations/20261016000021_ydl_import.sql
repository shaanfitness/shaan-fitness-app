-- Shaan Fitness app · 21. Moving the data from YDL (owner only): members and enquiries, subscriptions with their
-- invoice numbers, receipts, open follow-ups, freezes, extensions, PT sessions used and past check-ins.
-- The page reads YDL's own CSV exports and sends rows here in a plain shape (see app.import_* below).
-- While importing nothing is sent to members (WhatsApp, SMS, email, app) and no staff notifications are raised;
-- YDL's numbers, dates and amounts are kept as they are, and our numbering carries on after YDL's.

-- PT sessions already used in YDL, counted on top of the sessions recorded here.
alter table public.subscriptions add column if not exists sessions_carried int not null default 0 check (sessions_carried >= 0);

create or replace function app.importing()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(current_setting('app.importing', true), '') = 'on';
$$;

-- Nothing goes out to members while importing.
create or replace function app.queue_message(m public.members, p_channel text, p_source text, p_body text,
  p_subject text default null, p_dedupe text default null, p_campaign uuid default null, p_template text default null, p_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_to text := app.member_address(m, p_channel); v_id uuid;
begin
  if app.importing() then return null; end if;
  if v_to is null or nullif(trim(p_body), '') is null then return null; end if;
  insert into public.messages (studio_id, channel, member_id, to_name, to_address, subject, body, source, campaign_id, template_id, dedupe_key, created_by)
  values (m.studio_id, p_channel, m.id, m.full_name, v_to, p_subject, p_body, p_source, p_campaign, p_template, p_dedupe, p_by)
  on conflict (studio_id, channel, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id;
end $$;

-- No staff notifications for imported history.
create or replace function app.add_alert(p_studio uuid, p_kind text, p_member uuid, p_title text, p_body text, p_link text, p_ref uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.staff_alerts (studio_id, kind, member_id, ref_id, title, body, link)
  select p_studio, p_kind, p_member, p_ref, left(p_title, 200), left(p_body, 1000), p_link
  where not app.importing();
$$;

-- Sessions used = sessions recorded here + sessions carried over from YDL.
create or replace function app.recount_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  ids = array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.subscription_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.subscription_id end
  ], null);
  update public.subscriptions s set sessions_used = s.sessions_carried + (
    select count(*) from public.attendance a where a.subscription_id = s.id and a.status in ('present', 'late_cancel')
  ) where s.id = any (ids);
  return null;
end $$;

-- Past check-ins brought over from YDL don't count against a plan's sessions (YDL's count comes over as sessions_carried).
create or replace function app.attendance_link_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tz text; v_local time;
begin
  if app.importing() then
    if new.marked_by is null then new.marked_by = app.my_staff_id(new.studio_id); end if;
    return new;
  end if;
  if new.subscription_id is null then
    select s.id into new.subscription_id from public.subscriptions s
    where s.member_id = new.member_id and new.date between s.start_date and s.end_date
      and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
    order by (s.kind = 'trial'), s.start_date desc
    limit 1;
  end if;
  if new.marked_by is null then new.marked_by = app.my_staff_id(new.studio_id); end if;
  if tg_op = 'INSERT' and new.batch_id is null and new.source in ('manual', 'biometric', 'qr', 'app', 'live') then
    select s.timezone into v_tz from public.studios s where s.id = new.studio_id;
    v_local = (new.check_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::time;
    select b.id into new.batch_id
    from public.batch_members bm join public.batches b on b.id = bm.batch_id
    where bm.member_id = new.member_id and b.active
      and extract(isodow from new.date)::smallint = any (b.days)
      and (b.start_date is null or b.start_date <= new.date) and (b.end_date is null or b.end_date >= new.date)
      and v_local >= b.start_time - interval '30 minutes' and v_local <= b.end_time
      and not exists (select 1 from public.attendance a where a.member_id = new.member_id and a.date = new.date and a.batch_id = b.id)
    order by abs(extract(epoch from (v_local - b.start_time)))
    limit 1;
  end if;
  return new;
end $$;

-- Receipts: YDL's history is taken as it is (a receipt over the bill is kept, not refused).
create or replace function app.set_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_total numeric; v_paid numeric;
begin
  if new.receipt_no is null then
    select coalesce(s.settings->'receipt'->>'mode', 'automatic') into v_mode from public.studios s where s.id = new.studio_id;
    if v_mode = 'automatic' then new.receipt_no = app.next_code(new.studio_id, 'receipt', new.receipt_date); end if;
  end if;
  if new.added_by is null then new.added_by = app.my_staff_id(new.studio_id); end if;
  if new.bill_rep_id is null then new.bill_rep_id = new.added_by; end if;
  -- A receipt can't take more than what is still owed on the subscription.
  if new.subscription_id is not null and new.purpose = 'subscription' and new.kind in ('payment', 'write_off') and new.status = 'paid' and not app.importing() then
    select s.total_amount into v_total from public.subscriptions s where s.id = new.subscription_id;
    select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) into v_paid
    from public.payments p
    where p.subscription_id = new.subscription_id and p.purpose = 'subscription' and p.status = 'paid' and p.id <> new.id;
    if v_paid + new.amount > v_total + 0.009 then
      raise exception 'This is more than the balance due (% left)', greatest(v_total - v_paid, 0);
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Our numbering carries on after the highest YDL number in the same series (same prefix and suffix, same period).
create or replace function app.bump_counter(p_studio uuid, p_kind text, p_code text, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cfg jsonb; v_pre text; v_suf text; v_mid text; v_key text; v_d date := coalesce(p_date, app.today(p_studio));
begin
  if nullif(trim(p_code), '') is null then return; end if;
  select coalesce(s.settings->p_kind, '{}'::jsonb) into v_cfg from public.studios s where s.id = p_studio;
  v_pre := coalesce(v_cfg->>'prefix', ''); v_suf := coalesce(v_cfg->>'suffix', '');
  if left(p_code, length(v_pre)) <> v_pre or right(p_code, length(v_suf)) <> v_suf or length(p_code) <= length(v_pre) + length(v_suf) then return; end if;
  v_mid := substr(p_code, length(v_pre) + 1, length(p_code) - length(v_pre) - length(v_suf));
  if v_mid !~ '^[0-9]{1,15}$' then return; end if;
  v_key := p_kind || case v_cfg->>'restart'
    when 'year' then ':' || to_char(v_d, 'YYYY')
    when 'financial_year' then ':FY' || to_char(v_d - interval '3 months', 'YYYY')
    when 'month' then ':' || to_char(v_d, 'YYYY-MM')
    else '' end;
  insert into app.counters (studio_id, key, value) values (p_studio, v_key, v_mid::bigint)
  on conflict (studio_id, key) do update set value = greatest(app.counters.value, excluded.value);
end $$;

create or replace function app.import_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case when length(d) >= 10 then right(d, 10) when length(d) >= 6 then d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create or replace function app.import_text(r jsonb, k text)
returns text language sql immutable set search_path = '' as $$
  select nullif(trim(r->>k), '');
$$;

create or replace function app.import_num(r jsonb, k text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare v text := regexp_replace(coalesce(r->>k, ''), '[^0-9.\-]', '', 'g');
begin
  if v = '' or v = '-' or v = '.' then return null; end if;
  return v::numeric;
exception when others then
  raise exception '% is not a number: %', k, r->>k;
end $$;

create or replace function app.import_date(r jsonb, k text)
returns date language plpgsql immutable set search_path = '' as $$
declare v text := nullif(trim(r->>k), '');
begin
  if v is null then return null; end if;
  if v !~ '^\d{4}-\d{2}-\d{2}' then raise exception '% should be a date: %', k, v; end if;
  return left(v, 10)::date;
end $$;

-- A staff member by name or staff code (null when there is no such person).
create or replace function app.import_staff(p_studio uuid, p_name text)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.studio_id = p_studio and nullif(trim(p_name), '') is not null
    and (lower(s.full_name) = lower(trim(p_name)) or lower(coalesce(s.staff_code, '')) = lower(trim(p_name))
         or lower(s.first_name) = lower(trim(p_name)))
  order by s.active desc, (lower(s.full_name) = lower(trim(p_name))) desc, s.created_at
  limit 1;
$$;

-- The client a row is about: member code, enquiry code, then the mobile number (when several share it, or the row
-- carries a code another client already has, the first name must match too), or a unique name.
create or replace function app.import_find_member(p_studio uuid, r jsonb)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid; v_code text := app.import_text(r, 'member_code'); v_enq text := app.import_text(r, 'enquiry_code');
  v_phone text := app.import_phone(r->>'phone'); v_name text := lower(regexp_replace(coalesce(app.import_text(r, 'name'),
    trim(coalesce(r->>'first_name', '') || ' ' || coalesce(r->>'last_name', ''))), '\s+', ' ', 'g')); v_n int;
begin
  if v_code is not null then
    select m.id into v from public.members m where m.studio_id = p_studio and m.deleted_at is null
      and (lower(m.member_code) = lower(v_code) or lower(m.enquiry_code) = lower(v_code)) limit 1;
    if v is not null then return v; end if;
  end if;
  if v_enq is not null then
    select m.id into v from public.members m where m.studio_id = p_studio and m.deleted_at is null and lower(m.enquiry_code) = lower(v_enq) limit 1;
    if v is not null then return v; end if;
  end if;
  if v_phone is not null then
    -- Same mobile: the same person unless the codes or first names say otherwise (families often share a number).
    select m.id into v from public.members m
    where m.studio_id = p_studio and m.deleted_at is null and app.import_phone(m.phone) = v_phone
      and (v_code is null or m.member_code is null) and (v_enq is null or m.enquiry_code is null)
      and (v_name = '' or lower(m.full_name) = v_name or split_part(lower(m.first_name), ' ', 1) = split_part(v_name, ' ', 1))
    order by (lower(m.full_name) = v_name) desc, (m.kind = 'member') desc, m.created_at
    limit 1;
    if v is not null then return v; end if;
  end if;
  if v_name <> '' and v_code is null and v_enq is null and v_phone is null then
    select count(*) into v_n from public.members m where m.studio_id = p_studio and m.deleted_at is null and lower(m.full_name) = v_name;
    if v_n = 1 then
      select m.id into v from public.members m where m.studio_id = p_studio and m.deleted_at is null and lower(m.full_name) = v_name;
      return v;
    elsif v_n > 1 then
      raise exception 'More than one client is called %; add the member code or mobile number', initcap(v_name);
    end if;
  end if;
  return null;
end $$;

create or replace function app.import_need_member(p_studio uuid, r jsonb)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.import_find_member(p_studio, r);
begin
  if v is null then
    raise exception 'Client not found (%): import Members first', coalesce(app.import_text(r, 'member_code'), app.import_text(r, 'name'), app.import_text(r, 'phone'), '?');
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- One row of each kind. Each returns 'added', 'updated' or 'same'.
-- ---------------------------------------------------------------------------
-- members: member_code, enquiry_code, kind, name | first_name + last_name, phone, alt_phone, email, gender, date_of_birth,
--   enquiry_date, joined_on, source_promotion, source_enquiry, client_rep, trainer, biometric_code, rfid, occupation,
--   street1, city, state, pincode, emergency_name, emergency_phone, notes, active, not_interested
create or replace function app.import_member_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid := app.import_find_member(p_studio, r); m public.members; v_name text := app.import_text(r, 'name');
  v_first text := app.import_text(r, 'first_name'); v_last text := app.import_text(r, 'last_name');
  v_code text := app.import_text(r, 'member_code'); v_enq text := app.import_text(r, 'enquiry_code');
  v_kind text; v_gender text := lower(coalesce(app.import_text(r, 'gender'), '')); v_phone text := app.import_phone(r->>'phone');
  v_bio text := regexp_replace(coalesce(r->>'biometric_code', ''), '\D', '', 'g'); v_active boolean;
  v_since date := coalesce(app.import_date(r, 'enquiry_date'), app.import_date(r, 'joined_on'));
begin
  if v_first is null and v_name is not null then
    v_name := regexp_replace(v_name, '\s+', ' ', 'g');
    v_first := split_part(v_name, ' ', 1);
    v_last := nullif(trim(substr(v_name, length(v_first) + 1)), '');
  end if;
  if v_first is null then raise exception 'The name is missing'; end if;
  v_kind := case when v_code is not null or lower(coalesce(r->>'kind', '')) in ('member', 'client') then 'member' else 'enquiry' end;
  v_gender := case when v_gender in ('male', 'm', 'man') then 'male' when v_gender in ('female', 'f', 'woman') then 'female' when v_gender in ('other', 'others') then 'other' end;
  v_active := case when lower(coalesce(r->>'active', '')) in ('false', 'no', 'inactive', 'deactivated', '0') then false else true end;
  if length(v_bio) > 9 then v_bio := ''; end if;      -- a phone number in the biometric column isn't a device code
  if v_id is null then
    if v_phone is null and app.import_phone(r->>'alt_phone') is null then raise exception 'The mobile number is missing'; end if;
    insert into public.members (studio_id, kind, member_code, enquiry_code, first_name, last_name, phone, alt_phone, email, gender, date_of_birth,
      enquiry_date, joined_on, source_promotion, source_enquiry, added_by, trainer_id, biometric_code, rfid, occupation, street1, city, state, pincode,
      emergency_first_name, emergency_phone, notes, active, lead_status, created_at)
    values (p_studio, v_kind, v_code, v_enq, v_first, v_last, coalesce(v_phone, app.import_phone(r->>'alt_phone')), app.import_phone(r->>'alt_phone'),
      lower(app.import_text(r, 'email')), v_gender, app.import_date(r, 'date_of_birth'), coalesce(v_since, app.today(p_studio)),
      case when v_kind = 'member' then coalesce(app.import_date(r, 'joined_on'), app.import_date(r, 'enquiry_date')) end,
      app.import_text(r, 'source_promotion'), app.import_text(r, 'source_enquiry'), app.import_staff(p_studio, r->>'client_rep'),
      app.import_staff(p_studio, r->>'trainer'), nullif(v_bio, '')::int, app.import_text(r, 'rfid'), app.import_text(r, 'occupation'),
      app.import_text(r, 'street1'), app.import_text(r, 'city'), app.import_text(r, 'state'), app.import_text(r, 'pincode'),
      app.import_text(r, 'emergency_name'), app.import_phone(r->>'emergency_phone'), app.import_text(r, 'notes'), v_active,
      case when lower(coalesce(r->>'not_interested', '')) in ('true', 'yes', '1') then 'not_interested' else 'open' end,
      coalesce((v_since + time '12:00') at time zone 'Asia/Kolkata', now()));
    perform app.bump_counter(p_studio, 'member_code', v_code, null);
    perform app.bump_counter(p_studio, 'enquiry_code', v_enq, null);
    return 'added';
  end if;
  select * into m from public.members where id = v_id;
  update public.members set
    kind = case when v_kind = 'member' then 'member' else kind end,
    member_code = coalesce(member_code, v_code), enquiry_code = coalesce(enquiry_code, v_enq),
    last_name = coalesce(last_name, v_last), email = coalesce(email, lower(app.import_text(r, 'email'))), gender = coalesce(gender, v_gender),
    alt_phone = coalesce(alt_phone, app.import_phone(r->>'alt_phone')), date_of_birth = coalesce(date_of_birth, app.import_date(r, 'date_of_birth')),
    enquiry_date = coalesce(enquiry_date, app.import_date(r, 'enquiry_date')),
    joined_on = case when v_kind = 'member' and app.import_date(r, 'joined_on') is not null then least(coalesce(joined_on, app.import_date(r, 'joined_on')), app.import_date(r, 'joined_on')) else joined_on end,
    source_promotion = coalesce(source_promotion, app.import_text(r, 'source_promotion')), source_enquiry = coalesce(source_enquiry, app.import_text(r, 'source_enquiry')),
    trainer_id = coalesce(trainer_id, app.import_staff(p_studio, r->>'trainer')), biometric_code = coalesce(biometric_code, nullif(v_bio, '')::int),
    rfid = coalesce(rfid, app.import_text(r, 'rfid')), occupation = coalesce(occupation, app.import_text(r, 'occupation')),
    street1 = coalesce(street1, app.import_text(r, 'street1')), city = coalesce(city, app.import_text(r, 'city')), state = coalesce(state, app.import_text(r, 'state')),
    pincode = coalesce(pincode, app.import_text(r, 'pincode')), emergency_first_name = coalesce(emergency_first_name, app.import_text(r, 'emergency_name')),
    emergency_phone = coalesce(emergency_phone, app.import_phone(r->>'emergency_phone')), notes = coalesce(notes, app.import_text(r, 'notes')),
    active = case when r ? 'active' then v_active else active end
  where id = v_id;
  perform app.bump_counter(p_studio, 'member_code', v_code, null);
  perform app.bump_counter(p_studio, 'enquiry_code', v_enq, null);
  return 'updated';
end $$;

-- subscriptions: invoice_no, invoice_date, (client keys), plan, start_date, end_date, net_amount, gst_amount, total_amount, discount,
--   sessions_total, sessions_used, trainer, client_rep, bill_rep, status (active | cancelled | deleted | …), cancel_reason, note
create or replace function app.import_subscription_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member uuid := app.import_need_member(p_studio, r); p public.plans; v_inv text := app.import_text(r, 'invoice_no');
  v_start date := app.import_date(r, 'start_date'); v_end date := app.import_date(r, 'end_date'); v_idate date := app.import_date(r, 'invoice_date');
  v_net numeric := app.import_num(r, 'net_amount'); v_gst numeric := coalesce(app.import_num(r, 'gst_amount'), 0); v_total numeric := app.import_num(r, 'total_amount');
  v_disc numeric := coalesce(app.import_num(r, 'discount'), 0); v_status text := lower(coalesce(app.import_text(r, 'status'), '')); v_id uuid;
  v_used int := coalesce(app.import_num(r, 'sessions_used'), 0)::int; v_total_s int := app.import_num(r, 'sessions_total')::int;
  v_rate numeric; v_price numeric; v_by uuid := app.import_staff(p_studio, r->>'bill_rep');
begin
  select * into p from public.plans pl where pl.studio_id = p_studio and lower(pl.name) = lower(app.import_text(r, 'plan')) order by pl.active desc, pl.created_at limit 1;
  if p.id is null then raise exception 'Plan "%" not found: add it (it can be inactive) under Memberships, then import again', coalesce(app.import_text(r, 'plan'), '?'); end if;
  if v_start is null then raise exception 'The start date is missing'; end if;
  if v_end is null then v_end := app.plan_end_date(v_start, p.tenure_value, p.tenure_unit); end if;
  if v_end < v_start then raise exception 'The end date is before the start date'; end if;
  if v_inv is not null then
    select s.id into v_id from public.subscriptions s where s.studio_id = p_studio and s.invoice_no = v_inv;
  else
    select s.id into v_id from public.subscriptions s where s.member_id = v_member and s.plan_id = p.id and s.start_date = v_start limit 1;
  end if;
  if v_id is not null then
    update public.subscriptions set sessions_carried = greatest(sessions_carried, v_used) where id = v_id and v_used > 0;
    if found then update public.subscriptions set sessions_used = sessions_carried + (select count(*) from public.attendance a where a.subscription_id = v_id and a.status in ('present', 'late_cancel')) where id = v_id; end if;
    return 'same';
  end if;
  -- YDL shows the sale before tax and the tax; ours keeps the price and the tax rate.
  v_price := coalesce(v_net, case when v_total is not null then v_total - v_gst end, p.price);
  v_rate := case when v_gst > 0 and v_price > 0 then round(v_gst * 100 / v_price, 2) else 0 end;
  insert into public.subscriptions (studio_id, member_id, plan_id, kind, invoice_no, invoice_date, start_date, base_end_date, base_price, selling_price,
    gst_rate, coupon_discount, sessions_total, sessions_used, sessions_carried, trainer_id, created_by, bill_rep_id, client_rep_id, note,
    cancelled_at, cancel_reason, deleted_at, delete_reason, created_at)
  values (p_studio, v_member, p.id, case when p.is_free_trial then 'trial' else p.kind end, v_inv, coalesce(v_idate, v_start), v_start, v_end,
    greatest(coalesce(p.price, 0), v_price + v_disc), v_price + v_disc, v_rate, v_disc,
    coalesce(v_total_s, case when p.unlimited_sessions then null else p.session_count end), v_used, v_used,
    app.import_staff(p_studio, r->>'trainer'), v_by, v_by, app.import_staff(p_studio, r->>'client_rep'), app.import_text(r, 'note'),
    case when v_status like 'cancel%' then (coalesce(v_idate, v_start) + time '12:00') at time zone 'Asia/Kolkata' end,
    case when v_status like 'cancel%' then coalesce(app.import_text(r, 'cancel_reason'), 'Cancelled in YDL') end,
    case when v_status like 'delete%' then (coalesce(v_idate, v_start) + time '12:00') at time zone 'Asia/Kolkata' end,
    case when v_status like 'delete%' then coalesce(app.import_text(r, 'cancel_reason'), 'Deleted in YDL') end,
    (coalesce(v_idate, v_start) + time '12:00') at time zone 'Asia/Kolkata')
  returning id into v_id;
  perform app.bump_counter(p_studio, 'invoice', v_inv, coalesce(v_idate, v_start));
  update public.members set kind = 'member', joined_on = least(coalesce(joined_on, v_start), v_start)
  where id = v_member and p.kind <> 'trial' and not p.is_free_trial and v_status not like 'delete%';
  return 'added';
end $$;

-- receipts: receipt_no, receipt_date, invoice_no, amount, mode, added_by, kind (payment | refund | write_off), status, note
create or replace function app.import_receipt_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; v_no text := app.import_text(r, 'receipt_no'); v_date date := app.import_date(r, 'receipt_date');
  v_amount numeric := app.import_num(r, 'amount'); v_kind text := lower(coalesce(app.import_text(r, 'kind'), 'payment')); v_by uuid := app.import_staff(p_studio, r->>'added_by');
begin
  if v_amount is null or v_amount <= 0 then raise exception 'The amount should be more than 0'; end if;
  if v_date is null then raise exception 'The receipt date is missing'; end if;
  if v_no is not null and exists (select 1 from public.payments x where x.studio_id = p_studio and x.receipt_no = v_no) then return 'same'; end if;
  select * into s from public.subscriptions x where x.studio_id = p_studio and x.invoice_no = app.import_text(r, 'invoice_no');
  if s.id is null then raise exception 'Invoice % not found: import Subscriptions first', coalesce(app.import_text(r, 'invoice_no'), '(none)'); end if;
  if v_no is null and exists (select 1 from public.payments x where x.subscription_id = s.id and x.receipt_date = v_date and x.amount = v_amount) then return 'same'; end if;
  insert into public.payments (studio_id, member_id, subscription_id, kind, purpose, receipt_no, receipt_date, amount, mode, status, note, added_by, bill_rep_id, created_at)
  values (p_studio, s.member_id, s.id, case when v_kind like 'refund%' then 'refund' when v_kind like 'write%' then 'write_off' else 'payment' end, 'subscription',
    v_no, v_date, v_amount, upper(app.import_text(r, 'mode')), case when lower(coalesce(r->>'status', '')) like 'cancel%' then 'cancelled' else 'paid' end,
    app.import_text(r, 'note'), v_by, v_by, (v_date + time '12:00') at time zone 'Asia/Kolkata');
  perform app.bump_counter(p_studio, 'receipt', v_no, v_date);
  return 'added';
end $$;

-- follow_ups (open ones): type, due_at (date or date-time), assigned_to, notes, convertibility, expected_date, expected_amount, contact_type
create or replace function app.import_follow_up_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member uuid := app.import_need_member(p_studio, r); v_due timestamptz; v_type text := coalesce(app.import_text(r, 'type'), 'Enquiry');
begin
  begin
    v_due := case when app.import_text(r, 'due_at') ~ '^\d{4}-\d{2}-\d{2}[ T]\d' then (left(replace(r->>'due_at', 'T', ' '), 16))::timestamp at time zone 'Asia/Kolkata'
                  else (app.import_date(r, 'due_at') + time '10:00') at time zone 'Asia/Kolkata' end;
  exception when others then raise exception 'due_at should be a date: %', r->>'due_at';
  end;
  if v_due is null then raise exception 'The follow-up date is missing'; end if;
  if exists (select 1 from public.follow_ups f where f.member_id = v_member and f.type = v_type and f.due_at = v_due) then return 'same'; end if;
  insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status, convertibility, expected_date, expected_amount, contact_type, notes, source, created_by)
  values (p_studio, v_member, v_type, v_due, app.import_staff(p_studio, r->>'assigned_to'), 'open', app.import_text(r, 'convertibility'),
    app.import_date(r, 'expected_date'), app.import_num(r, 'expected_amount'), app.import_text(r, 'contact_type'), app.import_text(r, 'notes'), 'manual',
    app.my_staff_id(p_studio));
  return 'added';
end $$;

-- The subscription a freeze or extension belongs to: by invoice number, else the client's plan running on that date.
create or replace function app.import_find_subscription(p_studio uuid, r jsonb, p_on date)
returns public.subscriptions language plpgsql stable security definer set search_path = '' as $$
declare s public.subscriptions; v_member uuid;
begin
  if app.import_text(r, 'invoice_no') is not null then
    select * into s from public.subscriptions x where x.studio_id = p_studio and x.invoice_no = app.import_text(r, 'invoice_no');
    if s.id is not null then return s; end if;
  end if;
  v_member := app.import_need_member(p_studio, r);
  select x.* into s from public.subscriptions x join public.plans p on p.id = x.plan_id
  where x.member_id = v_member and x.deleted_at is null
    and (app.import_text(r, 'plan') is null or lower(p.name) = lower(app.import_text(r, 'plan')))
  order by (p_on is not null and p_on between x.start_date and x.end_date) desc, abs(coalesce(p_on, x.start_date) - x.start_date), x.start_date desc
  limit 1;
  if s.id is null then raise exception 'No subscription found for this client%', coalesce(' on plan ' || app.import_text(r, 'plan'), ''); end if;
  return s;
end $$;

-- freezes: (client keys), plan, invoice_no, start_date, days (or end_date), fee, note.  YDL's end date already counts the freeze,
-- so the subscription's end date stays where YDL had it.
create or replace function app.import_freeze_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_start date := app.import_date(r, 'start_date'); v_days int := app.import_num(r, 'days')::int; s public.subscriptions;
begin
  if v_start is null then raise exception 'The freeze start date is missing'; end if;
  if v_days is null and app.import_date(r, 'end_date') is not null then v_days := app.import_date(r, 'end_date') - v_start + 1; end if;
  if v_days is null or v_days <= 0 then raise exception 'The freeze days are missing'; end if;
  s := app.import_find_subscription(p_studio, r, v_start);
  if exists (select 1 from public.freezes f where f.subscription_id = s.id and f.start_date = v_start) then return 'same'; end if;
  if s.base_end_date - v_days < s.start_date then raise exception 'The freeze is longer than the plan'; end if;
  insert into public.freezes (studio_id, subscription_id, member_id, start_date, days, fee, note, status, created_by)
  values (p_studio, s.id, s.member_id, v_start, v_days, coalesce(app.import_num(r, 'fee'), 0), app.import_text(r, 'note'), 'approved', app.my_staff_id(p_studio));
  update public.subscriptions set base_end_date = base_end_date - v_days where id = s.id;
  return 'added';
end $$;

-- extensions: (client keys), plan, invoice_no, days, date, fee, note
create or replace function app.import_extension_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_days int := app.import_num(r, 'days')::int; v_date date := app.import_date(r, 'date'); s public.subscriptions;
begin
  if v_days is null or v_days <= 0 then raise exception 'The extension days are missing'; end if;
  s := app.import_find_subscription(p_studio, r, v_date);
  if exists (select 1 from public.extensions e where e.subscription_id = s.id and e.days = v_days
             and e.created_at::date = coalesce(v_date, e.created_at::date)) then return 'same'; end if;
  if s.base_end_date - v_days < s.start_date then raise exception 'The extension is longer than the plan'; end if;
  insert into public.extensions (studio_id, subscription_id, member_id, days, fee, note, status, created_by, created_at)
  values (p_studio, s.id, s.member_id, v_days, coalesce(app.import_num(r, 'fee'), 0), app.import_text(r, 'note'), 'approved', app.my_staff_id(p_studio),
    coalesce((v_date + time '12:00') at time zone 'Asia/Kolkata', now()));
  update public.subscriptions set base_end_date = base_end_date - v_days where id = s.id;
  return 'added';
end $$;

-- attendance (past check-ins): (client keys), date, check_in (HH:MM), check_out (HH:MM), source
create or replace function app.import_attendance_row(p_studio uuid, r jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member uuid := app.import_need_member(p_studio, r); v_date date := app.import_date(r, 'date'); v_in timestamptz; v_out timestamptz;
begin
  if v_date is null then raise exception 'The date is missing'; end if;
  if v_date > app.today(p_studio) then raise exception 'The date is in the future'; end if;
  v_in := (v_date + coalesce(nullif(trim(r->>'check_in'), '')::time, time '06:00')) at time zone 'Asia/Kolkata';
  v_out := (v_date + nullif(trim(r->>'check_out'), '')::time) at time zone 'Asia/Kolkata';
  if v_out is not null and v_out < v_in then v_out := null; end if;
  if exists (select 1 from public.attendance a where a.member_id = v_member and a.date = v_date and a.check_in = v_in) then return 'same'; end if;
  insert into public.attendance (studio_id, member_id, date, check_in, check_out, source, status)
  values (p_studio, v_member, v_date, v_in, v_out, case when lower(coalesce(r->>'source', '')) like 'bio%' then 'biometric' else 'manual' end, 'present');
  return 'added';
end $$;

-- ---------------------------------------------------------------------------
-- The page sends up to 1000 rows at a time; each row is added on its own, so one bad row doesn't stop the rest.
-- ---------------------------------------------------------------------------
create or replace function public.ydl_import(p_studio uuid, p_kind text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; i int := 0; v_res text; v_added int := 0; v_updated int := 0; v_same int := 0; v_problems jsonb := '[]'::jsonb;
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can move data from YDL'; end if;
  if p_kind not in ('members', 'subscriptions', 'receipts', 'follow_ups', 'freezes', 'extensions', 'attendance') then raise exception 'Unknown import: %', p_kind; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 1000 then raise exception 'Send up to 1000 rows at a time'; end if;
  perform set_config('app.importing', 'on', true);       -- until the end of this transaction, so deferred triggers see it too
  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_res := case p_kind
        when 'members' then app.import_member_row(p_studio, r)
        when 'subscriptions' then app.import_subscription_row(p_studio, r)
        when 'receipts' then app.import_receipt_row(p_studio, r)
        when 'follow_ups' then app.import_follow_up_row(p_studio, r)
        when 'freezes' then app.import_freeze_row(p_studio, r)
        when 'extensions' then app.import_extension_row(p_studio, r)
        when 'attendance' then app.import_attendance_row(p_studio, r) end;
      if v_res = 'added' then v_added := v_added + 1; elsif v_res = 'updated' then v_updated := v_updated + 1; else v_same := v_same + 1; end if;
    exception when others then
      v_problems := v_problems || jsonb_build_object('line', coalesce((r->>'_line')::int, i), 'message', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('added', v_added, 'updated', v_updated, 'same', v_same, 'problems', v_problems);
end $$;

-- Counts on this side, to compare with YDL after a move.
create or replace function public.ydl_import_counts(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when app.is_owner(p_studio) then jsonb_build_object(
    'members', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null),
    'enquiries', (select count(*) from public.members m where m.studio_id = p_studio and m.kind = 'enquiry' and m.deleted_at is null),
    'subscriptions', (select count(*) from public.subscriptions s where s.studio_id = p_studio and s.deleted_at is null),
    'receipts', (select count(*) from public.payments p where p.studio_id = p_studio and p.status = 'paid'),
    'collected', (select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) from public.payments p
                  where p.studio_id = p_studio and p.status = 'paid' and p.kind <> 'write_off'),
    'balance', (select coalesce(sum(greatest(s.total_amount - coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end)
                  from public.payments p where p.subscription_id = s.id and p.status = 'paid' and p.purpose = 'subscription'), 0), 0)), 0)
                from public.subscriptions s where s.studio_id = p_studio and s.deleted_at is null and s.cancelled_at is null),
    'follow_ups', (select count(*) from public.follow_ups f where f.studio_id = p_studio and f.status = 'open'),
    'freezes', (select count(*) from public.freezes f where f.studio_id = p_studio),
    'extensions', (select count(*) from public.extensions e where e.studio_id = p_studio),
    'attendance', (select count(*) from public.attendance a where a.studio_id = p_studio)) end;
$$;

revoke all on function public.ydl_import(uuid, text, jsonb), public.ydl_import_counts(uuid) from public, anon;
call app.apply_grants();
