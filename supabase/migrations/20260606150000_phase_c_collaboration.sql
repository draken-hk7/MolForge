create extension if not exists pgcrypto;

create type public.user_tier as enum ('free', 'early_access', 'plus', 'max', 'admin');
create type public.feedback_source as enum ('user_correction', 'mp_reconcile', 'cloud_dft');
create type public.cloud_job_type as enum ('xtb', 'dft_lite', 'batch_screening');
create type public.cloud_job_status as enum ('queued', 'running', 'completed', 'failed');
create type public.cloud_provider as enum ('oracle', 'gcp', 'colab', 'local');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  tier public.user_tier not null default 'free',
  predictions_today integer not null default 0 check (predictions_today >= 0),
  predictions_total integer not null default 0 check (predictions_total >= 0),
  api_key uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.molecules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  smiles text not null,
  mol_data jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  mp_data jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  forked_from uuid references public.molecules(id) on delete set null,
  fork_count integer not null default 0,
  view_count integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proteins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sequence text not null,
  uniprot_id text,
  structure_pdb text,
  properties jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

create table public.shared_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  members uuid[] not null default '{}',
  molecules uuid[] not null default '{}',
  is_public boolean not null default false,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid not null references public.molecules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.predictions_feedback (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid references public.molecules(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  property_name text,
  predicted_value double precision,
  corrected_value double precision,
  mp_actual_value double precision,
  cloud_calculated_value double precision,
  rating integer check (rating between 1 and 5),
  feedback_text text not null default '',
  correction_source text,
  source public.feedback_source not null,
  created_at timestamptz not null default now()
);

create table public.cloud_jobs (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid references public.molecules(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  job_type public.cloud_job_type not null,
  status public.cloud_job_status not null default 'queued',
  provider public.cloud_provider not null default 'local',
  input_smiles text not null,
  smiles_hash text not null,
  result jsonb not null default '{}'::jsonb,
  cost_credits double precision not null default 0,
  priority integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.shared_workspaces(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index molecules_user_id_idx on public.molecules(user_id);
create index molecules_public_created_idx on public.molecules(is_public, created_at desc);
create index molecules_fork_count_idx on public.molecules(fork_count desc);
create index molecules_tags_idx on public.molecules using gin(tags);
create index molecules_forked_from_idx on public.molecules(forked_from);
create index proteins_user_id_idx on public.proteins(user_id);
create index workspaces_owner_idx on public.shared_workspaces(owner_id);
create index workspaces_members_idx on public.shared_workspaces using gin(members);
create index workspaces_molecules_idx on public.shared_workspaces using gin(molecules);
create index comments_molecule_idx on public.comments(molecule_id, created_at);
create index comments_user_id_idx on public.comments(user_id);
create index feedback_user_idx on public.predictions_feedback(user_id);
create index feedback_molecule_id_idx on public.predictions_feedback(molecule_id);
create index feedback_created_idx on public.predictions_feedback(created_at desc);
create index cloud_jobs_user_idx on public.cloud_jobs(user_id, created_at desc);
create index cloud_jobs_molecule_id_idx on public.cloud_jobs(molecule_id);
create index cloud_jobs_cache_idx on public.cloud_jobs(smiles_hash, job_type, status);
create index workspace_invites_invited_by_idx on public.workspace_invites(invited_by);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create function public.increment_molecule_view(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$ update public.molecules set view_count = view_count + 1 where id = target and is_public; $$;

create function public.increment_molecule_fork(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$ update public.molecules set fork_count = fork_count + 1 where id = target and is_public; $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.increment_molecule_view(uuid) from public, anon, authenticated;
revoke all on function public.increment_molecule_fork(uuid) from public, anon, authenticated;
grant execute on function public.increment_molecule_view(uuid) to service_role;
grant execute on function public.increment_molecule_fork(uuid) to service_role;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger molecules_updated_at before update on public.molecules
for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.shared_workspaces
for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.molecules enable row level security;
alter table public.proteins enable row level security;
alter table public.shared_workspaces enable row level security;
alter table public.comments enable row level security;
alter table public.predictions_feedback enable row level security;
alter table public.cloud_jobs enable row level security;
alter table public.workspace_invites enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "public or owned molecules are readable" on public.molecules for select
using (is_public or (select auth.uid()) = user_id);
create policy "users insert own molecules" on public.molecules for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own molecules" on public.molecules for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own molecules" on public.molecules for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "public or owned proteins are readable" on public.proteins for select
using (is_public or (select auth.uid()) = user_id);
create policy "users manage own proteins" on public.proteins for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "workspaces visible to members" on public.shared_workspaces for select
using (is_public or (select auth.uid()) = owner_id or (select auth.uid()) = any(members));
create policy "owners insert workspaces" on public.shared_workspaces for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "owners update workspaces" on public.shared_workspaces for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners delete workspaces" on public.shared_workspaces for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "comments on readable molecules are visible" on public.comments for select
using (exists (select 1 from public.molecules m where m.id = molecule_id and (m.is_public or m.user_id = (select auth.uid()))));
create policy "users insert own comments" on public.comments for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users delete own comments" on public.comments for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "admins read feedback" on public.predictions_feedback for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'admin'));
create policy "users insert own feedback" on public.predictions_feedback for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users read own cloud jobs" on public.cloud_jobs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users insert own cloud jobs" on public.cloud_jobs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "owners read workspace invites" on public.workspace_invites for select to authenticated
using (exists (select 1 from public.shared_workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
create policy "owners create workspace invites" on public.workspace_invites for insert to authenticated
with check (exists (select 1 from public.shared_workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

alter publication supabase_realtime add table public.molecules;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.shared_workspaces;
alter publication supabase_realtime add table public.cloud_jobs;
