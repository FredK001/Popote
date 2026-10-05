-- Phase 5 (batch 2): variants, "À la une" (opt-in, whole community), monthly
-- challenge, badges, and "Ajouter à mon carnet" for any readable recipe.

-- ---------------------------------------------------------------------------
-- "Proposer à la une": the author opts a recipe in; then any signed-in user can
-- read it (and its author's first name and avatar). Off by default.
-- ---------------------------------------------------------------------------

alter table public.recipes add column featured boolean not null default false;
grant update (featured) on public.recipes to authenticated;

create index recipes_featured_idx on public.recipes (created_at desc) where featured and deleted_at is null;

create policy "recipes: read featured"
  on public.recipes for select
  to authenticated
  using (featured and deleted_at is null and visibility <> 'private');

create policy "profiles: read featured authors"
  on public.profiles for select
  to authenticated
  using (exists (
    select 1 from public.recipes r
    where r.author_id = profiles.id and r.featured and r.deleted_at is null and r.visibility <> 'private'
  ));

create or replace function public.can_read_recipe(p_recipe_id uuid, p_user uuid)
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
        or (r.featured and r.deleted_at is null and r.visibility <> 'private')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- "Ajouter à mon carnet" for a recipe the caller can already read (a friend's,
-- or one à la une). Received from its author. Idempotent.
-- ---------------------------------------------------------------------------

create function public.add_to_notebook(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
begin
  if v_uid is null or not public.can_read_recipe(p_recipe_id, v_uid) then
    raise exception 'recipe not readable' using errcode = '42501';
  end if;
  select author_id into v_author from public.recipes where id = p_recipe_id and deleted_at is null;
  if v_author is null then
    raise exception 'recipe not readable' using errcode = '42501';
  end if;
  insert into public.notebook_entries (user_id, recipe_id, received_from)
  values (v_uid, p_recipe_id, nullif(v_author, v_uid))
  on conflict do nothing;
end;
$$;

revoke execute on function public.add_to_notebook(uuid) from public, anon;
grant execute on function public.add_to_notebook(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Variants: a recipe written from another one ("Créer ma variante").
-- The source must be readable by the variant's author.
-- ---------------------------------------------------------------------------

create function public.check_variant_of()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.variant_of is not null
     and (new.variant_of = new.id or not public.can_read_recipe(new.variant_of, new.author_id)) then
    raise exception 'variant source not readable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger recipes_check_variant_of
  before insert or update of variant_of on public.recipes
  for each row execute function public.check_variant_of();

alter table public.activity drop constraint activity_type_check;
alter table public.activity add constraint activity_type_check check (type in ('published', 'adopted', 'cooked', 'variant'));

create function public.log_recipe_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.variant_of is not null and old.variant_of is distinct from new.variant_of and new.visibility <> 'private' then
    insert into public.activity (actor_id, type, recipe_id, target_user_id)
    select new.author_id, 'variant', new.id, src.author_id
    from public.recipes src where src.id = new.variant_of;
  end if;
  return new;
end;
$$;

create trigger recipes_log_variant
  after update of variant_of on public.recipes
  for each row execute function public.log_recipe_variant();

revoke execute on function public.check_variant_of() from public, anon, authenticated;
revoke execute on function public.log_recipe_variant() from public, anon, authenticated;

-- Variants of a recipe that the caller can read.
create function public.recipe_variants(p_recipe_id uuid)
returns table (id uuid, title text, photo_path text, author_first_name text, author_avatar_color text, is_mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.title, v.photo_path, p.first_name, p.avatar_color::text, v.author_id = auth.uid()
  from public.recipes v
  join public.profiles p on p.id = v.author_id
  where v.variant_of = p_recipe_id
    and v.deleted_at is null
    and public.can_read_recipe(p_recipe_id, auth.uid())
    and public.can_read_recipe(v.id, auth.uid())
  order by v.created_at desc
  limit 20;
$$;

revoke execute on function public.recipe_variants(uuid) from public, anon;
grant execute on function public.recipe_variants(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- "À la une": opted-in recipes from the whole community.
-- p_kind 'week': most adopted + cooked over p_days (then newest);
-- p_kind 'shared': most adopted over p_days, only those adopted at least once.
-- ---------------------------------------------------------------------------

create function public.featured_recipes(p_kind text, p_days int default 7, p_limit int default 10)
returns table (
  id uuid, title text, photo_path text, prep_minutes smallint, cook_minutes smallint,
  author_first_name text, author_avatar_color text, author_avatar_url text, score bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with scores as (
    select a.recipe_id, count(*) as n
    from public.activity a
    where a.created_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
      and (a.type = 'adopted' or (p_kind = 'week' and a.type = 'cooked'))
    group by a.recipe_id
  )
  select r.id, r.title, r.photo_path, r.prep_minutes, r.cook_minutes,
    p.first_name, p.avatar_color::text, p.avatar_url, coalesce(s.n, 0)
  from public.recipes r
  join public.profiles p on p.id = r.author_id
  left join scores s on s.recipe_id = r.id
  where r.featured and r.deleted_at is null and r.visibility <> 'private'
    and auth.uid() is not null
    and (p_kind = 'week' or s.n > 0)
  order by coalesce(s.n, 0) desc, r.created_at desc
  limit least(greatest(p_limit, 1), 30);
$$;

revoke execute on function public.featured_recipes(text, int, int) from public, anon;
grant execute on function public.featured_recipes(text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Monthly challenge: a "Je l'ai faite !" can join this month's theme. Joining
-- shows the photo and first name to the whole community (explicit opt-in).
-- ---------------------------------------------------------------------------

alter table public.cooks add column challenge_key text check (challenge_key ~ '^\d{4}-\d{2}$');
create index cooks_challenge_idx on public.cooks (challenge_key, created_at desc) where challenge_key is not null;

create function public.challenge_entries(p_key text, p_limit int default 30)
returns table (
  id uuid, photo_path text, first_name text, avatar_color text, avatar_url text,
  recipe_id uuid, recipe_title text, is_mine boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.photo_path, p.first_name, p.avatar_color::text, p.avatar_url,
    -- The recipe itself only when the viewer may open it.
    case when public.can_read_recipe(c.recipe_id, auth.uid()) then c.recipe_id end,
    case when public.can_read_recipe(c.recipe_id, auth.uid()) then r.title end,
    c.user_id = auth.uid(), c.created_at
  from public.cooks c
  join public.profiles p on p.id = c.user_id
  join public.recipes r on r.id = c.recipe_id
  where c.challenge_key = p_key and c.photo_path is not null and auth.uid() is not null
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 60);
$$;

revoke execute on function public.challenge_entries(text, int) from public, anon;
grant execute on function public.challenge_entries(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Badges: the caller's own counters; thresholds live in the app.
-- ---------------------------------------------------------------------------

create function public.my_stats()
returns table (written int, cooked int, adopted int, friends int, challenges int, featured int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.recipes where author_id = auth.uid() and deleted_at is null)::int,
    (select count(distinct recipe_id) from public.cooks where user_id = auth.uid())::int,
    (select count(*) from public.notebook_entries ne join public.recipes r on r.id = ne.recipe_id
      where r.author_id = auth.uid() and ne.user_id <> auth.uid())::int,
    (select count(*) from public.friendships where auth.uid() in (user_a, user_b) and status = 'accepted')::int,
    (select count(distinct challenge_key) from public.cooks where user_id = auth.uid() and challenge_key is not null)::int,
    (select count(*) from public.recipes where author_id = auth.uid() and featured and deleted_at is null)::int;
$$;

revoke execute on function public.my_stats() from public, anon;
grant execute on function public.my_stats() to authenticated;
