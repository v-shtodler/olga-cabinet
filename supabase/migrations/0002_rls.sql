-- Row Level Security: every table is readable/writable only by its owner.
-- Even with the public anon key, a request without a valid session returns nothing.

do $$
declare t text;
begin
  foreach t in array array['settings','shoot_type_presets','clients','client_prefs','shoots','payments','expenses','shoot_notes','checklist_items','shoot_tags','blocked_days','dismissed_insights','tax_payments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner_select', t);
    execute format('drop policy if exists %I on %I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on %I', t || '_owner_update', t);
    execute format('drop policy if exists %I on %I', t || '_owner_delete', t);
    execute format('create policy %I on %I for select to authenticated using (owner_id = auth.uid())', t || '_owner_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (owner_id = auth.uid())', t || '_owner_insert', t);
    execute format('create policy %I on %I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t || '_owner_update', t);
    execute format('create policy %I on %I for delete to authenticated using (owner_id = auth.uid())', t || '_owner_delete', t);
  end loop;
end $$;

-- Default owner_id = current user, so client code never has to send it.
alter table clients            alter column owner_id set default auth.uid();
alter table client_prefs       alter column owner_id set default auth.uid();
alter table shoots             alter column owner_id set default auth.uid();
alter table payments           alter column owner_id set default auth.uid();
alter table expenses           alter column owner_id set default auth.uid();
alter table shoot_notes        alter column owner_id set default auth.uid();
alter table checklist_items    alter column owner_id set default auth.uid();
alter table shoot_tags         alter column owner_id set default auth.uid();
alter table blocked_days       alter column owner_id set default auth.uid();
alter table dismissed_insights alter column owner_id set default auth.uid();
alter table tax_payments       alter column owner_id set default auth.uid();
alter table shoot_type_presets alter column owner_id set default auth.uid();

-- Private storage bucket for contracts / references / moodboards
insert into storage.buckets (id, name, public) values ('shoot-files', 'shoot-files', false) on conflict do nothing;
create policy "shoot_files_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'shoot-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'shoot-files' and (storage.foldername(name))[1] = auth.uid()::text);
