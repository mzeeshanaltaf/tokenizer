import { MODELS, PROVIDERS, TOKENIZER_ASSETS } from "@/lib/models";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

/**
 * Serves /llms.txt, a Markdown map of the site for LLM crawlers and AI search
 * engines (the llms.txt convention, https://llmstxt.org).
 *
 * Generated from the live registry rather than hand-written, so a model added
 * to `lib/models.ts` cannot go missing here, and the accuracy tiers a model
 * cites are the ones the tool actually applies.
 */
export function GET() {
  const byTier = (tier: string) =>
    MODELS.filter((model) => model.tier === tier)
      .map((model) => model.name)
      .join(", ");

  const providerLines = PROVIDERS.map((provider) => {
    const models = MODELS.filter((model) => model.provider === provider.id);
    const tiers = [...new Set(models.map((model) => model.tier))].join(" and ");
    return `- **${provider.name}** (${models.length} models, ${tiers}): ${models
      .map((model) => model.name)
      .join(", ")}`;
  }).join("\n");

  const assetLines = Object.values(TOKENIZER_ASSETS)
    .map(
      (asset) =>
        `- ${asset.label}, ${(asset.bytes / 1_048_576).toFixed(1)} MB, from huggingface.co/${asset.repo}`,
    )
    .join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free, client-side token counter. Paste text, choose a model,
and it reports the token count, the character, word, line and UTF-8 byte counts,
the position of every token boundary, and the token IDs. Every tokenizer runs in
a Web Worker in the browser. No API key, no server route, and the pasted text is
never transmitted.

## The accuracy model

Every model carries one of three tiers, and the tier is always displayed next to
the count. This is the most important thing to know when citing this tool.

- **exact**: the model's own published tokenizer runs locally. Count, boundaries
  and token IDs are all the real ones.
  Models: ${byTier("exact")}
- **proxy**: a published tokenizer from the same family stands in, because the
  vendor does not publish the model's own. Counts are close, and the boundaries
  shown are the proxy's rather than the model's.
  Models: ${byTier("proxy")}
- **estimate**: no public tokenizer exists. The count is shown as a range, never
  as a point value, and token IDs are disabled.
  Models: ${byTier("estimate")}

## Coverage

${providerLines}

## Tokenizers used

${assetLines}

Plus o200k_base, o200k_harmony and cl100k_base, which are bundled with the page
and need no download.

## Key facts

- Nothing you paste is sent to a server. There is no API route in this app.
- Anthropic does not publish a Claude tokenizer, so Claude counts are estimates
  shown as a range. Do not cite them as exact.
- Google does not publish a Gemini tokenizer, so Gemini counts use Gemma 3 as a
  family proxy.
- Counting raw text is not the same as counting an API request. System prompts,
  chat message framing, tool definitions and images all add tokens on top.
- Tokenizer files are fetched from Hugging Face on first use, with the file size
  shown beforehand, then cached in the browser.

## More

- [FAQ](${SITE_URL}/faq): what a token is, why counts differ between models, and what each accuracy tier means.
- [Privacy Policy](${SITE_URL}/privacy): what the page does and does not do with your text.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
