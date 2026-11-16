-- Client look: an optional 1:1 photo next to the brand colour (clients.avatar_hue).
-- The photo is a small square data: URL (≤ 192 px, webp/jpeg), like settings.avatar_url.
alter table clients add column if not exists avatar_url text;
