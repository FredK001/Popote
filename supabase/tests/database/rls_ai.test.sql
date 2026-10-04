-- The AI rate limit is service-role only. Run in CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email) values ('33333333-0000-0000-0000-000000000001', 'ai@example.com');

select is(public.ai_rate_check('33333333-0000-0000-0000-000000000001', 2, interval '1 minute'), true, 'first request allowed');
select is(public.ai_rate_check('33333333-0000-0000-0000-000000000001', 2, interval '1 minute'), true, 'second request allowed');
select is(public.ai_rate_check('33333333-0000-0000-0000-000000000001', 2, interval '1 minute'), false, 'third request in the window refused');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "33333333-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select throws_ok($$ select public.ai_rate_check('33333333-0000-0000-0000-000000000001', 100, interval '1 minute') $$, '42501', null, 'clients cannot call the rate limiter');
select throws_ok($$ delete from public.ai_requests $$, '42501', null, 'clients cannot clear their request log');

select * from finish();
rollback;
