-- Push subscriptions are private to each user. Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('44444444-0000-0000-0000-000000000001', 'p1@example.com'),
  ('44444444-0000-0000-0000-000000000002', 'p2@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "44444444-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('44444444-0000-0000-0000-000000000001', 'https://push.example.com/a', 'k', 'a') $$,
  'a user registers their device');

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('44444444-0000-0000-0000-000000000002', 'https://push.example.com/b', 'k', 'a') $$,
  '42501', null, 'nobody registers a device for someone else');

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('44444444-0000-0000-0000-000000000001', 'http://evil.local/x', 'k', 'a') $$,
  '23514', null, 'endpoints must be https');

select set_config('request.jwt.claims', '{"sub": "44444444-0000-0000-0000-000000000002", "role": "authenticated"}', true);
select is((select count(*) from public.push_subscriptions)::int, 0, 'others cannot see my devices');

delete from public.push_subscriptions;
reset role;
select is((select count(*) from public.push_subscriptions where user_id = '44444444-0000-0000-0000-000000000001')::int, 1, 'others cannot delete my devices');

select * from finish();
rollback;
