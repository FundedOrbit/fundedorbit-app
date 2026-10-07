-- Calendario de Cumplimiento: reglas propias del usuario + registro diario.
-- Datos privados: cada usuario solo ve y edita los suyos (RLS).

create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists compliance_rules_user_idx on public.compliance_rules(user_id);
alter table public.compliance_rules enable row level security;

drop policy if exists "compliance_rules_select_own" on public.compliance_rules;
create policy "compliance_rules_select_own" on public.compliance_rules for select using (auth.uid() = user_id);
drop policy if exists "compliance_rules_insert_own" on public.compliance_rules;
create policy "compliance_rules_insert_own" on public.compliance_rules for insert with check (auth.uid() = user_id);
drop policy if exists "compliance_rules_delete_own" on public.compliance_rules;
create policy "compliance_rules_delete_own" on public.compliance_rules for delete using (auth.uid() = user_id);

create table if not exists public.compliance_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  followed_plan boolean not null default true,
  result text not null check (result in ('positive','negative')),
  mood text,
  note text,
  broken_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists compliance_days_user_day_idx on public.compliance_days(user_id, day);
alter table public.compliance_days enable row level security;

drop policy if exists "compliance_days_select_own" on public.compliance_days;
create policy "compliance_days_select_own" on public.compliance_days for select using (auth.uid() = user_id);
drop policy if exists "compliance_days_insert_own" on public.compliance_days;
create policy "compliance_days_insert_own" on public.compliance_days for insert with check (auth.uid() = user_id);
drop policy if exists "compliance_days_update_own" on public.compliance_days;
create policy "compliance_days_update_own" on public.compliance_days for update using (auth.uid() = user_id);
drop policy if exists "compliance_days_delete_own" on public.compliance_days;
create policy "compliance_days_delete_own" on public.compliance_days for delete using (auth.uid() = user_id);
