# Token Counter

A token counter that is exact where it can be and honest where it cannot.

Paste text, pick a model, and get the token count, the character, word, line and
UTF-8 byte counts, the position of every token boundary, and the token IDs.
Everything runs in your browser. No API key, no server route, and the text you
paste is never transmitted.

## Why this exists

Counting tokens is easy for one provider and impossible for another, and most
token counters paper over the difference. OpenAI publishes its tokenizer, so its
counts, boundaries and IDs are exactly reproducible. Anthropic publishes nothing.
Google publishes Gemma but not Gemini.

Token Counter labels every count with how much it can be trusted, and the label changes
what the interface will do:

| Tier | Meaning | Count | Boundaries | Token IDs |
|---|---|---|---|---|
| **exact** | The model's own published tokenizer runs locally | Real | Real | Enabled |
| **proxy** | A published tokenizer from the same family stands in | Close | The proxy's | Enabled |
| **estimate** | No public tokenizer exists | A range | Proxy segmentation | **Disabled** |

Disabling token IDs on the estimate tier is deliberate. Showing plausible-looking
wrong integers is worse than showing nothing.

## Coverage

| Provider | Models | Tokenizer | Tier |
|---|---|---|---|
| OpenAI | GPT-5.6 Sol / Terra / Luna, 5.5 (+Pro), 5.4 (+mini/nano), 5.3-Codex, 5.2 (+Pro), 5.1, 5, GPT-4.1 (+mini), GPT-4o (+mini), o3, o4-mini | `o200k_base` | exact |
| OpenAI | gpt-oss-120b, gpt-oss-20b | `o200k_harmony` | exact |
| OpenAI | GPT-4 Turbo, GPT-4, GPT-3.5 Turbo | `cl100k_base` | exact |
| Anthropic | Opus 5, Sonnet 5, Opus 4.8 / 4.7 / 4.6, Sonnet 4.6, Haiku 4.5 | calibrated estimator | **estimate** |
| Google | Gemma 3 | Gemma 3 | exact |
| Google | Gemini 3.7 Pro, 3.6, 3.5 Flash, 3.1 Pro, 2.5 Pro / Flash | Gemma 3 | **proxy** |
| Meta | Llama 4 Scout / Maverick | Llama 4 | exact |
| Meta | Llama 3.3 70B, Llama 3.1 | Llama 3.1 | exact |
| Mistral | Mistral Large 2 | Mistral v3 | exact |
| Mistral | Mistral Small 3, Mistral Nemo | tekken | exact |
| Qwen | Qwen3 | Qwen3 | exact |
| DeepSeek | DeepSeek-V3, DeepSeek-R1 | DeepSeek V3 | exact |

OpenAI encodings ship with the page. The rest are fetched from the Hugging Face
Hub on first use, with the real file size shown before the download starts, then
cached in the browser so a second visit costs no network at all.

Every one of those files was verified before shipping: reachable, ungated,
CORS-permissive, its recorded size matching the server, and byte-exact on a
corpus of emoji, CJK, RTL text and source code. Re-run that check any time:

```bash
npm run verify:tokenizers
```

## Known limitations

Stated here and in the app, not buried.

- **Claude counts are estimates.** Anthropic does not publish a tokenizer, and
  its only exact count needs an API key and a round trip to a server. The
  estimator splits text into runs by character class, counts each with a
  published tokenizer, and applies a per-class factor. The factors are
  **literature-derived defaults, not measurements**. Run the calibration script
  below to replace them with real ones.
- **Gemini counts use Gemma 3 as a family proxy.** Google does not publish
  Gemini's tokenizer. The boundaries shown are real, they are just Gemma's.
- **Counting text is not counting a request.** A live API call also spends
  tokens on chat message framing, your system prompt, tool and function
  definitions, and images. Treat the number here as the cost of your content,
  then add the overhead of the envelope that carries it.
- **Token IDs are unavailable for Claude**, by design. See above.

## Calibrating the Claude estimator

The estimator ships with reasonable defaults. To replace them with measurements,
point the script at a corpus with an API key set. It calls
`messages.count_tokens` per sample, subtracts a measured empty-message baseline,
solves a non-negative least-squares fit per character class, and prints a
replacement table to paste into `src/lib/tokenizers/anthropic-estimate.ts`.

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run calibrate:anthropic ./corpus
```

The corpus wants a spread that matches how the tool is used: English prose,
source code in a few languages, Chinese or Japanese, a Cyrillic or Arabic
sample, and something emoji-heavy. Twenty files of a few hundred words each is
plenty, since the fit is over classes rather than over files.

This script never runs in the app and never ships a key. It is the only place in
the repository that talks to Anthropic.

## Privacy

Text you paste never leaves your device. There is no API route in this
application that could receive it, no analytics script, no advertising, no
tracking cookies, and no third-party embeds. Fonts are self-hosted at build time,
so viewing the page does not contact a font CDN either.

The only network request the page makes is fetching a public tokenizer file from
Hugging Face when you select a model that needs one. Your text is not part of
that request.

## Development

```bash
npm install
npm run dev                # http://localhost:3000
npm run build              # production build, also type-checks
npm run lint               # must pass with zero warnings
npm test                   # Vitest
npm run verify:tokenizers  # re-verify every Hugging Face tokenizer
```

Set `NEXT_PUBLIC_SITE_URL` in production so canonical URLs, the sitemap and the
JSON-LD point at the right origin.

Architecture notes, invariants, and the Base UI gotchas are in
[CLAUDE.md](CLAUDE.md). Design context is in [PRODUCT.md](PRODUCT.md) and
[DESIGN.md](DESIGN.md).

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui on Base UI
primitives, `gpt-tokenizer`, `@huggingface/tokenizers`, Vitest.
