import { sanitizeDraft, type RecipeDraft } from "./schema";

export type DraftInput = {
  mode: "photos" | "voice" | "text" | "link";
  /** Dictated, pasted, or cleaned page text. */
  text?: string;
  /** Photos, already resized client-side (WebP or JPEG). */
  images?: Array<{ mediaType: string; base64: string }>;
  /** Refinement: the current draft and the cook's answers. */
  previous?: RecipeDraft;
  answers?: string[];
};

/** Why an AI request failed, mapped to a clear message and a way out in the UI. */
export type AiErrorKind =
  | "not_connected" // no AI linked: invite to "Brancher mon IA"
  | "auth_expired" // authorization expired or revoked: reconnect in settings
  | "cap_reached" // subscription limit reached
  | "rate_limited" // our anti-abuse limit
  | "unreadable" // blurry photo, not a recipe, unreadable page
  | "invalid_output" // model answered twice with something unusable
  | "unavailable"; // provider down or network error

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    readonly detail?: string,
  ) {
    super(kind);
    this.name = "AiError";
  }
}

/**
 * One AI backend. `generate` returns the model's raw structured output (unvalidated)
 * and throws AiError for provider-level failures. Adding Claude or another provider
 * later means implementing this interface only.
 */
export interface AiProvider {
  readonly id: "chatgpt" | "fake";
  generate(input: DraftInput): Promise<unknown>;
}

/**
 * Asks the provider for a draft, validates it, and retries once on unusable output.
 * Throws AiError("unreadable") when the model says the input cannot be read.
 */
export async function draftRecipe(provider: AiProvider, input: DraftInput): Promise<RecipeDraft> {
  const photoCount = input.images?.length ?? 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const draft = sanitizeDraft(await provider.generate(input), photoCount);
    if (!draft) continue;
    if (draft.problem === "blurry" || draft.problem === "not_a_recipe") throw new AiError("unreadable", draft.problem);
    return draft;
  }
  throw new AiError("invalid_output");
}
