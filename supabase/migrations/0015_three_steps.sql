-- The flow is Запит → Підтверджено → Оплачено: the "shot" and "delivered" stages are gone.
-- Enum values stay in the type (Postgres cannot drop them cheaply); the app never writes them again.
update shoots set status = 'confirmed' where status in ('shot', 'delivered');
alter table shoots drop column if exists delivered_on;

-- Відкладені: the rate now comes from the NBU and may be unknown (0) when the bank is unreachable.
alter table savings drop constraint if exists savings_rate_check;
alter table savings add constraint savings_rate_check check (rate >= 0);

drop view if exists v_shoots;
create view v_shoots with (security_invoker = true) as
select
  s.*,
  c.name as client_name,
  c.avatar_hue as client_hue,
  coalesce(p.paid, 0)::numeric(12,2)             as paid,
  (s.price - coalesce(p.paid, 0))::numeric(12,2) as balance,
  s.deadline_on                                  as deadline,
  case when s.invoice_sent_on is not null then current_date - s.invoice_sent_on else null end as invoice_age_days
from shoots s
join clients c on c.id = s.client_id
left join (select shoot_id, sum(amount) as paid from payments group by shoot_id) p on p.shoot_id = s.id;
