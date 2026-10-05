import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminInsert, hasRealSupabase, samplePhoto, signInAsNewUser } from "./helpers";

const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();

test.describe("friends: feed, « Je l'ai faite ! », shopping list", () => {
  test.skip(!hasRealSupabase, "needs a real Supabase project");

  test("a friend makes Julie's recipe, Julie sees it in her feed", async ({ browser }) => {
    const juliePage = await (await browser.newContext()).newPage();
    const fredPage = await (await browser.newContext()).newPage();
    const julie = await signInAsNewUser(juliePage, "Julie");
    const fred = await signInAsNewUser(fredPage, "Fred");
    try {
      const [a, b] = [julie.id, fred.id].sort();
      await adminInsert("friendships", { user_a: a, user_b: b });
      const [recipe] = await adminInsert<{ id: string }>("recipes", { author_id: julie.id, title: "Tarte de Julie", servings: 4 });
      await adminInsert("recipe_ingredients", [
        { recipe_id: recipe.id, position: 0, quantity: 200, unit: "g", name: "farine", ingredient_key: "farine" },
        { recipe_id: recipe.id, position: 1, quantity: 4, unit: null, name: "pommes", ingredient_key: "pomme" },
      ]);
      await adminInsert("recipe_steps", { recipe_id: recipe.id, position: 0, text: "Cuire." });

      // Fred sees the new recipe in his feed.
      await fredPage.goto("/copains");
      await expect(fredPage.getByText("Julie a publié une recette")).toBeVisible();
      expect((await axe(fredPage)).violations).toEqual([]);
      await fredPage.getByRole("link", { name: "Tarte de Julie" }).click();
      await expect(fredPage.getByRole("heading", { level: 1, name: "Tarte de Julie" })).toBeVisible();

      // Shopping list for 8: quantities double, grouped by aisle.
      for (let i = 0; i < 4; i++) await fredPage.getByRole("button", { name: "Une part de plus" }).click();
      await fredPage.getByRole("button", { name: "Ajouter à ma liste de courses" }).click();
      await fredPage.getByRole("link", { name: "Voir ma liste" }).click();
      await expect(fredPage.getByRole("heading", { name: "Fruits et légumes" })).toBeVisible();
      await expect(fredPage.getByText("400 g farine")).toBeVisible();
      await expect(fredPage.getByText("8 pommes")).toBeVisible();
      expect((await axe(fredPage)).violations).toEqual([]);
      await fredPage.getByText("8 pommes").click();
      await expect(fredPage.getByRole("checkbox", { name: "Cocher pommes" })).toBeChecked();
      await fredPage.getByRole("button", { name: "Retirer les articles cochés" }).click();
      await expect(fredPage.getByText("8 pommes")).toBeHidden();

      // « Je l'ai faite ! » with a photo.
      await fredPage.goto(`/recette/${recipe.id}`);
      await fredPage.getByRole("button", { name: "Je l'ai faite !" }).click();
      await fredPage.getByLabel("Ajouter la photo").setInputFiles({ name: "plat.jpg", mimeType: "image/jpeg", buffer: await samplePhoto() });
      await fredPage.getByLabel("Un mot (facultatif)").fill("Top !");
      await fredPage.getByRole("button", { name: "C'est fait !" }).click();
      await expect(fredPage.getByText("Bravo ! Ta photo est sur la recette.")).toBeVisible({ timeout: 15000 });
      await expect(fredPage.getByRole("img", { name: "Le plat de Fred" })).toBeVisible();
      await expect(fredPage.getByText("Top !")).toBeVisible();

      // Julie sees it in her feed.
      await juliePage.goto("/copains");
      await expect(juliePage.getByText("Fred a fait ta recette")).toBeVisible();
    } finally {
      await julie.cleanup();
      await fred.cleanup();
    }
  });
});
