-- Shaan Fitness app · 16. Community and challenges (YDL App Settings › Community and › Challenges)
-- Members post photos and thoughts in the community; the gym accepts or declines them (or they go
-- live at once when "Auto approve community" is on). Challenges run between two dates with optional
-- daily tasks worth points; members join from the app, log their tasks and post, and teams compete.
-- Other members see first names on leaderboards and posts, never phone numbers or other details.

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  video_url text check (video_url is null or video_url ~* '^https://'),
  image_url text,
  start_date date not null,
  end_date date not null,
  terms text not null check (length(trim(terms)) > 0),
  has_tasks boolean not null default false,
  client_level text,                                   -- YDL "Client Challenge Level" (LEVEL 0 to LEVEL 3)
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index challenges_studio_idx on public.challenges (studio_id, start_date desc);

create table public.challenge_tasks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  target numeric(10,2) check (target is null or target > 0),
  unit text not null default 'reps' check (unit in ('reps', 'secs', 'mins', 'km', 'kg', 'steps', 'litres', 'times')),
  points int not null default 10 check (points between 0 and 1000),
  day int check (day is null or day >= 1),            -- null: every day of the challenge
  seq int not null default 0,
  created_at timestamptz not null default now()
);
create index challenge_tasks_challenge_idx on public.challenge_tasks (challenge_id, seq);

create table public.challenge_teams (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index challenge_teams_name_uq on public.challenge_teams (challenge_id, lower(name));

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  team_id uuid references public.challenge_teams(id) on delete set null,
  added_by uuid references public.staff(id) on delete set null,   -- null: joined from the app
  joined_at timestamptz not null default now(),
  unique (challenge_id, member_id)
);
create index challenge_participants_member_idx on public.challenge_participants (member_id);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  task_id uuid references public.challenge_tasks(id) on delete cascade,
  date date not null,
  value numeric(10,2) not null check (value >= 0),
  points int not null default 0,
  note text,
  recorded_by uuid references public.staff(id) on delete set null, -- null: the member logged it
  created_at timestamptz not null default now(),
  unique (challenge_id, member_id, task_id, date)
);
create index challenge_entries_challenge_idx on public.challenge_entries (challenge_id, member_id);

-- ---------------------------------------------------------------------------
-- Community posts (and challenge posts) and claps
-- ---------------------------------------------------------------------------
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  author_member_id uuid references public.members(id) on delete cascade,
  author_staff_id uuid references public.staff(id) on delete set null,
  body text,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  decided_by uuid references public.staff(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (author_member_id is not null or author_staff_id is not null),
  check (nullif(trim(body), '') is not null or media_path is not null),
  check ((media_path is null) = (media_type is null))
);
create index community_posts_studio_idx on public.community_posts (studio_id, status, created_at desc) where deleted_at is null;
create index community_posts_challenge_idx on public.community_posts (challenge_id) where challenge_id is not null;

