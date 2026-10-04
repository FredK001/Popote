-- Phase 3: bring-your-own AI. Users' API keys, encrypted by the app server
-- (AES-256-GCM, AI_KEYS_ENCRYPTION_KEY), and an anti-abuse rate limit.

create table public.ai_credentials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai')),
  -- "v1:" + base64(iv | auth tag | ciphertext). Never sent to the browser.
  key_ciphertext text not null,
  -- Shown as "•••• abcd" in settings.
  key_last4 text not null check (char_length(key_last4) = 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_credentials_set_updated_at
  before update on public.ai_credentials
  for each row execute function public.set_updated_at();

-- No policy at all: only the server (service role) reads or writes keys.
alter table public.ai_credentials enable row level security;
revoke all on public.ai_credentials from anon, authenticated;

-- Anti-abuse: one row per AI request, kept 1 day.
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_requests_user_time_idx on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from anon, authenticated;

-- Records a request and tells whether the user is still under p_limit requests
-- in the last p_window. Atomic per user (advisory lock). Service role only.
create function public.ai_rate_check(p_user uuid, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_rate:' || p_user::text));

  delete from public.ai_requests where user_id = p_user and created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.ai_requests
  where user_id = p_user and created_at > now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.ai_requests (user_id) values (p_user);
  return true;
end;
$$;

revoke execute on function public.ai_rate_check(uuid, int, interval) from public, anon, authenticated;
grant execute on function public.ai_rate_check(uuid, int, interval) to service_role;
