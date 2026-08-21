/**
 * Canonical site origin, resolved once at build/runtime.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL - set this in production
 *  2. VERCEL_PROJECT_PRODUCTION_URL - auto-provided by Vercel for the prod deployment
 *  3. http://localhost:3000 - local dev fallback
 *
 * Used for metadataBase, canonical URLs, the sitemap, and JSON-LD. Kept free of
 * a trailing slash so paths can be appended directly.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Token Counter";

/**
 * 45 characters. The product name already leads it, so this is used on its own
 * for the home page rather than taking the " - Token Counter" suffix, which
 * would only repeat the first two words.
 */
export const SITE_TITLE = "Token Counter for GPT, Claude, Gemini & Llama";

/** Meta description. Counted: 153 characters, under the 160 SERP cutoff. */
export const SITE_DESCRIPTION =
  "Count tokens for GPT-5, Claude, Gemini, Llama, Mistral, Qwen and DeepSeek. See token boundaries and IDs. Runs in your browser, your text never leaves it.";

/** Shorter copy for social cards, which truncate around 125 characters. */
export const SITE_DESCRIPTION_SHORT =
  "Count tokens for GPT-5, Claude, Gemini and Llama. Exact where the tokenizer is published, honest where it is not.";
