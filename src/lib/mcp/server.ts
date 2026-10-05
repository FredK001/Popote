import "server-only";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { categoryLabel } from "@/lib/categories";
import { INGREDIENT_KEYS, INGREDIENTS } from "@/lib/recipes/ingredient-catalog";
import type { Category } from "@/lib/recipes/types";
import { after } from "next/server";
import { importRecipePhoto } from "@/lib/import-photo";
import { notifyFriendPublished } from "@/lib/notify";
import { photoFromSourcePage } from "@/lib/recipes/source-photo";
import { matchFridge, type FridgeRecipe } from "@/lib/fridge";
import { mcpRecipeInput, mcpToRecipeData } from "./recipe-tool";

export const MCP_INSTRUCTIONS = `Popote is the user's recipe notebook. Use these tools to add a recipe the user shows you (photos of a handwritten card, a cookbook page, the dish) or tells you.

How to work:
1. Read the photos or text carefully. Keep the cook's wording; write in French with informal "tu" in steps.
2. If something that matters for cooking is missing or ambiguous (servings, times, a quantity you cannot read), ask the user one or two short questions before creating the recipe. Do not ask about what you could read.
3. Call popote_list_categories to file the recipe in the right category, and pick each ingredient_key from popote_list_ingredient_keys.
4. Call popote_create_recipe once, then give the user the link it returns. Photos the user sent cannot be passed to the tool: tell them they can add the dish photo from that link. When the recipe comes from a web page, pass its address in source_url and the page's photo of the dish (og:image or recipe image URL) in image_url: Popote downloads it.

"Frigo vide": when the user asks what to cook with what they have, call popote_find_recipes_from_fridge with the items (from their words or a photo of their fridge). Suggest the best two or three results with their link, say what is missing, and whose notebook each comes from. Only propose a new recipe of your own if nothing fits, and offer to save it with popote_create_recipe.`;

