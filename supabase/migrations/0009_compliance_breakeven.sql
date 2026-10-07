alter table public.compliance_days drop constraint if exists compliance_days_result_check;
alter table public.compliance_days add constraint compliance_days_result_check check (result in ('positive','negative','breakeven'));
