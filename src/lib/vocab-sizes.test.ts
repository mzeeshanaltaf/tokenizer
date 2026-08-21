import { describe, expect, it } from "vitest";
import { loadEncoding } from "./tokenizers/openai";

/**
 * Pins the vocabulary figures printed in the FAQ page's reference table.
 *
 * The page tells the reader these numbers were measured from the tokenizers it
 * actually runs, so they have to stay true. If a dependency bump moves one of
 * them, this fails and the table gets corrected rather than quietly becoming a
 * claim the product no longer supports.
 *
 * The Hugging Face figures in the same table are pinned by
 * `scripts/verify-tokenizers.mjs`, which reads the real files. They are not
 * asserted here because a unit test should not download 80 MB.
 */

const EXPECTED = {
  o200k_base: 200_006,
  o200k_harmony: 201_089,
  cl100k_base: 100_264,
} as const;

describe("vocabulary sizes quoted on the FAQ page", () => {
  for (const [encoding, size] of Object.entries(EXPECTED)) {
    it(`${encoding} is still ${size.toLocaleString()}`, async () => {
      const api = await loadEncoding(encoding as keyof typeof EXPECTED);
      expect((api as unknown as { vocabularySize: number }).vocabularySize).toBe(size);
    });
  }
});
