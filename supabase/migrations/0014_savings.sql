-- Відкладені: money set aside each month, kept in euro or dollars.
-- The hryvnia equivalent is stored so savings can be compared with income.
create table if not exists savings (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month      date not null,
  currency   text not null check (currency in ('EUR','USD')),
  amount     numeric(12,2) not null check (amount > 0),
  rate       numeric(12,4) not null check (rate > 0),
  uah        numeric(14,2) generated always as (round(amount * rate, 2)) stored,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists savings_owner_month on savings (owner_id, month);

alter table savings enable row level security;
alter table savings force row level security;
drop policy if exists savings_owner_select on savings;
drop policy if exists savings_owner_insert on savings;
drop policy if exists savings_owner_update on savings;
drop policy if exists savings_owner_delete on savings;
create policy savings_owner_select on savings for select to authenticated using (owner_id = auth.uid());
create policy savings_owner_insert on savings for insert to authenticated with check (owner_id = auth.uid());
create policy savings_owner_update on savings for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy savings_owner_delete on savings for delete to authenticated using (owner_id = auth.uid());
