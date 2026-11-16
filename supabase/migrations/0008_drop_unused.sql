-- Permanent removal of the fields the service no longer has, with their data.
-- Order matters: dependent views and the presets table go first, then the columns, then the enum.

drop view if exists v_income_by_type;   -- grouped by shoot type and hours
drop view if exists v_shoots;           -- selects the hour columns

drop table if exists shoot_type_presets;

-- the signup trigger seeded presets for new users
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into settings(owner_id) values (new.id) on conflict do nothing;
  return new;
end $$;

alter table clients drop column if exists default_types;

alter table shoots
  drop column if exists type,
  drop column if exists end_time,
  drop column if exists photos,
  drop column if exists extra_photos,
  drop column if exists photos_delivered,
  drop column if exists delivery_days,
  drop column if exists rights,
  drop column if exists shoot_hours,
  drop column if exists retouch_hours,
  drop column if exists prep_hours;

drop type if exists shoot_type;

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
