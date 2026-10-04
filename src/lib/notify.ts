import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { format, t } from "@/messages";
import { friendIds, sendPush } from "./push";

async function firstName(userId: string): Promise<string> {
  const { data } = await createAdminClient().from("profiles").select("first_name").eq("id", userId).single();
  return data?.first_name || "Un copain";
}

/** "Julie a publié une recette": to the author's friends, when a recipe is created. */
export async function notifyFriendPublished(authorId: string, recipeId: string, title: string) {
  const [friends, name] = await Promise.all([friendIds(authorId), firstName(authorId)]);
  await sendPush(friends, {
    title: format(t.notifications.friendPublished, { name }),
    body: title,
    url: `/recette/${recipeId}`,
    tag: `published-${recipeId}`,
  });
}

/** "Léa a ajouté ta recette à son carnet": to the sender, when a share is claimed. */
export async function notifyRecipeAdopted(senderId: string, adopterId: string, recipeId: string, title: string) {
  if (senderId === adopterId) return;
  const name = await firstName(adopterId);
  await sendPush([senderId], {
    title: format(t.notifications.recipeAdopted, { name }),
    body: title,
    url: `/recette/${recipeId}`,
    tag: `adopted-${recipeId}-${adopterId}`,
  });
}
