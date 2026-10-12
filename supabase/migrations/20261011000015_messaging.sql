-- Shaan Fitness app · 15. Notifications, WhatsApp, SMS and email (YDL "Notification & WhatsApp")
-- Every outgoing message (automatic or bulk) is written to one outbox, public.messages. A sender
-- (a Supabase Edge Function, set up with the gym's own WhatsApp / SMS / email accounts) picks up
-- queued messages and marks them sent or failed; until it is connected, messages wait in the
-- queue and the history shows them as waiting. App notifications go straight to the member app.

-- ---------------------------------------------------------------------------
-- Secrets for the message services (write-only, like the SMTP password)
-- ---------------------------------------------------------------------------
alter table public.studio_secrets drop constraint if exists studio_secrets_key_check;
alter table public.studio_secrets add constraint studio_secrets_key_check
  check (key in ('smtp_password', 'otp_vendor_api_key', 'whatsapp_token', 'sms_api_key', 'email_api_key'));

create or replace function public.set_studio_secret(p_studio uuid, p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change this'; end if;
  if p_key not in ('smtp_password', 'otp_vendor_api_key', 'whatsapp_token', 'sms_api_key', 'email_api_key') then raise exception 'Unknown setting'; end if;
  if coalesce(p_value, '') = '' then
    delete from public.studio_secrets where studio_id = p_studio and key = p_key;
  else
    insert into public.studio_secrets (studio_id, key, value) values (p_studio, p_key, p_value)
    on conflict (studio_id, key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Settings (YDL WhatsApp Settings as Shaan Fitness has them; SMS and email sending)
-- ---------------------------------------------------------------------------
create or replace function app.default_whatsapp_settings()
returns jsonb language sql immutable as $$ select '{
  "provider": "none", "instance_id": null, "number": null,
  "birthday": true, "balance_due": true, "on_expiry": true, "before_expiry": true, "after_expiry": true, "irregular": true,
  "on_enquiry": true, "on_bill": true, "on_paid_balance": false,
  "auto_resend": true, "internationalization": true, "customized_bill": true,
  "salutation": "Dear", "before_expiry_days": 3, "after_expiry_days": 7, "irregular_days": 10,
  "birthday_template": "", "irregular_template": "", "enquiry_template": "", "customized_bill_template": "",
  "suffix_bill": "Feel free to contact us in case of any queries.",
  "suffix_before_expiry": "Renew Immediately to continue using the services.",
  "suffix_after_expiry": "Renew Immediately to continue using the services.",
  "suffix_on_expiry": "Renew Immediately to continue using the services.",
  "suffix_balance_due": "Renew Immediately to continue using the services.",
  "suffix_paid_balance": "Thank you for your payment."
}'::jsonb $$;

create or replace function app.default_sms_settings()
returns jsonb language sql immutable as $$ select '{
  "provider": "none", "sender_id": null, "entity_id": null,
  "on_enquiry": false, "on_birthday": false, "before_expiry": false, "on_expiry": false, "on_bill": false,
  "templates": []
}'::jsonb $$;

create or replace function app.whatsapp_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'whatsapp'->p_key, app.default_whatsapp_settings()->p_key) from public.studios s where s.id = p_studio;
$$;
create or replace function app.sms_setting(p_studio uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(s.settings->'sms'->p_key, app.default_sms_settings()->p_key) from public.studios s where s.id = p_studio;
$$;

-- Save the WhatsApp or SMS settings (owner, or front desk with Broadcast SMS & WhatsApp).
create or replace function public.save_message_settings(p_studio uuid, p_channel text, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_def jsonb; v_new jsonb; k text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'change the message settings');
  if p_channel = 'whatsapp' then v_def := app.default_whatsapp_settings();
  elsif p_channel = 'sms' then v_def := app.default_sms_settings();
  else raise exception 'Unknown channel'; end if;
  if (p ? 'provider') and not app.is_owner(p_studio) then raise exception 'Only the owner can connect a message service'; end if;
  select coalesce(settings->p_channel, '{}'::jsonb) into v_new from public.studios where id = p_studio;
  for k in select jsonb_object_keys(p) loop
    if not (v_def ? k) then raise exception 'Unknown setting: %', k; end if;
    v_new := v_new || jsonb_build_object(k, p->k);
  end loop;
  if p_channel = 'whatsapp' then
    if coalesce(v_new->>'provider', 'none') not in ('none', 'ultramsg', 'greenapi', 'cloud_api') then raise exception 'Unknown WhatsApp service'; end if;
    if coalesce(v_new->>'salutation', 'Dear') not in ('Dear', 'Hello', 'Respected', 'Hi', 'Hey', 'Greetings') then raise exception 'Unknown salutation'; end if;
    if coalesce((v_new->>'before_expiry_days')::int, 3) not between 1 and 60 or coalesce((v_new->>'after_expiry_days')::int, 7) not between 1 and 60
       or coalesce((v_new->>'irregular_days')::int, 10) not between 3 and 90 then
      raise exception 'Days should be between 1 and 60 (irregular: 3 to 90)';
    end if;
  else
    if coalesce(v_new->>'provider', 'none') not in ('none', 'msg91', 'fast2sms', 'textlocal') then raise exception 'Unknown SMS service'; end if;
    if v_new->>'sender_id' is not null and v_new->>'sender_id' !~ '^[A-Za-z]{6}$' then raise exception 'The sender ID (header) is 6 letters, e.g. SHAANF'; end if;
    if jsonb_typeof(coalesce(v_new->'templates', '[]'::jsonb)) <> 'array' then raise exception 'Templates should be a list'; end if;
  end if;
  update public.studios set settings = jsonb_set(settings, array[p_channel], v_new) where id = p_studio;
end $$;

-- ---------------------------------------------------------------------------
-- The outbox
-- ---------------------------------------------------------------------------
create table public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  title text,
  body text not null,
  template_id text,
  audience text,
  total int not null default 0,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index message_campaigns_studio_idx on public.message_campaigns (studio_id, channel, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  member_id uuid references public.members(id) on delete set null,
  to_name text,
  to_address text not null check (length(trim(to_address)) > 0),
  subject text,
  body text not null check (length(trim(body)) > 0),
  source text not null check (source in ('birthday', 'balance_due', 'on_expiry', 'before_expiry', 'after_expiry', 'irregular',
                                         'enquiry', 'bill', 'paid_balance', 'bulk', 'test', 'single')),
  campaign_id uuid references public.message_campaigns(id) on delete set null,
  template_id text,                       -- the DLT template for an SMS
  dedupe_key text,                        -- one automatic message per client, kind and day
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  error text,
  attempts int not null default 0,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index messages_dedupe_uq on public.messages (studio_id, channel, dedupe_key) where dedupe_key is not null;
create index messages_studio_idx on public.messages (studio_id, channel, created_at desc);
create index messages_queue_idx on public.messages (send_after) where status = 'queued';
create index messages_campaign_idx on public.messages (campaign_id) where campaign_id is not null;

-- SMS credits bought (YDL "Recharge History"); the balance is credits less SMS sent.
create table public.sms_recharges (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  credits int not null check (credits > 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_on date not null default current_date,
  reference text,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index sms_recharges_studio_idx on public.sms_recharges (studio_id, paid_on desc);
create trigger sms_recharges_fill before insert on public.sms_recharges for each row execute function app.fill_created_by();

alter table public.message_campaigns enable row level security;
alter table public.messages enable row level security;
alter table public.sms_recharges enable row level security;
create policy message_campaigns_read on public.message_campaigns for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy messages_read on public.messages for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy sms_recharges_read on public.sms_recharges for select to authenticated using (app.can(studio_id, 'broadcast', 'on'));
create policy sms_recharges_owner on public.sms_recharges for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
-- Messages are written only by the functions below (and the sender, with the service key).

-- ---------------------------------------------------------------------------
-- Writing messages
-- ---------------------------------------------------------------------------
-- The client's WhatsApp / SMS number (country code and number, digits only) or email.
create or replace function app.member_address(m public.members, p_channel text)
returns text language sql immutable as $$
  select case
    when p_channel = 'email' then nullif(lower(trim(m.email)), '')
    when length(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g')) >= 6
      then regexp_replace(coalesce(m.country_code, '+91'), '\D', '', 'g') || regexp_replace(m.phone, '\D', '', 'g')
  end;
$$;

-- {cust_first_name} and the others: the client, the fitness center, and any extra values given.
create or replace function app.render_message(p_text text, m public.members, p_extra jsonb default '{}')
returns text language plpgsql stable security definer set search_path = '' as $$
declare s public.studios; v text := coalesce(p_text, ''); k text; x jsonb;
begin
  select * into s from public.studios where id = m.studio_id;
  x := jsonb_build_object(
    'cust_first_name', coalesce(m.first_name, ''), 'cust_last_name', coalesce(m.last_name, ''), 'cust_name', coalesce(m.full_name, ''),
    'fitness_center_name', coalesce(s.name, ''), 'fitness_center_phone', coalesce(s.mobile, ''),
    'website_url', coalesce(app.center_setting(s.id, 'website_url') #>> '{}', app.center_setting(s.id, 'web_app_url') #>> '{}', ''),
    'web_app_url', coalesce(app.center_setting(s.id, 'web_app_url') #>> '{}', app.center_setting(s.id, 'website_url') #>> '{}', ''),
    'salutation', coalesce(app.whatsapp_setting(s.id, 'salutation') #>> '{}', 'Dear')
  ) || coalesce(p_extra, '{}'::jsonb);
  for k in select jsonb_object_keys(x) loop
    v := replace(v, '{' || k || '}', coalesce(x->>k, ''));
  end loop;
  return trim(regexp_replace(v, '[ \t]+\n', E'\n', 'g'));
end $$;

-- Puts one message in the outbox (skipped quietly if the client has no number or email,
-- or the same automatic message already went out today).
create or replace function app.queue_message(m public.members, p_channel text, p_source text, p_body text,
  p_subject text default null, p_dedupe text default null, p_campaign uuid default null, p_template text default null, p_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_to text := app.member_address(m, p_channel); v_id uuid;
begin
  if v_to is null or nullif(trim(p_body), '') is null then return null; end if;
  insert into public.messages (studio_id, channel, member_id, to_name, to_address, subject, body, source, campaign_id, template_id, dedupe_key, created_by)
  values (m.studio_id, p_channel, m.id, m.full_name, v_to, p_subject, p_body, p_source, p_campaign, p_template, p_dedupe, p_by)
  on conflict (studio_id, channel, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id;
end $$;

-- The standard WhatsApp texts (as YDL sends them), with the gym's own templates and suffixes.
create or replace function app.whatsapp_text(p_kind text, m public.members, p jsonb default '{}')
returns text language plpgsql stable security definer set search_path = '' as $$
declare w jsonb; v_tpl text; v_hi text; v_text text; v_app text;
begin
  select app.default_whatsapp_settings() || coalesce(s.settings->'whatsapp', '{}'::jsonb) into w from public.studios s where s.id = m.studio_id;
  v_app := nullif(trim(coalesce(app.center_setting(m.studio_id, 'web_app_url') #>> '{}', '')), '');
  v_hi := (w->>'salutation') || ' ' || trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) || ',';
  v_tpl := nullif(trim(coalesce(w->>(p_kind || '_template'), '')), '');
  v_text := case p_kind
    when 'birthday' then coalesce(v_tpl, v_hi || ' Hope your special day brings you all that your heart desire! Happy Birthday From {fitness_center_name} Family.')
    when 'irregular' then coalesce(v_tpl, 'Hi {cust_first_name} {cust_last_name}, ' || E'\n\n' || 'It has been long time you have visited our center. ' || E'\n\n'
                                              || 'Please visit us and let us restart this wonderful journey together - {fitness_center_name}')
    when 'enquiry' then coalesce(v_tpl, 'Welcome To {fitness_center_name}, We are glad to know that you are interested in our services.' || E'\n\n'
                                            || case when v_app is not null then 'Our App : {web_app_url}' || E'\n' else '' end
                                            || 'Visit Our Website : {website_url}' || E'\n' || 'Call Us : {fitness_center_phone}')
    when 'bill' then case when (w->>'customized_bill')::boolean and nullif(trim(coalesce(w->>'customized_bill_template', '')), '') is not null
                          then w->>'customized_bill_template'
                          else v_hi || E'\n\n' || 'Thanks for subscribing ''{membership}'', Your Total Billing Amount is Rs. {total_amount}. '
                               || case when v_app is not null then 'You can see your plan and receipts in our app : ' || E'\n' || '{web_app_url}' else '' end
                               || E'\n' || coalesce(w->>'suffix_bill', '') end
    when 'before_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) is expiring in {days} Days ({end_date}). ' || coalesce(w->>'suffix_before_expiry', '')
    when 'on_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) is expiring today. ' || coalesce(w->>'suffix_on_expiry', '')
    when 'after_expiry' then v_hi || E'\n' || 'Your Membership Plan ({membership}) has expired {days} Days ago. ' || coalesce(w->>'suffix_after_expiry', '')
    when 'balance_due' then v_hi || E'\n' || 'A balance of Rs. {balance_amount} is due for your Membership Plan ({membership}). ' || coalesce(w->>'suffix_balance_due', '')
    when 'paid_balance' then v_hi || E'\n' || 'We have received Rs. {amount} for your Membership Plan ({membership}). Balance remaining: Rs. {balance_amount}. '
                                 || coalesce(w->>'suffix_paid_balance', '')
  end;
  return app.render_message(v_text, m, p);
end $$;

-- A bill's balance (total less payments and write-offs).
create or replace function app.sub_balance(p_sub uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select greatest(s.total_amount - coalesce((
    select sum(case when x.kind = 'payment' then x.amount when x.kind = 'refund' then -x.amount when x.kind = 'write_off' then x.amount else 0 end)
    from public.payments x where x.subscription_id = s.id and x.status = 'paid' and x.purpose = 'subscription'), 0), 0)
  from public.subscriptions s where s.id = p_sub;
$$;

-- Fewer decimals in amounts: 3000 not 3000.00.
create or replace function app.money_text(p numeric)
returns text language sql immutable as $$ select trim(trailing '.' from trim(trailing '0' from to_char(round(coalesce(p, 0), 2), 'FM999999999990.00'))) $$;

-- ---------------------------------------------------------------------------
-- Automatic messages: scheduled (birthday, expiry, balance due, irregular) and on events
-- ---------------------------------------------------------------------------
-- Queues one kind of scheduled message for a studio, for today (YDL "SYSTEM - …" messages).
create or replace function app.queue_scheduled(p_studio uuid, p_kind text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_n int := 0; r record; mem public.members; v_days int;
begin
  if not coalesce((app.whatsapp_setting(p_studio, p_kind) #>> '{}')::boolean, false) then return 0; end if;
  if p_kind = 'birthday' then
    for mem in select m.* from public.members m
      where m.studio_id = p_studio and m.kind = 'member' and m.deleted_at is null and m.active and m.date_of_birth is not null
        and (to_char(m.date_of_birth, 'MM-DD') = to_char(v_today, 'MM-DD')
             or (to_char(m.date_of_birth, 'MM-DD') = '02-29' and to_char(v_today, 'MM-DD') = '02-28' and to_char(v_today, 'YYYY')::int % 4 <> 0))
    loop
      if app.queue_message(mem, 'whatsapp', 'birthday', app.whatsapp_text('birthday', mem), null, 'birthday:' || mem.id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind in ('before_expiry', 'on_expiry', 'after_expiry') then
    v_days := case p_kind when 'on_expiry' then 0 when 'before_expiry' then (app.whatsapp_setting(p_studio, 'before_expiry_days') #>> '{}')::int
                          else -(app.whatsapp_setting(p_studio, 'after_expiry_days') #>> '{}')::int end;
    for r in select m as mem, p.name as plan_name, s.end_date as sub_end, s.id as sub_id from public.subscriptions s
      join public.members m on m.id = s.member_id and m.deleted_at is null and m.active
      join public.plans p on p.id = s.plan_id
      where s.studio_id = p_studio and s.kind in ('gym', 'pt') and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
        and s.end_date = v_today + v_days
        and not exists (select 1 from public.subscriptions n where n.member_id = s.member_id and n.kind in ('gym', 'pt') and n.id <> s.id
                        and n.deleted_at is null and n.cancelled_at is null and n.end_date > s.end_date)
    loop
      if app.queue_message(r.mem, 'whatsapp', p_kind,
           app.whatsapp_text(p_kind, r.mem, jsonb_build_object('membership', r.plan_name, 'days', abs(v_days), 'end_date', to_char(r.sub_end, 'DD-Mon-YYYY'))),
           null, p_kind || ':' || r.sub_id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind = 'balance_due' then
    -- On the payment date set on the bill (or a week after the bill), then every 7 days while a balance remains.
    for r in select m as mem, p.name as plan_name, s.id as sub_id, app.sub_balance(s.id) as bal from public.subscriptions s
      join public.members m on m.id = s.member_id and m.deleted_at is null and m.active
      join public.plans p on p.id = s.plan_id
      where s.studio_id = p_studio and s.deleted_at is null and s.cancelled_at is null and s.status = 'live'
        and v_today >= coalesce(s.balance_due_date, s.invoice_date + 7)
        and (v_today - coalesce(s.balance_due_date, s.invoice_date + 7)) % 7 = 0
        and app.sub_balance(s.id) > 0.009
    loop
      if app.queue_message(r.mem, 'whatsapp', 'balance_due',
           app.whatsapp_text('balance_due', r.mem, jsonb_build_object('membership', r.plan_name, 'balance_amount', app.money_text(r.bal))),
           null, 'balance_due:' || r.sub_id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  elsif p_kind = 'irregular' then
    v_days := (app.whatsapp_setting(p_studio, 'irregular_days') #>> '{}')::int;
    for mem in select m.* from public.members m
      join lateral (select s.start_date from public.subscriptions s where s.member_id = m.id and s.kind in ('gym', 'pt') and s.deleted_at is null
                    and s.cancelled_at is null and s.status = 'live' and v_today between s.start_date and s.end_date order by s.start_date limit 1) cur on true
      where m.studio_id = p_studio and m.deleted_at is null and m.active
        and coalesce((select max(a.date) from public.attendance a where a.member_id = m.id and a.status = 'present'), cur.start_date) = v_today - v_days
    loop
      if app.queue_message(mem, 'whatsapp', 'irregular', app.whatsapp_text('irregular', mem), null, 'irregular:' || mem.id || ':' || v_today) is not null then v_n := v_n + 1; end if;
    end loop;
  else
    raise exception 'Unknown message kind %', p_kind;
  end if;
  return v_n;
end $$;

-- Runs every hour: each kind at its YDL time in the studio's own time zone (Birthday 4 AM, Balance Due 5 AM,
-- Before Expiry 6 AM, After Expiry 7 AM, On Expiry and Irregular 8 AM). Safe to run more than once.
create or replace function app.run_message_schedule(p_hour int default null)
returns int language plpgsql security definer set search_path = '' as $$
declare s record; v_hour int; v_n int := 0; k text;
begin
  for s in select id, coalesce(timezone, 'Asia/Kolkata') as tz from public.studios where active loop
    v_hour := coalesce(p_hour, extract(hour from now() at time zone s.tz)::int);
    for k in select unnest(case v_hour when 4 then array['birthday'] when 5 then array['balance_due'] when 6 then array['before_expiry']
                                       when 7 then array['after_expiry'] when 8 then array['on_expiry', 'irregular'] else array[]::text[] end) loop
      v_n := v_n + app.queue_scheduled(s.id, k);
    end loop;
    -- Auto Resend: failed messages are retried a few hours later, up to three times.
    if coalesce((app.whatsapp_setting(s.id, 'auto_resend') #>> '{}')::boolean, false) then
      update public.messages set status = 'queued', send_after = now(), error = null
      where studio_id = s.id and channel = 'whatsapp' and status = 'failed' and attempts < 3 and created_at > now() - interval '2 days'
        and coalesce(sent_at, created_at) < now() - interval '2 hours';
    end if;
  end loop;
  return v_n;
end $$;

-- New enquiry: the welcome message (YDL "MESSAGE ON ENQUIRY").
create or replace function app.message_on_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'enquiry' and coalesce((app.whatsapp_setting(new.studio_id, 'on_enquiry') #>> '{}')::boolean, false) then
    perform app.queue_message(new, 'whatsapp', 'enquiry', app.whatsapp_text('enquiry', new), null, 'enquiry:' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists members_message_on_enquiry on public.members;
create trigger members_message_on_enquiry after insert on public.members for each row execute function app.message_on_enquiry();

-- New bill: sent when the billing finishes (so the first payment is counted).
create or replace function app.message_on_bill()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members; v_plan text;
begin
  if new.kind = 'trial' or new.deleted_at is not null or new.cancelled_at is not null then return null; end if;
  if not coalesce((app.whatsapp_setting(new.studio_id, 'on_bill') #>> '{}')::boolean, false) then return null; end if;
  select * into m from public.members where id = new.member_id;
  select name into v_plan from public.plans where id = new.plan_id;
  perform app.queue_message(m, 'whatsapp', 'bill', app.whatsapp_text('bill', m, jsonb_build_object(
    'membership', v_plan, 'total_amount', app.money_text(new.total_amount), 'start_date', to_char(new.start_date, 'DD-Mon-YYYY'),
    'end_date', to_char(new.end_date, 'DD-Mon-YYYY'), 'balance_amount', app.money_text(app.sub_balance(new.id)), 'receipt_link',
    coalesce(app.center_setting(new.studio_id, 'web_app_url') #>> '{}', ''))), null, 'bill:' || new.id);
  return null;
end $$;
drop trigger if exists subscriptions_message_on_bill on public.subscriptions;
create constraint trigger subscriptions_message_on_bill after insert on public.subscriptions
  deferrable initially deferred for each row execute function app.message_on_bill();

-- A balance paid later (not with the bill itself).
create or replace function app.message_on_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members; s public.subscriptions; v_plan text;
begin
  if new.kind <> 'payment' or new.status <> 'paid' or new.purpose <> 'subscription' or new.subscription_id is null then return null; end if;
  if not coalesce((app.whatsapp_setting(new.studio_id, 'on_paid_balance') #>> '{}')::boolean, false) then return null; end if;
  select * into s from public.subscriptions where id = new.subscription_id;
  if s.created_at >= now() then return null; end if;      -- paid with the bill: the bill message covers it
  select * into m from public.members where id = new.member_id;
  select name into v_plan from public.plans where id = s.plan_id;
  perform app.queue_message(m, 'whatsapp', 'paid_balance', app.whatsapp_text('paid_balance', m, jsonb_build_object(
    'membership', v_plan, 'amount', app.money_text(new.amount), 'balance_amount', app.money_text(app.sub_balance(s.id)))), null, 'paid:' || new.id);
  return null;
end $$;
drop trigger if exists payments_message_on_payment on public.payments;
create trigger payments_message_on_payment after insert on public.payments for each row execute function app.message_on_payment();

-- ---------------------------------------------------------------------------
-- Sending from the pages
-- ---------------------------------------------------------------------------
-- Clients by YDL's lists: Notification "Select Group Of User" and Email / SMS "Members Status".
create or replace function app.audience(p_studio uuid, p_group text, p_service uuid default null)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select o.id from public.member_overview o
  where o.studio_id = p_studio and o.active
    and case p_group
      when 'all' then true
      when 'enquiry' then o.kind = 'enquiry'
      when 'enquiry_male' then o.kind = 'enquiry' and o.gender = 'male'
      when 'enquiry_female' then o.kind = 'enquiry' and o.gender = 'female'
      when 'enquiry_open' then o.kind = 'enquiry' and o.lead_status = 'open'
      when 'enquiry_not_interested' then o.kind = 'enquiry' and o.lead_status = 'not_interested'
      when 'members' then o.kind = 'member'
      when 'male' then o.kind = 'member' and o.gender = 'male'
      when 'female' then o.kind = 'member' and o.gender = 'female'
      when 'active' then o.kind = 'member' and o.live_status in ('active', 'pending')
      when 'expired_membership' then o.kind = 'member' and o.live_status = 'inactive'
      else false end
    and (p_service is null or p_service = any (coalesce(o.current_service_ids, '{}'::uuid[])));
$$;

-- YDL "Send Notification": an app notification to a group (p_dry: just count them).
create or replace function public.notify_group(p_studio uuid, p_group text, p_service uuid, p_title text, p_body text, p_dry boolean default false)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform app.require(p_studio, 'notices', 'on', 'send notifications');
  if p_dry then return (select count(*) from app.audience(p_studio, p_group, p_service)); end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then raise exception 'Enter the Message Title and Message Body'; end if;
  insert into public.notifications (studio_id, member_id, title, body, sent_by)
  select p_studio, a, trim(p_title), trim(p_body), app.my_staff_id(p_studio) from app.audience(p_studio, p_group, p_service) a;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- WhatsApp, SMS or email to chosen clients (or a group). One message per client, with {cust_first_name} filled in.
create or replace function public.queue_messages(p_studio uuid, p_channel text, p_member_ids uuid[], p_body text, p_subject text default null,
  p_template_id text default null, p_group text default null, p_dry boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_campaign uuid; v_n int := 0; v_skip int := 0; m public.members; v_by uuid := app.my_staff_id(p_studio);
begin
  perform app.require(p_studio, 'broadcast', 'on', 'send WhatsApp, SMS or email');
  if p_channel not in ('whatsapp', 'sms', 'email') then raise exception 'Unknown channel'; end if;
  v_ids := case when p_group is not null then array(select app.audience(p_studio, p_group)) else coalesce(p_member_ids, '{}') end;
  if p_dry then
    return jsonb_build_object('total', (select count(*) from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null),
      'reachable', (select count(*) from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null and app.member_address(x, p_channel) is not null));
  end if;
  if nullif(trim(p_body), '') is null then raise exception 'Write the message'; end if;
  if p_channel = 'email' and nullif(trim(p_subject), '') is null then raise exception 'Enter the email subject'; end if;
  if p_channel = 'sms' and nullif(trim(p_template_id), '') is null then raise exception 'Choose the DLT template'; end if;
  if cardinality(v_ids) = 0 then raise exception 'Choose who to send it to'; end if;
  if cardinality(v_ids) > 1 then
    insert into public.message_campaigns (studio_id, channel, title, body, template_id, audience, created_by)
    values (p_studio, p_channel, nullif(trim(p_subject), ''), trim(p_body), p_template_id, coalesce(p_group, 'selected'), v_by) returning id into v_campaign;
  end if;
  for m in select * from public.members x where x.id = any (v_ids) and x.studio_id = p_studio and x.deleted_at is null loop
    if app.queue_message(m, p_channel, case when v_campaign is null then 'single' else 'bulk' end, app.render_message(p_body, m),
         case when p_subject is null then null else app.render_message(p_subject, m) end, null, v_campaign, p_template_id, v_by) is null then
      v_skip := v_skip + 1;
    else
      v_n := v_n + 1;
    end if;
  end loop;
  if v_campaign is not null then update public.message_campaigns set total = v_n where id = v_campaign; end if;
  return jsonb_build_object('queued', v_n, 'skipped', v_skip, 'campaign_id', v_campaign);
end $$;

-- QR Manager "Send Test Message".
create or replace function public.send_test_message(p_studio uuid, p_channel text, p_to text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_to text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'send test messages');
  if p_channel not in ('whatsapp', 'sms', 'email') then raise exception 'Unknown channel'; end if;
  v_to := case when p_channel = 'email' then lower(trim(p_to)) else regexp_replace(coalesce(p_to, ''), '\D', '', 'g') end;
  if p_channel <> 'email' and length(v_to) not between 10 and 15 then raise exception 'Enter the mobile number with its country code, e.g. 91 98481 20185'; end if;
  if p_channel = 'email' and v_to !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email address'; end if;
  if nullif(trim(p_body), '') is null then raise exception 'Write the message'; end if;
  insert into public.messages (studio_id, channel, to_address, body, source, created_by)
  values (p_studio, p_channel, v_to, trim(p_body), 'test', app.my_staff_id(p_studio)) returning id into v_id;
  return v_id;
end $$;

-- Messages History "Resend Selected / Today / Yesterday / All Failed" (failed ones; selected ones whatever their state).
create or replace function public.resend_messages(p_studio uuid, p_channel text, p_scope text, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_n int; v_tz text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'resend messages');
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = p_studio;
  update public.messages x set status = 'queued', send_after = now(), error = null
  where x.studio_id = p_studio and x.channel = p_channel and x.status <> 'queued'
    and case p_scope
      when 'selected' then x.id = any (coalesce(p_ids, '{}'))
      when 'today' then x.status = 'failed' and (x.created_at at time zone v_tz)::date = v_today
      when 'yesterday' then x.status = 'failed' and (x.created_at at time zone v_tz)::date = v_today - 1
      when 'failed' then x.status = 'failed'
      else false end;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- The history page's counts (YDL "Total Today / Success Today / Failed Today" and the 7 days).
create or replace function public.message_stats(p_studio uuid, p_channel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date := app.today(p_studio); v_tz text;
begin
  perform app.require(p_studio, 'broadcast', 'on', 'see the message history');
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.studios where id = p_studio;
  return (
    select jsonb_build_object(
      'today_total', count(*) filter (where d = v_today), 'today_sent', count(*) filter (where d = v_today and status = 'sent'),
      'today_failed', count(*) filter (where d = v_today and status = 'failed'),
      'week_total', count(*), 'week_sent', count(*) filter (where status = 'sent'), 'week_failed', count(*) filter (where status = 'failed'),
      'queued', (select count(*) from public.messages q where q.studio_id = p_studio and q.channel = p_channel and q.status in ('queued', 'sending')),
      'sms_credits', (select coalesce(sum(credits), 0) from public.sms_recharges r where r.studio_id = p_studio),
      'sms_used', (select count(*) from public.messages u where u.studio_id = p_studio and u.channel = 'sms' and u.status = 'sent'))
    from (select (x.created_at at time zone v_tz)::date as d, x.status from public.messages x
          where x.studio_id = p_studio and x.channel = p_channel and x.created_at >= (v_today - 6)::timestamp at time zone v_tz) t
  );
end $$;

-- Bulk campaigns with how many went out (SMS "Bulk Campaigns History").
create or replace function public.message_campaign_list(p_studio uuid, p_channel text)
returns table (id uuid, title text, body text, template_id text, audience text, total int, sent bigint, failed bigint, waiting bigint, created_at timestamptz, created_by_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.body, c.template_id, c.audience, c.total,
    count(x.id) filter (where x.status = 'sent'), count(x.id) filter (where x.status = 'failed'), count(x.id) filter (where x.status in ('queued', 'sending')),
    c.created_at, st.full_name
  from public.message_campaigns c
  left join public.messages x on x.campaign_id = c.id
  left join public.staff st on st.id = c.created_by
  where c.studio_id = p_studio and c.channel = p_channel and app.can(p_studio, 'broadcast', 'on')
  group by c.id, st.full_name
  order by c.created_at desc
  limit 500;
$$;

-- The member app: notifications, newest first; marking them read.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.notifications n set read_at = now()
  where n.read_at is null and app.is_self(n.member_id) and (p_ids is null or n.id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- The hourly schedule (Supabase has pg_cron; plain Postgres for tests doesn't)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.unschedule(jobid) from cron.job where jobname = 'shaan-messages';
      perform cron.schedule('shaan-messages', '0 * * * *', 'select app.run_message_schedule()');
    exception when others then
      raise notice 'Hourly messages not scheduled (%). Turn on pg_cron in Supabase › Database › Extensions, then run this file again.', sqlerrm;
    end;
  end if;
end $$;

revoke all on function public.save_message_settings(uuid, text, jsonb), public.notify_group(uuid, text, uuid, text, text, boolean),
  public.queue_messages(uuid, text, uuid[], text, text, text, text, boolean), public.send_test_message(uuid, text, text, text),
  public.resend_messages(uuid, text, text, uuid[]), public.message_stats(uuid, text), public.message_campaign_list(uuid, text),
  public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.save_message_settings(uuid, text, jsonb), public.notify_group(uuid, text, uuid, text, text, boolean),
  public.queue_messages(uuid, text, uuid[], text, text, text, text, boolean), public.send_test_message(uuid, text, text, text),
  public.resend_messages(uuid, text, text, uuid[]), public.message_stats(uuid, text), public.message_campaign_list(uuid, text),
  public.mark_notifications_read(uuid[]) to authenticated;
revoke all on function app.run_message_schedule(int), app.queue_scheduled(uuid, text) from public, anon, authenticated;
grant execute on function app.run_message_schedule(int), app.queue_scheduled(uuid, text) to service_role;

call app.apply_grants();
