/**
 * Shared vocabulary for every tokenizer adapter.
 *
 * The accuracy tier is the load-bearing idea in this app. It decides which
 * badge the UI shows, whether token IDs may be displayed at all, and what the
 * token stream is allowed to claim it is showing. Nothing downstream is
 * permitted to render a count without also rendering its tier.
 */

/** How much the number on screen can be trusted. */
export type AccuracyTier = "exact" | "proxy" | "estimate";

/** A visual unit in the token stream: one token, or several merged. */
export interface TokenChunk {
  /** The source text this chunk covers, sliced from the original input. */
  text: string;
  /**
   * The token IDs that produced this chunk. Usually one. More than one when a
   * multi-byte character was split across tokens and had to be merged back
   * into a single readable chip.
   */
  ids: number[];
  /** Start offset in the source string, in UTF-16 code units. */
  start: number;
}

/** A count that cannot be a single number, because it is an estimate. */
export interface CountRange {
  low: number;
  mid: number;
  high: number;
}

/** Phase one of a tokenize job: the numbers, computed without building chips. */
export interface CountResult {
  /** The headline number. For an estimate tier this is `range.mid`. */
  count: number;
  /** Present only on the `estimate` tier. */
  range?: CountRange;
}

/** Phase two of a tokenize job: the token stream, built only when it is visible. */
export interface StreamResult {
  chunks: TokenChunk[];
  /** True when the chunks cover the whole input rather than a truncated head. */
  complete: boolean;
  /**
   * False when byte-accurate reconstruction of the source text failed. The UI
   * must then hide the stream rather than show a segmentation it cannot verify.
   */
  verified: boolean;
}

/** A token paired with the raw bytes it decodes to. The input to `buildStream`. */
export interface RawToken {
  id: number;
  bytes: Uint8Array;
}

/** What a tokenizer adapter must provide. */
export interface TokenizerAdapter {
  count(text: string): CountResult;
  /** Returns null when this adapter cannot produce a real segmentation. */
  tokens(text: string): RawToken[] | null;
}
