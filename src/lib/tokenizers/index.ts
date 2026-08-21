import { assetFor, type ModelEntry } from "@/lib/models";
import { estimateAnthropicTokens } from "./anthropic-estimate";
import { countWithHf, loadHfTokenizer, tokensWithHf, type LoadProgress } from "./hf";
import { countWith, loadEncoding, tokensWith } from "./openai";
import { buildStream, type BuildStreamOptions } from "./stream";
import type { CountResult, RawToken, StreamResult } from "./types";

/**
 * Dispatch by registry entry. Everything below this line runs inside the
 * worker; nothing here may be imported from the main thread, or the tokenizer
 * vocabularies land in the page bundle.
 */

export type { LoadProgress };

/** A model made ready to tokenize with: any download already finished. */
interface Prepared {
  count(text: string): CountResult;
  tokens(text: string): RawToken[] | null;
}

export async function prepare(
  model: ModelEntry,
  onProgress?: (progress: LoadProgress) => void,
): Promise<Prepared> {
  switch (model.source.kind) {
    case "openai": {
      const api = await loadEncoding(model.source.encoding);
      return {
        count: (text) => countWith(api, text),
        tokens: (text) => tokensWith(api, text),
      };
    }

    case "hf": {
      const asset = assetFor(model);
      if (!asset) throw new Error(`No tokenizer registered for ${model.name}.`);
      const loaded = await loadHfTokenizer(asset, onProgress);
      return {
        count: (text) => countWithHf(loaded, text),
        tokens: (text) => tokensWithHf(loaded, text),
      };
    }

    case "anthropic-estimate": {
      // The estimator is built on o200k_base, which is bundled, so this path
      // still never touches the network.
      const api = await loadEncoding("o200k_base");
      return {
        count: (text) => {
          const range = estimateAnthropicTokens(text, (input) => api.countTokens(input));
          return { count: range.mid, range };
        },
        // Segmentation is shown from the proxy encoding, but IDs are refused
        // for this tier. See `supportsTokenIds`.
        tokens: (text) => tokensWith(api, text),
      };
    }
  }
}

export function streamFor(
  prepared: Prepared,
  text: string,
  options?: BuildStreamOptions,
): StreamResult {
  const tokens = prepared.tokens(text);
  if (!tokens) return { chunks: [], complete: false, verified: false };
  return buildStream(text, tokens, options);
}
