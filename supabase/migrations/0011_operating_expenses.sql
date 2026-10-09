-- Gastos operativos (mentorías, plataformas, copiadores, etc.) y categorías propias del usuario.
-- Datos privados por usuario (RLS).

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists expense_categories_user_idx on public.expense_categories(user_id);
alter table public.expense_categories enable row level security;

drop policy if exists "expense_categories_select_own" on public.expense_categories;
create policy "expense_categories_select_own" on public.expense_categories for select using (auth.uid() = user_id);
drop policy if exists "expense_categories_insert_own" on public.expense_categories;
create policy "expense_categories_insert_own" on public.expense_categories for insert with check (auth.uid() = user_id);
drop policy if exists "expense_categories_delete_own" on public.expense_categories;
create policy "expense_categories_delete_own" on public.expense_categories for delete using (auth.uid() = user_id);

create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  amount numeric not null default 0,
  expense_date date not null,
  recurring boolean not null default false,
  cancelled_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists operating_expenses_user_idx on public.operating_expenses(user_id, expense_date);
alter table public.operating_expenses enable row level security;

drop policy if exists "operating_expenses_select_own" on public.operating_expenses;
create policy "operating_expenses_select_own" on public.operating_expenses for select using (auth.uid() = user_id);
drop policy if exists "operating_expenses_insert_own" on public.operating_expenses;
create policy "operating_expenses_insert_own" on public.operating_expenses for insert with check (auth.uid() = user_id);
drop policy if exists "operating_expenses_update_own" on public.operating_expenses;
create policy "operating_expenses_update_own" on public.operating_expenses for update using (auth.uid() = user_id);
drop policy if exists "operating_expenses_delete_own" on public.operating_expenses;
create policy "operating_expenses_delete_own" on public.operating_expenses for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.expense_categories to authenticated;
grant select, insert, update, delete on public.operating_expenses to authenticated;
notify pgrst, 'reload schema';
