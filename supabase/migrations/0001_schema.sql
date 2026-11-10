-- Olga Voychik Cabinet — core schema
-- Single-tenant by design (owner_id on every table), RLS: a row is visible only to its owner.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type shoot_type as enum ('lookbook', 'product', 'campaign', 'portrait', 'other');
create type shoot_status as enum ('request', 'confirmed', 'shot', 'delivered', 'paid', 'cancelled');
create type payment_kind as enum ('deposit', 'balance', 'extra', 'refund');
create type payment_method as enum ('invoice', 'card', 'cash', 'other');

-- ---------- settings (one row per owner) ----------
create table settings (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default 'Ольга',
  ep_rate         numeric(5,2) not null default 5,      -- єдиний податок, %
  vz_rate         numeric(5,2) not null default 1,      -- військовий збір, %
  esv_monthly     numeric(12,2) not null default 1902.34,
  income_limit    numeric(14,2) not null default 10091049,
  rates_from      date not null default '2026-01-01',
  remind_days     int not null default 3,
  month_capacity  int not null default 9,               -- зйомок на місяць = 100% завантаженості
  currency        text not null default 'UAH',
  updated_at      timestamptz not null default now()
);

-- ---------- shoot type presets ----------
create table shoot_type_presets (
  owner_id        uuid not null references auth.users(id) on delete cascade,
  type            shoot_type not null,
  label           text not null,
  price           numeric(12,2) not null,
  photos          int not null default 0,
  extra_photos    int not null default 0,
  delivery_days   int not null default 7,
  shoot_hours     numeric(5,1) not null default 5,
  retouch_hours   numeric(5,1) not null default 6,
  sort            int not null default 0,
  primary key (owner_id, type)
);

-- ---------- clients ----------
create table clients (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  kind            text,                                  -- «Бренд одягу», «E-commerce» …
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  since           date not null default current_date,
  default_deposit_pct int not null default 50,
  default_types   shoot_type[] not null default '{}',
  avatar_hue      int not null default 0,                -- 0..7, gradient index
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clients_owner_idx on clients(owner_id);

-- «Що важливо для цього клієнта» — окремі пункти, їх помічник показує перед зйомкою
create table client_prefs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  text            text not null,
  sort            int not null default 0,
  created_at      timestamptz not null default now()
);
create index client_prefs_client_idx on client_prefs(client_id);

-- ---------- shoots ----------
create table shoots (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete restrict,
  no              text,                                  -- людський номер «2026-041»
  title           text not null,
  type            shoot_type not null,
  status          shoot_status not null default 'request',
  date            date not null,
  start_time      time,
  end_time        time,
  location        text,
  price           numeric(12,2) not null default 0,
  deposit_pct     int not null default 50,
  photos          int not null default 0,                -- ретушованих за умовами
  extra_photos    int not null default 0,                -- кольорокорекція
  photos_delivered int,                                  -- фактично віддано
  delivery_days   int not null default 7,
  delivered_on    date,
  invoice_sent_on date,
  shoot_hours     numeric(5,1) not null default 0,
  retouch_hours   numeric(5,1) not null default 0,
  prep_hours      numeric(5,1) not null default 1,
  rights          text,
  cancelled_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index shoots_owner_date_idx on shoots(owner_id, date);
create index shoots_client_idx on shoots(client_id);
create index shoots_status_idx on shoots(owner_id, status);

-- ---------- payments (дата платежу = квартал для податків) ----------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  shoot_id        uuid not null references shoots(id) on delete cascade,
  amount          numeric(12,2) not null,
  paid_on         date not null,
  kind            payment_kind not null default 'deposit',
  method          payment_method not null default 'invoice',
  note            text,
  created_at      timestamptz not null default now()
);
create index payments_owner_date_idx on payments(owner_id, paid_on);
create index payments_shoot_idx on payments(shoot_id);

-- ---------- expenses (маржа, не лише оборот) ----------
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  shoot_id        uuid references shoots(id) on delete set null,
  amount          numeric(12,2) not null,
  spent_on        date not null,
  category        text not null,                         -- студія, асистент, візаж, витратка …
  note            text,
  created_at      timestamptz not null default now()
);
create index expenses_owner_date_idx on expenses(owner_id, spent_on);

-- ---------- notes / checklist / tags ----------
create table shoot_notes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  shoot_id        uuid not null references shoots(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index shoot_notes_shoot_idx on shoot_notes(shoot_id);

create table checklist_items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  shoot_id        uuid not null references shoots(id) on delete cascade,
  text            text not null,
  done            boolean not null default false,
  sort            int not null default 0,
  created_at      timestamptz not null default now()
);
create index checklist_shoot_idx on checklist_items(shoot_id);

create table shoot_tags (
  owner_id        uuid not null references auth.users(id) on delete cascade,
  shoot_id        uuid not null references shoots(id) on delete cascade,
  tag             text not null,
  primary key (shoot_id, tag)
);

-- ---------- calendar blocks (особисті дні) ----------
create table blocked_days (
  owner_id        uuid not null references auth.users(id) on delete cascade,
  day             date not null,
  reason          text,
  primary key (owner_id, day)
);

-- ---------- assistant state ----------
create table dismissed_insights (
  owner_id        uuid not null references auth.users(id) on delete cascade,
  key             text not null,
  until           date not null,
  primary key (owner_id, key)
);

create table tax_payments (
  owner_id        uuid not null references auth.users(id) on delete cascade,
  period_key      text not null,                          -- '2026q3-tax' | '2026q3-esv'
  paid_on         date not null default current_date,
  amount          numeric(12,2),
  primary key (owner_id, period_key)
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger clients_updated before update on clients for each row execute function set_updated_at();
create trigger shoots_updated before update on shoots for each row execute function set_updated_at();
create trigger settings_updated before update on settings for each row execute function set_updated_at();

-- ---------- auto number for shoots: YYYY-NNN ----------
create or replace function assign_shoot_no() returns trigger language plpgsql as $$
declare n int;
begin
  if new.no is null then
    select count(*) + 1 into n from shoots where owner_id = new.owner_id and extract(year from date) = extract(year from new.date);
    new.no := to_char(new.date, 'YYYY') || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
create trigger shoots_no before insert on shoots for each row execute function assign_shoot_no();

-- ---------- bootstrap settings + presets for a new user ----------
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into settings(owner_id) values (new.id) on conflict do nothing;
  insert into shoot_type_presets(owner_id, type, label, price, photos, extra_photos, delivery_days, shoot_hours, retouch_hours, sort) values
    (new.id, 'lookbook', 'Lookbook', 30000, 40, 180, 7, 7, 12, 1),
    (new.id, 'product',  'Предметка', 18000, 60, 0, 5, 5, 6, 2),
    (new.id, 'campaign', 'Кампанія', 44000, 25, 60, 7, 9, 16, 3),
    (new.id, 'portrait', 'Портрети / бренд', 18000, 15, 40, 10, 2, 5, 4),
    (new.id, 'other',    'Інше', 12000, 20, 0, 5, 3, 4, 5)
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
