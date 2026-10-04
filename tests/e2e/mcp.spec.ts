import { expect, test } from "@playwright/test";

test.describe("MCP connector", () => {
  test("refuses calls without a token and points to the OAuth metadata", async ({ request }) => {
    const res = await request.post("/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
    expect(res.status()).toBe(401);
    expect(res.headers()["www-authenticate"]).toContain("/.well-known/oauth-protected-resource/mcp");
  });

  test("publishes protected resource metadata for /mcp", async ({ request }) => {
    const res = await request.get("/.well-known/oauth-protected-resource/mcp");
    const body = await res.json();
    expect(body.resource).toMatch(/\/mcp$/);
    expect(body.authorization_servers[0]).toMatch(/\/auth\/v1$/);
  });

  test("consent page without a request explains it expired", async ({ page }) => {
    await page.goto("/oauth/consent");
    await expect(page.getByText("Cette demande d'autorisation a expiré")).toBeVisible();
  });
});
