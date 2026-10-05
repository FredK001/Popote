import type { Page } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Signed-in journeys need a real Supabase project (local .env.local); CI runs signed-out tests only. */
export const hasRealSupabase = url.startsWith("https://") && serviceKey.length > 40;

const headers = () => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" });

/** Creates an onboarded throwaway user and signs the page in through /auth/confirm. */
export async function signInAsNewUser(page: Page, firstName = "Testeur"): Promise<{ id: string; cleanup: () => Promise<void> }> {
  const email = `popote-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ type: "magiclink", email, data: { first_name: firstName } }),
  });
  const link = (await res.json()) as { id: string; hashed_token: string };
  await fetch(`${url}/rest/v1/profiles?id=eq.${link.id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ notebook_name: `Le carnet de ${firstName}`, onboarded_at: new Date().toISOString() }),
  });
  await page.goto(`/auth/confirm?token_hash=${link.hashed_token}&type=email&next=/carnet`);
  return {
    id: link.id,
    cleanup: async () => {
      await fetch(`${url}/auth/v1/admin/users/${link.id}`, { method: "DELETE", headers: headers() });
    },
  };
}

/** Service-role REST insert, for test fixtures. Returns the inserted rows. */
export async function adminInsert<T = Record<string, unknown>>(table: string, rows: object | object[]): Promise<T[]> {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

/** A small valid JPEG (tomato red) for photo uploads. */
export async function samplePhoto(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 64, height: 48, channels: 3, background: "#c7381f" } }).jpeg().toBuffer();
}
