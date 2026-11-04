-- File audio/video caricati dall'admin (es. generati con NotebookLM) in un bucket PRIVATO.
-- L'accesso segue il paywall: chi può leggere il sottoargomento può ottenere un link firmato temporaneo.
alter table media add column path text;
alter table media alter column url drop not null;
alter table media add constraint media_source check (url is not null or path is not null);

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800) -- 50 MB (limite del piano gratuito Supabase)
on conflict (id) do nothing;

create policy media_objects_admin on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_admin(auth.uid()))
  with check (bucket_id = 'media' and public.is_admin(auth.uid()));

create policy media_objects_read on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'media'
    and exists (select 1 from public.media m where m.path = storage.objects.name and public.can_read_subtopic(m.subtopic_id))
  );
