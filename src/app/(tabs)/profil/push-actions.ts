"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const subscription = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Registers this device for notifications (idempotent per endpoint). */
export async function savePushSubscription(input: unknown, userAgent: string): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  const parsed = subscription.safeParse(input);
  if (!userId || !parsed.success) return { ok: false };
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  return { ok: !error };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  return { ok: !error };
}
