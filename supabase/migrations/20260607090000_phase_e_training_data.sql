alter type public.feedback_source add value if not exists 'qm9_dataset';

alter table public.predictions_feedback add column if not exists smiles text;
alter table public.predictions_feedback add column if not exists dataset text;

create table public.training_data (
  id uuid primary key default gen_random_uuid(),
  smiles text not null,
  smiles_hash text generated always as (md5(smiles)) stored,
  properties jsonb not null,
  source text not null,
  dataset text,
  quality_score double precision not null default 1.0 check (quality_score between 0 and 1),
  calculation_method text,
  created_at timestamptz not null default now(),
  unique (smiles_hash, source)
);

create index idx_training_smiles on public.training_data(smiles_hash);
create index idx_training_source on public.training_data(source);
create index idx_training_created on public.training_data(created_at desc);

alter table public.training_data enable row level security;

create policy "admins insert training data" on public.training_data for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'admin'));
create policy "admins update training data" on public.training_data for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'admin'));
create policy "admins delete training data" on public.training_data for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'admin'));

create function public.training_data_stats()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', coalesce(sum(source_count), 0),
    'by_source', coalesce(jsonb_object_agg(source, source_count), '{}'::jsonb)
  )
  from (
    select source, count(*) as source_count
    from public.training_data
    group by source
  ) counts;
$$;

revoke all on table public.training_data from public, anon, authenticated;
revoke all on function public.training_data_stats() from public, anon;
grant execute on function public.training_data_stats() to authenticated, service_role;
