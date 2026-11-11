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
