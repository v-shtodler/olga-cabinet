-- Colour now means "which brand", so every shoot carries its client's hue.
drop view if exists v_shoots;
create view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  c.avatar_hue as client_hue,
  coalesce(p.paid, 0)::numeric(12,2)             as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2) as balance,
  s.deadline_on                                  as deadline,
  case when s.delivered_on is not null then s.delivered_on - s.date else null end             as delivery_actual_days,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;
