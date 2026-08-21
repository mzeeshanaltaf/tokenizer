import type { RawToken, StreamResult, TokenChunk } from "./types";

/**
 * Turns a list of (token id, token bytes) pairs into readable chips.
 *
 * The reason this is not a one-liner: BPE tokenizers split on *bytes*, not on
 * characters. A single emoji is four UTF-8 bytes and is routinely cut across
 * two or three tokens. Decoding those tokens one at a time yields replacement
 * characters, so the naive implementation renders a wall of U+FFFD on any text
 * containing emoji or CJK.
 *
 * Instead of decoding tokens, this walks byte offsets through the *original*
 * string. Every chip's text is therefore a real slice of the input, and a chip
 * only closes where a byte boundary is also a character boundary. Tokens that
 * end mid-character merge into the chip that completes them, carrying all of
 * their IDs.
 *
 * Every token's bytes are checked against the source as it goes. If they ever
 * disagree the whole stream is reported unverified, because a segmentation that
 * cannot be checked is worse than no segmentation at all.
 */

const encoder = new TextEncoder();

/**
 * Maps every UTF-8 byte offset to the UTF-16 index of the character starting
 * there, or -1 when the offset falls inside a character. Length is
 * `byteLength + 1` so the final boundary is addressable.
 */
function byteToCharIndex(text: string, byteLength: number): Int32Array {
  const map = new Int32Array(byteLength + 1).fill(-1);

  let byteOffset = 0;
  let charOffset = 0;
  for (const codePoint of text) {
    map[byteOffset] = charOffset;
    const cp = codePoint.codePointAt(0)!;
    byteOffset += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x1_00_00 ? 3 : 4;
    charOffset += codePoint.length;
  }
  map[byteLength] = charOffset;
  return map;
}

/**
 * Some tokenizers prepend a synthetic leading space that their own decoder
 * strips again; Mistral's SentencePiece v3 does exactly this. Detected by byte
 * count rather than by reading decoder config, so it stays correct even if a
 * tokenizer.json changes shape. A synthetic prefix is one character at most.
 */
const MAX_SYNTHETIC_PREFIX_BYTES = 4;

export interface BuildStreamOptions {
  /** Stop after this many chips and report `complete: false`. */
  limit?: number;
}

const UNVERIFIED: StreamResult = { chunks: [], complete: false, verified: false };

export function buildStream(
  text: string,
  tokens: RawToken[],
  options: BuildStreamOptions = {},
): StreamResult {
  if (text.length === 0 || tokens.length === 0) {
    return { chunks: [], complete: true, verified: true };
  }

  const sourceBytes = encoder.encode(text);
  let tokenByteTotal = 0;
  for (const token of tokens) tokenByteTotal += token.bytes.length;

  const trim = tokenByteTotal - sourceBytes.length;
  if (trim < 0 || trim > MAX_SYNTHETIC_PREFIX_BYTES) return UNVERIFIED;

  const map = byteToCharIndex(text, sourceBytes.length);
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const chunks: TokenChunk[] = [];

  let byteCursor = 0;
  let remainingTrim = trim;
  let pendingIds: number[] = [];
  let chunkStartChar = 0;

  for (const token of tokens) {
    const bytes = token.bytes;
    let index = 0;

    // Drop the synthetic prefix without checking it: by definition it is not
    // in the source.
    if (remainingTrim > 0) {
      const dropped = Math.min(remainingTrim, bytes.length);
      index = dropped;
      remainingTrim -= dropped;
    }

    // Every remaining byte must be the next byte of the source. This is what
    // makes `verified` mean something.
    for (; index < bytes.length; index++) {
      if (byteCursor >= sourceBytes.length || sourceBytes[byteCursor] !== bytes[index]) {
        return UNVERIFIED;
      }
      byteCursor++;
    }

    pendingIds.push(token.id);

    // A boundary inside a character cannot close a chip, and neither can a
    // token that contributed no source bytes at all.
    const charEnd = map[byteCursor];
    if (charEnd < 0 || charEnd === chunkStartChar) continue;

    chunks.push({
      text: text.slice(chunkStartChar, charEnd),
      ids: pendingIds,
      start: chunkStartChar,
    });
    chunkStartChar = charEnd;
    pendingIds = [];

    if (chunks.length >= limit) {
      return { chunks, complete: byteCursor === sourceBytes.length, verified: true };
    }
  }

  if (pendingIds.length > 0 || byteCursor !== sourceBytes.length) return UNVERIFIED;
  return { chunks, complete: true, verified: true };
}
