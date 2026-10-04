-- Shares, claiming, friendships and genealogy (phase 2). Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000001', 'julie@example.com', '{"first_name": "Julie"}'),
  ('11111111-0000-0000-0000-000000000002', 'fred@example.com', '{"first_name": "Fred"}'),
  ('11111111-0000-0000-0000-000000000003', 'lea@example.com', '{"first_name": "Léa"}'),
  ('11111111-0000-0000-0000-000000000004', 'eve@example.com', '{"first_name": "Eve"}');

insert into public.recipes (id, author_id, title)
values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Tarte de Julie');

-- ---------------------------------------------------------------- Julie shares
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.shares (token, recipe_id, sender_id, message)
     values ('julieTokenAAAAAAAAAAAAAA', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Celle de dimanche') $$,
  'Julie shares her recipe');

select throws_ok(
  $$ insert into public.shares (token, recipe_id, sender_id)
     values ('fakeSenderAAAAAAAAAAAAAA', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002') $$,
  '42501', null, 'nobody can share in someone else''s name');

-- ---------------------------------------------------------------- Fred claims, then shares on
select set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000002", "role": "authenticated"}', true);

select is((select count(*) from public.recipes)::int, 0, 'Fred cannot read the recipe before claiming');
select throws_ok(
  $$ insert into public.shares (token, recipe_id, sender_id)
     values ('fredTooEarlyAAAAAAAAAAAA', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002') $$,
  '42501', null, 'Fred cannot share a recipe he cannot read');

select is(public.claim_share('julieTokenAAAAAAAAAAAAAA'), '22222222-0000-0000-0000-000000000001'::uuid, 'Fred claims the share');
select is(public.claim_share('julieTokenAAAAAAAAAAAAAA'), '22222222-0000-0000-0000-000000000001'::uuid, 'claiming twice is harmless');
select is((select count(*) from public.notebook_entries)::int, 1, 'one entry in Fred''s notebook');
select is((select received_from from public.notebook_entries), '11111111-0000-0000-0000-000000000001'::uuid, 'received from Julie');
select is((select count(*) from public.friendships)::int, 1, 'Fred and Julie are now friends');
select is((select first_name from public.profiles where id = '11111111-0000-0000-0000-000000000001'), 'Julie', 'Fred can see his friend Julie''s profile');

select lives_ok(
  $$ insert into public.shares (token, recipe_id, sender_id)
     values ('fredTokenAAAAAAAAAAAAAAA', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002') $$,
  'Fred passes it on');

select throws_ok($$ select public.claim_share('doesNotExistAAAAAAAAAAAA') $$, 'P0002', null, 'unknown token');

-- ---------------------------------------------------------------- Léa claims from Fred
select set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000003", "role": "authenticated"}', true);
select isnt(public.claim_share('fredTokenAAAAAAAAAAAAAAA'), null, 'Léa claims the recipe from Fred');

select is(
  (select string_agg(first_name, ' > ' order by "position") from public.my_recipe_genealogy('22222222-0000-0000-0000-000000000001')),
  'Julie > Fred > Léa',
  'genealogy follows Julie > Fred > Léa');

select is((select count(*) from public.profiles where id = '11111111-0000-0000-0000-000000000001')::int, 0,
  'Léa is not Julie''s friend: she cannot read Julie''s profile directly');

-- ---------------------------------------------------------------- Eve, outsider
select set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000004", "role": "authenticated"}', true);
select is((select count(*) from public.my_recipe_genealogy('22222222-0000-0000-0000-000000000001'))::int, 0,
  'outsiders get no genealogy');
select is((select count(*) from public.shares)::int, 0, 'outsiders cannot list shares');
select throws_ok($$ select * from public.recipe_genealogy('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003') $$,
  '42501', null, 'raw genealogy is service-role only');

select * from finish();
rollback;
