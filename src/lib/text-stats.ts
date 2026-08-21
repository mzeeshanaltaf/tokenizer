/**
 * Plain-text measurements that sit alongside the token count. All of these are
 * exact and model-independent, which is why they live outside `tokenizers/`.
 *
 * Every count here is deliberate about Unicode:
 *  - `characters` counts UTF-16 code units, matching `String.length` and what a
 *    textarea's `maxLength` enforces.
 *  - `graphemes` counts what a reader would call "characters", so an emoji with
 *    skin-tone and ZWJ joiners counts as one.
 *  - `bytes` counts UTF-8 bytes, which is what the network and most storage
 *    limits actually charge for.
 */
export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  graphemes: number;
  words: number;
  lines: number;
  paragraphs: number;
  bytes: number;
}

const encoder = new TextEncoder();

/** Runs of anything that is not Unicode whitespace, counted as words. */
const WORD_RE = /\S+/gu;

/** Lazily created because Intl.Segmenter is unavailable on a few older engines. */
let graphemeSegmenter: Intl.Segmenter | null | undefined;

function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter =
      typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  return graphemeSegmenter;
}

/**
 * Counts user-perceived characters. Falls back to counting code points where
 * `Intl.Segmenter` is missing, which over-counts joined emoji but never throws.
 */
export function countGraphemes(text: string): number {
  if (text.length === 0) return 0;
  const segmenter = getGraphemeSegmenter();
  if (!segmenter) return [...text].length;
  // `segment()` returns an iterable of segment records; counting them is the
  // only way to get a grapheme count without materialising the whole array.
  let n = 0;
  const iterator = segmenter.segment(text)[Symbol.iterator]();
  while (!iterator.next().done) n++;
  return n;
}

export function countWords(text: string): number {
  const matches = text.match(WORD_RE);
  return matches ? matches.length : 0;
}

/**
 * Lines as an editor shows them: a trailing newline does not open a new line,
 * and empty input is zero lines rather than one.
 */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const normalized = text.replace(/\r\n?/g, "\n");
  const trimmed = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return trimmed.split("\n").length;
}

/** Blocks separated by one or more blank lines, ignoring blank blocks. */
export function countParagraphs(text: string): number {
  const normalized = text.replace(/\r\n?/g, "\n");
  return normalized.split(/\n\s*\n/).filter((block) => block.trim().length > 0).length;
}

export function countBytes(text: string): number {
  return encoder.encode(text).length;
}

export function textStats(text: string): TextStats {
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/gu, "").length,
    graphemes: countGraphemes(text),
    words: countWords(text),
    lines: countLines(text),
    paragraphs: countParagraphs(text),
    bytes: countBytes(text),
  };
}

export const EMPTY_STATS: TextStats = {
  characters: 0,
  charactersNoSpaces: 0,
  graphemes: 0,
  words: 0,
  lines: 0,
  paragraphs: 0,
  bytes: 0,
};
