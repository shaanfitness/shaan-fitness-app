-- Shaan Fitness app · 10. Team: staff, trainers, access control, targets, payroll; coupons and combo offers
-- YDL "Staff" (accounts, access control, targets), "Trainers" (trainers, client transformations,
-- leave requests), "Accounts › Payroll", "Memberships › Coupon / Combo Offer", holidays for payroll.

-- ---------------------------------------------------------------------------
-- Staff: YDL employee type (drives access control), shift time for late marks
-- ---------------------------------------------------------------------------
alter table public.staff
  add column access_type text check (access_type in
    ('owner', 'manager', 'floor_manager', 'admin', 'sales', 'front_desk_exec', 'helper', 'sales_manager', 'hr')),
  add column shift_start time,
  add column shift_end time,
  add column deleted_at timestamptz;
update public.staff set access_type = case role when 'owner' then 'owner' when 'front_desk' then 'front_desk_exec' end
where access_type is null and role in ('owner', 'front_desk');
-- One account per email and kind (the owner can also be a trainer with the same email).
create unique index staff_email_role_uq on public.staff (studio_id, lower(email), role) where deleted_at is null and email is not null;

-- YDL staff designations (an editable dropdown list).
insert into public.list_items (studio_id, list, label, sort)
select s.id, 'staff_designation', d.label, d.sort
from public.studios s cross join (values ('Sales Head', 1), ('Sales Executive', 2), ('Housekeeping', 3), ('Security', 4), ('Valet', 5),
  ('Team Owner', 6), ('Score Keeper', 7)) as d(label, sort)
where not exists (select 1 from public.list_items x where x.studio_id = s.id and x.list = 'staff_designation');

-- ---------------------------------------------------------------------------
-- Access control (YDL "Staff Accounts Access Control"): what each employee type may do.
-- Stored in studios.settings.access_control; until the owner saves it, Shaan Fitness's
-- own YDL settings (read on 9 Oct 2026) apply. The owner can always do everything.
-- ---------------------------------------------------------------------------
create or replace function app.default_access_control()
returns jsonb language sql immutable as $acl$ select '{"manager":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","bill_rep","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"floor_manager":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"front_desk_exec":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","upgrade","freeze","billing_screen","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"sales":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"helper":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"sales_manager":{"enquiry":["add","view"],"members":["add","edit","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit","upgrade","freeze","downgrade","billing_screen","cancel_payments","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"trainers":["add","view","leave"],"fitness_center":["edit","view"],"staff_accounts":["edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"admin":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"hr":{"enquiry":["add","edit","delete","change","view"],"members":["add","edit","delete","change","view"],"traffic_insight":["on"],"members_insight":["on"],"subscription_insight":["on"],"bounced_insight":["on"],"notices":["on"],"plans":["add","edit","delete"],"batches":["add","edit","delete","view","activate"],"programs":["add","edit","delete","view"],"program_attendance":["view"],"batch_attendance":["view"],"class_attendance":["view"],"class_capacity":["view"],"class_calendar":["view"],"customer_attendance":["delete"],"subscriptions":["add","edit_date","edit","delete","upgrade","transfer","freeze","extend","downgrade","edit_bill","billing_screen","cancel_payments","receipt_date","receipt_price","upgrade_amount"],"allow_edit_subscription":["on"],"allow_extend":["on"],"allow_freeze":["on"],"coupons":["on"],"broadcast":["on"],"transformations":["on"],"community":["on"],"trainers":["add","edit","view","leave"],"fitness_center":["add","edit","view"],"staff_accounts":["add","edit","view"],"targets":["add","edit","delete","view_listing","view_page"],"rules":["on"],"feedback":["on"],"transfer_client":["on"],"biometric":["on"],"dashboard_cards":["today","month","year","balance","active_gym","active_pt","expired_gym","expired_pt","open_enquiries","active_members"]},"nav_off":{"admin":["Traffic Analysis","Members Analysis","Enquiry FollowUp Stage Analysis","Collection Analysis","Subscriptions Analysis","Renewal Analysis","Follow up Analysis","Conversion Analysis","Enquiry Analysis","Enquiry Conversion Report","Expense Analysis","Profit & Loss Analysis","Billing Analysis","Sales Leaderboard","Daily Collection Analysis","PT Analysis","Leaderboard","Revenue Forecast","Weight Loss Analysis","Lead Source Analysis","Collection Report","Receipt Register","Subscriptions Register","Cash Register","Session Register","Recorded Session Register","Deleted Session Register","Coupon Code Register","Expired Membership Register","Expired Session Register","Balance Due Register","TAX Register","Write Off Register","Deleted Subscription Register","Trial Register","Cancel Subscription Register","Transfer Register","Freeze Register","Upgrade Register","Extension Register","Downgrade Register","Course Orders","Receipt Register Log","Recurring Payments Register","Classes Point deduction on Booking"],"hr":["Traffic Analysis","Members Analysis","Enquiry FollowUp Stage Analysis","Collection Analysis","Subscriptions Analysis","Renewal Analysis","Follow up Analysis","Conversion Analysis","Enquiry Analysis","Enquiry Conversion Report","Expense Analysis","Profit & Loss Analysis","Billing Analysis","Sales Leaderboard","Daily Collection Analysis","PT Analysis","Leaderboard","Revenue Forecast","Weight Loss Analysis","Lead Source Analysis","Collection Report","Receipt Register","Subscriptions Register","Cash Register","Session Register","Recorded Session Register","Deleted Session Register","Coupon Code Register","Expired Membership Register","Expired Session Register","Balance Due Register","TAX Register","Write Off Register","Deleted Subscription Register","Trial Register","Cancel Subscription Register","Transfer Register","Freeze Register","Upgrade Register","Extension Register","Downgrade Register","Course Orders","Receipt Register Log","Recurring Payments Register","Classes Point deduction on Booking"]}}'::jsonb $acl$;

