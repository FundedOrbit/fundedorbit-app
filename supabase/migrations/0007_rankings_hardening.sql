-- El ranking de empresas se quedaba vacío porque la consulta tronaba en
-- silencio: convertíamos requestDate/receivedDate/amount directamente a
-- date/numeric, y en la práctica muchos retiros tienen esos campos en
-- blanco ("") en vez de nulos (por ejemplo, la fecha de solicitud es
-- opcional). Convertir "" directo a date/numeric es un error en Postgres,
-- y ese error tronaba TODA la consulta para TODOS los usuarios, no solo
-- para la cuenta con el dato incompleto. Esta versión usa nullif(x,'') para
-- tratar los campos vacíos como "sin dato" en vez de reventar la consulta.

create or replace function public.get_trader_rankings()
returns table (
  rank bigint,
  nickname text,
  avatar text,
  country text,
  roi numeric,
  withdrawals bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with per_account as (
    select
      a.user_id,
      a.purchase_cost
        + a.activation_fee
        + coalesce((
            select sum(nullif(r->>'cost', '')::numeric)
            from jsonb_array_elements(a.resets) r
          ), 0)
        + case
            when a.recurring and a.purchase_date is not null then
              greatest(0, (
                select count(*)::numeric
                from generate_series(
                  (a.purchase_date + interval '1 month')::date,
                  coalesce(a.passed_date, case when a.cancelled then a.cancelled_date end, current_date),
                  interval '1 month'
                ) gs
              )) * a.purchase_cost
            else 0
          end as invested,
      coalesce((
        select sum(nullif(w->>'amount', '')::numeric)
        from jsonb_array_elements(a.withdrawals) w
        where (w->>'status') = 'recibido'
      ), 0) as withdrawn,
      coalesce((
        select count(*)
        from jsonb_array_elements(a.withdrawals) w
        where (w->>'status') = 'recibido' and coalesce(nullif(w->>'amount', '')::numeric, 0) > 0
      ), 0) as wd_count
    from public.accounts a
  ),
  per_user as (
    select
      user_id,
      sum(invested) as total_invested,
      sum(withdrawn) as total_withdrawn,
      sum(wd_count) as total_wd_count
    from per_account
    group by user_id
  )
  select
    row_number() over (order by
      case when u.total_invested > 0 then ((u.total_withdrawn - u.total_invested) / u.total_invested) * 100 else 0 end desc
    ) as rank,
    coalesce(p.nickname, 'Trader') as nickname,
    coalesce(p.avatar, '🚀') as avatar,
    coalesce(p.country, '🌎') as country,
    round(case when u.total_invested > 0 then ((u.total_withdrawn - u.total_invested) / u.total_invested) * 100 else 0 end, 1) as roi,
    u.total_wd_count as withdrawals
  from per_user u
  join public.profiles p on p.id = u.user_id
  where u.total_invested > 0
  order by roi desc
  limit 100;
$$;

grant execute on function public.get_trader_rankings() to anon, authenticated;

create or replace function public.get_company_rankings()
returns table (
  rank bigint,
  company text,
  "avgDaysToPay" numeric,
  "totalWithdrawals" bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with wd as (
    select
      a.company,
      nullif(w->>'requestDate', '')::date as request_date,
      nullif(w->>'receivedDate', '')::date as received_date
    from public.accounts a,
      jsonb_array_elements(a.withdrawals) w
    where (w->>'status') = 'recibido'
      and a.company is not null and btrim(a.company) <> ''
  ),
  by_company as (
    select
      company,
      avg(received_date - request_date) filter (where request_date is not null and received_date is not null) as avg_days,
      count(*) as total_wd
    from wd
    group by company
  )
  select
    row_number() over (order by total_wd desc) as rank,
    company,
    round(avg_days, 1) as "avgDaysToPay",
    total_wd as "totalWithdrawals"
  from by_company
  order by total_wd desc
  limit 50;
$$;

grant execute on function public.get_company_rankings() to authenticated;
