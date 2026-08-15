-- Cuentas de trading fondeado, una fila por cuenta, ligada al usuario dueño.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  account_id text,
  company text,
  account_type text,
  size text,
  method text,
  status text not null default 'activa', -- activa | pasada | live | quemada

  purchase_date date,
  purchase_cost numeric not null default 0,
  activation_fee numeric not null default 0,
  passed_date date,
  burned_date date,

  banned boolean not null default false,
  ban_date date,
  ban_reason text,

  cancelled boolean not null default false,
  cancelled_date date,

  recurring boolean not null default false,

  notes text,

  resets jsonb not null default '[]'::jsonb,       -- [{date, cost}]
  extra_ids jsonb not null default '[]'::jsonb,     -- [{label, id}]
  withdrawals jsonb not null default '[]'::jsonb,   -- [{status, requestDate, receivedDate, amount, denialReason}]

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);

alter table public.accounts enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own"
  on public.accounts for select
  using (auth.uid() = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
  on public.accounts for update
  using (auth.uid() = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- updated_at automático en cada edición
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute procedure public.set_updated_at();
