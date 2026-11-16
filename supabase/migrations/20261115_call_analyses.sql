-- Analyse-closer : analyses IA des appels de closing (visible seulement par Samuel)
create table if not exists public.call_analyses (
  id             uuid primary key default gen_random_uuid(),
  call_date      date not null default (now() at time zone 'America/Toronto')::date,
  closer_name    text not null,
  prospect_name  text,
  fathom_url     text,
  issue          text check (issue in ('close','pas_close','a_suivre')),
  transcript     text not null,
  verdict        text check (verdict in ('closee','vente_manquee','a_suivre','pas_qualifiee')),
  avatar         text check (avatar in ('oui','partiel','non')),
  solution       text,
  score          int check (score between 0 and 100),
  analysis       jsonb not null default '{}'::jsonb,
  model          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists call_analyses_date_idx on public.call_analyses (call_date desc);

create table if not exists public.call_daily_reports (
  report_date  date primary key,
  content      text not null,
  nb_appels    int not null default 0,
  created_at   timestamptz not null default now()
);

-- RLS activée sans aucune policy : seul le service role (serveur) y accède.
alter table public.call_analyses      enable row level security;
alter table public.call_daily_reports enable row level security;

-- v2 : grilles avatar/closable, faits extraits, feedback de Samuel (boucle d'apprentissage)
alter table public.call_analyses
  add column if not exists faits jsonb,
  add column if not exists volonte text check (volonte in ('oui','partiel','non','inconnu')),
  add column if not exists capacite text check (capacite in ('oui','partiel','non','inconnu')),
  add column if not exists closable text check (closable in ('oui','non','incertain')),
  add column if not exists closable_pct int check (closable_pct between 0 and 100),
  add column if not exists info_manquante boolean default false,
  add column if not exists samuel_accord boolean,
  add column if not exists samuel_verdict text,
  add column if not exists samuel_closable text,
  add column if not exists samuel_note text,
  add column if not exists feedback_at timestamptz;

-- Coach : questions des closers (visibles par la closer et par Samuel)
create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text, titre text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null, model text,
  created_at timestamptz not null default now()
);
alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;
