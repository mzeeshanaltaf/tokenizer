# Caliper: build progress

Tracks the build order from the implementation plan. Updated as work lands.

## 1. Scaffold — done

- [x] Next.js 16 + React 19 + TypeScript, Keyforge's exact config files
- [x] Tailwind v4 + shadcn on Base UI primitives, `components.json` matched
- [x] Vitest + `vite-tsconfig-paths`
- [x] `gpt-tokenizer@4` and `@huggingface/tokenizers@0.1.3` installed
      (plan named versions that do not exist on npm; corrected to the real ones)

## 2. Verify every Hugging Face tokenizer repo — done

All seven return 200, are ungated, send permissive CORS, and round-trip
byte-exactly through the real production code path. Nothing was dropped.

| Asset | Repo | Size | Mode |
|---|---|---|---|
| gemma-3 | onnx-community/gemma-3-1b-it-ONNX | 19.4 MB | metaspace |
| llama-3.1 | Xenova/Meta-Llama-3.1-Tokenizer | 8.7 MB | byte-level |
| llama-4 | unsloth/Llama-4-Scout-17B-16E-Instruct | 26.7 MB | byte-level |
| mistral-v3 | Xenova/mistral-tokenizer-v3 | 1.9 MB | metaspace |
| tekken | Xenova/Mistral-Nemo-Instruct-Tokenizer | 8.8 MB | byte-level |
| qwen3 | onnx-community/Qwen3-0.6B-ONNX | 8.7 MB | byte-level |
| deepseek-v3 | deepseek-ai/DeepSeek-V3 | 7.5 MB | byte-level |

Registry corrections made against the plan, each verified by comparing
vocabularies entry for entry:

- [x] Llama 4 has its own 200k tokenizer; it is **not** Llama 3.1's. Ships separately.
- [x] Llama 3.3 is byte-identical to Llama 3.1. One asset, both exact.
- [x] DeepSeek-R1 is byte-identical to DeepSeek-V3. One asset, both exact.
- [x] Qwen3 onnx-community mirror is identical to the official repo. Uses the smaller mirror.
- [x] Mistral Small 3 vs tekken differ in ten reserved special-token slots only.

## 3. Pure logic + worker — done

- [x] `lib/text-stats.ts`
- [x] `lib/models.ts` (registry, assets, tier rules)
- [x] `lib/tokenizers/types.ts`, `byte-level.ts`, `stream.ts`
- [x] `lib/tokenizers/openai.ts`, `hf.ts`, `anthropic-estimate.ts`, `index.ts`
- [x] `workers/tokenize.worker.ts` (two-phase, generation-counter cancellation)
- [x] `scripts/verify-tokenizers.mjs`
- [x] `scripts/calibrate-anthropic.mjs`

## 4. Tests — done

- [x] 78 passing: text stats, OpenAI adapter against tiktoken fixtures,
      byte-accurate stream reconstruction, the estimator

## 5. Design pass — done

- [x] impeccable context loader run
- [x] `PRODUCT.md` (register: product; brass instrument, dark home)
- [x] `DESIGN.md`
- [x] shape brief confirmed by user

Answers that shaped the build: dark is home, measuring-instrument register,
WCAG AA with the tier never carried by color alone, empty first load with a
one-click sample, Claude shown as mid-with-bounds-beneath.

## 6. UI island — done

- [x] `globals.css`, brass hue 78, warm tinted neutrals, no pure black or white
- [x] `counter-island.tsx`, `counter.tsx`
- [x] `model-picker.tsx`, `accuracy-badge.tsx`
- [x] `input-panel.tsx`, `stat-rail.tsx`
- [x] `token-stream.tsx`, `token-chip.tsx`
- [x] `hooks/use-tokenizer.ts` (split count/stream debounce)
- [x] `navbar.tsx`, `footer.tsx`

Defects found by driving the real browser, and fixed:

- [x] Model picker showed the registry id, not the display name
- [x] Mid-download the rail paired the previous model's count with the new
      model's tier badge. Results now carry the model that produced them.
- [x] Base UI puts `id` on a hidden input, so the Token IDs label named an
      aria-hidden element and left the switch unnamed. Now `aria-labelledby`.
- [x] Typing on a 43k-char document cost 117 ms per keystroke because all 4,190
      chips re-rendered. Memoized the chip tree: **117 ms to 14 ms**, no long
      tasks while typing.

## 7. SEO surface — done

- [x] `lib/site.ts` (title 55 with suffix, description 153), `lib/structured-data.ts`
- [x] `layout.tsx`, `page.tsx`, `icon.svg`
- [x] `opengraph-image.tsx` with a CTA and a real token stream on the image
- [x] `robots.ts`, `sitemap.ts`, `manifest.ts`, `llms.txt/route.ts`
- [x] `explainer.tsx` (server-rendered, vocabulary figures pinned by tests)
- [x] `privacy/page.tsx`

## 8. Docs — done

- [x] `CLAUDE.md` / `AGENTS.md` in the Keyforge house style
- [x] `README.md` including the stated limitations

Further defects found by driving the browser, and fixed:

- [x] Page scrolled sideways 29 px at 375 px, because grid children default to
      `min-width: auto` and the reference tables stretched their column instead
      of scrolling inside their own wrapper. Added `min-w-0`.
- [x] JetBrains Mono ligatures rendered `=>` as a single glyph and `!=` as
      another. In a tool that shows which characters became which tokens, a font
      that merges two characters into one is showing something that is not in
      the user's text. Ligatures disabled everywhere monospace is used.
- [x] The logo mark, two bars and a crossbar, read as the letter H. Redesigned
      as a dimension between two jaws, with arrowheads.
- [x] Light-theme brass darkened to `oklch(0.5 0.12 68)`: the filled `exact`
      badge measured 4.80, passing AA but with no margin on the single most
      important element. Now 5.98.

## Verification checklist (plan section: Verification)

- [x] `npm run build` clean, 10 routes prerendered
- [x] `npm run lint` zero warnings, zero errors
- [x] `npm test`, 81 passing
- [x] 43k-char paste: 14 ms worst keystroke, zero long tasks while typing
- [x] cold model download shows size and progress (Llama 3.1, 8.7 MB, 75% seen)
- [x] warm cache: zero requests to huggingface.co on reload and re-select
- [x] Claude: estimate badge, "18, 16 to 22", Token IDs disabled with reason
- [x] Gemini: proxy badge, names Gemma 3 as the stand-in
- [x] emoji and CJK: no replacement characters (`Hello`, `·👋`, `·世界`, `·🇯`, `🇵`)
- [x] token IDs match o200k_base: `hello`=24912, `world`=2375
- [x] JSON-LD present in raw HTML (SoftwareApplication, Organization, FAQPage)
- [x] meta description 153 characters, title 55 with the brand suffix
- [x] WCAG AA on every measured text pair, both themes
- [x] 375 px viewport: zero horizontal overflow, tables scroll in their own box
- [x] OG image renders at 1200x630 with a CTA and a real token stream

## Not done

- [ ] Lighthouse run. Needs a deployed origin or a Lighthouse install; the
      underlying signals it grades (server-rendered content, single H1, valid
      JSON-LD, AA contrast, INP under 200 ms) were each measured directly above.
- [ ] Google Rich Results Test. Needs a public URL. The JSON-LD is confirmed
      present in `view-source` and parses.
- [ ] The Claude estimator is still on literature-derived defaults. Run
      `npm run calibrate:anthropic` against a corpus with a key to replace them.
