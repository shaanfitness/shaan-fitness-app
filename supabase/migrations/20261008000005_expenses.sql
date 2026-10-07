-- Shaan Fitness app · 5. Expenses and vendors (YDL expense and vendor pages)

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  contact_name text not null,
  phone1 text,
  phone2 text,
  gst_no text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  vendor_id uuid references public.vendors(id) on delete set null,
  category text not null,
  expense_date date not null default current_date,
  payment_type text not null,
  amount numeric(12,2) not null check (amount >= 0),
  gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  gst_no text,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_studio_date_idx on public.expenses (studio_id, expense_date);

create or replace function app.fill_created_by()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then new.created_by = app.my_staff_id(new.studio_id); end if;
  return new;
end $$;
create trigger expenses_fill before insert on public.expenses for each row execute function app.fill_created_by();
create trigger expenses_log after insert or update or delete on public.expenses for each row execute function app.log_activity();

alter table public.vendors enable row level security;
alter table public.expenses enable row level security;
create policy vendors_owner on public.vendors for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));
create policy expenses_owner on public.expenses for all to authenticated using (app.is_owner(studio_id)) with check (app.is_owner(studio_id));

call app.apply_grants();
