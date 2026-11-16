-- Simplified shoot card: the service keeps client, title, date, start time, location, price and
-- deposit. The delivery deadline becomes a plain optional date instead of "date + N days".
-- Old columns are left in place (unused, defaulted) so no data is lost and nothing has to be backfilled.
alter table shoots add column if not exists deadline_on date;
update shoots set deadline_on = (date + delivery_days)::date where deadline_on is null;

-- s.* gains a column, so the view has to be recreated rather than replaced
-- (CREATE OR REPLACE VIEW cannot reorder or rename existing output columns).
drop view if exists v_shoots;
create view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  coalesce(p.paid, 0)::numeric(12,2)                       as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2)           as balance,
  s.deadline_on                                            as deadline,
  (s.shoot_hours + s.retouch_hours + s.prep_hours)         as total_hours,
  case when (s.shoot_hours + s.retouch_hours + s.prep_hours) > 0
       then round(s.price / (s.shoot_hours + s.retouch_hours + s.prep_hours)) else null end as hourly_rate,
  case when s.delivered_on is not null then s.delivered_on - s.date else null end           as delivery_actual_days,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;
