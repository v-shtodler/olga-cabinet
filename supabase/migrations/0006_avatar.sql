-- Profile photo for the sidebar / top bar. Stored inline as a small data URL (≈20 KB after
-- client-side resize to 192×192 webp), so no storage bucket or signed URLs are involved.
alter table settings add column if not exists avatar_url text;
