-- Income from the years before the cabinet existed: one row per month, no clients, no shoots.
-- It feeds the charts and the "усе" totals; taxes keep counting real payments only.
create table if not exists legacy_income (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month    date not null,
  amount   numeric(12,2) not null,
  note     text,
  primary key (owner_id, month)
);
alter table legacy_income enable row level security;
alter table legacy_income force row level security;
drop policy if exists legacy_income_owner_select on legacy_income;
drop policy if exists legacy_income_owner_insert on legacy_income;
drop policy if exists legacy_income_owner_update on legacy_income;
drop policy if exists legacy_income_owner_delete on legacy_income;
create policy legacy_income_owner_select on legacy_income for select to authenticated using (owner_id = auth.uid());
create policy legacy_income_owner_insert on legacy_income for insert to authenticated with check (owner_id = auth.uid());
create policy legacy_income_owner_update on legacy_income for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy legacy_income_owner_delete on legacy_income for delete to authenticated using (owner_id = auth.uid());

create or replace view v_income_monthly with (security_invoker = true) as
select owner_id, month, sum(income)::numeric(12,2) as income, sum(payments)::bigint as payments
from (
  select owner_id, date_trunc('month', paid_on)::date as month, sum(amount) as income, count(*) as payments
  from payments group by owner_id, date_trunc('month', paid_on)
  union all
  select owner_id, date_trunc('month', month)::date as month, sum(amount) as income, 0 as payments
  from legacy_income group by owner_id, date_trunc('month', month)
) t
group by owner_id, month;

insert into legacy_income (owner_id, month, amount)
select s.owner_id, v.m::date, v.a
from settings s,
  (values
    ('2024-01-01',62000),('2024-02-01',239000),('2024-03-01',212000),('2024-04-01',111000),
    ('2024-05-01',152000),('2024-06-01',100000),('2024-07-01',110000),('2024-08-01',270000),
    ('2024-09-01',143000),('2024-10-01',125000),('2024-11-01',178000),('2024-12-01',117000),
    ('2025-01-01',77000),('2025-02-01',143000),('2025-03-01',97000),('2025-04-01',145000),
    ('2025-05-01',166000),('2025-06-01',180000),('2025-07-01',30000),('2025-08-01',245000),
    ('2025-09-01',335000),('2025-10-01',149000),('2025-11-01',105000),('2025-12-01',45000)
  ) as v(m, a)
on conflict (owner_id, month) do update set amount = excluded.amount;
