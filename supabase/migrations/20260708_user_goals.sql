-- Objectifs individuels par mois (closers et setters)
create table if not exists user_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  year          int  not null,
  month         int  not null,
  target_cash   numeric not null default 0,   -- objectif cash collecté (closers)
  target_closes int     not null default 0,   -- objectif nb de closes (closers)
  target_rdv    int     not null default 0,   -- objectif RDV bookés (setters)
  target_calls  int     not null default 0,   -- objectif tentatives (setters)
  created_at    timestamptz default now(),
  unique (user_id, year, month)
);

alter table user_goals enable row level security;

-- Lecture pour tout utilisateur connecté (vue compétitive)
create policy "user_goals_select" on user_goals
  for select using (auth.role() = 'authenticated');

-- Écriture réservée aux admins et CSM
create policy "user_goals_write" on user_goals
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'csm')
    )
  );
