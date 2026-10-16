-- Shaan Fitness app · 19. Health tracking in the member app (YDL customer app: Track Your Diet, Diet Analysis,
-- Workout Analysis, Hydration, Sleep and Steps trackers, Diary, PAR-Q form, Free Workout and Diet Plans).
-- Everything here is the member's own record. Their coach and the front desk can read it to guide them;
-- other members never see it.

-- An App Settings › On/Off Permission switch (the gym's choice, else the default, else p_default).
create or replace function app.app_flag(p_studio uuid, p_key text, p_default boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((app.app_setting(p_studio, p_key) #>> '{}')::boolean, p_default);
$$;

-- ---------------------------------------------------------------------------
-- What I ate (Track Your Diet)
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  meal text not null check (length(trim(meal)) > 0),
  plan_item_id uuid references public.diet_plan_items(id) on delete set null,   -- ticked from my diet plan
  food_id uuid references public.foods(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  quantity numeric(8,2) check (quantity is null or quantity > 0),
  unit text,
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fats numeric(8,2) not null default 0 check (fats >= 0),
  fibre numeric(8,2) not null default 0 check (fibre >= 0),
  created_at timestamptz not null default now()
);
create index food_logs_member_idx on public.food_logs (member_id, date desc);
create unique index food_logs_plan_item_once on public.food_logs (member_id, date, plan_item_id) where plan_item_id is not null;

-- A logged food takes the member's gym; its numbers come from the plan item, food or recipe (scaled by quantity)
-- unless typed in; no future days. Food outside the plan only when the gym allows it
-- (App Settings › "Allow clients to add their food in diet plan?").
create or replace function app.check_food_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare f public.foods; r public.recipes; pi public.diet_plan_items; v_scale numeric;
begin
  select m.studio_id into new.studio_id from public.members m where m.id = new.member_id;
  if new.studio_id is null then raise exception 'Client not found'; end if;
  if new.date > app.today(new.studio_id) then raise exception 'You can''t log a future day'; end if;
  if new.date < app.today(new.studio_id) - 60 then raise exception 'You can log up to 60 days back'; end if;
  if new.plan_item_id is null and tg_op = 'INSERT' and not app.app_flag(new.studio_id, 'can_add_food', true) then
    raise exception 'Your gym has turned off adding your own food; tick the items in your diet plan';
  end if;
  if new.plan_item_id is not null then
    select i.* into pi from public.diet_plan_items i join public.diet_plans p on p.id = i.plan_id
    where i.id = new.plan_item_id and p.studio_id = new.studio_id;
    if pi.id is null then raise exception 'Diet plan item not found'; end if;
    new.name := pi.item_name; new.meal := pi.meal; new.quantity := pi.quantity; new.unit := pi.unit;
    new.calories := pi.calories; new.protein := pi.protein; new.carbs := pi.carbs; new.fats := pi.fats; new.fibre := pi.fibre;
    new.food_id := pi.food_id; new.recipe_id := pi.recipe_id;
  elsif new.food_id is not null then
    select * into f from public.foods where id = new.food_id and (studio_id is null or studio_id = new.studio_id);
    if f.id is null then raise exception 'Food not found'; end if;
    v_scale := coalesce(new.quantity, f.quantity) / f.quantity;
    new.name := f.name; new.unit := coalesce(new.unit, f.unit); new.quantity := coalesce(new.quantity, f.quantity);
    new.calories := round(f.calories * v_scale, 1); new.protein := round(f.protein * v_scale, 1); new.carbs := round(f.carbs * v_scale, 1);
    new.fats := round(f.fats * v_scale, 1); new.fibre := round(f.fibre * v_scale, 1);
  elsif new.recipe_id is not null then
    select * into r from public.recipes where id = new.recipe_id and studio_id = new.studio_id and (is_verified or member_id = new.member_id);
    if r.id is null then raise exception 'Recipe not found'; end if;
    v_scale := coalesce(new.quantity, r.quantity) / r.quantity;
    new.name := r.name; new.unit := coalesce(new.unit, r.unit); new.quantity := coalesce(new.quantity, r.quantity);
    new.calories := round(r.calories * v_scale, 1); new.protein := round(r.protein * v_scale, 1); new.carbs := round(r.carbs * v_scale, 1);
    new.fats := round(r.fats * v_scale, 1); new.fibre := round(r.fibre * v_scale, 1);
  end if;
  return new;
end $$;
create trigger food_logs_check before insert or update on public.food_logs for each row execute function app.check_food_log();

-- ---------------------------------------------------------------------------
-- Daily trackers (water, steps, sleep, mood) with my goals, and my diary
-- ---------------------------------------------------------------------------
create table public.daily_logs (
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  studio_id uuid not null references public.studios(id) on delete cascade,
  water_ml int check (water_ml is null or water_ml between 0 and 10000),
  steps int check (steps is null or steps between 0 and 100000),
  sleep_hours numeric(4,2) check (sleep_hours is null or sleep_hours between 0 and 24),
  mood smallint check (mood is null or mood between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (member_id, date)
);

create table public.member_goals (
  member_id uuid primary key references public.members(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  water_ml int not null default 3000 check (water_ml between 500 and 10000),
  steps int not null default 8000 check (steps between 500 and 50000),
  sleep_hours numeric(4,2) not null default 7.5 check (sleep_hours between 3 and 12),
  calories int check (calories is null or calories between 800 and 6000),
  updated_at timestamptz not null default now()
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  body text not null check (length(trim(body)) between 1 and 4000),
  video_url text check (video_url is null or video_url ~* '^https://'),
  created_at timestamptz not null default now()
);
create index diary_entries_member_idx on public.diary_entries (member_id, date desc, created_at desc);

-- Rows take the member's gym; no future days; App Settings decide whether members set goals ("Can Set Goal?")
-- and keep a diary ("Show Diary", "Show Diary Video").
create or replace function app.member_row()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select m.studio_id into new.studio_id from public.members m where m.id = new.member_id and m.deleted_at is null;
  if new.studio_id is null then raise exception 'Client not found'; end if;
  if tg_table_name in ('daily_logs', 'diary_entries') then
    if new.date > app.today(new.studio_id) then raise exception 'You can''t log a future day'; end if;
  end if;
  if tg_table_name = 'member_goals' and not app.app_flag(new.studio_id, 'can_set_goal', true) then
    raise exception 'Your gym sets your goals';
  end if;
  if tg_table_name = 'diary_entries' then
    if not app.app_flag(new.studio_id, 'show_diary', true) then raise exception 'The diary is turned off'; end if;
    if new.video_url is not null and not app.app_flag(new.studio_id, 'show_diary_video', true) then raise exception 'Videos in the diary are turned off'; end if;
  end if;
  if tg_table_name in ('daily_logs', 'member_goals') then new.updated_at := now(); end if;
  return new;
end $$;
create trigger daily_logs_row before insert or update on public.daily_logs for each row execute function app.member_row();
create trigger member_goals_row before insert or update on public.member_goals for each row execute function app.member_row();
create trigger diary_entries_row before insert or update on public.diary_entries for each row execute function app.member_row();

-- A member's own recipe belongs to their gym, and only when the gym has recipes on (App Settings › Enable Recipe).
create or replace function app.check_member_recipe()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.member_id is null then return new; end if;
  select m.studio_id into new.studio_id from public.members m where m.id = new.member_id and m.deleted_at is null;
  if new.studio_id is null then raise exception 'Client not found'; end if;
  if tg_op = 'INSERT' and not app.is_staff(new.studio_id) and not app.app_flag(new.studio_id, 'allow_recipes', true) then
    raise exception 'Recipes are turned off';
  end if;
  return new;
end $$;
create trigger recipes_member before insert or update on public.recipes for each row execute function app.check_member_recipe();

-- ---------------------------------------------------------------------------
-- PAR-Q from the app (App Settings › Enable PAR-Q Form): the member answers for themself
-- ---------------------------------------------------------------------------
alter table public.member_medical add column filled_by_member_at timestamptz;

create or replace function public.save_my_medical(p_answers jsonb, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.members; v_keys text[] = array['heart_problem', 'diabetes', 'chest_pain_while_exercise', 'feel_faint', 'back_pain_or_joints_pain',
  'asthma', 'medication', 'any_surgery', 'any_reason_to_modify_exercise', 'pregnant', 'allergies', 'medical_problem'];
  v_clean jsonb = '{}'::jsonb; k text;
begin
  select * into m from public.members where user_id = (select auth.uid()) and deleted_at is null order by created_at limit 1;
  if m.id is null then raise exception 'Sign in as a member to fill the form'; end if;
  if not coalesce((app.app_setting(m.studio_id, 'can_view_parq_form') #>> '{}')::boolean, true) then raise exception 'The gym fills this form with you at the front desk'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Answer the questions'; end if;
  foreach k in array v_keys loop
    if jsonb_typeof(p_answers->k) = 'boolean' then v_clean := v_clean || jsonb_build_object(k, p_answers->k); end if;
  end loop;
  insert into public.member_medical (member_id, studio_id, answers, note, updated_at, filled_by_member_at)
  values (m.id, m.studio_id, v_clean, left(nullif(trim(p_note), ''), 1000), now(), now())
  on conflict (member_id) do update set answers = excluded.answers, note = excluded.note, updated_at = now(), updated_by = null, filled_by_member_at = now();
end $$;

-- ---------------------------------------------------------------------------
-- Free plans (YDL Free Workout Plans List / Free Diet Plans List): a member starts a public plan for themself,
-- unless their coach has given them one. Switching from one free plan to another needs App Settings
-- › "Can Change Workout Plan?" / "Can Change Diet Plan?".
-- ---------------------------------------------------------------------------
create or replace function public.start_free_plan(p_kind text, p_plan uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_id uuid; v_n smallint; v_current record;
begin
  select * into m from public.members where user_id = (select auth.uid()) and deleted_at is null order by created_at limit 1;
  if m.id is null then raise exception 'Sign in as a member to start a plan'; end if;
  if p_kind = 'workout' then
    if not app.app_flag(m.studio_id, 'is_woplan_allowed', true) then raise exception 'Workout plans are turned off in the app'; end if;
    select p.days_per_week into v_n from public.workout_plans p where p.id = p_plan and p.studio_id = m.studio_id and p.is_public and p.active;
    if not found then raise exception 'Plan not found'; end if;
    select * into v_current from public.member_workouts w where w.member_id = m.id and w.active;
    if v_current.id is not null and v_current.assigned_by is not null then raise exception 'Your coach has given you a workout plan; ask them to change it'; end if;
    if v_current.id is not null and not app.app_flag(m.studio_id, 'can_change_workout_plan', false) then
      raise exception 'You already follow a workout plan; ask the gym to change it';
    end if;
    update public.member_workouts set active = false, end_date = app.today(m.studio_id) where member_id = m.id and active;
    insert into public.member_workouts (studio_id, member_id, plan_id, weekdays, start_date, assigned_by)
    values (m.studio_id, m.id, p_plan,
            -- training days spread over the week: 3 → Mon, Wed, Fri; 4 → Mon, Tue, Thu, Fri …
            (case v_n when 1 then '{1}' when 2 then '{1,4}' when 3 then '{1,3,5}' when 4 then '{1,2,4,5}' when 5 then '{1,2,3,4,5}'
                      when 6 then '{1,2,3,4,5,6}' else '{1,2,3,4,5,6,7}' end)::smallint[], app.today(m.studio_id), null)
    returning id into v_id;
  elsif p_kind = 'diet' then
    if not app.app_flag(m.studio_id, 'is_Diet_PlanAllowed', true) then raise exception 'Diet plans are turned off in the app'; end if;
    perform 1 from public.diet_plans p where p.id = p_plan and p.studio_id = m.studio_id and p.is_public and p.active;
    if not found then raise exception 'Plan not found'; end if;
    select * into v_current from public.member_diets d where d.member_id = m.id and d.active;
    if v_current.id is not null and v_current.assigned_by is not null then raise exception 'Your coach has given you a diet plan; ask them to change it'; end if;
    if v_current.id is not null and not app.app_flag(m.studio_id, 'can_change_diet_plan', false) then
      raise exception 'You already follow a diet plan; ask the gym to change it';
    end if;
    update public.member_diets set active = false, end_date = app.today(m.studio_id) where member_id = m.id and active;
    insert into public.member_diets (studio_id, member_id, plan_id, start_date, assigned_by) values (m.studio_id, m.id, p_plan, app.today(m.studio_id), null)
    returning id into v_id;
  else
    raise exception 'Choose a workout or diet plan';
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Workout Analysis / Exercise Analysis (volume): week by week, for me, or for a client a staff member looks after
-- ---------------------------------------------------------------------------
create or replace function public.workout_analysis(p_member uuid default null, p_weeks int default 8)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_member uuid; v_studio uuid; v_today date; v_from date;
begin
  if p_member is null then
    select m.id, m.studio_id into v_member, v_studio from public.members m where m.user_id = (select auth.uid()) and m.deleted_at is null order by m.created_at limit 1;
  elsif app.is_self(p_member) or app.sees_member(p_member) then
    select m.id, m.studio_id into v_member, v_studio from public.members m where m.id = p_member;
  end if;
  if v_member is null then raise exception 'Client not found'; end if;
  v_today := app.today(v_studio);
  v_from := date_trunc('week', v_today)::date - 7 * (least(greatest(coalesce(p_weeks, 8), 1), 26) - 1);
  return jsonb_build_object(
    'from', v_from, 'to', v_today,
    'weeks', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.wk, 'days', coalesce(s.days, 0), 'exercises', coalesce(s.n, 0), 'volume', coalesce(s.vol, 0)) order by w.wk), '[]'::jsonb)
      from (select g::date as wk from generate_series(v_from, v_today, interval '7 days') g) w
      left join (
        select date_trunc('week', l.date)::date as wk, count(distinct l.date)::int as days, count(*)::int as n,
               round(sum(coalesce(l.sets_done, i.sets, 1) * coalesce(l.reps_done, i.reps, 0) * coalesce(l.weight_kg, i.weight_kg, 0)), 1) as vol
        from public.workout_logs l left join public.workout_plan_items i on i.id = l.item_id
        where l.member_id = v_member and l.date between v_from and v_today group by 1
      ) s on s.wk = w.wk),
    'parts', (
      select coalesce(jsonb_agg(jsonb_build_object('part', p.part, 'n', p.n) order by p.n desc, p.part), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(i.body_part), ''), nullif(trim(e.body_part), ''), 'Other') as part, count(*)::int as n
        from public.workout_logs l
        left join public.workout_plan_items i on i.id = l.item_id
        left join public.exercises e on e.id = i.exercise_id
        where l.member_id = v_member and l.date between v_from and v_today group by 1
      ) p));
end $$;

-- ---------------------------------------------------------------------------
-- Access rules: the member writes their own; staff who look after them can read
-- ---------------------------------------------------------------------------
alter table public.food_logs enable row level security;
alter table public.daily_logs enable row level security;
alter table public.member_goals enable row level security;
alter table public.diary_entries enable row level security;

create policy food_logs_read on public.food_logs for select to authenticated using (app.is_self(member_id) or app.sees_member(member_id));
create policy food_logs_own on public.food_logs for all to authenticated using (app.is_self(member_id)) with check (app.is_self(member_id));
create policy daily_logs_read on public.daily_logs for select to authenticated using (app.is_self(member_id) or app.sees_member(member_id));
create policy daily_logs_own on public.daily_logs for all to authenticated using (app.is_self(member_id)) with check (app.is_self(member_id));
create policy member_goals_read on public.member_goals for select to authenticated using (app.is_self(member_id) or app.sees_member(member_id));
create policy member_goals_own on public.member_goals for all to authenticated using (app.is_self(member_id)) with check (app.is_self(member_id));
create policy diary_entries_read on public.diary_entries for select to authenticated using (app.is_self(member_id) or app.in_care_team(member_id));
create policy diary_entries_own on public.diary_entries for all to authenticated using (app.is_self(member_id)) with check (app.is_self(member_id));

revoke all on function public.save_my_medical(jsonb, text), public.start_free_plan(text, uuid), public.workout_analysis(uuid, int) from public, anon;
revoke all on function app.app_flag(uuid, text, boolean) from public, anon;
grant execute on function app.app_flag(uuid, text, boolean) to authenticated, service_role;
call app.apply_grants();
