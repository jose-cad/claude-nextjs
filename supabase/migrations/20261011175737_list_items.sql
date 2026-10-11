-- Listas pessoais: "Quero assistir" e "Favoritos"
create type public.list_type as enum ('want', 'favorite');

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_movie_id integer not null check (tmdb_movie_id > 0),
  list_type public.list_type not null,
  title text not null check (char_length(title) between 1 and 300),
  poster_path text check (poster_path is null or poster_path like '/%'),
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_movie_id, list_type)
);

create index list_items_user_created_idx on public.list_items (user_id, created_at desc);

-- RLS: cada pessoa só enxerga, cria e apaga as próprias linhas (não há update)
alter table public.list_items enable row level security;

create policy "cada um lê os próprios itens" on public.list_items
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "cada um cria os próprios itens" on public.list_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "cada um apaga os próprios itens" on public.list_items
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.list_items to authenticated;

-- Regra de negócio no próprio banco: marcar como favorito tira de "quero assistir"
create function public.remove_want_when_favorite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.list_type = 'favorite' then
    delete from public.list_items
    where user_id = new.user_id
      and tmdb_movie_id = new.tmdb_movie_id
      and list_type = 'want';
  end if;
  return new;
end;
$$;

create trigger list_items_favorite_removes_want
  after insert on public.list_items
  for each row execute function public.remove_want_when_favorite();
