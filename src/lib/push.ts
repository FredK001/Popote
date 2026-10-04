import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@popote.app", publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Sends a notification to every device of the given users. Expired subscriptions
 * (404/410 from the push service) are removed. Never throws: notifications are a bonus.
 */
export async function sendPush(userIds: string[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0 || !configure()) return 0;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }),
  );
  return sent;
}

/** Ids of a user's friends (accepted friendships). */
export async function friendIds(userId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq("status", "accepted");
  return (data ?? []).map((f) => (f.user_a === userId ? f.user_b : f.user_a));
}
