-- Phase 4: Web Push subscriptions (one per device/browser).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;

-- Users manage their own devices; sending is done server-side with the service role.
create policy "push_subscriptions: read own"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_subscriptions: add own"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "push_subscriptions: remove own"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.push_subscriptions from authenticated;
