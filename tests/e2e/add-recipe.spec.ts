import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { hasRealSupabase, samplePhoto, signInAsNewUser } from "./helpers";

test.describe("add a recipe with the (simulated) AI", () => {
  test.skip(!hasRealSupabase, "needs a real Supabase project");

  test("photos → questions → one-tap answers → saved recipe", async ({ page }) => {
    const user = await signInAsNewUser(page, "Camille");
    try {
      await page.goto("/ajouter");
      await page.getByRole("button", { name: /Photo/ }).click();
      await page.getByLabel("Prendre ou choisir une photo").setInputFiles({ name: "fiche.jpg", mimeType: "image/jpeg", buffer: await samplePhoto() });
      await page.getByRole("button", { name: "C'est parti" }).click();

      await expect(page.getByRole("heading", { name: "Voilà ta fiche" })).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole("status").filter({ hasText: "2 points à vérifier" })).toBeVisible();
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations).toEqual([]);

      await page.getByRole("button", { name: "6", exact: true }).click();
      await page.getByRole("button", { name: "150 g" }).click();
      await expect(page.getByText("Tout est vérifié. Tu peux la ranger.")).toBeVisible();

      await page.getByRole("button", { name: "Ranger dans mon carnet" }).click();
      await expect(page).toHaveURL(/\/recette\/[0-9a-f-]{36}$/, { timeout: 15000 });
      await expect(page.getByRole("heading", { level: 1, name: "Tarte fine aux pommes" })).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "Cocher sucre" })).toContainText("150 g");
    } finally {
      await user.cleanup();
    }
  });

  test("an unreadable input explains what to do, without a dead end", async ({ page }) => {
    const user = await signInAsNewUser(page);
    try {
      await page.goto("/ajouter");
      await page.getByRole("button", { name: /En vrac/ }).click();
      await page.getByLabel("Ta recette").fill("illisible");
      await page.getByRole("button", { name: "Mettre au propre" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Je n'arrive pas à lire cette photo" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("link", { name: "Saisir à la main" })).toBeVisible();
    } finally {
      await user.cleanup();
    }
  });
});
