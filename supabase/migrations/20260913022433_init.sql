-- Meridian MVP schema. Mirrors specs/data-model.md.
-- Every user-owned table has Row Level Security. Rows are only visible to and
-- writable by their owner, and child rows may only reference parents the same
-- user owns.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one current profile per user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade default auth.uid(),
  summary text not null,
  "values" jsonb not null default '[]',
  interests jsonb not null default '[]',
  skills jsonb not null default '[]',
  motivations jsonb not null default '[]',
  preferences jsonb not null default '[]',
  constraints jsonb not null default '[]',
  goals jsonb not null default '[]',
  dislikes jsonb not null default '[]',
  uncertainties jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  status text not null default 'active' check (status in ('active', 'completed')),
  coverage real not null default 0 check (coverage between 0 and 1),
  ready_to_complete boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_created_idx on public.conversations (user_id, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- paths + user_paths
-- ---------------------------------------------------------------------------
create table public.paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  why_it_fits jsonb not null default '[]',
  strengths jsonb not null default '[]',
  uncertainties jsonb not null default '[]',
  first_experiment text not null,
  experiment_duration integer not null check (experiment_duration between 1 and 60),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index paths_user_created_idx on public.paths (user_id, created_at);
create index paths_conversation_idx on public.paths (conversation_id);

create table public.user_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  status text not null default 'suggested'
    check (status in ('suggested', 'selected', 'active', 'paused', 'completed', 'abandoned')),
  selected_at timestamptz,
  exploration_score integer not null default 50 check (exploration_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_id)
);

-- ---------------------------------------------------------------------------
-- experiments + experiment_tasks
-- ---------------------------------------------------------------------------
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  title text not null,
  description text not null,
  goal text not null,
  duration_days integer not null check (duration_days between 1 and 60),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  metadata jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiments_user_path_idx on public.experiments (user_id, path_id, status);

create table public.experiment_tasks (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  title text not null,
  description text not null,
  completed boolean not null default false,
  due_date timestamptz,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index experiment_tasks_experiment_idx on public.experiment_tasks (experiment_id, position);

-- ---------------------------------------------------------------------------
-- check_ins, insights, roadmaps
-- ---------------------------------------------------------------------------
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  energy smallint not null check (energy between 1 and 10),
  motivation smallint not null check (motivation between 1 and 10),
  enjoyment smallint not null check (enjoyment between 1 and 10),
  difficulty smallint not null check (difficulty between 1 and 10),
  enjoyed_activities jsonb not null default '[]',
  disliked_activities jsonb not null default '[]',
  continue_preference text not null check (continue_preference in ('definitely', 'maybe', 'probably_not')),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  analysis jsonb,
  created_at timestamptz not null default now()
);
create index check_ins_user_created_idx on public.check_ins (user_id, created_at desc);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  path_id uuid references public.paths (id) on delete cascade,
  headline text,
  content text not null,
  source_type text not null check (source_type in ('conversation', 'check_in')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index insights_user_created_idx on public.insights (user_id, created_at desc);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  title text not null,
  horizon text not null,
  content jsonb not null,
  version integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (path_id, version)
);
create unique index roadmaps_one_active_per_path on public.roadmaps (path_id) where active;
create index roadmaps_user_path_idx on public.roadmaps (user_id, path_id);

-- Covering indexes for foreign keys used in RLS checks and cascades.
create index user_paths_path_idx on public.user_paths (path_id);
create index experiments_path_idx on public.experiments (path_id);
create index check_ins_path_idx on public.check_ins (path_id);
create index insights_path_idx on public.insights (path_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
create trigger user_paths_touch before update on public.user_paths
  for each row execute function public.touch_updated_at();
create trigger experiments_touch before update on public.experiments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.paths enable row level security;
alter table public.user_paths enable row level security;
alter table public.experiments enable row level security;
alter table public.experiment_tasks enable row level security;
alter table public.check_ins enable row level security;
alter table public.insights enable row level security;
alter table public.roadmaps enable row level security;

-- Tables that carry user_id directly. Parent ownership is re-checked on write
-- so a user can't attach rows to someone else's conversation or path.

create policy "own profile" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own conversations" on public.conversations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own paths" on public.paths
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  );

create policy "own user_paths" on public.user_paths
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.paths p where p.id = path_id and p.user_id = (select auth.uid()))
  );

create policy "own experiments" on public.experiments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.paths p where p.id = path_id and p.user_id = (select auth.uid()))
  );

create policy "own check_ins" on public.check_ins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.paths p where p.id = path_id and p.user_id = (select auth.uid()))
  );

create policy "own insights" on public.insights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (path_id is null or exists (select 1 from public.paths p where p.id = path_id and p.user_id = (select auth.uid())))
  );

create policy "own roadmaps" on public.roadmaps
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.paths p where p.id = path_id and p.user_id = (select auth.uid()))
  );

-- Tables owned through their parent.

create policy "messages via own conversation" on public.messages
  for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

create policy "tasks via own experiment" on public.experiment_tasks
  for all to authenticated
  using (exists (select 1 from public.experiments e where e.id = experiment_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.experiments e where e.id = experiment_id and e.user_id = (select auth.uid())));

-- Signed-in users reach tables through the Data API; RLS above limits them to their own rows.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Anonymous users get nothing: no policies grant the anon role access.
revoke all on all tables in schema public from anon;
