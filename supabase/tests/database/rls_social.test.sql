-- Cooks, activity feed and shopping list (phase 5). Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-0000-0000-0000-000000000001', 'julie5@example.com', '{"first_name": "Julie"}'),
  ('55555555-0000-0000-0000-000000000002', 'fred5@example.com', '{"first_name": "Fred"}'),
  ('55555555-0000-0000-0000-000000000003', 'eve5@example.com', '{"first_name": "Eve"}');

-- Julie and Fred are friends; Eve is a stranger.
insert into public.friendships (user_a, user_b) values ('55555555-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002');

insert into public.recipes (id, author_id, title) values
  ('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Tarte de Julie');
insert into public.recipes (id, author_id, title, visibility) values
  ('66666666-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', 'Secret de Julie', 'private');

select is((select count(*) from public.activity where type = 'published')::int, 1, 'publishing a shared recipe is logged, a private one is not');

-- ---------------------------------------------------------------- Fred
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "55555555-0000-0000-0000-000000000002", "role": "authenticated"}', true);

select is((select count(*) from public.friends_feed())::int, 1, 'Fred sees Julie''s new recipe in his feed');
select is((select recipe_title from public.friends_feed() limit 1), 'Tarte de Julie', 'with its title');

select lives_ok(
  $$ insert into public.cooks (user_id, recipe_id, note) values ('55555555-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', 'Top !') $$,
  'Fred made Julie''s recipe');
select throws_ok(
  $$ insert into public.cooks (user_id, recipe_id) values ('55555555-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000002') $$,
  '42501', null, 'Fred cannot log a recipe he cannot read');
select throws_ok(
  $$ insert into public.cooks (user_id, recipe_id, photo_path) values ('55555555-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001/x.webp') $$,
  '42501', null, 'a cook photo must be in the user''s own folder');
select is((select count(*) from public.recipe_cooks('66666666-0000-0000-0000-000000000001'))::int, 1, 'the cook shows on the recipe');
select throws_ok($$ select * from public.activity $$, '42501', null, 'activity is not readable directly');

select lives_ok(
  $$ insert into public.shopping_items (user_id, name, aisle) values ('55555555-0000-0000-0000-000000000002', 'pommes', 'fruits-legumes') $$,
  'Fred adds to his shopping list');

-- ---------------------------------------------------------------- Julie
select set_config('request.jwt.claims', '{"sub": "55555555-0000-0000-0000-000000000001", "role": "authenticated"}', true);
select is((select type from public.friends_feed() limit 1), 'cooked', 'Julie sees that Fred made her recipe');
select is((select target_is_me from public.friends_feed() limit 1), true, 'and that it is hers');
select is((select count(*) from public.shopping_items)::int, 0, 'Julie cannot see Fred''s shopping list');

-- ---------------------------------------------------------------- Eve
select set_config('request.jwt.claims', '{"sub": "55555555-0000-0000-0000-000000000003", "role": "authenticated"}', true);
select is((select count(*) from public.friends_feed())::int + (select count(*) from public.recipe_cooks('66666666-0000-0000-0000-000000000001'))::int, 0,
  'a stranger sees neither the feed nor the cooks');

select * from finish();
rollback;
