-- Motor de insights: hitos permanentes (badges) y log de insights tipo "evento" (para cooldown/dedupe).

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists milestones_user_id_idx on public.milestones(user_id);

alter table public.milestones enable row level security;

drop policy if exists "milestones_select_own" on public.milestones;
create policy "milestones_select_own"
  on public.milestones for select
  using (auth.uid() = user_id);

drop policy if exists "milestones_insert_own" on public.milestones;
create policy "milestones_insert_own"
  on public.milestones for insert
  with check (auth.uid() = user_id);

-- log de insights tipo "evento" (records, hitos puntuales) para no repetir la misma alerta todos los dias
create table if not exists public.insight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null,
  last_shown_at timestamptz not null default now(),
  unique (user_id, insight_key)
);

create index if not exists insight_log_user_id_idx on public.insight_log(user_id);

alter table public.insight_log enable row level security;

drop policy if exists "insight_log_select_own" on public.insight_log;
create policy "insight_log_select_own"
  on public.insight_log for select
  using (auth.uid() = user_id);

drop policy if exists "insight_log_insert_own" on public.insight_log;
create policy "insight_log_insert_own"
  on public.insight_log for insert
  with check (auth.uid() = user_id);

drop policy if exists "insight_log_update_own" on public.insight_log;
create policy "insight_log_update_own"
  on public.insight_log for update
  using (auth.uid() = user_id);

-- IMPORTANTE: los GRANT son necesarios ademas de las politicas RLS de arriba.
grant select, insert, update on public.milestones to authenticated;
grant select, insert, update on public.insight_log to authenticated;
