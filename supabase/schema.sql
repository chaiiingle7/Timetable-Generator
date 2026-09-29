-- App setup (teachers, batches, breaks...) stored as one JSON blob.
-- Simple and flexible; you can normalise into separate tables later.
create table if not exists app_config (
  id         int primary key default 1,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Generated timetables you chose to save.
create table if not exists saved_timetables (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  config     jsonb not null,
  result     jsonb not null,
  created_at timestamptz not null default now()
);

-- Lock both tables down, then allow requests via the anon key.
alter table app_config       enable row level security;
alter table saved_timetables enable row level security;

create policy "allow anon all on app_config" on app_config
  for all using (true) with check (true);

create policy "allow anon all on saved_timetables" on saved_timetables
  for all using (true) with check (true);
