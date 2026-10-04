import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fakeProvider } from "./fake-provider";
import type { AiProvider } from "./provider";

/**
 * Simulated AI, for development and e2e only. Needs AI_FAKE_PROVIDER=1, plus
 * E2E_ALLOW_FAKE_AI=1 on a production build (Playwright). Never set these on Netlify.
 */
export function fakeAiEnabled(): boolean {
  if (process.env.AI_FAKE_PROVIDER !== "1") return false;
  return process.env.NODE_ENV !== "production" || process.env.E2E_ALLOW_FAKE_AI === "1";
}

/**
 * The AI the user has connected, or null. Today only the simulated provider exists:
 * "Sign in with ChatGPT" plugs in here once OpenAI grants Popote access (brief §5.1);
 * Claude users go through the MCP connector instead (§5.2), outside this flow.
 */
export async function getAiProvider(_userId: string): Promise<AiProvider | null> {
  void _userId;
  if (fakeAiEnabled()) return fakeProvider;
  return null;
}

/** Anti-abuse: at most `limit` AI requests per user per minute. */
export async function underRateLimit(userId: string, limit = 10): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("ai_rate_check", {
    p_user: userId,
    p_limit: limit,
    p_window: "1 minute",
  });
  // Fail open on a database hiccup: the provider has its own limits.
  return error ? true : data === true;
}
