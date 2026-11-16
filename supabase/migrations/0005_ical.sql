-- Calendar feed (iCal) for the phone: a per-owner secret token + a security-definer function that
-- returns that owner's shoots when called with the token (anon role, no session cookie needed).
alter table settings add column if not exists ical_token text unique;

create or replace function public.ical_feed(p_token text)
returns table (id uuid, title text, date date, start_time time, end_time time, location text, status shoot_status, client_name text, deadline date, delivered_on date)
language sql security definer set search_path = public as $$
  select s.id, s.title, s.date, s.start_time, s.end_time, s.location, s.status, c.name, (s.date + s.delivery_days)::date, s.delivered_on
  from shoots s
  join clients c on c.id = s.client_id
  join settings st on st.owner_id = s.owner_id
  where p_token is not null and length(p_token) >= 24 and st.ical_token = p_token and s.status <> 'cancelled'
  order by s.date
$$;
revoke all on function public.ical_feed(text) from public;
grant execute on function public.ical_feed(text) to anon, authenticated;
