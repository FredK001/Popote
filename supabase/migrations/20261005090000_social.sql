-- Phase 5 (batch 1): "Je l'ai faite !", activity feed, shopping list.

-- ---------------------------------------------------------------------------
-- Who can read a recipe (same rule as the recipes RLS policies), for
-- security-definer functions that must not leak other recipes.
-- ---------------------------------------------------------------------------

create function public.can_read_recipe(p_recipe_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and (
        r.author_id = p_user
        or exists (select 1 from public.notebook_entries ne where ne.recipe_id = r.id and ne.user_id = p_user)
        or (r.visibility in ('friends', 'link') and r.deleted_at is null and public.are_friends(p_user, r.author_id))
      )
  );
$$;

revoke execute on function public.can_read_recipe(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- cooks: "Je l'ai faite !"
-- ---------------------------------------------------------------------------

create table public.cooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- recipe-photos bucket, user's own folder.
  photo_path text,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);

create index cooks_recipe_idx on public.cooks (recipe_id, created_at desc);
create index cooks_user_idx on public.cooks (user_id);

alter table public.cooks enable row level security;
revoke all on public.cooks from anon;

create policy "cooks: read own"
  on public.cooks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cooks: add for a readable recipe"
  on public.cooks for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.recipes r where r.id = recipe_id)
    and (photo_path is null or photo_path like (select auth.uid())::text || '/%')
  );

create policy "cooks: delete own"
  on public.cooks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.cooks from authenticated;

-- Photos and first names of everyone who made a recipe the caller can read.
create function public.recipe_cooks(p_recipe_id uuid)
returns table (
  id uuid,
  user_id uuid,
  first_name text,
  avatar_color text,
  avatar_url text,
  photo_path text,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.user_id, p.first_name, p.avatar_color::text, p.avatar_url, c.photo_path, c.note, c.created_at
  from public.cooks c
  join public.profiles p on p.id = c.user_id
  where c.recipe_id = p_recipe_id
    and public.can_read_recipe(p_recipe_id, auth.uid())
  order by c.created_at desc
  limit 60;
$$;

revoke execute on function public.recipe_cooks(uuid) from public, anon;
grant execute on function public.recipe_cooks(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- activity: source of the "Copains" feed, written by triggers only.
-- ---------------------------------------------------------------------------

create table public.activity (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('published', 'adopted', 'cooked')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  cook_id uuid references public.cooks (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index activity_actor_time_idx on public.activity (actor_id, created_at desc);
create index activity_target_idx on public.activity (target_user_id, created_at desc);

alter table public.activity enable row level security;
-- Read only through friends_feed(); never written by clients.
revoke all on public.activity from anon, authenticated;

create function public.log_recipe_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility <> 'private' then
    insert into public.activity (actor_id, type, recipe_id) values (new.author_id, 'published', new.id);
  end if;
  return new;
end;
$$;

create trigger recipes_log_published
  after insert on public.recipes
  for each row execute function public.log_recipe_published();

create function public.log_recipe_adopted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.received_from is not null then
    insert into public.activity (actor_id, type, recipe_id, target_user_id)
    values (new.user_id, 'adopted', new.recipe_id, new.received_from);
  end if;
  return new;
end;
$$;

create trigger notebook_entries_log_adopted
  after insert on public.notebook_entries
  for each row execute function public.log_recipe_adopted();

create function public.log_recipe_cooked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity (actor_id, type, recipe_id, target_user_id, cook_id)
  select new.user_id, 'cooked', new.recipe_id, r.author_id, new.id
  from public.recipes r where r.id = new.recipe_id;
  return new;
end;
$$;

create trigger cooks_log_cooked
  after insert on public.cooks
  for each row execute function public.log_recipe_cooked();

revoke execute on function public.log_recipe_published() from public, anon, authenticated;
revoke execute on function public.log_recipe_adopted() from public, anon, authenticated;
revoke execute on function public.log_recipe_cooked() from public, anon, authenticated;

-- The "Copains" feed: what friends did, plus what others did with the caller's
-- recipes, limited to recipes the caller can read. Newest first, keyset paging.
create function public.friends_feed(p_limit int default 30, p_before timestamptz default null)
returns table (
  id bigint,
  type text,
  created_at timestamptz,
  actor_id uuid,
  actor_first_name text,
  actor_avatar_color text,
  actor_avatar_url text,
  recipe_id uuid,
  recipe_title text,
  recipe_photo_path text,
  target_is_me boolean,
  target_first_name text,
  cook_photo_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id, a.type, a.created_at,
    a.actor_id, actor.first_name, actor.avatar_color::text, actor.avatar_url,
    r.id, r.title, r.photo_path,
    a.target_user_id = auth.uid(), target.first_name,
    c.photo_path
  from public.activity a
  join public.profiles actor on actor.id = a.actor_id
  join public.recipes r on r.id = a.recipe_id and r.deleted_at is null
  left join public.profiles target on target.id = a.target_user_id
  left join public.cooks c on c.id = a.cook_id
  where a.actor_id <> auth.uid()
    and (public.are_friends(auth.uid(), a.actor_id) or a.target_user_id = auth.uid())
    and public.can_read_recipe(r.id, auth.uid())
    and (p_before is null or a.created_at < p_before)
  order by a.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.friends_feed(int, timestamptz) from public, anon;
grant execute on function public.friends_feed(int, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- shopping_items: personal shopping list, grouped by aisle in the app.
-- ---------------------------------------------------------------------------

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric(10, 3) check (quantity > 0),
  unit text check (char_length(unit) <= 30),
  ingredient_key text,
  aisle text not null default 'autre' check (aisle in (
    'fruits-legumes', 'cremerie', 'boucherie', 'poissonnerie', 'epicerie-salee',
    'epicerie-sucree', 'boulangerie', 'surgeles', 'autre'
  )),
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_items_user_idx on public.shopping_items (user_id, aisle, created_at);

alter table public.shopping_items enable row level security;
revoke all on public.shopping_items from anon;

create policy "shopping_items: own"
  on public.shopping_items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
