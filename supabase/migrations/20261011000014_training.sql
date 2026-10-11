-- Shaan Fitness app · 14. Workouts, diet and body measurements (YDL App Settings › Workouts & Diet)
-- Workout plans: a few days a week, each day a list of exercises with sets, reps or time.
-- Diet plans: meals by time of day, for every day or for a weekday, each item with its macros.
-- Coaches and the front desk assign them to clients; members see them in the app, tick off
-- exercises and add their measurements. Progress photos are seen only by the owner, the
-- client's own coach and doctor, and the client.

-- ---------------------------------------------------------------------------
-- Dropdown lists (editable in Settings › Lists)
-- ---------------------------------------------------------------------------
create or replace function app.default_training_lists()
returns table (list text, label text, sort int)
language sql immutable as $$
  with src(list, items) as (values
    ('exercise_type', array['Weight Training','Cardio','Stretching','Power Yoga','Yoga','Zumba','Crossfit','Functional','Free Body','Core',
                            'Strength Training','Aerobic Training','Abdominal conditioning','Meditation & Relaxation','Rest']),
    ('body_part', array['Chest','Shoulder','Arms','Triceps','Back','Biceps','Full Legs','Quadriceps','Calves','Hamstrings','Cardio','Abs',
                        'Glutes','Forearms','Traps','Lower Back','Full Body','Neck']),
    ('workout_goal', array['Fat Loss','Muscle Gain','Weight Gain','General Fitness','Over all fitness','Sports Specific','Marathon Training',
                           'Lean Toning','ABS','Strength building','Calisthenics','Stamina building','Maintain Weight']),
    ('plan_level', array['General','Beginner','Intermediate','Advanced']),
    ('meal_time', array['Early Morning','Breakfast','Mid Morning','Lunch','Evening Snack','Pre Workout','Post Workout','Dinner','Bed Time']),
    ('food_unit', array['g','ml','piece','cup','bowl','katori','glass','tbsp','tsp','slice','scoop','serving'])
  )
  select s.list, x.item, (x.ord * 10)::int from src s, unnest(s.items) with ordinality as x(item, ord);
$$;

create or replace function app.seed_training_lists()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.list_items (studio_id, list, label, sort)
  select new.id, d.list, d.label, d.sort from app.default_training_lists() d
  on conflict (studio_id, list, label) do nothing;
  return new;
end $$;
drop trigger if exists studios_seed_training on public.studios;
create trigger studios_seed_training after insert on public.studios for each row execute function app.seed_training_lists();

insert into public.list_items (studio_id, list, label, sort)
select s.id, d.list, d.label, d.sort from public.studios s cross join app.default_training_lists() d
where not exists (select 1 from public.list_items x where x.studio_id = s.id and x.list = d.list)
on conflict (studio_id, list, label) do nothing;

-- ---------------------------------------------------------------------------
-- Who may look at and work on a client's training
-- ---------------------------------------------------------------------------
-- Staff who can see the client (same rule as the client lists).
create or replace function app.sees_member(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.id = p_member and m.deleted_at is null
      and (app.can_see_client(m.studio_id, m.added_by, m.trainer_id) or app.in_care_team(m.id) or app.has_follow_up_for(m.id))
  );
$$;

