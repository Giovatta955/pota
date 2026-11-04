-- Schema iniziale. RLS attiva su tutte le tabelle.

create extension if not exists "pgcrypto";

-- ---------- Contenuti ----------
create table topics (
  id text primary key,
  title text not null,
  position int not null default 0,
  exam_weight numeric not null default 1 check (exam_weight >= 0)
);

create table subtopics (
  id text primary key,
  topic_id text not null references topics(id) on delete cascade,
  title text not null,
  position int not null default 0,
  exam_weight numeric not null default 1 check (exam_weight >= 0),
  is_free boolean not null default false
);
create index on subtopics(topic_id);

create table summaries (
  subtopic_id text primary key references subtopics(id) on delete cascade,
  markdown text not null,
  key_points jsonb not null default '[]'
);

create table maps (
  subtopic_id text primary key references subtopics(id) on delete cascade,
  tree jsonb not null
);

create table flashcards (
  id text primary key,
  subtopic_id text not null references subtopics(id) on delete cascade,
  front text not null,
  back text not null
);
create index on flashcards(subtopic_id);

create table questions (
  id text primary key,
  topic_id text not null references topics(id) on delete cascade,
  subtopic_id text not null references subtopics(id) on delete cascade,
  level int not null check (level between 1 and 5),
  stem text not null,
  options jsonb not null,
  correct text not null check (correct in ('A','B','C','D')),
  explanation text not null,
  reference text,
  source_kind text not null check (source_kind in ('original','official_past_exam')),
  status text not null default 'draft' check (status in ('draft','reviewed','published')),
  active boolean not null default true
);
create index on questions(subtopic_id, level);
create index on questions(topic_id);

-- ---------- Utenti ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  withdrawal_consent_at timestamptz, -- consenso accesso immediato (recesso)
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text unique,
  plan text not null check (plan in ('monthly','pass')),
  status text not null,           -- active | trialing | past_due | canceled ...
  current_period_end timestamptz, -- scadenza (null = senza scadenza)
  updated_at timestamptz not null default now()
);
create index on subscriptions(user_id);

create or replace function public.has_paid_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = uid), false);
$$;

create or replace function public.can_read_subtopic(sub text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from subtopics st where st.id = sub and st.is_free)
      or public.has_paid_access(auth.uid())
      or public.is_admin(auth.uid());
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Progressi ----------
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  answer text not null check (answer in ('A','B','C','D')),
  is_correct boolean not null,
  time_ms int,
  mode text not null check (mode in ('quiz','trainer','exam')),
  created_at timestamptz not null default now()
);
create index on attempts(user_id, created_at desc);

create table topic_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references topics(id) on delete cascade,
  accuracy_ema numeric not null default 0.5 check (accuracy_ema between 0 and 1),
  current_level int not null default 1 check (current_level between 1 and 5),
  n_answers int not null default 0,
  primary key (user_id, topic_id)
);

create table flashcard_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id text not null references flashcards(id) on delete cascade,
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_date date not null default current_date,
  primary key (user_id, flashcard_id)
);
create index on flashcard_progress(user_id, due_date);

create table exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_ids text[] not null,
  duration_s int not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric
);
create index on exams(user_id, started_at desc);

create table exam_answers (
  exam_id uuid not null references exams(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  answer text check (answer in ('A','B','C','D')),
  primary key (exam_id, question_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 1 and 2000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table topics enable row level security;
alter table subtopics enable row level security;
alter table summaries enable row level security;
alter table maps enable row level security;
alter table flashcards enable row level security;
alter table questions enable row level security;
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table attempts enable row level security;
alter table topic_stats enable row level security;
alter table flashcard_progress enable row level security;
alter table exams enable row level security;
alter table exam_answers enable row level security;
alter table reports enable row level security;

-- Indice contenuti: pubblico (serve per SEO e anteprima).
create policy topics_read on topics for select using (true);
create policy subtopics_read on subtopics for select using (true);

-- Contenuti: gratis se sottoargomento free, altrimenti serve abbonamento.
create policy summaries_read on summaries for select using (public.can_read_subtopic(subtopic_id));
create policy maps_read on maps for select using (public.can_read_subtopic(subtopic_id));
create policy flashcards_read on flashcards for select using (public.can_read_subtopic(subtopic_id));
create policy questions_read on questions for select
  using (status = 'published' and active and public.can_read_subtopic(subtopic_id));

-- Scrittura contenuti: solo admin (l'import usa la service role, che bypassa RLS).
create policy topics_admin on topics for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy subtopics_admin on subtopics for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy questions_admin on questions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Dati personali
create policy profiles_own_read on profiles for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy profiles_own_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));
create policy subs_own_read on subscriptions for select using (user_id = auth.uid());
-- subscriptions: scritte solo dal webhook (service role)

create policy attempts_own on attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy topic_stats_own on topic_stats for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fc_progress_own on flashcard_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exams_own on exams for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exam_answers_own on exam_answers for all
  using (exists (select 1 from exams e where e.id = exam_id and e.user_id = auth.uid()))
  with check (exists (select 1 from exams e where e.id = exam_id and e.user_id = auth.uid()));

create policy reports_insert on reports for insert with check (user_id = auth.uid());
create policy reports_own_read on reports for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy reports_admin_update on reports for update using (public.is_admin(auth.uid()));
