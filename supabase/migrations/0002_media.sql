-- Podcast e video per sottoargomento. Stesse regole di accesso degli altri contenuti (gratis se sottoargomento free, altrimenti abbonamento).
create table media (
  id uuid primary key default gen_random_uuid(),
  subtopic_id text not null references subtopics(id) on delete cascade,
  kind text not null check (kind in ('podcast','video')),
  title text not null check (char_length(title) between 1 and 200),
  url text not null check (url ~ '^https://'),
  description text check (char_length(description) <= 1000),
  duration_s int check (duration_s is null or duration_s > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on media(subtopic_id, position);

alter table media enable row level security;
create policy media_read on media for select using (public.can_read_subtopic(subtopic_id));
create policy media_admin on media for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
