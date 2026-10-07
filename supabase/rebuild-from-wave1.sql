-- One-time step: removes the first test version of the database (wave 1) so the
-- YDL-model database can be built in its place. It only runs if the wave-1 tables
-- are there, and it stops without changing anything if any member or payment exists.
-- Logins (auth.users) are kept; they're linked again by the setup.
do $$
begin
  if to_regclass('public.cycles') is null then
    raise notice 'No wave-1 tables found; nothing to remove.';
    return;
  end if;
  if exists (select 1 from public.members) or exists (select 1 from public.payments) then
    raise exception 'Stopped: this database already has members or payments. Nothing was changed.';
  end if;
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'drop view if exists public.cycle_overview cascade';
  execute 'drop function if exists public.care_progress() cascade';
  execute 'drop table if exists public.activity_log, public.banners, public.follow_ups, public.leads, public.expenses,
    public.payments, public.attendance, public.bookings, public.slots, public.extensions, public.freezes, public.cycles,
    public.plans, public.member_health, public.care_team, public.members, public.staff, public.profiles, public.studios cascade';
  execute 'drop schema if exists app cascade';
  execute 'drop type if exists public.staff_role, public.member_status, public.cycle_status, public.plan_tier,
    public.attendance_status, public.payment_method, public.lead_stage, public.lead_temperature, public.followup_status,
    public.care_role, public.request_status, public.doctor_decision cascade';
  raise notice 'Wave-1 tables removed.';
end $$;
