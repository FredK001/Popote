import { expect, test } from "@playwright/test";
import { hasRealSupabase, signInAsNewUser } from "./helpers";

test.describe("offline (service worker)", () => {
  test.skip(!hasRealSupabase, "needs a real Supabase project");

  test("an opened recipe stays readable offline; unknown pages show the offline page", async ({ page, context }) => {
    const user = await signInAsNewUser(page, "Hors");
    try {
      // Create a recipe through the manual form.
      await page.goto("/recette/nouvelle");
      await page.getByLabel("Nom de la recette").fill("Soupe hors ligne");
      await page.getByLabel("Ingrédient").first().fill("poireaux");
      await page.getByLabel("Étape 1", { exact: true }).fill("Fais cuire.");
      await page.getByRole("button", { name: "Enregistrer la recette" }).click();
      await expect(page).toHaveURL(/\/recette\/[0-9a-f-]{36}$/);
      const recipeUrl = page.url();

      // Once the service worker is active, the next load goes through it and is kept.
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
      await expect(page.getByRole("heading", { level: 1, name: "Soupe hors ligne" })).toBeVisible();

      await context.setOffline(true);
      await page.goto(recipeUrl);
      await expect(page.getByRole("heading", { level: 1, name: "Soupe hors ligne" })).toBeVisible();
      await expect(page.getByText("Hors ligne : tu vois la dernière version enregistrée.")).toBeVisible();

      await page.goto("/une");
      await expect(page.getByRole("heading", { name: "Pas de réseau" })).toBeVisible();
      await context.setOffline(false);
    } finally {
      await user.cleanup();
    }
  });
});
