import type { OpenAiEncoding } from "@/lib/models";
import type { CountResult, RawToken } from "./types";

/**
 * OpenAI adapter. These are the only models in the app whose real tokenizer is
 * published, so counts, boundaries and IDs are all exactly reproducible here.
 *
 * Encodings are imported per-encoding rather than through the barrel, so a page
 * that only ever counts GPT-5 never downloads the cl100k tables.
 */

interface EncodingApi {
  encode: (text: string) => number[];
  countTokens: (text: string) => number;
  decode: (ids: Iterable<number>) => string;
  /**
   * Undocumented internal. It is the only place gpt-tokenizer exposes the raw
   * bytes behind each token, which is what a byte-accurate token stream needs.
   * Treated as optional everywhere and pinned by a unit test, so a future
   * version bump degrades to "counts only" instead of rendering nonsense.
   */
  bytePairEncodingCoreProcessor?: {
    decodeNativeGenerator: (ids: Iterable<number>) => Iterable<Uint8Array | string>;
  };
}

const loaders: Record<OpenAiEncoding, () => Promise<EncodingApi>> = {
  o200k_base: () =>
    import("gpt-tokenizer/encoding/o200k_base").then((m) => m.default as unknown as EncodingApi),
  o200k_harmony: () =>
    import("gpt-tokenizer/encoding/o200k_harmony").then((m) => m.default as unknown as EncodingApi),
  cl100k_base: () =>
    import("gpt-tokenizer/encoding/cl100k_base").then((m) => m.default as unknown as EncodingApi),
};

const cache = new Map<OpenAiEncoding, Promise<EncodingApi>>();

export function loadEncoding(encoding: OpenAiEncoding): Promise<EncodingApi> {
  let pending = cache.get(encoding);
  if (!pending) {
    pending = loaders[encoding]();
    cache.set(encoding, pending);
  }
  return pending;
}

const textEncoder = new TextEncoder();

export function countWith(api: EncodingApi, text: string): CountResult {
  return { count: api.countTokens(text) };
}

/**
 * Returns one `RawToken` per token, or null when the installed gpt-tokenizer no
 * longer exposes per-token bytes. Callers must handle null by hiding the token
 * stream, never by guessing.
 */
export function tokensWith(api: EncodingApi, text: string): RawToken[] | null {
  const ids = api.encode(text);
  const core = api.bytePairEncodingCoreProcessor;
  if (!core || typeof core.decodeNativeGenerator !== "function") return null;

  const tokens: RawToken[] = [];
  let index = 0;
  for (const part of core.decodeNativeGenerator(ids)) {
    if (index >= ids.length) return null;
    tokens.push({
      id: ids[index],
      bytes: typeof part === "string" ? textEncoder.encode(part) : part,
    });
    index++;
  }
  return index === ids.length ? tokens : null;
}
