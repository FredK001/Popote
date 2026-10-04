-- Phase 1: recipes, ingredients, steps, notebook entries, photo storage.
-- The notebook references recipes, it never copies them.

-- ---------------------------------------------------------------------------
-- profiles: avatar colour (used when there is no photo)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column avatar_color public.color_token not null default 'tomate';

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  servings smallint not null default 4 check (servings between 1 and 50),
  prep_minutes smallint check (prep_minutes between 0 and 2880),
  cook_minutes smallint check (cook_minutes between 0 and 2880),
  difficulty smallint check (difficulty between 1 and 3),
  -- Path inside the recipe-photos bucket: {author_id}/{file}.webp
  photo_path text,
  source_url text check (source_url ~* '^https?://'),
  origin_label text check (char_length(origin_label) <= 80),
  origin_year smallint check (origin_year between 1800 and 2100),
  variant_of uuid references public.recipes (id) on delete set null,
  visibility text not null default 'friends' check (visibility in ('private', 'friends', 'link')),
  tags text[] not null default '{}',
  -- Soft delete: people who saved the recipe keep it.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_author_id_idx on public.recipes (author_id);
create index recipes_variant_of_idx on public.recipes (variant_of);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  -- Stable id: "ma version" overrides and the shopping list point to it.
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null,
  quantity numeric(10, 3) check (quantity > 0),
  unit text check (char_length(unit) <= 30),
  name text not null check (char_length(name) between 1 and 120),
  ingredient_key text,
  aisle text,
  uncertain boolean not null default false
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null,
  text text not null check (char_length(text) between 1 and 2000),
  timer_seconds integer check (timer_seconds between 1 and 86400)
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id, position);

-- ---------------------------------------------------------------------------
-- notebook_entries
-- ---------------------------------------------------------------------------

create table public.notebook_entries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  -- Phase 2: who sent it, and through which share.
  received_from uuid references public.profiles (id) on delete set null,
  share_id uuid,
  personal_note text check (char_length(personal_note) <= 2000),
  -- "Ma version": { "<ingredient id>": quantity for the recipe's base servings }
  quantity_overrides jsonb not null default '{}' check (jsonb_typeof(quantity_overrides) = 'object'),
  added_at timestamptz not null default now(),
  last_opened_at timestamptz,
  primary key (user_id, recipe_id)
);

create index notebook_entries_recipe_idx on public.notebook_entries (recipe_id);
create index notebook_entries_recent_idx on public.notebook_entries (user_id, last_opened_at desc nulls last);

-- The author always has their own recipe in their notebook.
create function public.add_recipe_to_author_notebook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notebook_entries (user_id, recipe_id)
  values (new.author_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger recipes_add_to_author_notebook
  after insert on public.recipes
  for each row execute function public.add_recipe_to_author_notebook();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.notebook_entries enable row level security;

revoke all on public.recipes, public.recipe_ingredients, public.recipe_steps, public.notebook_entries from anon;

-- recipes: the author, and anyone who has it in their notebook.
-- (Friends' recipes open up in phase 2; the public /r/[token] page reads server-side.)
create policy "recipes: read own or saved"
  on public.recipes for select
  to authenticated
  using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.notebook_entries ne
      where ne.recipe_id = recipes.id and ne.user_id = (select auth.uid())
    )
  );

create policy "recipes: insert as author"
  on public.recipes for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "recipes: update own"
  on public.recipes for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

-- No hard delete from clients: soft delete through deleted_at.
revoke delete on public.recipes from authenticated;
-- author_id, created_at and id cannot be changed.
revoke update on public.recipes from authenticated;
grant update (
  title, description, servings, prep_minutes, cook_minutes, difficulty, photo_path,
  source_url, origin_label, origin_year, variant_of, visibility, tags, deleted_at
) on public.recipes to authenticated;

-- ingredients and steps follow their recipe.
create policy "recipe_ingredients: read with recipe"
  on public.recipe_ingredients for select
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));

create policy "recipe_ingredients: write own recipe"
  on public.recipe_ingredients for all
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));

create policy "recipe_steps: read with recipe"
  on public.recipe_steps for select
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));

create policy "recipe_steps: write own recipe"
  on public.recipe_steps for all
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));

-- notebook entries: strictly personal.
create policy "notebook_entries: read own"
  on public.notebook_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notebook_entries: update own"
  on public.notebook_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    -- Only a default category or one of the user's own.
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id))
  );

create policy "notebook_entries: delete own"
  on public.notebook_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Entries are created by triggers (own recipes) or server-side (received recipes, phase 2).
revoke insert on public.notebook_entries from authenticated;
revoke update on public.notebook_entries from authenticated;
grant update (category_id, personal_note, quantity_overrides, last_opened_at) on public.notebook_entries to authenticated;

