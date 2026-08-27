-- Historial de fechas en que una cuenta se quemó (una cuenta con cobro recurrente
-- puede quemarse, reestablecerse sola con el siguiente cobro, y quemarse otra vez).
alter table public.accounts add column if not exists burned_dates jsonb not null default '[]'::jsonb;