-- The owner, front desk who can see the client, and the client's own coaches.
create or replace function app.trains_member(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.in_care_team(p_member, array['coach']::public.care_role[]) or exists (
    select 1 from public.members m
    where m.id = p_member and m.deleted_at is null and app.can_see_client(m.studio_id, m.added_by, m.trainer_id)
  );
$$;

-- A coach's app switches (Trainers › Allow Workout / Allow Diet in Coach App). Owner and front desk always.
create or replace function app.may_plan(p_studio uuid, p_switch text)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_desk(p_studio) or exists (
    select 1 from public.staff s
    where s.studio_id = p_studio and s.user_id = (select auth.uid()) and s.active and s.role = 'coach'
      and coalesce((s.permissions->>p_switch)::boolean, true)
  );
$$;

grant execute on function app.sees_member(uuid), app.trains_member(uuid), app.may_plan(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Exercises: YDL's "General Exercise List" (shared, studio_id null) plus the studio's own
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  exercise_type text not null,
  body_part text not null,
  equipment text,
  instructions text,
  image_url text,
  video_url text,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index exercises_name_uq on public.exercises (coalesce(studio_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index exercises_studio_idx on public.exercises (studio_id, body_part);

-- "Exclude in App": general exercises a studio hides from its coaches and members.
create table public.exercise_exclusions (
  studio_id uuid not null references public.studios(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (studio_id, exercise_id)
);

-- ---------------------------------------------------------------------------
-- Workout plans
-- ---------------------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  goal text not null,
  level text not null default 'General',
  trainer_id uuid references public.staff(id) on delete set null,     -- "Assign By Trainer"
  days_per_week smallint not null check (days_per_week between 1 and 7),
  total_days int check (total_days is null or total_days > 0),
  instructions text,                                                  -- "Important Instruction"
  is_public boolean not null default false,                           -- members can browse it in the app
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_plans_studio_idx on public.workout_plans (studio_id, active);

create table public.workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day smallint not null check (day between 1 and 7),
  seq int not null default 0,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null check (length(trim(exercise_name)) > 0),
  exercise_type text,
  body_part text,
  sets int check (sets is null or sets between 0 and 100),
  reps int check (reps is null or reps between 0 and 1000),
  time numeric(8,2) check (time is null or time >= 0),
  time_unit text not null default 'secs' check (time_unit in ('secs', 'mins', 'hours')),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  rest_secs int check (rest_secs is null or rest_secs >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index workout_plan_items_plan_idx on public.workout_plan_items (plan_id, day, seq);

-- ---------------------------------------------------------------------------
-- Foods, recipes and diet plans
-- ---------------------------------------------------------------------------
-- Macros are for the stated quantity of the food (e.g. 100 g, or 1 piece).
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,      -- null: the general list
  name text not null check (length(trim(name)) > 0),
  quantity numeric(8,2) not null default 100 check (quantity > 0),
  unit text not null default 'g',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  fats numeric(8,2) not null default 0 check (fats >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fibre numeric(8,2) not null default 0 check (fibre >= 0),
  is_veg boolean not null default true,
  is_verified boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index foods_name_uq on public.foods (coalesce(studio_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit text not null default 'serving',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  fats numeric(8,2) not null default 0 check (fats >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fibre numeric(8,2) not null default 0 check (fibre >= 0),
  prep_time_mins int check (prep_time_mins is null or prep_time_mins >= 0),
  ingredients text,
  method text,
  notes text,
  image_url text,
  pdf_url text,
  is_veg boolean not null default true,
  member_id uuid references public.members(id) on delete cascade,    -- a client's own recipe, waiting for the gym to verify it
  is_verified boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index recipes_studio_idx on public.recipes (studio_id, is_verified);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  goal text not null default 'General Fitness',
  level text not null default 'General',
  trainer_id uuid references public.staff(id) on delete set null,
  calories_target int check (calories_target is null or calories_target > 0),
  instructions text,
  is_public boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diet_plans_studio_idx on public.diet_plans (studio_id, active);

create table public.diet_plan_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  plan_id uuid not null references public.diet_plans(id) on delete cascade,
  weekday smallint not null default 0 check (weekday between 0 and 7),  -- 0 = every day, 1-7 = Monday-Sunday
  meal text not null,
  meal_time time,
  seq int not null default 0,
  food_id uuid references public.foods(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  item_name text not null check (length(trim(item_name)) > 0),
  quantity numeric(8,2) check (quantity is null or quantity > 0),
  unit text,
  calories numeric(8,2) not null default 0,
  protein numeric(8,2) not null default 0,
  fats numeric(8,2) not null default 0,
  carbs numeric(8,2) not null default 0,
  fibre numeric(8,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index diet_plan_items_plan_idx on public.diet_plan_items (plan_id, weekday, meal_time, seq);

-- ---------------------------------------------------------------------------
-- A client's plans, workout ticks and measurements
-- ---------------------------------------------------------------------------
create table public.member_workouts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  weekdays smallint[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  start_date date not null default current_date,
  end_date date,
  goal text,
  level text,
  assigned_by uuid references public.staff(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index member_workouts_one_active on public.member_workouts (member_id) where active;
create index member_workouts_plan_idx on public.member_workouts (plan_id);

create table public.member_diets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.diet_plans(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  assigned_by uuid references public.staff(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index member_diets_one_active on public.member_diets (member_id) where active;
create index member_diets_plan_idx on public.member_diets (plan_id);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  item_id uuid not null references public.workout_plan_items(id) on delete cascade,
  date date not null,
  sets_done int check (sets_done is null or sets_done >= 0),
  reps_done int check (reps_done is null or reps_done >= 0),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  created_at timestamptz not null default now(),
  unique (member_id, item_id, date)
);
create index workout_logs_member_idx on public.workout_logs (member_id, date desc);

-- Measurements: the studio's Measurement Settings decide which fields are asked for.
-- Body circumferences are in inches, height in cm, weight and masses in kg.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  measured_on date not null default current_date,
  vals jsonb not null default '{}'::jsonb check (jsonb_typeof(vals) = 'object'),
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  note text,
  recorded_by uuid references public.staff(id) on delete set null,   -- null when the client added it in the app
  created_at timestamptz not null default now()
);
create index measurements_member_idx on public.measurements (member_id, measured_on desc);
create index measurements_studio_idx on public.measurements (studio_id, measured_on);

create table public.measurement_photos (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index measurement_photos_member_idx on public.measurement_photos (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger exercises_fill before insert on public.exercises for each row when (new.studio_id is not null) execute function app.fill_created_by();
create trigger workout_plans_fill before insert on public.workout_plans for each row execute function app.fill_created_by();
create trigger workout_plans_touch before update on public.workout_plans for each row execute function app.touch_updated_at();
create trigger diet_plans_fill before insert on public.diet_plans for each row execute function app.fill_created_by();
create trigger diet_plans_touch before update on public.diet_plans for each row execute function app.touch_updated_at();
create trigger foods_fill before insert on public.foods for each row when (new.studio_id is not null) execute function app.fill_created_by();
create trigger recipes_fill before insert on public.recipes for each row execute function app.fill_created_by();
create trigger workout_plans_log after insert or update or delete on public.workout_plans for each row execute function app.log_activity();
create trigger diet_plans_log after insert or update or delete on public.diet_plans for each row execute function app.log_activity();
create trigger member_workouts_log after insert or update on public.member_workouts for each row execute function app.log_activity();
create trigger member_diets_log after insert or update on public.member_diets for each row execute function app.log_activity();
create trigger measurements_log after delete on public.measurements for each row execute function app.log_activity();

-- Items belong to their plan's studio, and a workout day fits the plan's week.
create or replace function app.check_plan_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_studio uuid; v_days int;
begin
  if tg_table_name = 'workout_plan_items' then
    select p.studio_id, p.days_per_week into v_studio, v_days from public.workout_plans p where p.id = new.plan_id;
    if new.day > v_days then raise exception 'This plan has % day(s) a week; there is no Day %', v_days, new.day; end if;
    if new.exercise_id is not null and (new.exercise_type is null or new.body_part is null) then
      select coalesce(new.exercise_type, e.exercise_type), coalesce(new.body_part, e.body_part) into new.exercise_type, new.body_part
      from public.exercises e where e.id = new.exercise_id;
    end if;
  else
    select p.studio_id into v_studio from public.diet_plans p where p.id = new.plan_id;
  end if;
  new.studio_id := v_studio;
  return new;
end $$;
create trigger workout_plan_items_check before insert or update on public.workout_plan_items for each row execute function app.check_plan_item();
create trigger diet_plan_items_check before insert or update on public.diet_plan_items for each row execute function app.check_plan_item();

-- Only the owner and front desk can mark foods and recipes verified. Staff recipes start verified;
-- a client's own recipe waits for the gym.
create or replace function app.guard_verified()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'recipes' then
      -- (a separate IF: foods have no member_id)
      if new.member_id is null then new.is_verified := true; else new.is_verified := false; end if;
    elsif not app.is_desk(new.studio_id) then new.is_verified := false;
    end if;
  elsif new.is_verified is distinct from old.is_verified and not app.is_desk(new.studio_id) then
    raise exception 'Only the owner or front desk can verify';
  end if;
  return new;
end $$;
create trigger foods_verified before insert or update on public.foods for each row when (new.studio_id is not null) execute function app.guard_verified();
create trigger recipes_verified before insert or update on public.recipes for each row execute function app.guard_verified();

-- A workout tick belongs to the client's own plan.
create or replace function app.check_workout_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select m.studio_id into new.studio_id from public.members m where m.id = new.member_id;
  if not exists (
    select 1 from public.workout_plan_items i join public.member_workouts w on w.plan_id = i.plan_id and w.member_id = new.member_id
    where i.id = new.item_id
  ) then raise exception 'That exercise is not in this client''s workout plan'; end if;
  if new.date > app.today(new.studio_id) then raise exception 'You can''t tick off a future workout'; end if;
  return new;
end $$;
create trigger workout_logs_check before insert or update on public.workout_logs for each row execute function app.check_workout_log();

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.exercise_exclusions enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_items enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.diet_plans enable row level security;
alter table public.diet_plan_items enable row level security;
alter table public.member_workouts enable row level security;
alter table public.member_diets enable row level security;
alter table public.workout_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.measurement_photos enable row level security;

create policy exercises_read on public.exercises for select to authenticated using (studio_id is null or app.in_studio(studio_id));
create policy exercises_write on public.exercises for all to authenticated
  using (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy exercise_exclusions_read on public.exercise_exclusions for select to authenticated using (app.in_studio(studio_id));
create policy exercise_exclusions_write on public.exercise_exclusions for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));

-- Plans: every staff member reads them; members read the ones assigned to them and public ones.
create or replace function app.can_read_workout_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_plans p where p.id = p_plan and (
      app.is_staff(p.studio_id)
      or (p.is_public and p.active and app.in_studio(p.studio_id))
      or exists (select 1 from public.member_workouts w join public.members m on m.id = w.member_id
                 where w.plan_id = p.id and m.user_id = (select auth.uid())))
  );
$$;
create or replace function app.can_edit_workout_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_plans p where p.id = p_plan and (
      app.is_desk(p.studio_id)
      or (app.may_plan(p.studio_id, 'allow_workout') and (p.created_by in (select app.my_staff_ids()) or p.trainer_id in (select app.my_staff_ids()))))
  );
$$;
create or replace function app.can_read_diet_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.diet_plans p where p.id = p_plan and (
      app.is_staff(p.studio_id)
      or (p.is_public and p.active and app.in_studio(p.studio_id))
      or exists (select 1 from public.member_diets w join public.members m on m.id = w.member_id
                 where w.plan_id = p.id and m.user_id = (select auth.uid())))
  );
$$;
create or replace function app.can_edit_diet_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.diet_plans p where p.id = p_plan and (
      app.is_desk(p.studio_id)
      or (app.may_plan(p.studio_id, 'allow_diet') and (p.created_by in (select app.my_staff_ids()) or p.trainer_id in (select app.my_staff_ids()))))
  );
$$;
grant execute on function app.can_read_workout_plan(uuid), app.can_edit_workout_plan(uuid), app.can_read_diet_plan(uuid), app.can_edit_diet_plan(uuid)
  to authenticated, service_role;

-- A plan assigned to the signed-in member (now or before).
create or replace function app.assigned_plan(p_kind text, p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_kind = 'workout' then exists (
      select 1 from public.member_workouts w join public.members m on m.id = w.member_id where w.plan_id = p_plan and m.user_id = (select auth.uid()))
    else exists (
      select 1 from public.member_diets w join public.members m on m.id = w.member_id where w.plan_id = p_plan and m.user_id = (select auth.uid()))
    end;
$$;
grant execute on function app.assigned_plan(text, uuid) to authenticated, service_role;
-- The read rules use the row's own columns, so a new plan can be read back as it is saved (insert … returning).
create policy workout_plans_read on public.workout_plans for select to authenticated
  using (app.is_staff(studio_id) or (is_public and active and app.in_studio(studio_id)) or app.assigned_plan('workout', id));
create policy workout_plans_insert on public.workout_plans for insert to authenticated with check (app.may_plan(studio_id, 'allow_workout'));
create policy workout_plans_update on public.workout_plans for update to authenticated using (app.can_edit_workout_plan(id)) with check (app.may_plan(studio_id, 'allow_workout'));
create policy workout_plans_delete on public.workout_plans for delete to authenticated using (app.can_edit_workout_plan(id));
create policy workout_items_read on public.workout_plan_items for select to authenticated using (app.can_read_workout_plan(plan_id));
create policy workout_items_write on public.workout_plan_items for all to authenticated using (app.can_edit_workout_plan(plan_id)) with check (app.can_edit_workout_plan(plan_id));

create policy diet_plans_read on public.diet_plans for select to authenticated
  using (app.is_staff(studio_id) or (is_public and active and app.in_studio(studio_id)) or app.assigned_plan('diet', id));
create policy diet_plans_insert on public.diet_plans for insert to authenticated with check (app.may_plan(studio_id, 'allow_diet'));
create policy diet_plans_update on public.diet_plans for update to authenticated using (app.can_edit_diet_plan(id)) with check (app.may_plan(studio_id, 'allow_diet'));
create policy diet_plans_delete on public.diet_plans for delete to authenticated using (app.can_edit_diet_plan(id));
create policy diet_items_read on public.diet_plan_items for select to authenticated using (app.can_read_diet_plan(plan_id));
create policy diet_items_write on public.diet_plan_items for all to authenticated using (app.can_edit_diet_plan(plan_id)) with check (app.can_edit_diet_plan(plan_id));

create policy foods_read on public.foods for select to authenticated using (studio_id is null or app.in_studio(studio_id));
create policy foods_write on public.foods for all to authenticated
  using (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (studio_id is not null and app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));

create policy recipes_read on public.recipes for select to authenticated
  using (app.is_staff(studio_id) or (app.in_studio(studio_id) and is_verified and active) or app.is_self(member_id));
create policy recipes_staff on public.recipes for all to authenticated
  using (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]))
  with check (app.has_role(studio_id, array['owner', 'front_desk', 'coach']::public.staff_role[]));
create policy recipes_member_insert on public.recipes for insert to authenticated with check (member_id is not null and app.is_self(member_id) and not is_verified);
create policy recipes_member_update on public.recipes for update to authenticated using (app.is_self(member_id) and not is_verified) with check (app.is_self(member_id) and not is_verified);
create policy recipes_member_delete on public.recipes for delete to authenticated using (app.is_self(member_id) and not is_verified);

-- Assignments go through assign_workout / assign_diet; anyone who can see the client reads them.
create policy member_workouts_read on public.member_workouts for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy member_diets_read on public.member_diets for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));

create policy workout_logs_read on public.workout_logs for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy workout_logs_write on public.workout_logs for all to authenticated
  using (app.is_self(member_id) or app.trains_member(member_id)) with check (app.is_self(member_id) or app.trains_member(member_id));

-- Measurements are added through save_measurement (it checks the values).
create policy measurements_read on public.measurements for select to authenticated using (app.sees_member(member_id) or app.is_self(member_id));
create policy measurements_delete on public.measurements for delete to authenticated
  using (app.is_owner(studio_id) or recorded_by in (select app.my_staff_ids()) or (recorded_by is null and app.is_self(member_id)));
create policy measurement_photos_read on public.measurement_photos for select to authenticated
  using (app.is_owner(studio_id) or app.in_care_team(member_id) or app.is_self(member_id));
create policy measurement_photos_delete on public.measurement_photos for delete to authenticated
  using (app.is_owner(studio_id) or app.is_self(member_id));

-- ---------------------------------------------------------------------------
-- Copying days, duplicating plans, assigning, measurements
-- ---------------------------------------------------------------------------
-- YDL "Copy Exercise for Day" and "Copy From Another Workout": adds the source day's exercises to a day.
create or replace function public.copy_workout_day(p_plan uuid, p_from_plan uuid, p_from_day int, p_to_day int)
returns int language plpgsql security definer set search_path = '' as $$
declare n int; v_seq int;
begin
  if not app.can_edit_workout_plan(p_plan) then raise exception 'You can''t change this workout plan'; end if;
  if not app.can_read_workout_plan(p_from_plan) then raise exception 'Workout plan not found'; end if;
  if (select studio_id from public.workout_plans where id = p_plan) is distinct from (select studio_id from public.workout_plans where id = p_from_plan) then
    raise exception 'Copy from a plan of this fitness center';
  end if;
  if p_plan = p_from_plan and p_from_day = p_to_day then raise exception 'Choose a different day to copy to'; end if;
  select coalesce(max(seq), 0) into v_seq from public.workout_plan_items where plan_id = p_plan and day = p_to_day;
  insert into public.workout_plan_items (studio_id, plan_id, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes)
  select i.studio_id, p_plan, p_to_day, v_seq + i.seq, i.exercise_id, i.exercise_name, i.exercise_type, i.body_part, i.sets, i.reps, i.time, i.time_unit, i.weight_kg, i.rest_secs, i.notes
  from public.workout_plan_items i where i.plan_id = p_from_plan and i.day = p_from_day
  order by i.seq;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Day % has no exercises to copy', p_from_day; end if;
  return n;
end $$;

create or replace function public.copy_diet_day(p_plan uuid, p_from_plan uuid, p_from_weekday int, p_to_weekday int)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not app.can_edit_diet_plan(p_plan) then raise exception 'You can''t change this diet plan'; end if;
  if not app.can_read_diet_plan(p_from_plan) then raise exception 'Diet plan not found'; end if;
  if (select studio_id from public.diet_plans where id = p_plan) is distinct from (select studio_id from public.diet_plans where id = p_from_plan) then
    raise exception 'Copy from a plan of this fitness center';
  end if;
  if p_plan = p_from_plan and p_from_weekday = p_to_weekday then raise exception 'Choose a different day to copy to'; end if;
  insert into public.diet_plan_items (studio_id, plan_id, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes)
  select i.studio_id, p_plan, p_to_weekday, i.meal, i.meal_time, i.seq, i.food_id, i.recipe_id, i.item_name, i.quantity, i.unit, i.calories, i.protein, i.fats, i.carbs, i.fibre, i.notes
  from public.diet_plan_items i where i.plan_id = p_from_plan and i.weekday = p_from_weekday;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'That day has no meals to copy'; end if;
  return n;
end $$;

-- A copy of a plan (with every day), e.g. to adapt one client's diet for another.
create or replace function public.duplicate_plan(p_kind text, p_plan uuid, p_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_new uuid; v_studio uuid;
begin
  if p_kind = 'workout' then
    select studio_id into v_studio from public.workout_plans where id = p_plan;
    if v_studio is null or not app.can_read_workout_plan(p_plan) or not app.may_plan(v_studio, 'allow_workout') then raise exception 'You can''t copy this workout plan'; end if;
    insert into public.workout_plans (studio_id, name, goal, level, trainer_id, days_per_week, total_days, instructions, created_by)
    select studio_id, coalesce(nullif(trim(p_name), ''), name || ' (copy)'), goal, level, trainer_id, days_per_week, total_days, instructions, app.my_staff_id(studio_id)
    from public.workout_plans where id = p_plan returning id into v_new;
    insert into public.workout_plan_items (studio_id, plan_id, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes)
    select studio_id, v_new, day, seq, exercise_id, exercise_name, exercise_type, body_part, sets, reps, time, time_unit, weight_kg, rest_secs, notes
    from public.workout_plan_items where plan_id = p_plan;
  elsif p_kind = 'diet' then
    select studio_id into v_studio from public.diet_plans where id = p_plan;
    if v_studio is null or not app.can_read_diet_plan(p_plan) or not app.may_plan(v_studio, 'allow_diet') then raise exception 'You can''t copy this diet plan'; end if;
    insert into public.diet_plans (studio_id, name, goal, level, trainer_id, calories_target, instructions, created_by)
    select studio_id, coalesce(nullif(trim(p_name), ''), name || ' (copy)'), goal, level, trainer_id, calories_target, instructions, app.my_staff_id(studio_id)
    from public.diet_plans where id = p_plan returning id into v_new;
    insert into public.diet_plan_items (studio_id, plan_id, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes)
    select studio_id, v_new, weekday, meal, meal_time, seq, food_id, recipe_id, item_name, quantity, unit, calories, protein, fats, carbs, fibre, notes
    from public.diet_plan_items where plan_id = p_plan;
  else
    raise exception 'Unknown plan kind';
  end if;
  return v_new;
end $$;

-- YDL "Add Workout": the client's weight and height, goal, level, plan and workout days.
create or replace function public.assign_workout(p_member uuid, p_plan uuid, p_weekdays int[], p_weight numeric default null,
  p_height_cm numeric default null, p_goal text default null, p_level text default null, p_start date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; p public.workout_plans; v_id uuid; v_days smallint[];
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  select * into p from public.workout_plans where id = p_plan;
  if m.id is null or p.id is null or p.studio_id <> m.studio_id then raise exception 'Client or workout plan not found'; end if;
  if not app.trains_member(p_member) or not app.may_plan(m.studio_id, 'allow_workout') then
    raise exception 'You can''t assign workouts to this client';
  end if;
  if not p.active then raise exception 'This workout plan is deactivated'; end if;
  select array_agg(distinct d order by d)::smallint[] into v_days from unnest(p_weekdays) d where d between 1 and 7;
  if coalesce(cardinality(v_days), 0) = 0 then raise exception 'Choose the workout days'; end if;
  update public.member_workouts set active = false, end_date = coalesce(end_date, app.today(m.studio_id)) where member_id = p_member and active;
  insert into public.member_workouts (studio_id, member_id, plan_id, weekdays, start_date, goal, level, assigned_by)
  values (m.studio_id, p_member, p_plan, v_days, coalesce(p_start, app.today(m.studio_id)), coalesce(nullif(p_goal, ''), p.goal),
          coalesce(nullif(p_level, ''), p.level), app.my_staff_id(m.studio_id))
  returning id into v_id;
  if p_weight is not null or p_height_cm is not null then
    perform public.save_measurement(jsonb_build_object('member_id', p_member,
      'values', jsonb_strip_nulls(jsonb_build_object('weight_kg', p_weight, 'height', p_height_cm)), 'note', 'With the workout plan'));
  end if;
  return v_id;
end $$;

create or replace function public.assign_diet(p_member uuid, p_plan uuid, p_start date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; p public.diet_plans; v_id uuid;
begin
  select * into m from public.members where id = p_member and deleted_at is null;
  select * into p from public.diet_plans where id = p_plan;
  if m.id is null or p.id is null or p.studio_id <> m.studio_id then raise exception 'Client or diet plan not found'; end if;
  if not app.trains_member(p_member) or not app.may_plan(m.studio_id, 'allow_diet') then raise exception 'You can''t assign diets to this client'; end if;
  if not p.active then raise exception 'This diet plan is deactivated'; end if;
  update public.member_diets set active = false, end_date = coalesce(end_date, app.today(m.studio_id)) where member_id = p_member and active;
  insert into public.member_diets (studio_id, member_id, plan_id, start_date, assigned_by)
  values (m.studio_id, p_member, p_plan, coalesce(p_start, app.today(m.studio_id)), app.my_staff_id(m.studio_id))
  returning id into v_id;
  return v_id;
end $$;

-- Ends a client's current workout or diet.
create or replace function public.end_member_plan(p_kind text, p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_studio uuid;
begin
  select studio_id into v_studio from public.members where id = p_member;
  if not app.trains_member(p_member) then raise exception 'You can''t change this client''s plans'; end if;
  if p_kind = 'workout' then
    update public.member_workouts set active = false, end_date = app.today(v_studio) where member_id = p_member and active;
  elsif p_kind = 'diet' then
    update public.member_diets set active = false, end_date = app.today(v_studio) where member_id = p_member and active;
  else raise exception 'Unknown plan kind'; end if;
end $$;

-- Keys a measurement may have (YDL's 82), and the ones that hold text.
create or replace function app.measurement_keys()
returns text[] language sql immutable as $$
  select array_agg(x->>'key') from jsonb_array_elements(app.default_measurement_settings()) x
  where x->>'key' not in ('image', 'image_two', 'image_three');
$$;

-- Adds a measurement. p: member_id, measured_on, values {key: value}, note, photos [storage paths].
-- Staff who train the client, or the client, may add one. BMI fills in from weight and height.
create or replace function public.save_measurement(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; v_vals jsonb := '{}'::jsonb; k text; v jsonb; n numeric; v_id uuid; v_date date; v_height numeric; v_weight numeric;
  v_self boolean; v_path text;
begin
  select * into m from public.members where id = (p->>'member_id')::uuid and deleted_at is null;
  if m.id is null then raise exception 'Client not found'; end if;
  v_self := app.is_self(m.id);
  if not (v_self or app.trains_member(m.id)) then raise exception 'You can''t add measurements for this client'; end if;
  v_date := coalesce(nullif(p->>'measured_on', '')::date, app.today(m.studio_id));
  if v_date > app.today(m.studio_id) then raise exception 'The date can''t be in the future'; end if;
  for k, v in select * from jsonb_each(coalesce(p->'values', '{}'::jsonb)) loop
    continue when v is null or v = 'null'::jsonb or trim(v #>> '{}') = '';
    if not (k = any (app.measurement_keys())) then raise exception 'Unknown measurement: %', k; end if;
    if k in ('blood_presure', 'deviation_note') then
      if length(v #>> '{}') > 500 then raise exception 'Keep % under 500 characters', k; end if;
      v_vals := v_vals || jsonb_build_object(k, trim(v #>> '{}'));
    else
      begin n := (v #>> '{}')::numeric;
      exception when others then raise exception 'Enter a number for %', replace(k, '_', ' '); end;
      if n < 0 or n > 1000 then raise exception 'Check the value for %', replace(k, '_', ' '); end if;
      if k = 'weight_kg' and (n < 10 or n > 350) then raise exception 'Weight should be in kg (10 to 350)'; end if;
      if k = 'height' and (n < 50 or n > 260) then raise exception 'Height should be in cm (50 to 260)'; end if;
      v_vals := v_vals || jsonb_build_object(k, round(n, 2));
    end if;
  end loop;
  if v_vals = '{}'::jsonb and coalesce(jsonb_array_length(p->'photos'), 0) = 0 then raise exception 'Enter at least one measurement'; end if;
  v_weight := (v_vals->>'weight_kg')::numeric;
  v_height := coalesce((v_vals->>'height')::numeric,
    (select x.height_cm from public.measurements x where x.member_id = m.id and x.height_cm is not null order by x.measured_on desc, x.created_at desc limit 1));
  if v_weight is not null and v_height is not null and not v_vals ? 'bmi' then
    v_vals := v_vals || jsonb_build_object('bmi', round(v_weight / ((v_height / 100) ^ 2), 1));
  end if;
  insert into public.measurements (studio_id, member_id, measured_on, vals, weight_kg, height_cm, note, recorded_by)
  values (m.studio_id, m.id, v_date, v_vals, v_weight, (v_vals->>'height')::numeric, nullif(trim(p->>'note'), ''),
          case when v_self then null else app.my_staff_id(m.studio_id) end)
  returning id into v_id;
  for v_path in select jsonb_array_elements_text(coalesce(p->'photos', '[]'::jsonb)) loop
    if split_part(v_path, '/', 1) <> m.studio_id::text or split_part(v_path, '/', 2) <> m.id::text then raise exception 'Photo is not this client''s'; end if;
    insert into public.measurement_photos (studio_id, member_id, measurement_id, path) values (m.studio_id, m.id, v_id, v_path);
  end loop;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Weight Loss Analysis (YDL "Client Weight Loss List"): first and latest weight in the dates.
-- p_filter: gender, client_type, source, employment, lead (convertibility), rep (added_by),
-- coach (trainer_id), batch, ages [], lead_status [], search.
-- ---------------------------------------------------------------------------
create or replace function public.analysis_weight_loss(p_studio uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_f jsonb := coalesce(p_filter, '{}'); v_today date;
begin
  -- Owner; front desk unless the page is hidden for them; coaches see their own clients.
  if app.is_owner(p_studio) then null;
  elsif app.has_role(p_studio, array['front_desk']::public.staff_role[]) then perform app.analysis_require(p_studio, 'Weight Loss Analysis', true);
  elsif not app.has_role(p_studio, array['coach']::public.staff_role[]) then
    raise exception 'You don''t have access to Weight Loss Analysis.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a date range'; end if;
  v_today := app.today(p_studio);
  return (
    with w as (
      select x.member_id, x.measured_on, x.weight_kg, x.created_at, (x.vals->>'waist')::numeric as waist
      from public.measurements x
      where x.studio_id = p_studio and x.weight_kg is not null and x.measured_on between p_from and p_to
    ), per as (
      select member_id, count(*) as n,
        (array_agg(weight_kg order by measured_on, created_at))[1] as first_w, (array_agg(measured_on order by measured_on, created_at))[1] as first_d,
        (array_agg(weight_kg order by measured_on desc, created_at desc))[1] as last_w, (array_agg(measured_on order by measured_on desc, created_at desc))[1] as last_d,
        (array_agg(waist order by measured_on, created_at) filter (where waist is not null))[1] as first_waist,
        (array_agg(waist order by measured_on desc, created_at desc) filter (where waist is not null))[1] as last_waist
      from w group by member_id
    ), rows_ as (
      select m.id, m.full_name, coalesce(m.member_code, m.enquiry_code) as code, m.country_code, m.phone, m.email, m.gender, m.kind,
        tr.full_name as coach, per.*
      from per join public.members m on m.id = per.member_id and m.deleted_at is null
      left join public.staff tr on tr.id = m.trainer_id
      where (app.can_see_client(m.studio_id, m.added_by, m.trainer_id) or app.in_care_team(m.id))
        and (coalesce(v_f->>'gender', '') = '' or m.gender = v_f->>'gender')
        and (coalesce(v_f->>'client_type', '') = '' or m.kind = v_f->>'client_type')
        and (coalesce(v_f->>'source', '') = '' or m.source_promotion = v_f->>'source')
        and (coalesce(v_f->>'employment', '') = '' or m.employment_status = v_f->>'employment')
        and (coalesce(v_f->>'lead', '') = '' or lower(m.convertibility) like lower(v_f->>'lead') || '%')
        and (coalesce(v_f->>'rep', '') = '' or m.added_by = (v_f->>'rep')::uuid)
        and (coalesce(v_f->>'coach', '') = '' or m.trainer_id = (v_f->>'coach')::uuid)
        and (coalesce(v_f->>'batch', '') = '' or exists (select 1 from public.batch_members bm where bm.member_id = m.id and bm.batch_id = (v_f->>'batch')::uuid))
        and (jsonb_array_length(coalesce(v_f->'ages', '[]')) = 0 or app.age_group(m.date_of_birth, v_today) in (select jsonb_array_elements_text(v_f->'ages')))
        and (jsonb_array_length(coalesce(v_f->'lead_status', '[]')) = 0 or m.lead_status in (select jsonb_array_elements_text(v_f->'lead_status')))
        and (coalesce(v_f->>'search', '') = '' or m.full_name ilike '%' || (v_f->>'search') || '%' or m.phone like '%' || (v_f->>'search') || '%'
             or m.email ilike '%' || (v_f->>'search') || '%')
    )
    select coalesce(jsonb_agg(jsonb_build_object('member_id', id, 'name', full_name, 'code', code, 'country_code', country_code, 'phone', phone, 'email', email,
             'gender', gender, 'kind', kind, 'coach', coach, 'count', n, 'first_date', first_d, 'first_weight', first_w, 'last_date', last_d, 'last_weight', last_w,
             'lost', round(first_w - last_w, 2), 'lost_pct', round((first_w - last_w) * 100 / nullif(first_w, 0), 1),
             'waist_lost', round(first_waist - last_waist, 2)) order by (first_w - last_w) desc, full_name), '[]'::jsonb)
    from rows_
  );
end $$;

-- ---------------------------------------------------------------------------
-- Progress photos: private files, <studio_id>/<member_id>/<file>
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
  execute $p$ drop policy if exists progress_photos_read on storage.objects $p$;
  execute $p$ create policy progress_photos_read on storage.objects for select to authenticated
    using (bucket_id = 'progress-photos' and (app.is_owner((split_part(name, '/', 1))::uuid)
           or app.in_care_team((split_part(name, '/', 2))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
  execute $p$ drop policy if exists progress_photos_write on storage.objects $p$;
  execute $p$ create policy progress_photos_write on storage.objects for insert to authenticated
    with check (bucket_id = 'progress-photos' and (app.trains_member((split_part(name, '/', 2))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
  execute $p$ drop policy if exists progress_photos_delete on storage.objects $p$;
  execute $p$ create policy progress_photos_delete on storage.objects for delete to authenticated
    using (bucket_id = 'progress-photos' and (app.is_owner((split_part(name, '/', 1))::uuid) or app.is_self((split_part(name, '/', 2))::uuid))) $p$;
end $$;

-- ---------------------------------------------------------------------------
-- The general exercise list (names, type and body part; studios add pictures and their own)
-- ---------------------------------------------------------------------------
insert into public.exercises (studio_id, name, exercise_type, body_part, equipment)
select null, x.name, x.t, x.b, x.e from (values
  ('Barbell Bench Press (Flat)', 'Weight Training', 'Chest', 'Barbell'), ('Barbell Bench Press (Incline)', 'Weight Training', 'Chest', 'Barbell'),
  ('Barbell Bench Press (Decline)', 'Weight Training', 'Chest', 'Barbell'), ('Dumbbell Bench Press (Flat)', 'Weight Training', 'Chest', 'Dumbbells'),
  ('Dumbbell Bench Press (Incline)', 'Weight Training', 'Chest', 'Dumbbells'), ('Dumbbell Fly (Flat)', 'Weight Training', 'Chest', 'Dumbbells'),
  ('Dumbbell Fly (Incline)', 'Weight Training', 'Chest', 'Dumbbells'), ('Cable Crossover', 'Weight Training', 'Chest', 'Cable'),
  ('Pec Deck', 'Weight Training', 'Chest', 'Machine'), ('Chest Press Machine', 'Weight Training', 'Chest', 'Machine'),
  ('Dumbbell Pullover', 'Weight Training', 'Chest', 'Dumbbell'), ('Push-up', 'Free Body', 'Chest', null), ('Incline Push-up', 'Free Body', 'Chest', null),
  ('Decline Push-up', 'Free Body', 'Chest', null), ('Chest Dips', 'Free Body', 'Chest', 'Dip bars'),
  ('Lat Pull Down (Wide Grip)', 'Weight Training', 'Back', 'Cable'), ('Lat Pull Down (Close Grip)', 'Weight Training', 'Back', 'Cable'),
  ('Seated Cable Row', 'Weight Training', 'Back', 'Cable'), ('Bent Over Barbell Row', 'Weight Training', 'Back', 'Barbell'),
  ('Bent Over Dumbbell Row', 'Weight Training', 'Back', 'Dumbbells'), ('Single Arm Dumbbell Row', 'Weight Training', 'Back', 'Dumbbell'),
  ('T-Bar Row', 'Weight Training', 'Back', 'Barbell'), ('Machine Row', 'Weight Training', 'Back', 'Machine'), ('Pull-up', 'Free Body', 'Back', 'Pull-up bar'),
  ('Chin-up', 'Free Body', 'Back', 'Pull-up bar'), ('Assisted Pull-up', 'Weight Training', 'Back', 'Machine'), ('Deadlift', 'Strength Training', 'Back', 'Barbell'),
  ('Rack Pull', 'Strength Training', 'Back', 'Barbell'), ('Straight Arm Pulldown', 'Weight Training', 'Back', 'Cable'),
  ('Back Extension', 'Weight Training', 'Lower Back', 'Hyperextension bench'), ('Good Morning', 'Weight Training', 'Lower Back', 'Barbell'),
  ('Barbell Overhead Press', 'Weight Training', 'Shoulder', 'Barbell'), ('Dumbbell Shoulder Press', 'Weight Training', 'Shoulder', 'Dumbbells'),
  ('Arnold Press', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Machine Shoulder Press', 'Weight Training', 'Shoulder', 'Machine'),
  ('Dumbbell Lateral Raise', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Cable Lateral Raise', 'Weight Training', 'Shoulder', 'Cable'),
  ('Dumbbell Front Raise', 'Weight Training', 'Shoulder', 'Dumbbells'), ('Rear Delt Fly', 'Weight Training', 'Shoulder', 'Dumbbells'),
  ('Reverse Pec Deck', 'Weight Training', 'Shoulder', 'Machine'), ('Upright Row', 'Weight Training', 'Shoulder', 'Barbell'), ('Face Pull', 'Weight Training', 'Shoulder', 'Cable'),
  ('Barbell Shrug', 'Weight Training', 'Traps', 'Barbell'), ('Dumbbell Shrug', 'Weight Training', 'Traps', 'Dumbbells'),
  ('Barbell Biceps Curl', 'Weight Training', 'Biceps', 'Barbell'), ('EZ Bar Curl', 'Weight Training', 'Biceps', 'EZ bar'),
  ('Dumbbell Biceps Curl', 'Weight Training', 'Biceps', 'Dumbbells'), ('Dumbbell Hammer Curl', 'Weight Training', 'Biceps', 'Dumbbells'),
  ('Preacher Curl', 'Weight Training', 'Biceps', 'EZ bar'), ('Concentration Curl', 'Weight Training', 'Biceps', 'Dumbbell'),
  ('Incline Dumbbell Curl', 'Weight Training', 'Biceps', 'Dumbbells'), ('Cable Biceps Curl', 'Weight Training', 'Biceps', 'Cable'),
  ('Triceps Pushdown (Rope)', 'Weight Training', 'Triceps', 'Cable'), ('Triceps Pushdown (Bar)', 'Weight Training', 'Triceps', 'Cable'),
  ('Overhead Dumbbell Triceps Extension', 'Weight Training', 'Triceps', 'Dumbbell'), ('Skull Crusher', 'Weight Training', 'Triceps', 'EZ bar'),
  ('Close Grip Bench Press', 'Weight Training', 'Triceps', 'Barbell'), ('Bench Dips', 'Free Body', 'Triceps', 'Bench'),
  ('Triceps Kickback', 'Weight Training', 'Triceps', 'Dumbbell'), ('Cable Overhead Triceps Extension', 'Weight Training', 'Triceps', 'Cable'),
  ('Wrist Curl', 'Weight Training', 'Forearms', 'Dumbbells'), ('Reverse Wrist Curl', 'Weight Training', 'Forearms', 'Dumbbells'),
  ('Farmer''s Walk', 'Functional', 'Forearms', 'Dumbbells'),
  ('Barbell Back Squat', 'Strength Training', 'Quadriceps', 'Barbell'), ('Front Squat', 'Strength Training', 'Quadriceps', 'Barbell'),
  ('Goblet Squat', 'Weight Training', 'Quadriceps', 'Dumbbell'), ('Leg Press', 'Weight Training', 'Quadriceps', 'Machine'),
  ('Hack Squat', 'Weight Training', 'Quadriceps', 'Machine'), ('Leg Extension', 'Weight Training', 'Quadriceps', 'Machine'),
  ('Bodyweight Squat', 'Free Body', 'Quadriceps', null), ('Sumo Squat', 'Weight Training', 'Full Legs', 'Dumbbell'),
  ('Walking Lunges', 'Weight Training', 'Full Legs', 'Dumbbells'), ('Bulgarian Split Squat', 'Weight Training', 'Full Legs', 'Dumbbells'),
  ('Step-up', 'Weight Training', 'Full Legs', 'Box'), ('Romanian Deadlift', 'Weight Training', 'Hamstrings', 'Barbell'),
  ('Lying Leg Curl', 'Weight Training', 'Hamstrings', 'Machine'), ('Seated Leg Curl', 'Weight Training', 'Hamstrings', 'Machine'),
  ('Standing Calf Raise', 'Weight Training', 'Calves', 'Machine'), ('Seated Calf Raise', 'Weight Training', 'Calves', 'Machine'),
  ('Hip Thrust', 'Weight Training', 'Glutes', 'Barbell'), ('Glute Bridge', 'Free Body', 'Glutes', null), ('Cable Glute Kickback', 'Weight Training', 'Glutes', 'Cable'),
  ('Hip Abduction Machine', 'Weight Training', 'Glutes', 'Machine'), ('Hip Adduction Machine', 'Weight Training', 'Full Legs', 'Machine'),
  ('Crunches', 'Core', 'Abs', null), ('Bicycle Crunch', 'Core', 'Abs', null), ('Reverse Crunch', 'Core', 'Abs', null), ('Cable Crunch', 'Core', 'Abs', 'Cable'),
  ('Plank', 'Core', 'Abs', null), ('Side Plank', 'Core', 'Abs', null), ('Hanging Leg Raise', 'Core', 'Abs', 'Pull-up bar'), ('Lying Leg Raise', 'Core', 'Abs', null),
  ('Russian Twist', 'Core', 'Abs', null), ('Ab Wheel Rollout', 'Core', 'Abs', 'Ab wheel'), ('Dead Bug', 'Core', 'Abs', null), ('Bird Dog', 'Core', 'Lower Back', null),
  ('Flutter Kicks', 'Core', 'Abs', null), ('V-up', 'Core', 'Abs', null), ('Mountain Climbers', 'Core', 'Full Body', null),
  ('Treadmill Walk', 'Cardio', 'Cardio', 'Treadmill'), ('Treadmill Run', 'Cardio', 'Cardio', 'Treadmill'), ('Exercise Bike', 'Cardio', 'Cardio', 'Bike'),
  ('Spin Bike', 'Cardio', 'Cardio', 'Spin bike'), ('Cross Trainer', 'Cardio', 'Cardio', 'Elliptical'), ('Rowing Machine', 'Cardio', 'Cardio', 'Rower'),
  ('Stair Climber', 'Cardio', 'Cardio', 'Stair climber'), ('Skipping Rope', 'Cardio', 'Cardio', 'Rope'), ('Jumping Jacks', 'Cardio', 'Full Body', null),
  ('Burpees', 'Cardio', 'Full Body', null), ('High Knees', 'Cardio', 'Cardio', null), ('Butt Kicks', 'Cardio', 'Cardio', null),
  ('Box Jumps', 'Functional', 'Full Legs', 'Box'), ('Battle Ropes', 'Functional', 'Full Body', 'Battle ropes'), ('Kettlebell Swing', 'Functional', 'Full Body', 'Kettlebell'),
  ('Kettlebell Goblet Squat', 'Functional', 'Quadriceps', 'Kettlebell'), ('Sled Push', 'Functional', 'Full Body', 'Sled'), ('Medicine Ball Slam', 'Functional', 'Full Body', 'Medicine ball'),
  ('Wall Ball', 'Functional', 'Full Body', 'Medicine ball'), ('Turkish Get-up', 'Functional', 'Full Body', 'Kettlebell'), ('TRX Row', 'Functional', 'Back', 'Suspension trainer'),
  ('Bear Crawl', 'Functional', 'Full Body', null),
  ('Hamstring Stretch', 'Stretching', 'Hamstrings', null), ('Quadriceps Stretch', 'Stretching', 'Quadriceps', null), ('Chest Stretch', 'Stretching', 'Chest', null),
  ('Shoulder Stretch', 'Stretching', 'Shoulder', null), ('Triceps Stretch', 'Stretching', 'Triceps', null), ('Cat-Cow Stretch', 'Stretching', 'Lower Back', null),
  ('Hip Flexor Stretch', 'Stretching', 'Glutes', null), ('Calf Stretch', 'Stretching', 'Calves', null), ('Cobra Stretch', 'Stretching', 'Abs', null),
  ('Butterfly Stretch', 'Stretching', 'Full Legs', null), ('Neck Stretch', 'Stretching', 'Neck', null), ('Child''s Pose', 'Stretching', 'Lower Back', null),
  ('Surya Namaskar', 'Yoga', 'Full Body', null), ('Tadasana', 'Yoga', 'Full Body', null), ('Vrikshasana', 'Yoga', 'Full Legs', null),
  ('Bhujangasana', 'Yoga', 'Lower Back', null), ('Trikonasana', 'Yoga', 'Full Body', null), ('Adho Mukha Svanasana', 'Yoga', 'Full Body', null),
  ('Setu Bandhasana', 'Yoga', 'Glutes', null), ('Shavasana', 'Meditation & Relaxation', 'Full Body', null),
  ('Anulom Vilom', 'Meditation & Relaxation', 'Full Body', null), ('Kapalbhati', 'Meditation & Relaxation', 'Abs', null)
) as x(name, t, b, e)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- The general food list: typical values for the stated quantity (check packaged foods against their label)
-- ---------------------------------------------------------------------------
insert into public.foods (studio_id, name, quantity, unit, calories, protein, fats, carbs, fibre, is_veg, is_verified)
select null, x.name, x.q, x.u, x.kcal, x.p, x.f, x.c, x.fi, x.veg, true from (values
  ('Rice, white (cooked)', 100, 'g', 130, 2.7, 0.3, 28.2, 0.4, true), ('Rice, brown (cooked)', 100, 'g', 112, 2.3, 0.8, 23.5, 1.8, true),
  ('Phulka / roti (no oil)', 1, 'piece', 85, 3.1, 0.4, 17.6, 2.6, true), ('Chapati (with oil)', 1, 'piece', 120, 3.5, 3.5, 18.5, 2.8, true),
  ('Idli', 1, 'piece', 58, 1.6, 0.4, 12.0, 0.6, true), ('Plain dosa', 1, 'piece', 165, 3.9, 4.8, 26.5, 1.1, true),
  ('Upma', 100, 'g', 115, 2.9, 4.3, 16.5, 1.4, true), ('Poha (cooked)', 100, 'g', 130, 2.5, 3.5, 22.0, 1.0, true),
  ('Oats (dry)', 100, 'g', 389, 16.9, 6.9, 66.3, 10.6, true), ('Brown bread', 1, 'slice', 70, 3.0, 1.0, 12.0, 1.9, true),
  ('White bread', 1, 'slice', 66, 2.3, 0.8, 12.5, 0.6, true), ('Ragi flour', 100, 'g', 328, 7.3, 1.3, 72.0, 11.5, true),
  ('Moong dal (cooked)', 100, 'g', 105, 7.0, 0.4, 19.2, 7.6, true), ('Masoor dal (cooked)', 100, 'g', 116, 9.0, 0.4, 20.1, 7.9, true),
  ('Toor dal (cooked)', 100, 'g', 121, 6.8, 0.4, 23.3, 6.7, true), ('Chickpeas / chana (boiled)', 100, 'g', 164, 8.9, 2.6, 27.4, 7.6, true),
  ('Rajma (boiled)', 100, 'g', 127, 8.7, 0.5, 22.8, 6.4, true), ('Moong sprouts', 100, 'g', 30, 3.0, 0.2, 5.9, 1.8, true),
  ('Soya chunks (dry)', 100, 'g', 345, 52.0, 0.5, 33.0, 13.0, true), ('Roasted chana', 100, 'g', 369, 22.5, 5.2, 58.1, 16.8, true),
  ('Peanuts (raw)', 100, 'g', 567, 25.8, 49.2, 16.1, 8.5, true),
  ('Egg, whole', 1, 'piece', 72, 6.3, 4.8, 0.4, 0, false), ('Egg white', 1, 'piece', 17, 3.6, 0.1, 0.2, 0, false),
  ('Milk, toned', 100, 'ml', 58, 3.1, 3.0, 4.7, 0, true), ('Milk, whole (cow)', 100, 'ml', 61, 3.2, 3.3, 4.8, 0, true),
  ('Curd / dahi', 100, 'g', 61, 3.5, 3.3, 4.7, 0, true), ('Greek yogurt, plain (non-fat)', 100, 'g', 59, 10.2, 0.4, 3.6, 0, true),
  ('Paneer', 100, 'g', 265, 18.3, 20.8, 1.2, 0, true), ('Buttermilk / chaas', 100, 'ml', 40, 3.3, 0.9, 4.8, 0, true),
  ('Ghee', 1, 'tsp', 45, 0, 5.0, 0, 0, true), ('Butter', 10, 'g', 72, 0.1, 8.1, 0, 0, true),
  ('Whey protein (check your brand)', 1, 'scoop', 120, 24.0, 1.5, 3.0, 0, true),
  ('Chicken breast (cooked)', 100, 'g', 165, 31.0, 3.6, 0, 0, false), ('Mutton / goat (cooked)', 100, 'g', 143, 27.1, 3.0, 0, 0, false),
  ('Fish fillet, lean (cooked)', 100, 'g', 128, 26.2, 2.7, 0, 0, false), ('Prawns (cooked)', 100, 'g', 99, 24.0, 0.3, 0.2, 0, false),
  ('Banana', 1, 'piece', 105, 1.3, 0.4, 27.0, 3.1, true), ('Apple', 1, 'piece', 95, 0.5, 0.3, 25.0, 4.4, true),
  ('Orange', 1, 'piece', 62, 1.2, 0.2, 15.4, 3.1, true), ('Papaya', 100, 'g', 43, 0.5, 0.3, 10.8, 1.7, true),
  ('Watermelon', 100, 'g', 30, 0.6, 0.2, 7.6, 0.4, true), ('Guava', 100, 'g', 68, 2.6, 1.0, 14.3, 5.4, true),
  ('Mango', 100, 'g', 60, 0.8, 0.4, 15.0, 1.6, true), ('Pomegranate', 100, 'g', 83, 1.7, 1.2, 18.7, 4.0, true),
  ('Grapes', 100, 'g', 69, 0.7, 0.2, 18.1, 0.9, true), ('Pineapple', 100, 'g', 50, 0.5, 0.1, 13.1, 1.4, true),
  ('Dates', 100, 'g', 282, 2.5, 0.4, 75.0, 8.0, true),
  ('Spinach', 100, 'g', 23, 2.9, 0.4, 3.6, 2.2, true), ('Broccoli', 100, 'g', 34, 2.8, 0.4, 6.6, 2.6, true),
  ('Cucumber', 100, 'g', 15, 0.7, 0.1, 3.6, 0.5, true), ('Tomato', 100, 'g', 18, 0.9, 0.2, 3.9, 1.2, true),
  ('Carrot', 100, 'g', 41, 0.9, 0.2, 9.6, 2.8, true), ('Onion', 100, 'g', 40, 1.1, 0.1, 9.3, 1.7, true),
  ('Potato (boiled)', 100, 'g', 87, 1.9, 0.1, 20.1, 1.8, true), ('Sweet potato (boiled)', 100, 'g', 76, 1.4, 0.1, 17.7, 2.5, true),
  ('Beetroot', 100, 'g', 43, 1.6, 0.2, 9.6, 2.8, true), ('Cabbage', 100, 'g', 25, 1.3, 0.1, 5.8, 2.5, true),
  ('Cauliflower', 100, 'g', 25, 1.9, 0.3, 5.0, 2.0, true), ('Green beans', 100, 'g', 31, 1.8, 0.2, 7.0, 2.7, true),
  ('Okra / bhindi', 100, 'g', 33, 1.9, 0.2, 7.5, 3.2, true), ('Bottle gourd / lauki', 100, 'g', 14, 0.6, 0, 3.4, 0.5, true),
  ('Mushroom', 100, 'g', 22, 3.1, 0.3, 3.3, 1.0, true), ('Green peas (boiled)', 100, 'g', 84, 5.4, 0.2, 15.6, 5.5, true),
  ('Sweet corn (boiled)', 100, 'g', 96, 3.4, 1.5, 21.0, 2.4, true),
  ('Almonds', 100, 'g', 579, 21.2, 49.9, 21.6, 12.5, true), ('Walnuts', 100, 'g', 654, 15.2, 65.2, 13.7, 6.7, true),
  ('Cashews', 100, 'g', 553, 18.2, 43.9, 30.2, 3.3, true), ('Flax seeds', 100, 'g', 534, 18.3, 42.2, 28.9, 27.3, true),
  ('Chia seeds', 100, 'g', 486, 16.5, 30.7, 42.1, 34.4, true), ('Pumpkin seeds', 100, 'g', 559, 30.2, 49.1, 10.7, 6.0, true),
  ('Peanut butter', 100, 'g', 588, 25.1, 50.4, 19.6, 6.0, true),
  ('Cooking oil', 1, 'tsp', 45, 0, 5.0, 0, 0, true), ('Sugar', 1, 'tsp', 20, 0, 0, 5.0, 0, true), ('Honey', 1, 'tbsp', 64, 0.1, 0, 17.3, 0, true),
  ('Jaggery', 100, 'g', 383, 0.4, 0.1, 95.0, 0, true), ('Tea with milk and 1 tsp sugar', 1, 'cup', 64, 2.3, 2.3, 8.5, 0, true),
  ('Black coffee', 1, 'cup', 2, 0.3, 0, 0, 0, true), ('Coconut water', 100, 'ml', 19, 0.7, 0.2, 3.7, 1.1, true)
) as x(name, q, u, kcal, p, f, c, fi, veg)
on conflict do nothing;

call app.apply_grants();
