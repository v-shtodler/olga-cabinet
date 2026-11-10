-- Analytics views. All are security_invoker so RLS of the base tables applies.

-- Per-shoot derived numbers
create or replace view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  coalesce(p.paid, 0)::numeric(12,2)                       as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2)           as balance,
  (s.date + s.delivery_days)                               as deadline,
  (s.shoot_hours + s.retouch_hours + s.prep_hours)         as total_hours,
  case when (s.shoot_hours + s.retouch_hours + s.prep_hours) > 0
       then round(s.price / (s.shoot_hours + s.retouch_hours + s.prep_hours)) else null end as hourly_rate,
  case when s.delivered_on is not null then s.delivered_on - s.date else null end           as delivery_actual_days,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;

-- Income by month (by payment date — what ФОП is taxed on)
create or replace view v_income_monthly with (security_invoker = true) as
select owner_id, date_trunc('month', paid_on)::date as month, sum(amount)::numeric(12,2) as income, count(*) as payments
from payments group by owner_id, date_trunc('month', paid_on);

-- Quarterly tax base
create or replace view v_tax_quarters with (security_invoker = true) as
select
  p.owner_id,
  extract(year from p.paid_on)::int as year,
  extract(quarter from p.paid_on)::int as quarter,
  sum(p.amount)::numeric(12,2) as income,
  round(sum(p.amount) * st.ep_rate / 100, 2) as ep,
  round(sum(p.amount) * st.vz_rate / 100, 2) as vz,
  round(st.esv_monthly * 3, 2) as esv,
  (date_trunc('quarter', min(p.paid_on)) + interval '3 months' - interval '1 day')::date as quarter_end,
  (date_trunc('quarter', min(p.paid_on)) + interval '3 months' - interval '1 day' + interval '40 days')::date as declaration_due,
  (date_trunc('quarter', min(p.paid_on)) + interval '3 months' - interval '1 day' + interval '50 days')::date as payment_due
from payments p
join settings st on st.owner_id = p.owner_id
group by p.owner_id, extract(year from p.paid_on), extract(quarter from p.paid_on), st.ep_rate, st.vz_rate, st.esv_monthly;

-- Client stats
create or replace view v_client_stats with (security_invoker = true) as
select
  c.id as client_id, c.owner_id, c.name,
  count(s.id) filter (where s.status <> 'cancelled') as shoots,
  coalesce(sum(s.price) filter (where s.status in ('delivered','paid')), 0)::numeric(12,2) as total,
  coalesce(avg(s.price) filter (where s.status in ('delivered','paid')), 0)::numeric(12,2) as avg_check,
  max(s.date) filter (where s.date <= current_date) as last_shoot,
  coalesce(avg(pay.paid_on - s.invoice_sent_on) filter (where pay.kind = 'balance' and s.invoice_sent_on is not null), null) as avg_pay_delay_days,
  coalesce(sum(s.price - coalesce(pp.paid, 0)) filter (where s.status = 'delivered'), 0)::numeric(12,2) as open_balance
from clients c
left join shoots s on s.client_id = c.id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) pp on pp.shoot_id = s.id
left join payments pay on pay.shoot_id = s.id
group by c.id, c.owner_id, c.name;

-- Income by shoot type (by shoot date, delivered/paid only)
create or replace view v_income_by_type with (security_invoker = true) as
select owner_id, type, extract(year from date)::int as year,
  count(*) as shoots, sum(price)::numeric(12,2) as total,
  round(avg(price / nullif(shoot_hours + retouch_hours + prep_hours, 0))) as avg_hourly_rate,
  round(avg(delivered_on - date), 1) as avg_delivery_days,
  round(avg(delivery_days), 1) as promised_delivery_days
from shoots where status in ('delivered','paid') group by owner_id, type, extract(year from date);