create or replace function app.access_control(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select s.settings->'access_control' from public.studios s where s.id = p_studio), app.default_access_control());
$$;

-- True when the signed-in person may do p_sub of p_key ('on' for single switches).
create or replace function app.can(p_studio uuid, p_key text, p_sub text default 'on')
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_owner(p_studio) or exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.deleted_at is null and s.role = 'front_desk'
      and coalesce(app.access_control(p_studio) -> coalesce(s.access_type, 'front_desk_exec') -> p_key, '[]'::jsonb) ? p_sub
  );
$$;

create or replace function app.require(p_studio uuid, p_key text, p_sub text, p_what text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.can(p_studio, p_key, p_sub) then raise exception 'You don''t have permission to %. Ask the owner (Staff › Staff Access Control).', p_what; end if;
end $$;

-- The signed-in staff member's rights, for the app to show or hide pages and buttons.
create or replace function public.my_access(p_studio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when app.is_owner(p_studio) then jsonb_build_object('owner', true)
    else jsonb_build_object('owner', false, 'type', s.access_type,
      'rights', coalesce(app.access_control(p_studio) -> coalesce(s.access_type, 'front_desk_exec'), '{}'::jsonb),
      'nav_off', coalesce(app.access_control(p_studio) -> 'nav_off' -> coalesce(s.access_type, 'front_desk_exec'), '[]'::jsonb))
  end
  from (select 1) x left join public.staff s
    on s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.deleted_at is null and s.role = 'front_desk';
$$;

-- The owner saves the matrix.
create or replace function public.save_access_control(p_studio uuid, p_acl jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_owner(p_studio) then raise exception 'Only the owner can change access control'; end if;
  if jsonb_typeof(p_acl) <> 'object' then raise exception 'Access control must be an object'; end if;
  update public.studios set settings = jsonb_set(settings, '{access_control}', p_acl, true) where id = p_studio;
end $$;

grant execute on function app.default_access_control(), app.access_control(uuid), app.can(uuid, text, text),
  app.require(uuid, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Plans, coupons, combo offers, batches, programs follow access control
-- ---------------------------------------------------------------------------
drop policy plans_owner on public.plans;
create policy plans_add on public.plans for insert to authenticated with check (app.can(studio_id, 'plans', 'add'));
create policy plans_edit on public.plans for update to authenticated using (app.can(studio_id, 'plans', 'edit')) with check (app.can(studio_id, 'plans', 'edit'));
create policy plans_delete on public.plans for delete to authenticated using (app.can(studio_id, 'plans', 'delete'));

drop policy coupons_owner on public.coupons;
create policy coupons_manage on public.coupons for all to authenticated using (app.can(studio_id, 'coupons')) with check (app.can(studio_id, 'coupons'));
create trigger coupons_created_by before insert on public.coupons for each row execute function app.fill_created_by();
alter table public.coupons add constraint coupons_name_check check (length(trim(name)) > 0),
  add constraint coupons_code_check check (code ~ '^[A-Za-z0-9_-]{2,30}$');
create unique index coupons_code_ci on public.coupons (studio_id, upper(code));

alter table public.combo_offers add column plan_prices jsonb not null default '{}'::jsonb;
alter table public.combo_offers add constraint combo_offers_name_check check (length(trim(name)) > 0);
drop policy combos_owner on public.combo_offers;
create policy combos_manage on public.combo_offers for all to authenticated using (app.can(studio_id, 'plans', 'add')) with check (app.can(studio_id, 'plans', 'add'));
create trigger combo_offers_created_by before insert on public.combo_offers for each row execute function app.fill_created_by();

drop policy batches_desk on public.batches;
create policy batches_add on public.batches for insert to authenticated with check (app.can(studio_id, 'batches', 'add'));
create policy batches_edit on public.batches for update to authenticated
  using (app.can(studio_id, 'batches', 'edit') or app.can(studio_id, 'batches', 'activate'))
  with check (app.can(studio_id, 'batches', 'edit') or app.can(studio_id, 'batches', 'activate'));
create policy batches_delete on public.batches for delete to authenticated using (app.can(studio_id, 'batches', 'delete'));

drop policy programs_desk on public.programs;
create policy programs_add on public.programs for insert to authenticated with check (app.can(studio_id, 'programs', 'add'));
create policy programs_edit on public.programs for update to authenticated using (app.can(studio_id, 'programs', 'edit')) with check (app.can(studio_id, 'programs', 'edit'));
create policy programs_delete on public.programs for delete to authenticated using (app.can(studio_id, 'programs', 'delete'));

-- ---------------------------------------------------------------------------
-- Staff and trainer accounts
-- ---------------------------------------------------------------------------
drop policy staff_owner_insert on public.staff;
drop policy staff_owner_update on public.staff;
create policy staff_desk_insert on public.staff for insert to authenticated with check (app.is_desk(studio_id));
create policy staff_desk_update on public.staff for update to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

-- Who may add or change which account. Runs as the caller, so the database's own
-- functions (which check rights themselves) are not stopped here.
create or replace function app.guard_staff()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user::text <> 'authenticated' or app.is_owner(new.studio_id) then return new; end if;
  if new.role in ('owner', 'doctor') or new.access_type = 'owner' or (tg_op = 'UPDATE' and old.role in ('owner', 'doctor')) then
    raise exception 'Only the owner can add or change owner and doctor accounts';
  end if;
  if tg_op = 'INSERT' then
    perform app.require(new.studio_id, case when new.role = 'coach' then 'trainers' else 'staff_accounts' end, 'add',
      case when new.role = 'coach' then 'add trainers' else 'add staff accounts' end);
    if new.user_id is not null then raise exception 'Logins are linked automatically'; end if;
  else
    perform app.require(new.studio_id, case when new.role = 'coach' then 'trainers' else 'staff_accounts' end, 'edit',
      case when new.role = 'coach' then 'edit trainers' else 'edit staff accounts' end);
    if new.user_id is distinct from old.user_id then raise exception 'Logins are linked automatically'; end if;
    if old.user_id = (select auth.uid()) and (new.permissions is distinct from old.permissions or new.access_type is distinct from old.access_type
        or new.role is distinct from old.role or new.active is distinct from old.active) then
      raise exception 'You can''t change your own access';
    end if;
    if new.role is distinct from old.role then raise exception 'A staff account can''t become a trainer (add a trainer instead)'; end if;
  end if;
  return new;
end $$;
create trigger staff_guard before insert or update on public.staff for each row execute function app.guard_staff();

-- Link a login that already exists (same email or mobile) to a staff record.
create or replace function public.link_staff_login(p_staff uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s public.staff; v_user uuid;
begin
  select * into s from public.staff where id = p_staff;
  if s.id is null or not app.is_desk(s.studio_id) then raise exception 'Staff not found'; end if;
  if s.user_id is not null then return true; end if;
  select u.id into v_user from auth.users u
  where (s.email is not null and lower(u.email) = lower(s.email))
     or (u.phone is not null and (app.same_phone(s.country_code || coalesce(s.phone, ''), u.phone) or app.same_phone(s.phone, u.phone)))
  order by u.created_at limit 1;
  if v_user is null then return false; end if;
  update public.staff set user_id = v_user where id = s.id;
  return true;
end $$;

-- Manual check-in and check-out times (YDL "Add Check In & Check Out Time").
create or replace function public.staff_add_time(p_staff uuid, p_in timestamptz, p_out timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.staff; v_id uuid; v_tz text;
begin
  select * into s from public.staff where id = p_staff and deleted_at is null;
  if s.id is null then raise exception 'Staff not found'; end if;
  perform app.require(s.studio_id, case when s.role = 'coach' then 'trainers' else 'staff_accounts' end, 'view', 'mark attendance');
  if p_in is null then raise exception 'Enter the check in date and time'; end if;
  if p_out is not null and p_out < p_in then raise exception 'Check out is before check in'; end if;
  if p_in > now() + interval '5 minutes' then raise exception 'Check in can''t be in the future'; end if;
  select st.timezone into v_tz from public.studios st where st.id = s.studio_id;
  insert into public.staff_attendance (studio_id, staff_id, date, check_in, check_out, source, marked_by)
  values (s.studio_id, s.id, (p_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::date, p_in, p_out, 'manual', app.my_staff_id(s.studio_id))
  returning id into v_id;
  return v_id;
end $$;

-- Delete a trainer or staff account, moving their clients and work to someone else first
-- (YDL "Delete & Migrate"). The record is kept, marked deleted, so old bills keep the name.
create or replace function public.delete_staff(p_staff uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.staff; t public.staff;
begin
  select * into s from public.staff where id = p_staff and deleted_at is null;
  if s.id is null then raise exception 'Staff not found'; end if;
  if not app.is_owner(s.studio_id) then raise exception 'Only the owner can delete trainers and staff'; end if;
  if s.role = 'owner' and (select count(*) from public.staff x where x.studio_id = s.studio_id and x.role = 'owner' and x.active and x.deleted_at is null) <= 1 then
    raise exception 'The last owner can''t be deleted';
  end if;
  if s.user_id = (select auth.uid()) and s.role = 'owner' then raise exception 'You can''t delete your own owner account'; end if;
  if p_to is not null then
    select * into t from public.staff where id = p_to and studio_id = s.studio_id and active and deleted_at is null;
    if t.id is null or t.id = s.id then raise exception 'Choose who takes over'; end if;
    update public.members set trainer_id = t.id where trainer_id = s.id;
    update public.members set added_by = t.id where added_by = s.id;
    update public.subscriptions set trainer_id = t.id where trainer_id = s.id and status = 'live' and deleted_at is null and cancelled_at is null;
    update public.subscriptions set client_rep_id = t.id where client_rep_id = s.id and status = 'live' and deleted_at is null and cancelled_at is null;
    update public.batches set trainer_ids = array_append(array_remove(trainer_ids, s.id), t.id) where s.id = any (trainer_ids) and not (t.id = any (trainer_ids));
    update public.batches set trainer_ids = array_remove(trainer_ids, s.id) where s.id = any (trainer_ids);
    update public.programs set trainer_ids = array_append(array_remove(trainer_ids, s.id), t.id) where s.id = any (trainer_ids) and not (t.id = any (trainer_ids));
    update public.programs set trainer_ids = array_remove(trainer_ids, s.id) where s.id = any (trainer_ids);
    update public.follow_ups set assigned_to = t.id where assigned_to = s.id and status = 'open';
    update public.appointments set handled_by = t.id where handled_by = s.id and appointment_date >= app.today(s.studio_id) and status = 'open';
    update public.care_team set staff_id = t.id where staff_id = s.id
      and not exists (select 1 from public.care_team c2 where c2.member_id = care_team.member_id and c2.staff_id = t.id);
  end if;
  update public.staff set active = false, deleted_at = now(), user_id = null where id = s.id;
end $$;

-- ---------------------------------------------------------------------------
-- Client transformations (shown in the member app). Clients' consent is required.
-- ---------------------------------------------------------------------------
create table public.transformations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  image_url text,
  client_name text not null check (length(trim(client_name)) > 0),
  member_id uuid references public.members(id) on delete set null,
  period_value int not null check (period_value > 0),
  period_unit text not null default 'months' check (period_unit in ('days', 'weeks', 'months', 'years')),
  trainer_id uuid references public.staff(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  consent boolean not null default false check (consent),
  show_in_app boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index transformations_studio_idx on public.transformations (studio_id, created_at desc);
create trigger transformations_created_by before insert on public.transformations for each row execute function app.fill_created_by();
create trigger transformations_log after update or delete on public.transformations for each row execute function app.log_activity();

-- ---------------------------------------------------------------------------
-- Leave requests (YDL "Trainer Leave Requests")
-- ---------------------------------------------------------------------------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  mode text not null default 'full' check (mode in ('full', 'morning_half', 'evening_half')),
  days numeric(5,1) generated always as ((end_date - start_date + 1) * case when mode = 'full' then 1 else 0.5 end) stored,
  paid boolean,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  cancelled boolean not null default false,
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index leave_requests_studio_idx on public.leave_requests (studio_id, start_date);
create trigger leave_requests_log after update or delete on public.leave_requests for each row execute function app.log_activity();

create or replace function public.decide_leave(p_ids uuid[], p_status text, p_paid boolean default null)
returns int language plpgsql security definer set search_path = '' as $$
declare l public.leave_requests; v_n int = 0;
begin
  if p_status not in ('approved', 'rejected') then raise exception 'Approve or reject'; end if;
  for l in select * from public.leave_requests where id = any (p_ids) for update loop
    perform app.require(l.studio_id, 'trainers', 'leave', 'decide leave requests');
    if l.cancelled then continue; end if;
    update public.leave_requests set status = p_status, paid = case when p_status = 'approved' then coalesce(p_paid, false) end,
      decided_by = app.my_staff_id(l.studio_id), decided_at = now() where id = l.id;
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.cancel_leave(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.leave_requests;
begin
  select * into l from public.leave_requests where id = p_id;
  if l.id is null or not (l.staff_id in (select app.my_staff_ids()) or app.can(l.studio_id, 'trainers', 'leave')) then raise exception 'Leave request not found'; end if;
  update public.leave_requests set cancelled = true where id = l.id;
end $$;

-- ---------------------------------------------------------------------------
-- Staff/Trainer targets with up to five commission slabs (YDL "Staff/Trainer Target")
-- ---------------------------------------------------------------------------
create table public.staff_targets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  year smallint not null check (year between 2020 and 2100),
  month smallint not null check (month between 1 and 12),
  target_type text check (target_type in ('pt', 'general', 'both', 'new_pt', 'new_general', 'renew_pt', 'renew_general')),
  commission_type text check (commission_type in ('flat', 'percentage')),
  tiers jsonb not null default '[]'::jsonb check (jsonb_typeof(tiers) = 'array' and jsonb_array_length(tiers) between 1 and 5),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index staff_targets_once on public.staff_targets (staff_id, year, month, coalesce(target_type, ''));
create trigger staff_targets_created_by before insert on public.staff_targets for each row execute function app.fill_created_by();
create trigger staff_targets_log after update or delete on public.staff_targets for each row execute function app.log_activity();

-- Sales that count for a target: bills where the person is the bill rep or the trainer, that month.
create or replace function app.target_sales(t public.staff_targets)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(s.net_amount), 0)
  from public.subscriptions s
  where s.studio_id = t.studio_id and s.deleted_at is null and s.cancelled_at is null and s.kind in ('gym', 'pt')
    and s.invoice_date >= make_date(t.year, t.month, 1) and s.invoice_date < (make_date(t.year, t.month, 1) + interval '1 month')::date
    and (s.bill_rep_id = t.staff_id or s.trainer_id = t.staff_id)
    and case t.target_type
      when 'pt' then s.kind = 'pt' when 'general' then s.kind = 'gym'
      when 'new_pt' then s.kind = 'pt' and not s.is_renewal when 'new_general' then s.kind = 'gym' and not s.is_renewal
      when 'renew_pt' then s.kind = 'pt' and s.is_renewal when 'renew_general' then s.kind = 'gym' and s.is_renewal
      else true end;
$$;

create view public.target_overview with (security_invoker = true) as
select t.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, cb.full_name as created_by_name,
  ach.sales as achieved,
  (select max(i) from generate_series(1, jsonb_array_length(t.tiers)) i where ach.sales >= (t.tiers -> (i - 1) ->> 'target')::numeric) as tier_reached,
  coalesce((select case t.commission_type
      when 'percentage' then round(ach.sales * coalesce((t.tiers -> (i - 1) ->> 'commission')::numeric, 0) / 100, 2)
      else coalesce((t.tiers -> (i - 1) ->> 'commission')::numeric, 0) end
    from generate_series(1, jsonb_array_length(t.tiers)) i where ach.sales >= (t.tiers -> (i - 1) ->> 'target')::numeric
    order by i desc limit 1), 0) as commission_earned
from public.staff_targets t
join public.staff s on s.id = t.staff_id
left join public.staff cb on cb.id = t.created_by
cross join lateral (select app.target_sales(t) as sales) ach;

-- ---------------------------------------------------------------------------
-- Holidays (YDL "Fitness Center Holiday"; payroll counts declared holidays)
-- ---------------------------------------------------------------------------
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  event_date date not null,
  title text not null check (length(trim(title)) > 0),
  holiday_type text,
  audience text not null default 'customer',
  is_holiday boolean not null default true,
  send_wish boolean not null default false,
  wish_text text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index holidays_studio_idx on public.holidays (studio_id, event_date);
create trigger holidays_created_by before insert on public.holidays for each row execute function app.fill_created_by();

-- ---------------------------------------------------------------------------
-- Payroll (YDL "Payroll Calculator" and "Payroll Register")
-- ---------------------------------------------------------------------------
create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  paid_date date not null,
  paid_days numeric(5,1) not null default 0,
  present_days int not null default 0,
  absent_days numeric(5,1) not null default 0,
  late_days int not null default 0,
  paid_leaves numeric(5,1) not null default 0,
  holidays int not null default 0,
  basic_salary numeric(12,2) not null default 0,
  pt_commission numeric(12,2) not null default 0,
  sales_commission numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  deduction numeric(12,2) not null default 0,
  payable numeric(12,2) not null default 0,
  mode text,
  expense_id uuid references public.expenses(id) on delete set null,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index payroll_entries_studio_idx on public.payroll_entries (studio_id, from_date);
create trigger payroll_entries_log after update or delete on public.payroll_entries for each row execute function app.log_activity();

-- Everyone's pay for a period from attendance, leave, holidays, targets and pay settings.
-- Per-day rate = monthly pay ÷ calendar days in the period (weekly pay ÷ 7; daily pay as is).
create or replace function public.payroll_calculate(p_studio uuid, p_from date, p_to date)
returns table (staff_id uuid, full_name text, staff_code text, role text, pay_per text, basic_pay numeric, calendar_days int,
               working_days int, holidays int, present_days int, paid_leaves numeric, unpaid_leaves numeric, absent_days numeric,
               late_days int, paid_days numeric, basic_salary numeric, pt_commission numeric, sales_commission numeric,
               deduction numeric, payable numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_to date; v_tz text; v_tgrace int; v_sgrace int;
begin
  perform app.require(p_studio, 'payroll', 'view_calculator', 'see the payroll calculator');
  if p_to < p_from or p_to - p_from > 62 then raise exception 'Choose a period of up to two months'; end if;
  v_to = least(p_to, app.today(p_studio));
  select st.timezone, coalesce((st.settings->'payroll'->>'trainer_grace_minutes')::int, 0), coalesce((st.settings->'payroll'->>'staff_grace_minutes')::int, 0)
    into v_tz, v_tgrace, v_sgrace from public.studios st where st.id = p_studio;
  return query
  with base as (
    select s.*, coalesce(sp.basic_pay, 0) as pay, coalesce(sp.pay_per, 'month') as per, coalesce(sp.deduct_for_absent, false) as deduct,
      coalesce(sp.late_penalty, 0) as penalty
    from public.staff s left join public.staff_payroll sp on sp.staff_id = s.id
    where s.studio_id = p_studio and s.active and s.deleted_at is null and s.role in ('owner', 'front_desk', 'coach')
      and (s.role <> 'owner' or coalesce(sp.basic_pay, 0) > 0)
  ), calc as (
    select b.*,
      (p_to - p_from + 1) as cal,
      (select count(*) from generate_series(p_from, v_to, interval '1 day') g where extract(isodow from g)::smallint = any (b.working_days)
         and exists (select 1 from public.holidays h where h.studio_id = p_studio and h.active and h.is_holiday and h.event_date = g::date))::int as hol,
      (select count(*) from generate_series(p_from, v_to, interval '1 day') g where extract(isodow from g)::smallint = any (b.working_days)
         and not exists (select 1 from public.holidays h where h.studio_id = p_studio and h.active and h.is_holiday and h.event_date = g::date))::int as work,
      (select count(distinct a.date) from public.staff_attendance a where a.staff_id = b.id and a.date between p_from and v_to)::int as present,
      (select coalesce(sum((least(l.end_date, v_to) - greatest(l.start_date, p_from) + 1) * case when l.mode = 'full' then 1 else 0.5 end), 0)
         from public.leave_requests l where l.staff_id = b.id and l.status = 'approved' and not l.cancelled and l.paid
           and l.start_date <= v_to and l.end_date >= p_from) as pleave,
      (select coalesce(sum((least(l.end_date, v_to) - greatest(l.start_date, p_from) + 1) * case when l.mode = 'full' then 1 else 0.5 end), 0)
         from public.leave_requests l where l.staff_id = b.id and l.status = 'approved' and not l.cancelled and not coalesce(l.paid, false)
           and l.start_date <= v_to and l.end_date >= p_from) as uleave,
      (select count(*) from (select a.date, min(a.check_in) as first_in from public.staff_attendance a
          where a.staff_id = b.id and a.date between p_from and v_to group by a.date) d
        where b.shift_start is not null
          and (d.first_in at time zone coalesce(v_tz, 'Asia/Kolkata'))::time
              > b.shift_start + make_interval(mins => case when b.role = 'coach' then v_tgrace else v_sgrace end))::int as late,
      (select coalesce(sum(o.commission_earned), 0) from public.target_overview o where o.staff_id = b.id
         and make_date(o.year, o.month, 1) between date_trunc('month', p_from)::date and p_to and o.target_type in ('pt', 'new_pt', 'renew_pt')) as ptc,
      (select coalesce(sum(o.commission_earned), 0) from public.target_overview o where o.staff_id = b.id
         and make_date(o.year, o.month, 1) between date_trunc('month', p_from)::date and p_to and (o.target_type is null or o.target_type not in ('pt', 'new_pt', 'renew_pt'))) as salesc
    from base b
  ), fin as (
    select c.*, greatest(c.work - c.present - c.pleave, 0)::numeric as absent,
      case c.per when 'day' then c.pay when 'week' then c.pay / 7 else c.pay / greatest(c.cal, 1) end as per_day
    from calc c
  )
  select f.id, f.full_name, f.staff_code, f.role::text, f.per, f.pay, f.cal, f.work, f.hol, f.present, f.pleave, f.uleave, f.absent, f.late,
    (f.cal - f.absent)::numeric,
    round(case f.per when 'day' then f.pay * (f.present + f.pleave + f.hol) when 'week' then f.pay * f.cal / 7.0 else f.pay end, 2),
    round(f.ptc, 2), round(f.salesc, 2),
    round(case when f.per <> 'day' and f.deduct then f.per_day * f.absent else 0 end + f.penalty * f.late, 2),
    round(case f.per when 'day' then f.pay * (f.present + f.pleave + f.hol) when 'week' then f.pay * f.cal / 7.0 else f.pay end
      + f.ptc + f.salesc - (case when f.per <> 'day' and f.deduct then f.per_day * f.absent else 0 end + f.penalty * f.late), 2)
  from fin f
  order by f.role <> 'owner', f.full_name;
end $$;

-- Save calculated pay into the Payroll Register (and, if asked, as a Salary expense).
--   p: {from_date, to_date, paid_date, mode, as_expense, rows: [{staff_id, ...numbers, bonus, note}]}
create or replace function public.add_payroll(p_studio uuid, p jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_n int = 0; v_exp uuid; v_name text; v_pay numeric;
begin
  perform app.require(p_studio, 'payroll', 'add', 'add to the payroll register');
  for r in select * from jsonb_array_elements(p->'rows') loop
    select s.full_name into v_name from public.staff s where s.id = (r->>'staff_id')::uuid and s.studio_id = p_studio;
    if v_name is null then raise exception 'Staff not found'; end if;
    v_pay = coalesce((r->>'payable')::numeric, 0);
    v_exp = null;
    if coalesce((p->>'as_expense')::boolean, false) and v_pay > 0 then
      insert into public.expenses (studio_id, title, category, expense_date, payment_type, amount, gst_amount, final_amount, note, created_by)
      values (p_studio, 'Salary · ' || v_name || ' · ' || to_char((p->>'from_date')::date, 'Mon YYYY'), 'Salary',
              coalesce(nullif(p->>'paid_date', '')::date, app.today(p_studio)), coalesce(nullif(p->>'mode', ''), 'CASH'), v_pay, 0, v_pay,
              nullif(r->>'note', ''), app.my_staff_id(p_studio))
      returning id into v_exp;
    end if;
    insert into public.payroll_entries (studio_id, staff_id, from_date, to_date, paid_date, paid_days, present_days, absent_days, late_days,
      paid_leaves, holidays, basic_salary, pt_commission, sales_commission, bonus, deduction, payable, mode, expense_id, note, created_by)
    values (p_studio, (r->>'staff_id')::uuid, (p->>'from_date')::date, (p->>'to_date')::date, coalesce(nullif(p->>'paid_date', '')::date, app.today(p_studio)),
      coalesce((r->>'paid_days')::numeric, 0), coalesce((r->>'present_days')::int, 0), coalesce((r->>'absent_days')::numeric, 0),
      coalesce((r->>'late_days')::int, 0), coalesce((r->>'paid_leaves')::numeric, 0), coalesce((r->>'holidays')::int, 0),
      coalesce((r->>'basic_salary')::numeric, 0), coalesce((r->>'pt_commission')::numeric, 0), coalesce((r->>'sales_commission')::numeric, 0),
      coalesce((r->>'bonus')::numeric, 0), coalesce((r->>'deduction')::numeric, 0), v_pay, nullif(p->>'mode', ''), v_exp, nullif(r->>'note', ''),
      app.my_staff_id(p_studio));
    v_n = v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.save_payroll_settings(p_studio uuid, p_trainer_grace int, p_staff_grace int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.require(p_studio, 'payroll', 'edit_settings', 'change payroll settings');
  if p_trainer_grace < 0 or p_staff_grace < 0 or p_trainer_grace > 240 or p_staff_grace > 240 then raise exception 'Grace period is 0 to 240 minutes'; end if;
  update public.studios set settings = jsonb_set(settings, '{payroll}', coalesce(settings->'payroll', '{}'::jsonb)
    || jsonb_build_object('trainer_grace_minutes', p_trainer_grace, 'staff_grace_minutes', p_staff_grace), true) where id = p_studio;
end $$;

create view public.payroll_entry_overview with (security_invoker = true) as
select pe.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, cb.full_name as created_by_name
from public.payroll_entries pe
join public.staff s on s.id = pe.staff_id
left join public.staff cb on cb.id = pe.created_by;

-- ---------------------------------------------------------------------------
-- Subscriptions & Payments rights (YDL access control) checked where the change happens.
-- Only front-desk staff are checked; the owner can do everything.
-- ---------------------------------------------------------------------------
create or replace function app.is_limited_staff(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and not app.is_owner(p_studio) and app.has_role(p_studio, array['front_desk']::public.staff_role[]);
$$;

create or replace function app.guard_subscription_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  if tg_op = 'INSERT' then
    if new.previous_subscription_id is null then perform app.require(new.studio_id, 'subscriptions', 'add', 'add subscriptions'); end if;
    return new;
  end if;
  if (new.deleted_at is distinct from old.deleted_at or new.cancelled_at is distinct from old.cancelled_at) then
    perform app.require(new.studio_id, 'subscriptions', 'delete', 'delete or cancel subscriptions');
  end if;
  if new.selling_price is distinct from old.selling_price then perform app.require(new.studio_id, 'subscriptions', 'edit_bill', 'edit the bill amount'); end if;
  if new.start_date is distinct from old.start_date or new.base_end_date is distinct from old.base_end_date then
    perform app.require(new.studio_id, 'subscriptions', 'edit_date', 'edit subscription dates');
  end if;
  if new.bill_rep_id is distinct from old.bill_rep_id then perform app.require(new.studio_id, 'subscriptions', 'bill_rep', 'change the bill rep'); end if;
  if new.trainer_id is distinct from old.trainer_id or new.second_trainer_ids is distinct from old.second_trainer_ids or new.note is distinct from old.note
     or new.mark_used is distinct from old.mark_used then
    perform app.require(new.studio_id, 'subscriptions', 'edit', 'edit subscriptions');
    perform app.require(new.studio_id, 'allow_edit_subscription', 'on', 'edit subscriptions directly');
  end if;
  return new;
end $$;
create trigger subscriptions_rights before insert or update on public.subscriptions for each row execute function app.guard_subscription_rights();

create or replace function app.guard_change_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if app.is_limited_staff(new.studio_id) then
    perform app.require(new.studio_id, 'subscriptions', new.kind, new.kind || ' subscriptions');
  end if;
  return new;
end $$;
create trigger subscription_changes_rights before insert on public.subscription_changes for each row execute function app.guard_change_rights();

-- Without "Allow Freeze" / "Allow Extension" a freeze or extension becomes a request for the owner, with no fee.
create or replace function app.guard_freeze_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_key text = case tg_table_name when 'freezes' then 'freeze' else 'extend' end;
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  perform app.require(new.studio_id, 'subscriptions', v_key, case v_key when 'freeze' then 'freeze subscriptions' else 'extend subscriptions' end);
  if not app.can(new.studio_id, case v_key when 'freeze' then 'allow_freeze' else 'allow_extend' end) then
    if new.fee > 0 or new.payment_id is not null then
      raise exception 'Your % goes to the owner as a request, so it can''t take a fee. Leave the fee empty.', case v_key when 'freeze' then 'freeze' else 'extension' end;
    end if;
    new.status = 'requested';
    new.requested_by = (select auth.uid());
  end if;
  return new;
end $$;
create trigger freezes_rights before insert on public.freezes for each row execute function app.guard_freeze_rights();
create trigger extensions_rights before insert on public.extensions for each row execute function app.guard_freeze_rights();

-- The owner approves or rejects freeze and extension requests.
create or replace function public.decide_request(p_kind text, p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_studio uuid;
begin
  if p_kind = 'freeze' then select studio_id into v_studio from public.freezes where id = p_id and status = 'requested';
  elsif p_kind = 'extension' then select studio_id into v_studio from public.extensions where id = p_id and status = 'requested';
  else raise exception 'Unknown request'; end if;
  if v_studio is null then raise exception 'Request not found'; end if;
  if not app.is_owner(v_studio) then raise exception 'Only the owner decides requests'; end if;
  if p_kind = 'freeze' then
    update public.freezes set status = case when p_approve then 'approved' else 'rejected' end, decided_by = app.my_staff_id(v_studio) where id = p_id;
  else
    update public.extensions set status = case when p_approve then 'approved' else 'rejected' end where id = p_id;
  end if;
end $$;

create or replace function app.guard_payment_rights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_limited_staff(new.studio_id) then return new; end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then perform app.require(new.studio_id, 'subscriptions', 'cancel_payments', 'cancel receipts'); end if;
  if new.receipt_date is distinct from old.receipt_date then perform app.require(new.studio_id, 'subscriptions', 'receipt_date', 'change receipt dates'); end if;
  if new.amount is distinct from old.amount then perform app.require(new.studio_id, 'subscriptions', 'receipt_price', 'change receipt amounts'); end if;
  return new;
end $$;
create trigger payments_rights before update on public.payments for each row execute function app.guard_payment_rights();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create view public.staff_overview with (security_invoker = true) as
select s.*, (s.user_id is not null) as has_login,
  att.check_in as today_check_in, att.check_out as today_check_out,
  (select count(*) from public.members m where m.trainer_id = s.id and m.deleted_at is null)::int as client_count
from public.staff s
left join lateral (
  select a.check_in, a.check_out from public.staff_attendance a
  where a.staff_id = s.id and a.date = app.today(s.studio_id) order by a.check_in desc limit 1
) att on true
where s.deleted_at is null;

create view public.coupon_overview with (security_invoker = true) as
select c.*, coalesce(sv.custom_name, sv.name) as service_name, p.name as plan_name, m.full_name as member_name,
  coalesce(m.member_code, m.enquiry_code) as member_code, cb.full_name as created_by_name,
  (select count(*) from public.subscriptions s where s.coupon_id = c.id and s.deleted_at is null and s.cancelled_at is null)::int as used_count
from public.coupons c
left join public.services sv on sv.id = c.service_id
left join public.plans p on p.id = c.plan_id
left join public.members m on m.id = c.member_id
left join public.staff cb on cb.id = c.created_by;

create view public.transformation_overview with (security_invoker = true) as
select t.*, s.full_name as trainer_name, s.staff_code as trainer_code, s.photo_url as trainer_photo
from public.transformations t left join public.staff s on s.id = t.trainer_id;

create view public.leave_overview with (security_invoker = true) as
select l.*, s.full_name as staff_name, s.staff_code, s.role::text as staff_role, s.phone as staff_phone, s.email as staff_email,
  d.full_name as decided_by_name
from public.leave_requests l
join public.staff s on s.id = l.staff_id
left join public.staff d on d.id = l.decided_by;

-- ---------------------------------------------------------------------------
-- Access rules for the new tables
-- ---------------------------------------------------------------------------
alter table public.transformations enable row level security;
alter table public.leave_requests enable row level security;
alter table public.staff_targets enable row level security;
alter table public.holidays enable row level security;
alter table public.payroll_entries enable row level security;

create policy transformations_read on public.transformations for select to authenticated
  using (app.is_staff(studio_id) or (show_in_app and app.in_studio(studio_id)));
create policy transformations_manage on public.transformations for all to authenticated
  using (app.can(studio_id, 'transformations') or (trainer_id in (select app.my_staff_ids()) and app.has_role(studio_id, array['coach']::public.staff_role[])))
  with check (app.can(studio_id, 'transformations') or (trainer_id in (select app.my_staff_ids()) and app.has_role(studio_id, array['coach']::public.staff_role[])));

create policy leave_read on public.leave_requests for select to authenticated
  using (app.can(studio_id, 'trainers', 'leave') or staff_id in (select app.my_staff_ids()));
create policy leave_request on public.leave_requests for insert to authenticated
  with check (status = 'pending' and paid is null and decided_by is null
    and (staff_id in (select app.my_staff_ids()) or app.can(studio_id, 'trainers', 'leave')));

create policy targets_read on public.staff_targets for select to authenticated
  using (app.can(studio_id, 'targets', 'view_listing') or staff_id in (select app.my_staff_ids()));
create policy targets_add on public.staff_targets for insert to authenticated with check (app.can(studio_id, 'targets', 'add'));
create policy targets_edit on public.staff_targets for update to authenticated using (app.can(studio_id, 'targets', 'edit')) with check (app.can(studio_id, 'targets', 'edit'));
create policy targets_delete on public.staff_targets for delete to authenticated using (app.can(studio_id, 'targets', 'delete'));

create policy holidays_read on public.holidays for select to authenticated using (app.in_studio(studio_id));
create policy holidays_desk on public.holidays for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));

create policy payroll_read on public.payroll_entries for select to authenticated using (app.can(studio_id, 'payroll', 'view_register'));
create policy payroll_delete on public.payroll_entries for delete to authenticated using (app.can(studio_id, 'payroll', 'delete'));

-- ---------------------------------------------------------------------------
-- Grants: changes that go through the functions above stay read-only in the tables.
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
end $$;
call app.apply_grants();
