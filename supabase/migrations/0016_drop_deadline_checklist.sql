-- "Віддати до" and the per-shoot checklist are gone from the service.
drop view if exists v_shoots;
alter table shoots drop column if exists deadline_on;
drop table if exists checklist_items;

create view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  c.avatar_hue as client_hue,
  coalesce(p.paid, 0)::numeric(12,2)             as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2) as balance,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;
