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

      // « Frigo vide » finds Julie's recipe from what Fred has.
      await fredPage.goto("/frigo");
      await fredPage.getByLabel("Ce que tu as").first().fill("pommes, farine");
      await fredPage.getByRole("button", { name: "Trouver une recette" }).click();
      await expect(fredPage.getByRole("link", { name: /Tarte de Julie.*Du carnet de Julie.*Tu as tout/ })).toBeVisible();
      expect((await axe(fredPage)).violations).toEqual([]);

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

test.describe("À la une: variants, notebook, monthly challenge", () => {
  test.skip(!hasRealSupabase, "needs a real Supabase project");

  test("a stranger finds a featured recipe, keeps it, writes a variant and joins the challenge", async ({ browser }) => {
    const juliePage = await (await browser.newContext()).newPage();
    const evePage = await (await browser.newContext()).newPage();
    const julie = await signInAsNewUser(juliePage, "Julie");
    const eve = await signInAsNewUser(evePage, "Eve");
    try {
      const title = `Tarte à la une ${Date.now()}`;
      const [recipe] = await adminInsert<{ id: string }>("recipes", { author_id: julie.id, title, servings: 4, featured: true });
      await adminInsert("recipe_ingredients", { recipe_id: recipe.id, position: 0, quantity: 4, unit: null, name: "pommes", ingredient_key: "pomme" });
      await adminInsert("recipe_steps", { recipe_id: recipe.id, position: 0, text: "Cuire." });

      // Recipe of the week falls back to the newest featured recipe.
      await evePage.goto("/une");
      await expect(evePage.getByRole("heading", { name: "Défi du mois" }).or(evePage.getByText("Défi du mois"))).toBeVisible();
      expect((await axe(evePage)).violations).toEqual([]);
      await evePage.goto(`/recette/${recipe.id}`);
      await expect(evePage.getByText("Recette de Julie")).toBeVisible();
      await evePage.getByRole("button", { name: "Ajouter à mon carnet" }).click();
      await expect(evePage.getByText(`${title} ajoutée à ton carnet`)).toBeVisible();
      await expect(evePage.getByText("Dans mon carnet")).toBeVisible();

      // « Je l'ai faite ! » with a photo, joining the challenge.
      await evePage.getByRole("button", { name: "Je l'ai faite !" }).click();
      await evePage.getByLabel("Ajouter la photo").setInputFiles({ name: "plat.jpg", mimeType: "image/jpeg", buffer: await samplePhoto() });
      await evePage.getByRole("checkbox", { name: /Je participe au défi/ }).check();
      await evePage.getByRole("button", { name: "C'est fait !" }).click();
      await expect(evePage.getByText("Bravo ! Ta photo est sur la recette.")).toBeVisible({ timeout: 15000 });
      await evePage.goto("/une");
      await expect(evePage.getByRole("img", { name: "Le plat de Eve" }).first()).toBeVisible();

      // Variant.
      await evePage.goto(`/recette/${recipe.id}`);
      await evePage.getByRole("button", { name: "Plus d'options" }).click();
      await evePage.getByRole("link", { name: "Créer ma variante" }).click();
      await evePage.getByLabel("Nom de la recette").fill(`${title} d'Eve`);
      await evePage.getByRole("button", { name: "Enregistrer la recette" }).click();
      await expect(evePage).toHaveURL(/\/recette\/[0-9a-f-]{36}$/, { timeout: 15000 });
      await expect(evePage.getByRole("link", { name: `Variante de « ${title} »` })).toBeVisible();

      // Julie, the author, sees the adoption in her feed. The variant is private to Eve's circle.
      await juliePage.goto("/copains");
      await expect(juliePage.getByText("Eve a ajouté ta recette à son carnet")).toBeVisible();
    } finally {
      await julie.cleanup();
      await eve.cleanup();
    }
  });
});