create table public.post_claps (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Rules on writes
-- ---------------------------------------------------------------------------
create trigger challenges_fill before insert on public.challenges for each row execute function app.fill_created_by();
create trigger challenges_touch before update on public.challenges for each row execute function app.touch_updated_at();
create trigger challenges_log after insert or update or delete on public.challenges for each row execute function app.log_activity();
create trigger challenge_teams_fill before insert on public.challenge_teams for each row execute function app.fill_created_by();

-- Child rows take their challenge's studio.
create or replace function app.challenge_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.studio_id into new.studio_id from public.challenges c where c.id = new.challenge_id;
  if new.studio_id is null then raise exception 'Challenge not found'; end if;
  return new;
end $$;
create trigger challenge_tasks_child before insert or update on public.challenge_tasks for each row execute function app.challenge_child();
create trigger challenge_teams_child before insert or update on public.challenge_teams for each row execute function app.challenge_child();

-- A team belongs to the participant's challenge.
create or replace function app.check_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.studio_id into new.studio_id from public.challenges c where c.id = new.challenge_id;
  if not exists (select 1 from public.members m where m.id = new.member_id and m.studio_id = new.studio_id and m.deleted_at is null) then
    raise exception 'Client not found';
  end if;
  if new.team_id is not null and not exists (select 1 from public.challenge_teams t where t.id = new.team_id and t.challenge_id = new.challenge_id) then
    raise exception 'That team is in another challenge';
  end if;
  return new;
end $$;
create trigger challenge_participants_check before insert or update on public.challenge_participants for each row execute function app.check_participant();

-- An entry is a participant's, on a day of the challenge (not in the future); its points come from the task.
create or replace function app.check_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.challenges; t public.challenge_tasks;
begin
  select * into c from public.challenges where id = new.challenge_id;
  new.studio_id := c.studio_id;
  if not exists (select 1 from public.challenge_participants p where p.challenge_id = c.id and p.member_id = new.member_id) then
    raise exception 'Join the challenge first';
  end if;
  if new.date < c.start_date or new.date > c.end_date then raise exception 'That day is outside the challenge (% to %)', c.start_date, c.end_date; end if;
  if new.date > app.today(c.studio_id) then raise exception 'You can''t log a future day'; end if;
  if new.task_id is not null then
    select * into t from public.challenge_tasks where id = new.task_id and challenge_id = c.id;
    if t.id is null then raise exception 'That task is not in this challenge'; end if;
    if t.day is not null and new.date <> c.start_date + (t.day - 1) then raise exception 'That task is for Day %', t.day; end if;
    new.points := case when t.target is null or new.value >= t.target then t.points else 0 end;
  elsif tg_op = 'INSERT' and new.recorded_by is null and not app.is_staff(c.studio_id) then
    new.points := 0;   -- members can't award themselves free points
  end if;
  return new;
end $$;
create trigger challenge_entries_check before insert or update on public.challenge_entries for each row execute function app.check_entry();

-- Posts: the author's studio; staff posts go live; members' wait for approval unless auto-approve is on.
create or replace function app.check_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_auto boolean;
begin
  if new.author_member_id is not null then
    select m.studio_id into new.studio_id from public.members m where m.id = new.author_member_id;
  else
    select s.studio_id into new.studio_id from public.staff s where s.id = new.author_staff_id;
  end if;
  if new.challenge_id is not null then
    if not exists (select 1 from public.challenges c where c.id = new.challenge_id and c.studio_id = new.studio_id) then raise exception 'Challenge not found'; end if;
    if new.author_member_id is not null and not exists (select 1 from public.challenge_participants p where p.challenge_id = new.challenge_id and p.member_id = new.author_member_id) then
      raise exception 'Join the challenge first';
    end if;
  end if;
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> new.studio_id::text then raise exception 'That picture is not this gym''s'; end if;
  if new.author_staff_id is not null then
    new.status := 'active';
  else
    v_auto := coalesce((app.center_setting(new.studio_id, case when new.challenge_id is null then 'auto_approve_community' else 'auto_approve_challenge' end) #>> '{}')::boolean, false);
    new.status := case when v_auto then 'active' else 'pending' end;
  end if;
  return new;
end $$;
create trigger community_posts_check before insert on public.community_posts for each row execute function app.check_post();

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.challenge_tasks enable row level security;
alter table public.challenge_teams enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_claps enable row level security;

-- Staff see every challenge; members see the active ones of their gym.
create policy challenges_read on public.challenges for select to authenticated using (app.is_staff(studio_id) or (active and app.in_studio(studio_id)));
create policy challenges_desk on public.challenges for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy challenge_tasks_read on public.challenge_tasks for select to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and (app.is_staff(c.studio_id) or (c.active and app.in_studio(c.studio_id)))));
create policy challenge_tasks_desk on public.challenge_tasks for all to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)));
create policy challenge_teams_read on public.challenge_teams for select to authenticated using (app.in_studio(studio_id));
create policy challenge_teams_desk on public.challenge_teams for all to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and app.is_desk(c.studio_id)));
-- Who joined: staff, and each member their own row (others appear only by first name on leaderboards).
create policy challenge_participants_read on public.challenge_participants for select to authenticated using (app.is_staff(studio_id) or app.is_self(member_id));
create policy challenge_participants_desk on public.challenge_participants for all to authenticated using (app.is_desk(studio_id)) with check (app.is_desk(studio_id));
create policy challenge_entries_read on public.challenge_entries for select to authenticated using (app.is_staff(studio_id) or app.is_self(member_id));
create policy challenge_entries_write on public.challenge_entries for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]) or app.is_self(member_id))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]) or (app.is_self(member_id) and recorded_by is null));
-- Posts are read through community_feed (it adds author names); the table itself: staff, and the author.
create policy community_posts_read on public.community_posts for select to authenticated
  using (app.is_staff(studio_id) or app.is_self(author_member_id) or (status = 'active' and deleted_at is null and app.in_studio(studio_id)));
