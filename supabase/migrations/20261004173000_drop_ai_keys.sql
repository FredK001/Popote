-- The brief changed: Popote stores no personal AI API key (users connect their own
-- subscription instead: ChatGPT sign-in once OpenAI grants access, Claude via MCP).
-- Tokens for the ChatGPT connection will get their own table when that ships.
drop table public.ai_credentials;
