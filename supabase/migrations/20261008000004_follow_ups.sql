-- Shaan Fitness app · 4. Follow-ups
-- YDL follow-up model: each follow-up has a type, a date, the staff it's assigned to,
-- convertibility, expected date and amount, contact type and a to-do note.
-- Answering one ("follow up response") closes it and, if needed, schedules the next.

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  type text not null,
  due_at timestamptz not null,
  assigned_to uuid references public.staff(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done', 'successful', 'not_interested')),
  convertibility text,
  expected_date date,
  expected_amount numeric(12,2) check (expected_amount is null or expected_amount >= 0),
  contact_type text,
  notes text,
  response text,
  response_kind text check (response_kind in ('open', 'successful', 'not_interested')),
  response_note text,
  responded_at timestamptz,
  responded_by uuid references public.staff(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  previous_id uuid references public.follow_ups(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'system')),
  created_by uuid references public.staff(id) on delete set null,   -- null = system generated
  created_at timestamptz not null default now()
);
create index follow_ups_due_idx on public.follow_ups (studio_id, status, due_at);
create index follow_ups_member_idx on public.follow_ups (member_id, created_at desc);
create index follow_ups_assigned_idx on public.follow_ups (assigned_to, status, due_at);
-- One open follow-up per client, type and day: no duplicate reminders.
create unique index follow_ups_no_dupes on public.follow_ups
  (member_id, type, ((due_at at time zone 'Asia/Kolkata')::date)) where status = 'open';

create trigger follow_ups_log after update or delete on public.follow_ups for each row execute function app.log_activity();

-- True when the signed-in staff member has a follow-up for this client.
create or replace function app.has_follow_up_for(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.follow_ups f
    where f.member_id = p_member and f.assigned_to in (select app.my_staff_ids())
  );
$$;
grant execute on function app.has_follow_up_for(uuid) to authenticated, service_role;

-- Coaches also see the clients whose follow-ups they've been given.
drop policy members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (app.can_see_client(studio_id, added_by, trainer_id) or app.in_care_team(id)
         or app.has_follow_up_for(id) or user_id = (select auth.uid()));

alter table public.follow_ups enable row level security;
create policy follow_ups_read on public.follow_ups for select to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()) or created_by in (select app.my_staff_ids()));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()))
  with check (app.is_desk(studio_id) or assigned_to in (select app.my_staff_ids()));
create policy follow_ups_owner_delete on public.follow_ups for delete to authenticated using (app.is_owner(studio_id));

