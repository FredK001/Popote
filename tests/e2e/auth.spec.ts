import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
  for (const path of ["/carnet", "/recette/nouvelle", "/profil"]) {
    test(`${path} redirects to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/connexion\\?next=${encodeURIComponent(path).replace(/%/g, "%")}`));
    });
  }

  test("login page offers magic link and Google", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByRole("heading", { level: 1, name: "Ton carnet t'attend" })).toBeVisible();
    await expect(page.getByLabel("Prénom")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Recevoir mon lien" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
  });

  test("expired link shows an explicit error", async ({ page }) => {
    await page.goto("/connexion?erreur=lien");
    await expect(page.getByRole("alert").filter({ hasText: "Ce lien a expiré" })).toBeVisible();
  });

  test("login page passes axe WCAG 2.2 AA checks", async ({ page }) => {
    await page.goto("/connexion");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
