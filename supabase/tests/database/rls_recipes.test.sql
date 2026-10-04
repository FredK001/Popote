-- RLS tests for recipes, ingredients, steps and notebook entries (phase 1). Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@example.com', '{"first_name": "Alice"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@example.com', '{"first_name": "Bob"}');

insert into public.categories (id, user_id, name, color_token, icon_key)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bob only', 'sauge', 'c-tout');

-- ---------------------------------------------------------------- Alice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

create temp table ids (recipe_id uuid) on commit drop;
grant all on ids to authenticated;

insert into ids
select public.save_recipe(
  '{"title": "Tarte fine", "servings": 6, "prep_minutes": 20, "cook_minutes": 25, "difficulty": 1}',
  '[{"quantity": 5, "name": "pommes"}, {"quantity": 100, "unit": "g", "name": "sucre"}]',
  '[{"text": "Préchauffe le four."}, {"text": "Enfourne.", "timer_seconds": 1500}]',
  null
);

select is((select count(*) from public.recipes)::int, 1, 'Alice created a recipe');
select is((select count(*) from public.recipe_ingredients)::int, 2, 'with 2 ingredients');
select is((select count(*) from public.recipe_steps)::int, 2, 'and 2 steps');
select is(
  (select count(*) from public.notebook_entries where recipe_id = (select recipe_id from ids))::int, 1,
  'the recipe is in Alice''s notebook automatically');

-- Update keeps ingredient ids (ma version stays attached).
create temp table first_ingredient on commit drop as
  select id from public.recipe_ingredients order by position limit 1;
grant all on first_ingredient to authenticated;

select is(
  public.save_recipe(
    jsonb_build_object('id', (select recipe_id from ids), 'title', 'Tarte fine aux pommes', 'servings', 6),
    jsonb_build_array(
      jsonb_build_object('id', (select id from first_ingredient), 'quantity', 6, 'name', 'pommes golden')
    ),
    '[{"text": "Préchauffe le four."}]',
    null
  ),
  (select recipe_id from ids),
  'update returns the same recipe id');
select is((select name from public.recipe_ingredients where id = (select id from first_ingredient)), 'pommes golden', 'ingredient updated in place');
select is((select count(*) from public.recipe_ingredients)::int, 1, 'removed ingredient deleted');

update public.notebook_entries set personal_note = 'Moins de sucre' where recipe_id = (select recipe_id from ids);
select is((select personal_note from public.notebook_entries), 'Moins de sucre', 'Alice writes her note');

select throws_ok(
  $$ update public.notebook_entries set recipe_id = gen_random_uuid() $$,
  '42501', null, 'Alice cannot repoint an entry to another recipe');

select throws_ok(
  $$ update public.notebook_entries set category_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '42501', null, 'Alice cannot file a recipe under Bob''s category');

select throws_ok(
  $$ insert into public.notebook_entries (user_id, recipe_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid()) $$,
  '42501', null, 'clients cannot insert notebook entries directly');

select throws_ok(
  $$ delete from public.recipes $$,
  '42501', null, 'no hard delete of recipes');

select throws_ok(
  $$ update public.recipes set author_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501', null, 'author cannot be changed');

-- ---------------------------------------------------------------- Bob
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}', true);

select is((select count(*) from public.recipes)::int, 0, 'Bob cannot read Alice''s recipe');
select is((select count(*) from public.recipe_ingredients)::int, 0, 'nor its ingredients');
select is((select count(*) from public.recipe_steps)::int, 0, 'nor its steps');
select is((select count(*) from public.notebook_entries)::int, 0, 'nor Alice''s notebook');

select throws_ok(
  format($$ select public.save_recipe('{"id": "%s", "title": "Pirate"}', '[]', '[]', null) $$, (select recipe_id from ids)),
  '42501', null, 'Bob cannot overwrite Alice''s recipe');

select throws_ok(
  format($$ insert into public.recipe_ingredients (recipe_id, position, name) values ('%s', 9, 'poison') $$, (select recipe_id from ids)),
  '42501', null, 'Bob cannot add an ingredient to Alice''s recipe');

update public.notebook_entries set personal_note = 'hacked';
reset role;
select is((select personal_note from public.notebook_entries where recipe_id = (select recipe_id from ids)), 'Moins de sucre', 'Bob''s update on Alice''s note had no effect');

-- ---------------------------------------------------------------- anon
set local role anon;
select throws_ok($$ select count(*) from public.recipes $$, '42501', null, 'anon cannot read recipes');

select * from finish();
rollback;
