-- Restare nel piano gratuito: pulizia automatica dello storico risposte + misura dello spazio usato.

-- 1) Pulizia: per ogni utente tiene le ultime 3000 risposte e comunque solo gli ultimi 12 mesi.
--    L'allenatore usa le statistiche aggregate (topic_stats) e le risposte recenti: non perde nulla di utile.
create or replace function public.prune_attempts()
returns void language sql security definer set search_path = public as $$
  delete from attempts a
  using (
    select id from (
      select id, created_at, row_number() over (partition by user_id order by created_at desc) as rn
      from attempts
    ) x
    where x.rn > 3000 or x.created_at < now() - interval '12 months'
  ) old
  where a.id = old.id;
$$;
revoke all on function public.prune_attempts() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('prune-attempts', '17 3 * * 0', 'select public.prune_attempts()'); -- domenica 03:17

-- 2) Spazio usato (solo admin)
create or replace function public.usage_stats()
returns json language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'solo admin';
  end if;
  return json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'users', (select count(*) from profiles),
    'attempts', (select count(*) from attempts),
    'questions', (select count(*) from questions),
    'media_files', (select count(*) from media where path is not null)
  );
end $$;
revoke all on function public.usage_stats() from public, anon;
grant execute on function public.usage_stats() to authenticated;
