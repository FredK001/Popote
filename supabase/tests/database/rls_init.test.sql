-- RLS tests for profiles and categories. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Two users; the trigger creates their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"first_name": "Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob Martin"}');

select is(
  (select first_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice', 'profile created from magic-link first_name');
select is(
  (select first_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Bob', 'profile created from Google full_name');

-- Bob creates a custom category (as service role, before switching).
insert into public.categories (user_id, name, color_token, icon_key)
values ('22222222-2222-2222-2222-222222222222', 'Soupes', 'sauge', 'c-plat');

-- Act as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is((select count(*) from public.profiles)::int, 1, 'Alice sees only her profile');
select is((select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222')::int, 0, 'Alice cannot read Bob');

update public.profiles set first_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set notebook_name = 'Les recettes d''Alice' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select notebook_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Les recettes d''Alice', 'Alice updates her own profile');

select throws_ok(
  $$ insert into public.profiles (id) values ('33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'clients cannot insert profiles');

select is((select count(*) from public.categories where user_id is null)::int, 5, 'Alice sees the 5 default categories');
select is((select count(*) from public.categories where user_id is not null)::int, 0, 'Alice does not see Bob''s categories');

select lives_ok(
  $$ insert into public.categories (user_id, name, color_token, icon_key)
     values ('11111111-1111-1111-1111-111111111111', 'Goûters', 'prune', 'c-dessert') $$,
  'Alice creates her own category');

select throws_ok(
  $$ insert into public.categories (user_id, name, color_token, icon_key)
     values ('22222222-2222-2222-2222-222222222222', 'Pirate', 'prune', 'c-dessert') $$,
  '42501', null, 'Alice cannot create a category for Bob');

delete from public.categories where user_id is null;
select is((select count(*) from public.categories where user_id is null)::int, 5, 'Alice cannot delete default categories');

-- Anonymous visitors see nothing.
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
