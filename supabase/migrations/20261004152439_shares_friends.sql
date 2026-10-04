-- Phase 2: share links, friendships, claiming a received recipe, genealogy.

-- ---------------------------------------------------------------------------
-- shares
-- ---------------------------------------------------------------------------

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  -- Unguessable (128 random bits, base64url), generated server-side.
  token text not null unique check (char_length(token) >= 22),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 500),
  created_at timestamptz not null default now()
);

create index shares_recipe_idx on public.shares (recipe_id);
create index shares_sender_idx on public.shares (sender_id);

-- When a share targets specific friends (used from phase 5: push "recette reçue").
create table public.share_recipients (
  share_id uuid not null references public.shares (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (share_id, user_id)
);

alter table public.notebook_entries
  add constraint notebook_entries_share_id_fkey foreign key (share_id) references public.shares (id) on delete set null;

-- ---------------------------------------------------------------------------
-- friendships: one row per pair, user_a < user_b.
-- Created automatically when someone adds a recipe received from someone else.
-- ---------------------------------------------------------------------------

create table public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index friendships_user_b_idx on public.friendships (user_b);

create function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.user_a = least(p_a, p_b) and f.user_b = greatest(p_a, p_b) and f.status = 'accepted'
  );
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.shares enable row level security;
alter table public.share_recipients enable row level security;
alter table public.friendships enable row level security;
revoke all on public.shares, public.share_recipients, public.friendships from anon;

-- Shares: the sender sees and creates their own; the public page reads by token server-side.
create policy "shares: read own"
  on public.shares for select
  to authenticated
  using ((select auth.uid()) = sender_id);

create policy "shares: create for a readable recipe"
  on public.shares for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.deleted_at is null)
  );

revoke update, delete on public.shares from authenticated;

create policy "share_recipients: sender manages"
  on public.share_recipients for all
  to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and s.sender_id = (select auth.uid())))
  with check (
    exists (select 1 from public.shares s where s.id = share_id and s.sender_id = (select auth.uid()))
    and public.are_friends((select auth.uid()), user_id)
  );

create policy "share_recipients: recipient reads"
  on public.share_recipients for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Friendships: both sides read; either side can end it. Creation happens in claim_share.
create policy "friendships: read own"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "friendships: delete own"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

revoke insert, update on public.friendships from authenticated;

-- Profiles: friends can now see each other (first name, avatar, notebook colour).
create policy "profiles: read friends"
  on public.profiles for select
  to authenticated
  using (public.are_friends((select auth.uid()), id));

-- Recipes: friends read recipes shared with friends (or by link).
create policy "recipes: read friends'"
  on public.recipes for select
  to authenticated
  using (
    visibility in ('friends', 'link')
    and deleted_at is null
    and public.are_friends((select auth.uid()), author_id)
  );

-- ---------------------------------------------------------------------------
-- claim_share: "Ajouter à mon carnet" from a share link.
-- Adds the recipe to the caller's notebook (received from the sender) and
-- makes the two people friends. Idempotent.
-- ---------------------------------------------------------------------------

create function public.claim_share(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_share record;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select s.id, s.recipe_id, s.sender_id into v_share
  from public.shares s
  join public.recipes r on r.id = s.recipe_id
  where s.token = p_token and r.deleted_at is null;

  if not found then
    raise exception 'share not found' using errcode = 'P0002';
  end if;

  insert into public.notebook_entries (user_id, recipe_id, received_from, share_id)
  values (v_uid, v_share.recipe_id, nullif(v_share.sender_id, v_uid), v_share.id)
  on conflict (user_id, recipe_id) do nothing;

  if v_share.sender_id <> v_uid then
    insert into public.friendships (user_a, user_b)
    values (least(v_uid, v_share.sender_id), greatest(v_uid, v_share.sender_id))
    on conflict do nothing;
  end if;

  return v_share.recipe_id;
end;
$$;

revoke execute on function public.claim_share(text) from public, anon;
grant execute on function public.claim_share(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Genealogy: how a recipe travelled from its author to a given person,
-- following notebook_entries.received_from. Ordered from the author (position 0).
-- Exposes first names and avatars only. Cycle-safe, depth ≤ 20.
-- ---------------------------------------------------------------------------

create function public.recipe_genealogy(p_recipe_id uuid, p_from_user uuid)
returns table (
  "position" int,
  user_id uuid,
  first_name text,
  avatar_color text,
  avatar_url text,
  received_at timestamptz,
  is_author boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_chain uuid[] := array[]::uuid[];
  v_dates timestamptz[] := array[]::timestamptz[];
  v_current uuid := p_from_user;
  v_entry record;
  i int;
begin
  select r.author_id into v_author from public.recipes r where r.id = p_recipe_id;
  if v_author is null then
    return;
  end if;

  -- Walk up from p_from_user through received_from.
  while v_current is not null and not (v_current = any (v_chain)) and coalesce(array_length(v_chain, 1), 0) < 20 loop
    select ne.received_from, ne.added_at into v_entry
    from public.notebook_entries ne
    where ne.user_id = v_current and ne.recipe_id = p_recipe_id;

    v_chain := array_prepend(v_current, v_chain);
    v_dates := array_prepend(case when found then v_entry.added_at end, v_dates);

    exit when v_current = v_author or not found;
    v_current := v_entry.received_from;
  end loop;

  -- The chain always starts with the author.
  if coalesce(v_chain[1] <> v_author, true) then
    v_chain := array_prepend(v_author, v_chain);
    v_dates := array_prepend(null::timestamptz, v_dates);
  end if;

  for i in 1 .. array_length(v_chain, 1) loop
    return query
      select i - 1, p.id, p.first_name, p.avatar_color::text, p.avatar_url, v_dates[i], p.id = v_author
      from public.profiles p
      where p.id = v_chain[i];
  end loop;
end;
$$;

-- Service role only (public share page); signed-in users go through my_recipe_genealogy.
revoke execute on function public.recipe_genealogy(uuid, uuid) from public, anon, authenticated;

create function public.my_recipe_genealogy(p_recipe_id uuid)
returns table (
  "position" int,
  user_id uuid,
  first_name text,
  avatar_color text,
  avatar_url text,
  received_at timestamptz,
  is_author boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.*
  from public.recipe_genealogy(p_recipe_id, auth.uid()) g
  where exists (
    select 1 from public.notebook_entries ne
    where ne.user_id = auth.uid() and ne.recipe_id = p_recipe_id
  );
$$;

revoke execute on function public.my_recipe_genealogy(uuid) from public, anon;
grant execute on function public.my_recipe_genealogy(uuid) to authenticated;

-- How far a recipe went: people who adopted it (author excluded), and how many got it from the caller.
create function public.recipe_reach(p_recipe_id uuid)
returns table (adopted int, onward int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.notebook_entries ne
       join public.recipes r on r.id = ne.recipe_id
     where ne.recipe_id = p_recipe_id and ne.user_id <> r.author_id),
    (select count(*)::int from public.notebook_entries ne
     where ne.recipe_id = p_recipe_id and auth.uid() is not null and ne.received_from = auth.uid());
$$;

revoke execute on function public.recipe_reach(uuid) from public, anon;
grant execute on function public.recipe_reach(uuid) to authenticated, service_role;
