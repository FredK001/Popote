-- Phase 0: foundations. Profiles (one per auth user) and categories.
-- Every table has RLS enabled with explicit policies.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Colour tokens a user can pick (notebook cover, categories). Mirrors src/styles/tokens.css.
create domain public.color_token as text
  check (value in ('encre', 'tomate', 'sauge', 'prune', 'laiton', 'abricot', 'bleu-nuit'));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 50),
  avatar_url text,
  notebook_name text check (char_length(notebook_name) <= 60),
  notebook_color public.color_token not null default 'tomate',
  -- Set when the user finishes onboarding (name, cover, avatar).
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile and notebook settings, one row per auth user.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Phase 0: a user only sees their own profile. Friends' profiles open up in phase 2.
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Rows are created by the trigger below, never by clients.
revoke insert, delete on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;

-- Create the profile when an auth user is created.
-- first_name comes from the magic-link sign-up form, or from the Google profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(new.raw_user_meta_data ->> 'given_name', ''),
      split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1)
    ), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- null = default category, shared by everyone.
  user_id uuid references public.profiles (id) on delete cascade,
  -- Default categories carry a key translated by the UI (src/messages); custom ones a name.
  default_key text unique,
  name text check (char_length(name) between 1 and 40),
  color_token public.color_token not null,
  icon_key text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_default_or_custom check (
    (user_id is null and default_key is not null and name is null)
    or (user_id is not null and default_key is null and name is not null)
  )
);

create unique index categories_user_name_key on public.categories (user_id, lower(name)) where user_id is not null;
create index categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "categories: read defaults and own"
  on public.categories for select
  to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

create policy "categories: insert own"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "categories: update own"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories: delete own"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.categories from anon;

-- Default categories (production data, not seed).
insert into public.categories (default_key, color_token, icon_key, position) values
  ('mains', 'tomate', 'c-plat', 1),
  ('starters', 'sauge', 'c-entree', 2),
  ('desserts', 'prune', 'c-dessert', 3),
  ('apero', 'laiton', 'c-apero', 4),
  ('brunch', 'abricot', 'c-brunch', 5);