-- Add a follow-up, or answer one (p.follow_up_id), in one step.
--   p: member_id, follow_up_id?, type, assigned_to, response, convertibility,
--      expected_date, expected_amount, next_at, contact_type, notes
-- The response's kind decides what happens: open → the next follow-up is scheduled;
-- successful → closed as successful; not_interested → closed, and an enquiry is
-- marked "not interested".
create or replace function public.add_follow_up(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_member public.members;
  v_prev public.follow_ups;
  v_me uuid;
  v_kind text;
  v_new uuid;
  v_type text;
  v_next timestamptz;
begin
  if nullif(p->>'follow_up_id', '') is not null then
    select * into v_prev from public.follow_ups where id = (p->>'follow_up_id')::uuid;
    if v_prev.id is null then raise exception 'Follow-up not found'; end if;
    select * into v_member from public.members where id = v_prev.member_id;
  else
    select * into v_member from public.members where id = (p->>'member_id')::uuid;
  end if;
  if v_member.id is null then raise exception 'Client not found'; end if;

  -- Who may do this: owner and front desk always; a coach for clients they look after
  -- or follow-ups assigned to them.
  if not app.is_desk(v_member.studio_id) then
    if not (app.has_role(v_member.studio_id, array['coach']::public.staff_role[])
            and (app.in_care_team(v_member.id) or coalesce(v_prev.assigned_to in (select app.my_staff_ids()), false))) then
      raise exception 'You are not allowed to add follow-ups for this client';
    end if;
  end if;
  v_me = app.my_staff_id(v_member.studio_id);

  select li.kind into v_kind from public.list_items li
  where li.studio_id = v_member.studio_id and li.list = 'followup_response' and li.label = p->>'response';
  v_kind = coalesce(v_kind, 'open');
  v_type = coalesce(nullif(p->>'type', ''), v_prev.type, 'Enquiry');
  v_next = nullif(p->>'next_at', '')::timestamptz;

  if v_prev.id is not null then
    if v_prev.status <> 'open' then raise exception 'This follow-up is already closed'; end if;
    update public.follow_ups set
      status = case v_kind when 'open' then 'done' else v_kind end,
      response = p->>'response', response_kind = v_kind, response_note = nullif(p->>'notes', ''),
      responded_at = now(), responded_by = v_me
    where id = v_prev.id;
  end if;

  if v_kind = 'open' then
    if v_next is null then raise exception 'Choose the next follow-up date'; end if;
    insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, convertibility, expected_date,
      expected_amount, contact_type, notes, previous_id, subscription_id, source, created_by)
    values (v_member.studio_id, v_member.id, v_type, v_next,
      coalesce(nullif(p->>'assigned_to', '')::uuid, v_prev.assigned_to, v_me),
      nullif(p->>'convertibility', ''), nullif(p->>'expected_date', '')::date, nullif(p->>'expected_amount', '')::numeric,
      nullif(p->>'contact_type', ''), nullif(p->>'notes', ''), v_prev.id, v_prev.subscription_id, 'manual', v_me)
    returning id into v_new;
  elsif v_prev.id is null then
    -- A closing response with nothing open: keep it in the history.
    insert into public.follow_ups (studio_id, member_id, type, due_at, assigned_to, status, convertibility, expected_date,
      expected_amount, contact_type, notes, response, response_kind, responded_at, responded_by, source, created_by)
    values (v_member.studio_id, v_member.id, v_type, coalesce(v_next, now()),
      coalesce(nullif(p->>'assigned_to', '')::uuid, v_me), v_kind,
      nullif(p->>'convertibility', ''), nullif(p->>'expected_date', '')::date, nullif(p->>'expected_amount', '')::numeric,
      nullif(p->>'contact_type', ''), nullif(p->>'notes', ''), p->>'response', v_kind, now(), v_me, 'manual', v_me)
    returning id into v_new;
  else
    v_new = v_prev.id;
  end if;

  update public.members set
    convertibility = coalesce(nullif(p->>'convertibility', ''), convertibility),
    tapped = true,
    lead_status = case when v_kind = 'not_interested' and kind = 'enquiry' then 'not_interested'
                       when v_kind <> 'not_interested' and kind = 'enquiry' then 'open'
                       else lead_status end
  where id = v_member.id;
  return v_new;
end $$;

-- Move every open follow-up from one staff member to another (YDL "Transfer follow ups").
create or replace function public.transfer_follow_ups(p_studio uuid, p_from uuid, p_to uuid)
returns int language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  if not app.is_desk(p_studio) then raise exception 'Only owner and front desk can transfer follow-ups'; end if;
  if not exists (select 1 from public.staff where id = p_to and studio_id = p_studio and active) then
    raise exception 'Choose an active staff member to transfer to';
  end if;
  update public.follow_ups set assigned_to = p_to
  where studio_id = p_studio and assigned_to = p_from and status = 'open';
  get diagnostics n = row_count;
  return n;
end $$;

create view public.follow_up_overview with (security_invoker = true) as
select
  f.*,
  m.full_name as member_name,
  m.country_code as member_country_code,
  m.phone as member_phone,
  m.gender as member_gender,
  m.kind as member_kind,
  m.lead_status as member_lead_status,
  m.added_by as member_added_by,
  coalesce(m.member_code, m.enquiry_code) as client_code,
  a.full_name as assigned_name,
  c.full_name as created_by_name,
  r.full_name as responded_by_name,
  (f.due_at at time zone 'Asia/Kolkata')::date as due_date
from public.follow_ups f
join public.members m on m.id = f.member_id and m.deleted_at is null
left join public.staff a on a.id = f.assigned_to
left join public.staff c on c.id = f.created_by
left join public.staff r on r.id = f.responded_by;

call app.apply_grants();
