-- A shoot is identified by its client, date and number — the free-text title is gone.
drop view if exists v_shoots;
alter table shoots drop column if exists title;
create view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  coalesce(p.paid, 0)::numeric(12,2)             as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2) as balance,
  s.deadline_on                                  as deadline,
  case when s.delivered_on is not null then s.delivered_on - s.date else null end             as delivery_actual_days,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;
