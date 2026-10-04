import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AiError, draftRecipe, type AiErrorKind, type DraftInput } from "@/lib/ai/provider";
import { recipeDraft } from "@/lib/ai/schema";
import { getAiProvider, underRateLimit } from "@/lib/ai/server";
import { getUserId } from "@/lib/auth";
import { FetchPageError, fetchPage } from "@/lib/fetch-page";
import { importRecipePhoto } from "@/lib/import-photo";
import { findRecipeNode, pageText, recipeFromJsonLd, recipeImageUrl } from "@/lib/recipes/jsonld";

/** Error codes the add screen knows how to explain. */
export type DraftErrorCode =
  | AiErrorKind
  | "unreadable_blurry"
  | "unreadable_not_a_recipe"
  | "link_no_recipe"
  | "link_unreachable";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3_000_000;
const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

const fail = (error: DraftErrorCode, status = 422) => NextResponse.json({ error }, { status });

function aiFailure(e: unknown) {
  if (e instanceof AiError) {
    if (e.kind === "unreadable") return fail(e.detail === "not_a_recipe" ? "unreadable_not_a_recipe" : "unreadable_blurry");
    return fail(e.kind, e.kind === "rate_limited" ? 429 : 422);
  }
  return fail("unavailable", 502);
}

const jsonBody = z.object({
  mode: z.enum(["voice", "text", "link"]),
  text: z.string().max(20000).optional(),
  url: z.string().max(2000).optional(),
  previous: recipeDraft.optional(),
  answers: z.array(z.string().max(200)).max(10).optional(),
});

/**
 * Turns photos, dictation, free text or a link into a recipe draft.
 * Links work without AI when the page has schema.org/Recipe data.
 * POST multipart (photos) or JSON (voice, text, link).
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let input: DraftInput;
  let url: string | undefined;

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const files = form.getAll("images").filter((f): f is File => f instanceof File);
    if (files.length === 0 || files.length > MAX_IMAGES) return fail("unreadable_blurry", 400);
    if (files.some((f) => f.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(f.type))) return fail("unreadable_blurry", 400);
    const parsedPrevious = recipeDraft.safeParse(parseJson(form.get("previous")));
    const parsedAnswers = z.array(z.string().max(200)).max(10).safeParse(parseJson(form.get("answers")));
    input = {
      mode: "photos",
      images: await Promise.all(
        files.map(async (f) => ({ mediaType: f.type, base64: Buffer.from(await f.arrayBuffer()).toString("base64") })),
      ),
      previous: parsedPrevious.success ? parsedPrevious.data : undefined,
      answers: parsedAnswers.success ? parsedAnswers.data : undefined,
    };
  } else {
    const parsed = jsonBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const body = parsed.data;
    url = body.url;
    input = { mode: body.mode, text: body.text, previous: body.previous, answers: body.answers };
  }

  // Link: structured data first, without AI.
  if (input.mode === "link") {
    if (!(await underRateLimit(userId, 20))) return fail("rate_limited", 429);
    let page: { url: string; html: string };
    try {
      page = await fetchPage(url ?? "");
    } catch (e) {
      return fail(e instanceof FetchPageError && e.reason === "not_html" ? "link_no_recipe" : "link_unreachable");
    }
    const node = findRecipeNode(page.html);
    const structured = node ? recipeFromJsonLd(node) : null;
    const imageUrl = recipeImageUrl(page.html, node, page.url);
    const photo = () => (imageUrl ? importRecipePhoto(userId, imageUrl) : Promise.resolve(null));
    if (structured) {
      return NextResponse.json({ draft: structured, sourceUrl: page.url, photoPath: await photo(), usedAi: false });
    }

    const provider = await getAiProvider(userId);
    if (!provider) return fail("link_no_recipe");
    try {
      const [draft, photoPath] = await Promise.all([
        draftRecipe(provider, { mode: "link", text: pageText(page.html) }),
        photo(),
      ]);
      return NextResponse.json({ draft, sourceUrl: page.url, photoPath, usedAi: true });
    } catch (e) {
      return aiFailure(e);
    }
  }

  const provider = await getAiProvider(userId);
  if (!provider) return fail("not_connected");
  if (!input.images?.length && !input.text?.trim() && !input.previous) return fail("unreadable_not_a_recipe", 400);
  if (!(await underRateLimit(userId))) return fail("rate_limited", 429);

  try {
    return NextResponse.json({ draft: await draftRecipe(provider, input), usedAi: true });
  } catch (e) {
    return aiFailure(e);
  }
}
