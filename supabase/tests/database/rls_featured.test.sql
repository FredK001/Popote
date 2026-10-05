-- Variants, "À la une", challenge and badges (phase 5, batch 2). Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('77777777-0000-0000-0000-000000000001', 'julie7@example.com', '{"first_name": "Julie"}'),
  ('77777777-0000-0000-0000-000000000002', 'fred7@example.com', '{"first_name": "Fred"}'),
  ('77777777-0000-0000-0000-000000000003', 'eve7@example.com', '{"first_name": "Eve"}');

insert into public.friendships (user_a, user_b) values ('77777777-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000002');

insert into public.recipes (id, author_id, title, featured) values
  ('88888888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Tarte à la une', true),
  ('88888888-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 'Gratin entre copains', false);

-- ---------------------------------------------------------------- Eve (stranger)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "77777777-0000-0000-0000-000000000003", "role": "authenticated"}', true);

select is((select count(*) from public.recipes where author_id = '77777777-0000-0000-0000-000000000001')::int, 1, 'a stranger reads the featured recipe only');
select is((select first_name from public.profiles where id = '77777777-0000-0000-0000-000000000001'), 'Julie', 'and its author''s first name');
select is((select count(*) from public.featured_recipes('week', 7, 30) where id = '88888888-0000-0000-0000-000000000001')::int, 1, 'it is listed à la une');
select throws_ok($$ select public.add_to_notebook('88888888-0000-0000-0000-000000000002') $$, '42501', null, 'a friends-only recipe cannot be added by a stranger');
select lives_ok($$ select public.add_to_notebook('88888888-0000-0000-0000-000000000001') $$, 'the featured one can');
select is((select received_from from public.notebook_entries where recipe_id = '88888888-0000-0000-0000-000000000001'), '77777777-0000-0000-0000-000000000001'::uuid, 'received from its author');
select is((select count(*) from public.featured_recipes('shared', 7, 30) where id = '88888888-0000-0000-0000-000000000001')::int, 1, 'and now counts as shared');

select throws_ok(
  $$ insert into public.recipes (author_id, title, variant_of) values ('77777777-0000-0000-0000-000000000003', 'Ma version', '88888888-0000-0000-0000-000000000002') $$,
  '42501', null, 'no variant of a recipe one cannot read');

select lives_ok(
  $$ insert into public.cooks (user_id, recipe_id, photo_path, challenge_key) values ('77777777-0000-0000-0000-000000000003', '88888888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000003/p.webp', '2026-10') $$,
  'Eve joins the challenge');
select is((select written + cooked + challenges from public.my_stats()), 2, 'her counters: 0 written, 1 cooked, 1 challenge');

-- ---------------------------------------------------------------- Fred (friend)
select set_config('request.jwt.claims', '{"sub": "77777777-0000-0000-0000-000000000002", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.recipes (id, author_id, title, variant_of) values ('88888888-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000002', 'Gratin de Fred', '88888888-0000-0000-0000-000000000002') $$,
  'a friend writes a variant');
select is((select count(*) from public.recipe_variants('88888888-0000-0000-0000-000000000002'))::int, 1, 'it shows under the original');
select is((select count(*) from public.challenge_entries('2026-10') where first_name = 'Eve')::int, 1, 'everyone sees challenge entries');
select is((select recipe_title from public.challenge_entries('2026-10') where first_name = 'Eve' limit 1), 'Tarte à la une', 'with the recipe when readable');

-- ---------------------------------------------------------------- Julie
select set_config('request.jwt.claims', '{"sub": "77777777-0000-0000-0000-000000000001", "role": "authenticated"}', true);
select is((select adopted from public.my_stats()), 1, 'Julie''s recipe was adopted once');

select * from finish();
rollback;
