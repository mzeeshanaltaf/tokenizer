/**
 * The GPT-2 byte-level alphabet, and the two ways a Hugging Face tokenizer.json
 * represents the bytes behind a vocabulary entry.
 *
 * Verified against the seven tokenizer.json files this app ships (see
 * `scripts/verify-tokenizers.mjs`): five use ByteLevel, two use
 * Metaspace + ByteFallback. There is no third case in the registry.
 */

import type { TokenEncodingMode } from "@/lib/models";

/** Reverse of `bytes_to_unicode()`: printable char -> the byte it stands for. */
function buildCharToByte(): Map<string, number> {
  const printable: number[] = [];
  for (let i = 33; i < 127; i++) printable.push(i);
  for (let i = 161; i < 173; i++) printable.push(i);
  for (let i = 174; i < 256; i++) printable.push(i);

  const seen = new Set(printable);
  const bytes = printable.slice();
  const chars = printable.slice();
  let next = 0;
  for (let b = 0; b < 256; b++) {
    if (seen.has(b)) continue;
    bytes.push(b);
    chars.push(256 + next);
    next++;
  }

  const map = new Map<string, number>();
  for (let i = 0; i < bytes.length; i++) {
    map.set(String.fromCodePoint(chars[i]), bytes[i]);
  }
  return map;
}

const CHAR_TO_BYTE = buildCharToByte();
const encoder = new TextEncoder();

/** SentencePiece's visible space, U+2581 LOWER ONE EIGHTH BLOCK. */
export const METASPACE = "\u2581";

/** A ByteFallback vocabulary entry, e.g. `<0xF0>`. */
const BYTE_FALLBACK = /^<0x([0-9A-Fa-f]{2})>$/;

/** Decodes a ByteLevel vocabulary entry. Null if it contains a foreign char. */
export function byteLevelTokenBytes(token: string): Uint8Array | null {
  const out = new Uint8Array(token.length);
  let n = 0;
  for (const char of token) {
    const byte = CHAR_TO_BYTE.get(char);
    if (byte === undefined) return null;
    out[n++] = byte;
  }
  return out.subarray(0, n);
}

/** Decodes a Metaspace / ByteFallback vocabulary entry. */
export function metaspaceTokenBytes(token: string): Uint8Array {
  const fallback = BYTE_FALLBACK.exec(token);
  if (fallback) return Uint8Array.of(Number.parseInt(fallback[1], 16));
  return encoder.encode(token.split(METASPACE).join(" "));
}

export function tokenBytes(token: string, mode: TokenEncodingMode): Uint8Array | null {
  return mode === "byte-level" ? byteLevelTokenBytes(token) : metaspaceTokenBytes(token);
}
