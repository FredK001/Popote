-- Phase 5 (batch 3): "Frigo vide". The recipes the caller can cook from: their
-- notebook plus their friends' shared recipes, with ingredient names only.

create function public.fridge_recipes()
returns table (
  id uuid,
  title text,
  photo_path text,
  author_first_name text,
  in_notebook boolean,
  ingredients jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select r.id, true as in_notebook
    from public.notebook_entries ne
    join public.recipes r on r.id = ne.recipe_id
    where ne.user_id = auth.uid()
  ),
  friends as (
    select r.id, false as in_notebook
    from public.recipes r
    where r.visibility in ('friends', 'link') and r.deleted_at is null
      and r.author_id <> auth.uid()
      and public.are_friends(auth.uid(), r.author_id)
      and not exists (select 1 from mine m where m.id = r.id)
  ),
  pool as (select * from mine union all select * from friends)
  select r.id, r.title, r.photo_path,
    case when r.author_id = auth.uid() then null else p.first_name end,
    pool.in_notebook,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name, 'ingredient_key', i.ingredient_key) order by i.position)
      from public.recipe_ingredients i where i.recipe_id = r.id
    ), '[]'::jsonb)
  from pool
  join public.recipes r on r.id = pool.id
  join public.profiles p on p.id = r.author_id
  where auth.uid() is not null
  limit 500;
$$;

revoke execute on function public.fridge_recipes() from public, anon;
grant execute on function public.fridge_recipes() to authenticated;