-- ---------------------------------------------------------------------------
-- save_recipe: create or update a recipe with its ingredients and steps, atomically.
-- Runs as the caller (security invoker): RLS applies.
-- Ingredient and step ids are kept when present, so overrides stay attached.
-- ---------------------------------------------------------------------------

create function public.save_recipe(
  p_recipe jsonb,
  p_ingredients jsonb,
  p_steps jsonb,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_recipe ->> 'id', '')::uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.recipes (
      author_id, title, description, servings, prep_minutes, cook_minutes, difficulty,
      photo_path, source_url, origin_label, origin_year, tags
    ) values (
      v_uid,
      p_recipe ->> 'title',
      nullif(p_recipe ->> 'description', ''),
      coalesce((p_recipe ->> 'servings')::smallint, 4),
      (p_recipe ->> 'prep_minutes')::smallint,
      (p_recipe ->> 'cook_minutes')::smallint,
      (p_recipe ->> 'difficulty')::smallint,
      nullif(p_recipe ->> 'photo_path', ''),
      nullif(p_recipe ->> 'source_url', ''),
      nullif(p_recipe ->> 'origin_label', ''),
      (p_recipe ->> 'origin_year')::smallint,
      coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}')
    )
    returning id into v_id;
  else
    update public.recipes set
      title = p_recipe ->> 'title',
      description = nullif(p_recipe ->> 'description', ''),
      servings = coalesce((p_recipe ->> 'servings')::smallint, servings),
      prep_minutes = (p_recipe ->> 'prep_minutes')::smallint,
      cook_minutes = (p_recipe ->> 'cook_minutes')::smallint,
      difficulty = (p_recipe ->> 'difficulty')::smallint,
      photo_path = nullif(p_recipe ->> 'photo_path', ''),
      source_url = nullif(p_recipe ->> 'source_url', ''),
      origin_label = nullif(p_recipe ->> 'origin_label', ''),
      origin_year = (p_recipe ->> 'origin_year')::smallint,
      tags = coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}')
    where id = v_id and author_id = v_uid and deleted_at is null;

    if not found then
      raise exception 'recipe not found or not yours' using errcode = '42501';
    end if;
  end if;

  -- Ingredients: drop removed ones, upsert the rest in order.
  delete from public.recipe_ingredients
  where recipe_id = v_id
    and id not in (
      select (e ->> 'id')::uuid from jsonb_array_elements(p_ingredients) e where nullif(e ->> 'id', '') is not null
    );

  insert into public.recipe_ingredients (id, recipe_id, position, quantity, unit, name, ingredient_key, aisle)
  select
    coalesce(nullif(e ->> 'id', '')::uuid, gen_random_uuid()),
    v_id,
    (ord - 1)::smallint,
    (e ->> 'quantity')::numeric,
    nullif(e ->> 'unit', ''),
    e ->> 'name',
    nullif(e ->> 'ingredient_key', ''),
    nullif(e ->> 'aisle', '')
  from jsonb_array_elements(p_ingredients) with ordinality as t(e, ord)
  on conflict (id) do update set
    position = excluded.position,
    quantity = excluded.quantity,
    unit = excluded.unit,
    name = excluded.name,
    ingredient_key = excluded.ingredient_key,
    aisle = excluded.aisle
  -- Never move an ingredient that belongs to another recipe.
  where public.recipe_ingredients.recipe_id = v_id;

  -- Steps: same approach.
  delete from public.recipe_steps
  where recipe_id = v_id
    and id not in (
      select (e ->> 'id')::uuid from jsonb_array_elements(p_steps) e where nullif(e ->> 'id', '') is not null
    );

  insert into public.recipe_steps (id, recipe_id, position, text, timer_seconds)
  select
    coalesce(nullif(e ->> 'id', '')::uuid, gen_random_uuid()),
    v_id,
    (ord - 1)::smallint,
    e ->> 'text',
    (e ->> 'timer_seconds')::integer
  from jsonb_array_elements(p_steps) with ordinality as t(e, ord)
  on conflict (id) do update set
    position = excluded.position,
    text = excluded.text,
    timer_seconds = excluded.timer_seconds
  where public.recipe_steps.recipe_id = v_id;

  update public.notebook_entries
  set category_id = p_category_id
  where user_id = v_uid and recipe_id = v_id;

  return v_id;
end;
$$;

revoke execute on function public.save_recipe(jsonb, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_recipe(jsonb, jsonb, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: recipe photos and avatars. Public read (share page and OG image need it,
-- paths are unguessable), write only inside the user's own folder.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recipe-photos', 'recipe-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "photos: upload in own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('recipe-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos: update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('recipe-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('recipe-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
