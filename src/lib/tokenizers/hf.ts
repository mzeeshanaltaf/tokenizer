import { Tokenizer } from "@huggingface/tokenizers";
import type { TokenizerAsset } from "@/lib/models";
import { tokenBytes } from "./byte-level";
import type { CountResult, RawToken } from "./types";

/**
 * Hugging Face tokenizer adapter. Everything here runs inside the worker.
 *
 * These tokenizer.json files are several megabytes each, so they are fetched
 * lazily on model select, reported with real progress, and persisted in the
 * Cache API. A second visit costs no network at all.
 */

const CACHE_NAME = "token-counter-tokenizers-v1";

export interface LoadProgress {
  /** Bytes received so far. */
  received: number;
  /** Total bytes, or null when the server did not send a length. */
  total: number | null;
  /** True once the file came back from the Cache API instead of the network. */
  cached: boolean;
}

type ProgressHandler = (progress: LoadProgress) => void;

function assetUrl(asset: TokenizerAsset, file: string): string {
  return `https://huggingface.co/${asset.repo}/resolve/main/${file}`;
}

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(CACHE_NAME);
  } catch {
    // Private browsing modes and some embedded webviews reject caches.open().
    return null;
  }
}

/** Fetches a JSON file, serving from the Cache API when it is already there. */
async function fetchJson(
  url: string,
  onProgress?: ProgressHandler,
): Promise<unknown> {
  const cache = await openCache();
  const hit = await cache?.match(url);
  if (hit) {
    onProgress?.({ received: 0, total: null, cached: true });
    return hit.json();
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download the tokenizer (HTTP ${response.status}).`);
  }

  // Cache before reading, since consuming the body locks it.
  const forCache = response.clone();
  const lengthHeader = response.headers.get("content-length");
  const total = lengthHeader ? Number(lengthHeader) : null;

  let text: string;
  if (response.body && onProgress) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress({ received, total, cached: false });
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    text = new TextDecoder().decode(merged);
  } else {
    text = await response.text();
  }

  try {
    await cache?.put(url, forCache);
  } catch {
    // A full or unavailable cache is not a reason to fail the tokenize.
  }

  return JSON.parse(text);
}

export interface LoadedTokenizer {
  asset: TokenizerAsset;
  tokenizer: Tokenizer;
}

const loaded = new Map<string, Promise<LoadedTokenizer>>();

export function loadHfTokenizer(
  asset: TokenizerAsset,
  onProgress?: ProgressHandler,
): Promise<LoadedTokenizer> {
  const existing = loaded.get(asset.id);
  if (existing) return existing;

  const pending = (async () => {
    // tokenizer.json carries essentially all the weight; report progress only
    // for it so the percentage does not jump backwards on the small config.
    const tokenizerJson = await fetchJson(assetUrl(asset, "tokenizer.json"), onProgress);
    const configJson = await fetchJson(assetUrl(asset, "tokenizer_config.json"));
    return {
      asset,
      tokenizer: new Tokenizer(tokenizerJson as object, configJson as object),
    };
  })();

  loaded.set(asset.id, pending);
  pending.catch(() => loaded.delete(asset.id));
  return pending;
}

/**
 * Special tokens are deliberately off. This tool counts the tokens in a piece
 * of text, not the tokens in a fully framed chat request. The explainer says so
 * in as many words.
 */
const ENCODE_OPTIONS = { add_special_tokens: false } as const;

export function countWithHf(loadedTokenizer: LoadedTokenizer, text: string): CountResult {
  return { count: loadedTokenizer.tokenizer.encode(text, ENCODE_OPTIONS).ids.length };
}

export function tokensWithHf(
  { asset, tokenizer }: LoadedTokenizer,
  text: string,
): RawToken[] | null {
  const { ids, tokens } = tokenizer.encode(text, ENCODE_OPTIONS);
  const out: RawToken[] = [];
  for (let i = 0; i < ids.length; i++) {
    const bytes = tokenBytes(tokens[i], asset.mode);
    if (bytes === null) return null;
    out.push({ id: ids[i], bytes });
  }
  return out;
}
