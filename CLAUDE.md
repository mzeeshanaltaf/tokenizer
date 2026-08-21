# Token Counter — Project Guide

A client-side token counter. Paste text, pick a model, get the token count, the
character/word/line/byte counts, the position of every token boundary, and the
token IDs. Every tokenizer runs in a Web Worker in the browser. There is no API
route in this app and no way for pasted text to reach a server.

Design context lives in `PRODUCT.md` and `DESIGN.md`. Read them before touching UI.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui — **Base UI primitives, not Radix** (see gotchas)
- `gpt-tokenizer` (bundled encodings) and `@huggingface/tokenizers` (downloaded ones)
- Phosphor Icons, next-themes (class strategy, dark default), sonner
- Vitest for unit tests

## Commands

```bash
npm run dev                # dev server at http://localhost:3000
npm run build              # production build (also type-checks)
npm run lint               # ESLint, must pass with zero warnings
npm test                   # Vitest
npm run verify:tokenizers  # re-check every HF tokenizer: 200, CORS, size, round trip
npm run calibrate:anthropic ./corpus   # refit the Claude estimator, needs a key
```

## The accuracy model

This is the load-bearing idea. Everything else serves it.

Every model in `lib/models.ts` carries one of three tiers, and the tier decides
what the UI is allowed to claim:

| Tier | Meaning | Count | Stream | Token IDs |
|---|---|---|---|---|
| `exact` | The model's own published tokenizer runs locally | Point value | Real | Enabled |
| `proxy` | A published tokenizer from the same family stands in | Point value | The proxy's | Enabled |
| `estimate` | No public tokenizer exists | **Range** | Proxy segmentation | **Disabled** |

Today `proxy` is Gemini (counted with Gemma 3) and `estimate` is Claude only.

**Invariants that must not be broken:**

1. **A count never renders without its tier beside it.** `StatRail` takes both.
2. **An `estimate` never renders as a point value.** If `counts.range` is set,
   the bounds render underneath the headline number.
3. **Token IDs are refused for `estimate`.** `supportsTokenIds()` gates it, and
   `showIds` is derived (`idsRequested && idsAllowed`) rather than synced, so
   there is no frame where IDs from another model are on screen.
4. **A result never appears under a tier that did not produce it.** Worker
   messages carry `modelId`; `useTokenizer` withholds any result whose
   `resultFor` does not match the selected model.
5. **An unverifiable segmentation is not shown.** `buildStream` returns
   `verified: false` and `TokenStream` renders an explanation instead.

## Architecture

- **`src/app/page.tsx` is a Server Component.** It renders the H1, the
  standfirst, the client island, and the JSON-LD. Only the counter is
  client-side. The long-form content moved to `src/app/faq/page.tsx`, which owns
  the FAQ copy and the FAQPage schema, so the home page leads with the tool.
- **FAQ copy is data, in `src/lib/faqs.ts`.** The page renders it and
  `faqSchema` serialises the same array, so the two cannot drift apart.
- **The island** (`components/counter/counter-island.tsx`) is `next/dynamic` with
  `ssr: false`, because the counter creates a Worker and reads `caches` on mount.
- **All tokenizer code is imported only inside `src/workers/tokenize.worker.ts`.**
  Importing `lib/tokenizers/*` from a component would pull a 2 MB vocabulary
  into the page bundle. Do not do it.
- **`src/lib/` is pure and framework-free.** `models.ts` is data only and imports
  nothing at runtime, so it is safe from a Server Component.

### Tokenizing pipeline

```
text -> useTokenizer (debounce, generation counter)
     -> worker: prepare(model) -> count  (phase 1, cheap)
                               -> tokens -> buildStream  (phase 2, on demand)
```

`prepare()` dispatches on the registry entry: bundled `gpt-tokenizer` encoding,
downloaded Hugging Face `tokenizer.json`, or the Claude estimator.

### Why `buildStream` walks bytes

BPE tokenizers split on **bytes**, not characters. A single emoji is four UTF-8
bytes and is routinely cut across two or three tokens, so decoding tokens one at
a time yields a wall of U+FFFD. Instead `buildStream` walks byte offsets through
the original string, checks every token's bytes against the source as it goes,
and only closes a chip where a byte boundary is also a character boundary.
Tokens ending mid-character merge into one chip carrying several IDs.

If the bytes ever disagree with the source, the whole stream is reported
unverified rather than shown. That check is what makes `verified` mean anything.

## Performance rules

Measured on a 43k-character paste. Break these and it regresses hard.