create policy community_posts_member_insert on public.community_posts for insert to authenticated
  with check (author_member_id is not null and app.is_self(author_member_id) and author_staff_id is null);
create policy community_posts_staff_insert on public.community_posts for insert to authenticated
  with check (author_staff_id is not null and author_staff_id in (select app.my_staff_ids()) and author_member_id is null and app.is_desk(studio_id));
-- Accept / decline / delete go through decide_posts; an author may delete their own post.
create policy community_posts_author_delete on public.community_posts for delete to authenticated using (app.is_self(author_member_id));
create policy post_claps_read on public.post_claps for select to authenticated using (user_id = (select auth.uid()) or app.is_staff(studio_id));
create policy post_claps_own on public.post_claps for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A clap is on a live post of the person's own gym.
create or replace function app.check_clap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select p.studio_id into new.studio_id from public.community_posts p where p.id = new.post_id and p.status = 'active' and p.deleted_at is null;
  if new.studio_id is null or not app.in_studio(new.studio_id) then raise exception 'Post not found'; end if;
  return new;
end $$;
create trigger post_claps_check before insert on public.post_claps for each row execute function app.check_clap();

-- ---------------------------------------------------------------------------
-- Functions for the pages and the member app
-- ---------------------------------------------------------------------------
-- A name other members may see: first name and the initial of the last.
create or replace function app.public_name(m public.members)
returns text language sql immutable as $$
  select trim(coalesce(m.first_name, '') || coalesce(' ' || left(nullif(trim(m.last_name), ''), 1) || '.', ''));
$$;

-- The feed: posts with author, claps and whether I clapped. Staff can filter by status; members see
-- live posts and their own.
create or replace function public.community_feed(p_studio uuid, p_status text default 'active', p_challenge uuid default null,
  p_search text default null, p_limit int default 100, p_before timestamptz default null)
