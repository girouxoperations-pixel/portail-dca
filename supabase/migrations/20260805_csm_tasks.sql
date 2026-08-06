create table if not exists csm_tasks (
  id              uuid default gen_random_uuid() primary key,
  csm_client_id   uuid references csm_clients(id) on delete cascade not null,
  title           text not null,
  due_date        date not null,
  done            boolean default false not null,
  done_at         timestamptz,
  created_by      uuid,
  created_at      timestamptz default now() not null
);

create index if not exists idx_csm_tasks_client on csm_tasks(csm_client_id);
create index if not exists idx_csm_tasks_due    on csm_tasks(due_date);
create index if not exists idx_csm_tasks_done   on csm_tasks(done);
