import type { CountRange } from "./types";

/**
 * Claude token estimator.
 *
 * Anthropic does not publish a tokenizer. The only exact count available is the
 * `messages.count_tokens` API endpoint, which returns a bare integer, needs an
 * API key, and would mean sending your text to a server. This app is fully
 * client-side, so Claude is an openly-labelled estimate and the UI never shows
 * it as a point value.
 *
 * A flat multiplier would be wrong almost everywhere. tiktoken-family
 * tokenizers undercount Claude by roughly 15-20% on English prose, but by
 * considerably more on code and on non-Latin scripts, where Claude's vocabulary
 * has thinner coverage than o200k_base. So the text is split into runs by
 * character class, each run is counted with o200k_base, and a per-class factor
 * is applied before summing.
 *
 * IMPORTANT: the factors below are literature-derived defaults, not
 * measurements taken against the real endpoint. `scripts/calibrate-anthropic.mjs`
 * refits them from a corpus if you have a key and ten minutes.
 */

export type CharClass = "latin" | "code" | "cjk" | "otherScript" | "emojiSymbol";

export interface ClassFactor {
  low: number;
  mid: number;
  high: number;
  /** Why this number, so a future reader can argue with it. */
  note: string;
}

/**
 * Multipliers applied to an o200k_base count, per character class.
 *
 * The spread between `low` and `high` is the honest part: it is the observed
 * variance within each class, which is why the UI shows a range. Replace this
 * whole table with the output of `scripts/calibrate-anthropic.mjs`.
 */
export const CALIBRATION: Record<CharClass, ClassFactor> = {
  latin: {
    low: 1.1,
    mid: 1.16,
    high: 1.24,
    note: "English and Latin-script prose. Community comparisons of Anthropic's count_tokens against tiktoken consistently land in the +10% to +25% band, tightest on ordinary prose.",
  },
  code: {
    low: 1.15,
    mid: 1.3,
    high: 1.45,
    note: "Source code. Wider than prose because the gap depends heavily on identifier style, indentation width, and how much punctuation the language uses.",
  },
  cjk: {
    low: 1.3,
    mid: 1.55,
    high: 1.85,
    note: "Chinese, Japanese, Korean. o200k_base added substantial CJK vocabulary that Claude's tokenizer does not appear to match, so this is the widest and least certain class.",
  },
  otherScript: {
    low: 1.15,
    mid: 1.35,
    high: 1.6,
    note: "Cyrillic, Greek, Arabic, Hebrew, Devanagari, Thai and other non-Latin alphabets. Between prose and CJK in both size and confidence.",
  },
  emojiSymbol: {
    low: 1.0,
    mid: 1.2,
    high: 1.45,
    note: "Emoji, pictographs, box drawing and other symbols. Usually byte-fallback in both tokenizers, so the two are often close, but joined emoji sequences diverge.",
  },
};

/** Characters that suggest code rather than prose, per the plan's heuristic. */
const CODE_PUNCTUATION = new Set("{}();=<>/_[]|&*+#$`".split(""));

/** Punctuation density of a line, measured without its indentation. */
function codePunctuationDensity(line: string): number {
  const body = line.trim();
  if (body.length === 0) return 0;
  let punctuation = 0;
  for (const char of body) if (CODE_PUNCTUATION.has(char)) punctuation++;
  return punctuation / body.length;
}

/**
 * Decides whether a line reads as code.
 *
 * Punctuation density carries the decision on its own. Indentation is the
 * second signal, but only in context: `return value` has no punctuation at all
 * and is indistinguishable from prose in isolation, yet it is plainly code when
 * the line above it was code. Code arrives in runs, so an indented line
 * inherits from its predecessor. That is what `previousWasCode` is for.
 */
export function isCodeLikeLine(line: string, previousWasCode = false): boolean {
  if (line.trim().length === 0) return false;

  const density = codePunctuationDensity(line);
  if (density >= 0.08) return true;

  const indented = /^(\s{2,}|\t)/.test(line);
  if (!indented) return false;
  return density >= 0.03 || previousWasCode;
}

/** Script class of a single code point, before the code-vs-prose overlay. */
export function classifyCodePoint(cp: number): Exclude<CharClass, "code"> {
  // CJK ideographs, kana, hangul, and the CJK punctuation that travels with them.
  if (
    (cp >= 0x3040 && cp <= 0x30ff) ||
    (cp >= 0x3100 && cp <= 0x312f) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    (cp >= 0x2_00_00 && cp <= 0x2_a6_df) ||
    (cp >= 0x3000 && cp <= 0x303f)
  ) {
    return "cjk";
  }

  // Emoji, pictographs, arrows, box drawing, and the symbol blocks near them.
  if (
    (cp >= 0x2190 && cp <= 0x2bff) ||
    (cp >= 0x1_f0_00 && cp <= 0x1_fa_ff) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    cp === 0x20e3 ||
    cp === 0x200d
  ) {
    return "emojiSymbol";
  }

  // Latin, ASCII, Latin Extended, and the punctuation and digits around them.
  if (cp <= 0x02af || (cp >= 0x2000 && cp <= 0x206f)) return "latin";

  // Cyrillic, Greek, Arabic, Hebrew, Devanagari, Thai, and everything else.
  return "otherScript";
}

export interface Run {
  charClass: CharClass;
  text: string;
}

/**
 * Splits text into contiguous runs of one class. Lines are classified as code
 * or prose first; within a code line, Latin-script runs become `code` while
 * CJK, other scripts and emoji keep their own class, since a Chinese string
 * literal is still Chinese.
 */
export function segmentByClass(text: string): Run[] {
  const runs: Run[] = [];
  let current: Run | null = null;

  // Split on newlines but keep them, so line classification stays exact and no
  // characters are dropped from the count.
  const lines = text.split(/(?<=\n)/);

  let previousWasCode = false;
  for (const line of lines) {
    const code = isCodeLikeLine(line, previousWasCode);
    if (line.trim().length > 0) previousWasCode = code;
    for (const char of line) {
      const script = classifyCodePoint(char.codePointAt(0)!);
      const charClass: CharClass = code && script === "latin" ? "code" : script;
      if (current && current.charClass === charClass) {
        current.text += char;
      } else {
        current = { charClass, text: char };
        runs.push(current);
      }
    }
  }

  return runs;
}

/**
 * Estimates Claude's token count for `text`.
 *
 * `countBase` must count with o200k_base. It is injected rather than imported
 * so this module stays pure and testable without loading a 2 MB vocabulary.
 */
export function estimateAnthropicTokens(
  text: string,
  countBase: (input: string) => number,
): CountRange {
  if (text.length === 0) return { low: 0, mid: 0, high: 0 };

  let low = 0;
  let mid = 0;
  let high = 0;

  for (const run of segmentByClass(text)) {
    const base = countBase(run.text);
    if (base === 0) continue;
    const factor = CALIBRATION[run.charClass];
    low += base * factor.low;
    mid += base * factor.mid;
    high += base * factor.high;
  }

  // Floor / round / ceil keeps the range honest at the edges, then clamp so the
  // ordering can never invert on a very short input.
  const lowOut = Math.max(1, Math.floor(low));
  const midOut = Math.max(lowOut, Math.round(mid));
  const highOut = Math.max(midOut, Math.ceil(high));
  return { low: lowOut, mid: midOut, high: highOut };
}
