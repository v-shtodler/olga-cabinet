# Кабінет фотографа · Olga Voychik

Приватний органайзер для комерційного фотографа: календар зйомок, замовники, платежі, податки ФОП 3 групи, аналітика і помічник на правилах.

**Стек:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + Storage, RLS) · Vercel.

## Запуск локально

```bash
cp .env.example .env.local      # вставити URL і anon key з Supabase → Project Settings → API
npm install
npm run dev                     # http://localhost:3000
```

## Налаштування Supabase (один раз)

1. **SQL Editor** → виконати по черзі `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_views.sql`.
2. **Authentication → Providers → Email**: лишити Email увімкненим, **вимкнути «Allow new users to sign up»** (кабінет приватний, користувача створюємо руками).
3. **Authentication → Users → Add user**: пошта Ольги + пароль, «Auto confirm» = on. Тригер `on_auth_user_created` сам створить налаштування і пресети.
4. **Authentication → URL Configuration**: Site URL = `https://app.olgavoychik.com`, Redirect URLs = `https://app.olgavoychik.com/auth/callback`, `http://localhost:3000/auth/callback`.
5. (Опційно) демо-дані: `SUPABASE_SERVICE_ROLE_KEY=… SEED_USER_EMAIL=… npm run seed`. Скрипт пропускає сидування, якщо у користувача вже є зйомки.

## Деплой на Vercel

1. Import Git Repository → цей репозиторій. Framework: Next.js (визначається сам).
2. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview).
3. Deploy. Потім Settings → Domains → `app.olgavoychik.com`.
4. У Cloudflare DNS: `app` → CNAME → `cname.vercel-dns.com`, **Proxy status: DNS only**.

## Структура

```
supabase/migrations/   SQL: схема, RLS, аналітичні в'юхи
src/lib/domain.ts      типи, форматування, правила помічника, податковий календар (чисті функції)
src/lib/data.ts        читання з Supabase (серверне, під RLS)
src/app/actions.ts     усі записи — Server Actions із zod-валідацією
src/app/(app)/         екрани кабінету
src/components/        UI: навігація, помічник, чіпи, рядки зйомок
scripts/seed.ts        демо-дані
```

## Приватність

- RLS на всіх таблицях: рядок бачить тільки `owner_id = auth.uid()`.
- `proxy.ts` редіректить неавторизованих на `/login`.
- `X-Robots-Tag: noindex`, `robots.txt: Disallow /`.
- Рекомендовано: Cloudflare Zero Trust → Access на субдомен (другий замок, безкоштовно).

## Офлайн-режим

- `public/sw.js` — service worker: статика cache-first; HTML та RSC-відповіді екранів network-first з таймаутом 6 с і падінням на кеш; без кешу — `/offline`. `V` у файлі — версія кешу (підняти при зміні логіки).
- `src/lib/outbox.ts` — черга змін у `localStorage` (`outbox.v1`): `enqueue / list / remove / flush / callOrQueue`.
- `src/components/offline.tsx` — реєструє SW, перехоплює `submit` у формах із `data-op` / `data-args` коли `navigator.onLine === false`, показує смугу «Офлайн» / «N змін очікують», тости, відправляє чергу при `online`, завантаженні та поверненні у вкладку.
- `src/app/api/sync/route.ts` — повторює дію на сервері: викликає ту саму Server Action з `actions.ts` за назвою (allow-list `OPS`).
- Нову серверну дію, яка має працювати офлайн: додати у `OPS`, у `OP_LABEL`, і на `<form>` поставити `data-op="name" data-args={JSON.stringify([...])}`; у клієнтському коді — обгорнути в `callOrQueue`.
- Обмеження: файли (фото) офлайн не ставляться в чергу; черга видно лише у списку, у календар до синхронізації не потрапляє; порядок відправки — як додавали; при 4xx помилка зберігається біля пункту, пункт можна видалити.

## Експлуатація

- **Keep-alive**: `vercel.json` → cron `0 5 * * *` викликає `/api/ping` (один запит до Data API), щоб безкоштовний проєкт Supabase не «засинав» після 7 днів без активності. Перевірка: відкрити `https://app.olgavoychik.space/api/ping` — має бути `{"ok":true,"status":200}`. Можна захистити змінною `CRON_SECRET` у Vercel (Vercel сам надсилає її в заголовку).
- **Вихід з акаунта** спершу відправляє чергу офлайн-змін, потім чистить кеш екранів і чергу на пристрої.
- **Сесія закінчилась** під час офлайну: черга лишається на пристрої й відправиться після повторного входу (API відповідає 401, а не редиректом).
- `/api/sync` приймає лише same-origin JSON-запити (захист від CSRF).

## Календар на телефоні (iCal)

- Міграція `supabase/migrations/0005_ical.sql` (колонка `settings.ical_token` + функція `ical_feed(token)` із `security definer`) — застосовується вручну в SQL Editor.
- Налаштування → «Календар на телефоні» → «Створити посилання» → `webcal://app.olgavoychik.space/api/ical/<token>`.
- Фід: кожна зйомка (з часом або на весь день) + подія «⏱ Віддати» на дедлайн для підтверджених/відзнятих; нагадування за день. Скасовані не виводяться. «Нове посилання» робить старе недійсним.

## Структура зйомки (після 0007–0008)

Зйомка = замовник, назва, дата, час початку, локація, ціна, передоплата (%), необовʼязкова дата «Віддати до» (`deadline_on`), статус.
Міграція `0008_drop_unused.sql` назавжди видалила `type`, `end_time`, `photos`, `extra_photos`, `photos_delivered`,
`delivery_days`, `rights`, `shoot_hours`, `retouch_hours`, `prep_hours`, таблицю `shoot_type_presets`, тип `shoot_type`
і `clients.default_types`. Разом із ними зникли пресети, кольори типів і аналітика за типами.
