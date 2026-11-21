begin;

create table if not exists public.mpi_materiales_admin (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.mpi_materiales_config (
  id smallint primary key check (id = 1),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 1000000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.mpi_materiales_config(id) values (1) on conflict (id) do nothing;

alter table public.mpi_materiales_admin enable row level security;
alter table public.mpi_materiales_config enable row level security;
revoke all on public.mpi_materiales_config, public.mpi_materiales_admin from public, anon, authenticated;
grant select on public.mpi_materiales_config to anon, authenticated;
grant update(config) on public.mpi_materiales_config to authenticated;
grant select(user_id) on public.mpi_materiales_admin to authenticated;

drop policy if exists mpi_materiales_propio on public.mpi_materiales_admin;
create policy mpi_materiales_propio on public.mpi_materiales_admin
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists mpi_materiales_lectura on public.mpi_materiales_config;
create policy mpi_materiales_lectura on public.mpi_materiales_config
  for select to anon, authenticated using (id = 1);

drop policy if exists mpi_materiales_edicion on public.mpi_materiales_config;
create policy mpi_materiales_edicion on public.mpi_materiales_config
  for update to authenticated
  using (exists (select 1 from public.mpi_materiales_admin where user_id = (select auth.uid())))
  with check (id = 1 and exists (select 1 from public.mpi_materiales_admin where user_id = (select auth.uid())));

create or replace function public.mpi_materiales_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists mpi_materiales_actualizar on public.mpi_materiales_config;
create trigger mpi_materiales_actualizar before update on public.mpi_materiales_config
for each row execute function public.mpi_materiales_revision();
revoke all on function public.mpi_materiales_revision() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
