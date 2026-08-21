# Design

Seeded before implementation, from the confirmed direction in PRODUCT.md.
Re-run `$impeccable document` once the UI exists to capture the real tokens.

## Visual Theme

A measuring instrument, not a dashboard.

The scene: a prompt engineer pastes a 40,000-character system prompt at 11pm,
editor already dark, wanting to know whether it fits the context window before
shipping. Dark is home. The light theme meets the same bar but is tuned second.

The reference lane is precision hardware, brass calipers and machined scales,
not developer-tool chrome. Concretely that means warm charcoal rather than
slate, a brass accent rather than indigo, tight radii, hairline rules instead of
card borders wherever a rule will do, and monospace carrying every number on the
page.

The deliberate move away from the category reflex: the surface is **warm**. Every
neutral is tinted toward the brass hue, so the dark theme reads as anodized metal
under a work lamp rather than as the standard blue-black SaaS night mode.

## Color Palette

**Strategy: Restrained.** Tinted neutrals plus one accent held under 10% of the
surface. The accent is not decoration: it is reserved to mean *this number is
measured*, which is the single most important distinction in the product.

All values OKLCH. No `#000`, no `#fff`. Brand hue is **78** (brass).

### Dark (primary)

| Role | Value | Use |
|---|---|---|
| `--background` | `oklch(0.16 0.008 78)` | Page. Warm near-black, never neutral grey. |
| `--card` | `oklch(0.20 0.009 78)` | Raised panels: input, stream, rail. |
| `--foreground` | `oklch(0.95 0.006 78)` | Body and readouts. |
| `--muted-foreground` | `oklch(0.68 0.010 78)` | Labels, units, secondary readouts. |
| `--border` | `oklch(0.30 0.010 78)` | Hairlines. 1px only, never a side stripe. |
| `--primary` | `oklch(0.80 0.130 78)` | Brass. The exact-tier accent. |
| `--primary-foreground` | `oklch(0.20 0.040 78)` | Text on brass. |
| `--accent` | `oklch(0.26 0.030 78)` | Hover and selected rows. |
| `--destructive` | `oklch(0.68 0.170 28)` | Errors only. Never a tier. |

### Light

| Role | Value | Use |
|---|---|---|
| `--background` | `oklch(0.985 0.004 78)` | Warm paper. |
| `--card` | `oklch(1 0 0)` | Panels lift by being cleaner, not brighter. |
| `--foreground` | `oklch(0.20 0.010 78)` | Ink. |
| `--muted-foreground` | `oklch(0.50 0.012 78)` | Labels and units. |
| `--border` | `oklch(0.90 0.008 78)` | Hairlines. |
| `--primary` | `oklch(0.55 0.115 70)` | Brass, darkened to hold AA on paper. |
| `--destructive` | `oklch(0.58 0.200 28)` | Errors only. |

### Tier encoding, the load-bearing rule

The accuracy tier is **never** carried by hue alone. Each tier is a word, plus a
distinct fill treatment that survives greyscale:

| Tier | Badge | Token chip | Count |
|---|---|---|---|
| `exact` | Filled brass, solid | Solid tinted fill, 1px solid edge | Point value |
| `proxy` | Outlined, brass hairline | Solid tinted fill, 1px dashed edge | Point value |
| `estimate` | Ghost, muted, no fill | Hatched fill, 1px dashed edge | Range, never a point |

Token chip alternation within the stream is decoration and carries no meaning,
so it stays subtle: two alternating background tints at very low chroma. The
chip edge, not the fill, is what makes a boundary visible.

## Typography

Two families, both self-hosted through `next/font/google` at build time so the
page makes no runtime request to a font CDN. That is a product commitment, not a
performance one.

- **Mono: JetBrains Mono.** Carries every number, every token chip, every token
  ID, and the input textarea. `font-variant-numeric: tabular-nums` everywhere a
  number can change, so digits do not jitter as the count updates.
- **Sans: Geist.** Prose only: the explainer, the FAQ, labels longer than two
  words.

Scale, ratio 1.25 or wider between steps:

| Step | Size / line-height | Use |
|---|---|---|
| Readout | `2.75rem / 1` mono, `-0.03em` | The token count. |
| H1 | `2rem / 1.15` sans, `-0.02em` | One per page. |
| H2 | `1.375rem / 1.3` sans | Explainer sections. |
| Body | `0.9375rem / 1.65` sans, max `68ch` | Prose. |
| Readout label | `0.6875rem / 1` mono, `0.08em`, uppercase | Stat rail units. |
| Chip | `0.8125rem / 1.5` mono | Token stream. |

The readout is large because it is the answer, but it is set in mono at a normal
weight, not as a gradient hero number. Emphasis comes from size and the brass
tier badge beside it, never from `background-clip: text`.

## Layout

- Single column, `max-width: 78rem`, generous side gutters. No sidebar: there is
  one tool and it does not need navigation.
- The workspace is an asymmetric two-column split at `lg`: input left at roughly
  `1.4fr`, the stat rail right at `minmax(16rem, 1fr)`. Below `lg` the rail moves
  above the input, because the count is why the user came.
- The token stream spans full width beneath both, since it is the thing that
  needs horizontal room.
- Rhythm varies on purpose: tight inside the stat rail (dense readouts, `0.75rem`
  gaps), loose between the tool and the explainer (`5rem`), comfortable within
  prose. Uniform padding everywhere would be the monotony the shared laws warn
  about.
- Panels are separated by hairlines and background shifts. Cards are used only
  for the input and the stream, where a real container edge helps. Never nested.

## Components

- **Model picker.** Grouped `<select>` by provider, each option carrying its tier.
  The selected model's tier badge sits directly beside the picker, not in a
  distant legend.
- **Accuracy badge.** The tier word, its fill treatment, and a disclosure that
  opens the one-sentence reason from the registry. Always adjacent to the count.
- **Stat rail.** Tokens first and largest, then characters, words, lines, bytes,
  each a mono readout over an uppercase mono label. Hairline-divided rows, not
  a grid of identical cards.
- **Token stream.** Chips rendered in chunks with `content-visibility: auto` per
  chunk, hard-capped with an explicit "render all" escape hatch. Whitespace and
  newlines are shown as visible glyph substitutes inside the chip so an
  all-whitespace token is not an invisible gap.
- **Download prompt.** Before any tokenizer fetch: the real file size, a progress
  bar, and a note that it is cached after the first time. Never a silent stall.

## Motion

Minimal and functional. Ease-out-quart, 120ms to 200ms, never bounce.

- The count cross-fades and slides 2px when it settles. It does not tick up.
- Chips fade in per chunk, not per chip.
- The download progress bar is the only continuous motion on the page.
- `prefers-reduced-motion: reduce` collapses all of it to an instant swap.

## Radii and elevation

`--radius: 0.375rem`. Instruments have tight corners. Token chips are tighter
still at `3px`. Elevation is carried by a one-step background shift plus a
hairline, not by shadow; the only shadow on the page is under the model picker's
open popup.