returns table (id uuid, challenge_id uuid, author_name text, author_is_staff boolean, author_member_id uuid, is_mine boolean, body text,
  media_path text, media_type text, status text, claps bigint, clapped boolean, created_at timestamptz, decided_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.challenge_id,
    case when p.author_staff_id is not null then st.full_name when app.is_staff(p_studio) then m.full_name else app.public_name(m) end,
    p.author_staff_id is not null, case when app.is_staff(p_studio) then p.author_member_id end,
    coalesce(app.is_self(p.author_member_id), false), p.body, p.media_path, p.media_type, p.status,
    (select count(*) from public.post_claps c where c.post_id = p.id),
    exists (select 1 from public.post_claps c where c.post_id = p.id and c.user_id = (select auth.uid())),
    p.created_at, p.decided_at
  from public.community_posts p
  left join public.members m on m.id = p.author_member_id
  left join public.staff st on st.id = p.author_staff_id
  where p.studio_id = p_studio and p.deleted_at is null and app.in_studio(p_studio)
    and p.challenge_id is not distinct from p_challenge
    and case
      when app.is_staff(p_studio) then p_status = 'all' or p.status = p_status
      else p.status = 'active' or app.is_self(p.author_member_id) end
    and (coalesce(trim(p_search), '') = '' or m.full_name ilike '%' || trim(p_search) || '%' or st.full_name ilike '%' || trim(p_search) || '%')
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Accept, decline or delete posts (YDL "Accept / Decline / Delete").
create or replace function public.decide_posts(p_studio uuid, p_ids uuid[], p_action text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform app.require(p_studio, 'community', 'on', 'manage community posts');
  if p_action = 'delete' then
    update public.community_posts set deleted_at = now(), decided_by = app.my_staff_id(p_studio), decided_at = now()
    where studio_id = p_studio and id = any (p_ids) and deleted_at is null;
  elsif p_action in ('active', 'declined', 'pending') then
    update public.community_posts set status = p_action, decided_by = app.my_staff_id(p_studio), decided_at = now()
    where studio_id = p_studio and id = any (p_ids) and deleted_at is null;
  else
    raise exception 'Unknown action';
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- A member joins a challenge from the app (accepting its terms).
create or replace function public.join_challenge(p_challenge uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.challenges; v_member uuid; v_id uuid;
begin
  select * into c from public.challenges where id = p_challenge and active;
  if c.id is null then raise exception 'Challenge not found'; end if;
  select m.id into v_member from public.members m where m.studio_id = c.studio_id and m.user_id = (select auth.uid()) and m.deleted_at is null limit 1;
  if v_member is null then raise exception 'Only members of this gym can join'; end if;
  if not coalesce(p_accept, false) then raise exception 'Accept the terms and conditions to join'; end if;
  if app.today(c.studio_id) > c.end_date then raise exception 'This challenge has ended'; end if;
  insert into public.challenge_participants (studio_id, challenge_id, member_id) values (c.studio_id, c.id, v_member)
  on conflict (challenge_id, member_id) do update set joined_at = public.challenge_participants.joined_at
  returning id into v_id;
  return v_id;
end $$;

-- Staff add clients to a challenge (optionally into a team), or move them between teams.
create or replace function public.add_challenge_participants(p_challenge uuid, p_member_ids uuid[], p_team uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_studio uuid; v_n int;
begin
  select studio_id into v_studio from public.challenges where id = p_challenge;
  if v_studio is null or not app.is_desk(v_studio) then raise exception 'Only the owner or front desk can add participants'; end if;
  insert into public.challenge_participants (studio_id, challenge_id, member_id, team_id, added_by)
  select v_studio, p_challenge, m.id, p_team, app.my_staff_id(v_studio)
  from public.members m where m.id = any (coalesce(p_member_ids, '{}')) and m.studio_id = v_studio and m.deleted_at is null
  on conflict (challenge_id, member_id) do update set team_id = coalesce(excluded.team_id, public.challenge_participants.team_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- YDL "Copy": the challenge and its tasks, starting deactivated so the dates can be set first.
create or replace function public.copy_challenge(p_challenge uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.challenges; v_new uuid;
begin
  select * into c from public.challenges where id = p_challenge;
  if c.id is null or not app.is_desk(c.studio_id) then raise exception 'Challenge not found'; end if;
  insert into public.challenges (studio_id, name, description, video_url, image_url, start_date, end_date, terms, has_tasks, client_level, active, created_by)
  values (c.studio_id, c.name || ' (copy)', c.description, c.video_url, c.image_url, c.start_date, c.end_date, c.terms, c.has_tasks, c.client_level, false, app.my_staff_id(c.studio_id))
  returning id into v_new;
  insert into public.challenge_tasks (studio_id, challenge_id, title, description, target, unit, points, day, seq)
  select studio_id, v_new, title, description, target, unit, points, day, seq from public.challenge_tasks where challenge_id = c.id;
  return v_new;
end $$;

-- Leaderboard: points from tasks, entries, claps on challenge posts; first names for members.
create or replace function public.challenge_leaderboard(p_challenge uuid)
returns table (member_id uuid, name text, team_id uuid, team_name text, points bigint, entries bigint, posts bigint, claps bigint, is_me boolean, rank bigint)
language sql stable security definer set search_path = '' as $$
  with c as (select * from public.challenges where id = p_challenge and (app.is_staff(studio_id) or (active and app.in_studio(studio_id)))),
  rows_ as (
    select p.member_id, case when app.is_staff(c.studio_id) then m.full_name else app.public_name(m) end as name, p.team_id, t.name as team_name,
      coalesce((select sum(e.points) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = p.member_id), 0) as points,
      (select count(*) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = p.member_id) as entries,
      (select count(*) from public.community_posts x where x.challenge_id = c.id and x.author_member_id = p.member_id and x.status = 'active' and x.deleted_at is null) as posts,
      (select count(*) from public.post_claps k join public.community_posts x on x.id = k.post_id
       where x.challenge_id = c.id and x.author_member_id = p.member_id and x.status = 'active' and x.deleted_at is null) as claps,
      coalesce(app.is_self(p.member_id), false) as is_me
    from c join public.challenge_participants p on p.challenge_id = c.id
    join public.members m on m.id = p.member_id and m.deleted_at is null
    left join public.challenge_teams t on t.id = p.team_id
  )
  select r.*, rank() over (order by r.points desc, r.claps desc) from rows_ r order by 10, r.name;
$$;

-- Teams' totals.
create or replace function public.challenge_team_board(p_challenge uuid)
returns table (team_id uuid, team_name text, members bigint, points bigint, rank bigint)
language sql stable security definer set search_path = '' as $$
  select l.team_id, l.team_name, count(*), sum(l.points)::bigint, rank() over (order by sum(l.points) desc)
  from public.challenge_leaderboard(p_challenge) l where l.team_id is not null group by l.team_id, l.team_name order by 5, 2;
$$;

-- The challenge list with counts (staff page).
create or replace function public.challenge_list(p_studio uuid)
returns table (id uuid, name text, start_date date, end_date date, active boolean, has_tasks boolean, image_url text,
  participants bigint, teams bigint, pending_posts bigint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.start_date, c.end_date, c.active, c.has_tasks, c.image_url,
    (select count(*) from public.challenge_participants p where p.challenge_id = c.id),
    (select count(*) from public.challenge_teams t where t.challenge_id = c.id and t.active),
    (select count(*) from public.community_posts x where x.challenge_id = c.id and x.status = 'pending' and x.deleted_at is null),
    c.created_at
  from public.challenges c where c.studio_id = p_studio and app.is_staff(p_studio)
  order by c.start_date desc, c.created_at desc;
$$;

-- The member app: challenges I can see, with whether I joined and my points.
create or replace function public.my_challenges()
returns table (id uuid, name text, description text, image_url text, video_url text, start_date date, end_date date, terms text, has_tasks boolean,
  joined boolean, my_points bigint, participants bigint, team_name text)
language sql stable security definer set search_path = '' as $$
  with me as (select m.id, m.studio_id from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null)
  select c.id, c.name, c.description, c.image_url, c.video_url, c.start_date, c.end_date, c.terms, c.has_tasks,
    p.id is not null, coalesce((select sum(e.points) from public.challenge_entries e where e.challenge_id = c.id and e.member_id = me.id), 0),
    (select count(*) from public.challenge_participants x where x.challenge_id = c.id), t.name
  from me join public.challenges c on c.studio_id = me.studio_id and c.active
  left join public.challenge_participants p on p.challenge_id = c.id and p.member_id = me.id
  left join public.challenge_teams t on t.id = p.team_id
  where c.end_date >= app.today(c.studio_id) - 30
  order by (app.today(c.studio_id) between c.start_date and c.end_date) desc, c.start_date desc;
$$;

-- ---------------------------------------------------------------------------
-- Community pictures: private files, <studio_id>/<file>; anyone in the gym may open them
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('community-media', 'community-media', false) on conflict (id) do nothing;
  execute $p$ drop policy if exists community_media_read on storage.objects $p$;
  execute $p$ create policy community_media_read on storage.objects for select to authenticated
    using (bucket_id = 'community-media' and app.in_studio((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists community_media_write on storage.objects $p$;
  execute $p$ create policy community_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'community-media' and app.in_studio((split_part(name, '/', 1))::uuid)) $p$;
  execute $p$ drop policy if exists community_media_delete on storage.objects $p$;
  execute $p$ create policy community_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'community-media' and app.is_desk((split_part(name, '/', 1))::uuid)) $p$;
end $$;

revoke all on function public.community_feed(uuid, text, uuid, text, int, timestamptz), public.decide_posts(uuid, uuid[], text),
  public.join_challenge(uuid, boolean), public.add_challenge_participants(uuid, uuid[], uuid), public.copy_challenge(uuid),
  public.challenge_leaderboard(uuid), public.challenge_team_board(uuid), public.challenge_list(uuid), public.my_challenges() from public, anon;
call app.apply_grants();