- **Nothing tokenizes on the main thread.** One Worker, created once, reused.
- **Counts and the stream have separate debounces** (120 ms and 400 ms).
  Rebuilding several thousand chips is the expensive operation; nobody reads
  chips mid-keystroke, so it waits for a pause.
- **The chip tree is memoized on `[tokens, tier, showIds]`.** Without this every
  keystroke re-renders every chip: measured at 117 ms per keystroke, versus
  14 ms with the memo. Do not remove it, and do not add a prop to `TokenStream`
  that changes identity on every parent render without adding it to the deps.
- **Chunks carry `content-visibility: auto`** so offscreen chips cost nothing.
- **Chip cap is `DEFAULT_STREAM_LIMIT`** with an explicit "render all" escape.
- **The stream scrolls in its own box** (`max-h-[min(70vh,44rem)]`,
  `overscroll-contain`) rather than growing the page, so the count and the model
  picker stay reachable on a long paste.

### Why the stream needs explicit break opportunities

`TokenChip` substitutes whitespace with visible glyphs, and the chips are
emitted back to back with no whitespace text nodes between them. That leaves the
line breaker with nothing to break on, and a pasted paragraph renders as one
unbreakable run that overflows the panel sideways. Each chip therefore emits a
`<wbr>` after itself (a newline-bearing chip emits the hard break instead), and
the container is `break-words` so a single chip wider than the line still
breaks. Remove either and horizontal overflow comes straight back.

## Conventions & invariants

- **The registry is explicit.** `lib/models.ts` maps model to encoding in our own
  data rather than leaning on `gpt-tokenizer`'s built-in model map, which lags
  new model names and silently falls back.
- **Claimed numbers are pinned by tests.** The vocabulary figures printed in the
  FAQ page are asserted in `lib/vocab-sizes.test.ts`; the Hugging Face ones by
  `scripts/verify-tokenizers.mjs`. If you change the table, change the test.
- **Adding a tokenizer asset:** add it to `TOKENIZER_ASSETS` with its **measured**
  byte size, then run `npm run verify:tokenizers`. If it fails, drop it rather
  than shipping it broken.
- **`gpt-tokenizer` internals:** `tokensWith` reads
  `bytePairEncodingCoreProcessor`, which is undocumented. It is guarded (returns
  null) and pinned by a test, so a version bump degrades to counts-only instead
  of rendering nonsense. If that test fails, the dependency changed.
- **No ligatures in monospace.** `.font-readout` sets `font-variant-ligatures:
  none`. JetBrains Mono renders `=>` as one glyph, which would show the user a
  character that is not in their text.
- **No em dashes in user-facing strings.** Use commas, colons, or parentheses.
- **No analytics, no third-party scripts, no remote fonts.** The product promise
  is that nothing leaves the device; shipping a tracker would contradict it.
  Fonts are self-hosted by `next/font` at build time.

## Accessibility

- The tier is never carried by color alone: each has a word, a glyph, and a fill
  treatment (solid / hatched / dashed) that survives greyscale.
- Both themes measured at WCAG AA on every text pair. The light-theme brass was
  darkened to `oklch(0.5 0.12 68)` to give the filled badge margin (5.98).
- `prefers-reduced-motion` collapses all transitions.
- The count is in an `aria-live="polite"` region with an sr-only suffix that
  distinguishes "waiting for input", "counting", and an estimated range.

## Base UI vs Radix gotchas

The shadcn components use `@base-ui/react`, so the API differs from Radix:

- Button has no `asChild`. Use `render={<Link href="..." />}` plus
  `nativeButton={false}`.
- `TooltipProvider` uses `delay`, not `delayDuration`.
- **`Select.Value` renders the raw value.** Pass a formatter function as children
  to show a label: `<SelectValue>{(v) => getModel(v).name}</SelectValue>`.
- **`Switch` puts `id` on a hidden `<input>`, not on the switch.** A
  `<label htmlFor>` would name an `aria-hidden` element and leave the switch
  unnamed. Use `aria-labelledby` pointing at the visible text.

## Adding a model

1. Add the entry to `MODELS` in `src/lib/models.ts` with its `tier`,
   `tokenizerName`, and a one-sentence `why` explaining the tier.
2. If it needs a new tokenizer file, add it to `TOKENIZER_ASSETS` and run
   `npm run verify:tokenizers`.
3. If the tier is `proxy` or `estimate`, say so on the FAQ page too. The
   registry drives `/llms.txt` automatically.