/** Supabase client acting as the connector's user: RLS applies exactly as in the app. */
function userClient(token: string): SupabaseClient {
  return createClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies a Supabase access token (issued by the Supabase OAuth server) and returns its owner. */
export async function verifyAccessToken(token: string | undefined): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const { data, error } = await userClient(token).auth.getClaims(token);
  const claims = data?.claims as (Record<string, unknown> & { sub?: string; exp?: number }) | undefined;
  if (error || !claims?.sub) return undefined;
  return {
    token,
    clientId: typeof claims.client_id === "string" ? claims.client_id : "popote",
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
    expiresAt: claims.exp,
    extra: { userId: claims.sub },
  };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

function auth(ctx: { http?: { authInfo?: AuthInfo } }): { token: string; userId: string } | null {
  const info = ctx.http?.authInfo;
  const userId = info?.extra?.userId;
  return info && typeof userId === "string" ? { token: info.token, userId } : null;
}

async function loadCategories(client: SupabaseClient): Promise<Category[]> {
  const { data } = await client.from("categories").select("id, user_id, default_key, name, color_token, icon_key, position");
  return (data ?? []) as Category[];
}

/** Registers Popote's tools. Every tool acts only on the authenticated user's data. */
export function registerPopoteTools(server: McpServer) {
  server.registerTool(
    "popote_list_categories",
    {
      title: "Catégories du carnet",
      description: "Lists the categories of the user's Popote notebook (id and name), to file a new recipe.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      const user = auth(ctx);
      if (!user) return failure("Not signed in to Popote.");
      const categories = await loadCategories(userClient(user.token));
      return text(JSON.stringify(categories.map((c) => ({ id: c.id, name: categoryLabel(c), key: c.default_key }))));
    },
  );

  server.registerTool(
    "popote_list_ingredient_keys",
    {
      title: "Liste des ingrédients",
      description:
        "Returns the closed list of ingredient_key values (with French label and family). Every ingredient of a new recipe must use one of these keys, or the closest family key (legume, fruit, laitage, viande, poisson, epice, feculent, autre).",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      text(JSON.stringify(INGREDIENT_KEYS.map((key) => ({ key, label: INGREDIENTS[key].label, family: INGREDIENTS[key].family })))),
  );

  server.registerTool(
    "popote_create_recipe",
    {
      title: "Ranger la recette dans Popote",
      description:
        "Creates the recipe in the user's Popote notebook and returns the link to its page. Ask the user short questions first if servings, times or a quantity are missing or unreadable. Mark fields you are unsure of with confidence \"low\". For a recipe from a website, set source_url and image_url (the page's dish photo) so Popote can add the photo; otherwise the user adds it from the returned link.",
      inputSchema: z.object({ recipe: mcpRecipeInput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ recipe }, ctx) => {
      const user = auth(ctx);
      if (!user) return failure("Not signed in to Popote.");
      const client = userClient(user.token);
      const data = mcpToRecipeData(recipe, await loadCategories(client));
      if (!data) return failure("The recipe is incomplete: it needs a title, at least one ingredient and one step.");
      if (data.ingredients.length === 0 || data.steps.length === 0) return failure("Add at least one ingredient and one step.");

      const imageUrl = typeof recipe === "object" && recipe && "image_url" in recipe ? (recipe as { image_url: unknown }).image_url : null;
      let photoPath = typeof imageUrl === "string" && /^https:\/\//.test(imageUrl) ? await importRecipePhoto(user.userId, imageUrl, client) : null;
      // No usable photo URL from the model: read the source page ourselves.
      if (!photoPath && data.source_url) photoPath = await photoFromSourcePage(user.userId, data.source_url, client);

      const { data: recipeId, error } = await client.rpc("save_recipe", {
        p_recipe: { ...data, id: null, tags: [], photo_path: photoPath },
        p_ingredients: data.ingredients,
        p_steps: data.steps,
        p_category_id: data.category_id,
      });
      if (error || !recipeId) return failure("Popote could not save the recipe. Try again in a moment.");
      after(() => notifyFriendPublished(user.userId, recipeId as string, data.title));

      const link = `${siteUrl()}/recette/${recipeId}${photoPath ? "" : "?photo=1"}`;
      return text(
        photoPath
          ? `Recette « ${data.title} » rangée dans le carnet Popote, avec sa photo. Lien : ${link}`
          : `Recette « ${data.title} » rangée dans le carnet Popote. Lien : ${link} (l'utilisateur peut y ajouter la photo du plat).`,
      );
    },
  );

  server.registerTool(
    "popote_find_recipes_from_fridge",
    {
      title: "Frigo vide",
      description:
        "Finds recipes the user can cook with the ingredients they have, among their Popote notebook and the recipes their friends share. Returns the best matches with the ingredients used and those missing (salt, pepper, oil and water are assumed). Pass ingredient names in French, one per item.",
      inputSchema: z.object({ ingredients: z.array(z.string().trim().min(2).max(60)).min(1).max(30) }),
      annotations: { readOnlyHint: true },
    },
    async ({ ingredients }, ctx) => {
      const user = auth(ctx);
      if (!user) return failure("Not signed in to Popote.");
      const { data, error } = await userClient(user.token).rpc("fridge_recipes");
      if (error) return failure("Popote could not read the notebook. Try again in a moment.");
      const matches = matchFridge(ingredients, (data ?? []) as FridgeRecipe[], 8);
      if (matches.length === 0) return text("Aucune recette du carnet ni des copains n'utilise ces ingrédients.");
      return text(
        JSON.stringify(
          matches.map((m) => ({
            title: m.recipe.title,
            link: `${siteUrl()}/recette/${m.recipe.id}`,
            from: m.recipe.author_first_name ? `carnet de ${m.recipe.author_first_name}` : "ton carnet",
            in_notebook: m.recipe.in_notebook,
            uses: m.have,
            missing: m.missing,
          })),
        ),
      );
    },
  );
}
