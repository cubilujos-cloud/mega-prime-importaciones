-- Ejecutar UNA VEZ en Supabase > SQL Editor; es seguro volver a ejecutarlo.
-- Conserva videos, archivos, usuarios y políticas existentes.
begin;
alter table public.videos add column if not exists group_name text not null default 'Novedades';
alter table public.videos add column if not exists subgroup_name text not null default '';
alter table public.videos add column if not exists featured boolean not null default false;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='videos_group_name_length' and conrelid='public.videos'::regclass) then
  alter table public.videos add constraint videos_group_name_length check(length(group_name) between 1 and 90);
 end if;
 if not exists(select 1 from pg_constraint where conname='videos_subgroup_name_length' and conrelid='public.videos'::regclass) then
  alter table public.videos add constraint videos_subgroup_name_length check(length(subgroup_name)<=90);
 end if;
end $$;
create index if not exists videos_public_groups on public.videos(group_name,subgroup_name,sort_order) where published;
commit;
notify pgrst, 'reload schema';
