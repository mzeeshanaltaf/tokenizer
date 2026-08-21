# Product

## Register

product

## Users

Developers and prompt engineers, working inside a build. They arrive from an
editor or a terminal with a concrete question and one piece of text: does this
system prompt fit the context window, how much will this batch cost, why is the
same document 12% more expensive on one model than another.

They are not browsing. They paste, read one number, and leave. A visit that
takes longer than about fifteen seconds has failed them, unless they chose to
stay and look at the token boundaries, which is the one thing here worth
lingering over.

They know what a token is. They do not need it explained before they can use the
tool, but some of them arrived from a search engine asking exactly that, and the
page has to serve both without patronising either.

## Product Purpose

Count the tokens in a piece of text, for a chosen model, without the text ever
leaving the device.

Success is a number the user can act on plus an honest label saying how much
that number can be trusted. Every tokenizer runs in the browser: no API keys, no
server, no request that could log what was pasted.

The hard part is not counting. It is that the five things this tool reports are
not equally knowable across providers. OpenAI publishes its tokenizer, so counts,
boundaries and IDs are exactly reproducible. Anthropic publishes nothing, and its
only exact count needs a key and a round trip we have promised not to make.
Google publishes Gemma but not Gemini.

So the product is really about calibrated confidence. A tool that is exact where
it can be, openly estimated where it cannot be, and that never lets a guess wear
the same clothes as a measurement.

## Brand Personality

Precise, plain-spoken, unhurried.

The voice of a good instrument's documentation: it tells you the reading and the
tolerance in the same breath, without apologising for the tolerance and without
hiding it in a footnote. No exclamation marks, no "Oops!", no celebration of a
number that is merely correct.

Three words: **instrument, candid, dense.**

Where it has to say something uncomfortable, such as "we cannot count Claude
exactly", it says it once, at full size, in the place the user is already
looking. Not in a tooltip, not in the footer.

## Anti-references

- **The generic dark-blue SaaS dashboard.** Slate-900 background, indigo-500
  accent, three identical stat cards with an icon in a rounded square, a gradient
  somewhere for no reason. This is the training-data reflex for "developer tool"
  and it is the specific thing to avoid.
- **The hero-metric template.** One enormous gradient number with a small caption
  under it. The token count is important, but it is a reading, not a trophy.
- **Marketing chrome on a utility.** No "Trusted by", no logo wall, no testimonial,
  no pricing table, no cookie banner. There is nothing to sell.
- **Confident nonsense.** Any UI that would render an estimate with the same
  visual weight as a measurement, or show plausible-looking token IDs for a
  tokenizer nobody has published. The estimate tier disables the ID toggle for
  exactly this reason.
- **Toy tokenizer demos.** Pastel chip rainbows where the colors carry no meaning
  and the same word changes color twice on a re-render.

## Design Principles

1. **A reading always carries its tolerance.** No count renders anywhere without
   its accuracy tier next to it. If the tier is `estimate`, the number renders as
   a range, never as a point. This is a structural rule, not a style preference.

2. **Refuse rather than approximate.** Where the honest answer is "we do not
   know", show nothing and say why. Token IDs are disabled for Claude, and the
   token stream hides itself entirely if byte-accurate reconstruction fails.
   An empty state that explains itself beats a filled state that misleads.

3. **The token stream is the interface.** The count is the answer, but the
   segmentation is the insight: it is where a user sees *why* their text costs
   what it costs. It gets the space, and it has to stay readable at 50,000
   characters.

4. **Density is respect.** These users read dense readouts all day. Whitespace
   spent on breathing room is whitespace not spent on the next number they
   wanted. Vary rhythm for hierarchy, not for comfort.

5. **Practice what you preach.** A tool whose entire premise is "nothing leaves
   your device" cannot ship third-party analytics scripts, remote fonts it did
   not need, or a network request it cannot explain. The one deliberate exception,
   downloading a tokenizer from Hugging Face, is announced with its real file
   size before it happens.

## Accessibility & Inclusion

**Target: WCAG 2.2 AA**, with one commitment above it.

- **The accuracy tier is never communicated by color alone.** Each tier carries a
  word, and a distinct shape or texture: `exact` is a filled badge with solid
  chips, `proxy` is an outlined badge with hatched chips, `estimate` is a ghost
  badge with dashed chips. Around one in twelve men cannot rely on hue, and the
  tier is the single most important thing on the page to get across.
- Token chip color alternation is decoration and carries no meaning, so it is
  free to be subtle. It must never be the only way to see a boundary; the chip
  edge does that job.
- Full keyboard operation, visible focus rings that survive both themes, and a
  live region announcing the count when it settles, so the number is available
  without watching it change.
- `prefers-reduced-motion` honored: the count transition and any chip animation
  reduce to an instant swap.
- The disabled Token IDs control explains itself in text on focus, not only as a
  greyed-out affordance.
- Dark is the primary theme, but the light theme meets the same AA bar. Neither
  is a downgrade.
