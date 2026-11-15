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
