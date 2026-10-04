-- Trigger functions are not meant to be called through the API (/rest/v1/rpc).
-- Flagged by the Supabase security advisor.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_recipe_to_author_notebook() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
