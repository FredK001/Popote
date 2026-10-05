-- "Frigo vide" only offers the caller's notebook and friends' shared recipes. Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('99999999-0000-0000-0000-000000000001', 'julie9@example.com', '{"first_name": "Julie"}'),
  ('99999999-0000-0000-0000-000000000002', 'fred9@example.com', '{"first_name": "Fred"}'),
  ('99999999-0000-0000-0000-000000000003', 'eve9@example.com', '{"first_name": "Eve"}');

insert into public.friendships (user_a, user_b) values ('99999999-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002');

insert into public.recipes (id, author_id, title, visibility) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'Omelette de Julie', 'friends'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '99999999-0000-0000-0000-000000000001', 'Secret de Julie', 'private'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '99999999-0000-0000-0000-000000000003', 'Gratin d''Eve', 'friends');
insert into public.recipe_ingredients (recipe_id, position, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 0, 'œufs');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "99999999-0000-0000-0000-000000000002", "role": "authenticated"}', true);

select is((select count(*) from public.fridge_recipes() where id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'a friend''s shared recipe is offered');
select is((select ingredients -> 0 ->> 'name' from public.fridge_recipes() where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'œufs', 'with its ingredients');
select is((select count(*) from public.fridge_recipes() where id = 'aaaaaaaa-0000-0000-0000-000000000002')::int, 0, 'not a private one');
select is((select count(*) from public.fridge_recipes() where id = 'aaaaaaaa-0000-0000-0000-000000000003')::int, 0, 'nor a stranger''s');

select * from finish();
rollback;
