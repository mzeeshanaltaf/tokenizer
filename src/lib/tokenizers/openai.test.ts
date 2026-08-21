import { describe, expect, it } from "vitest";
import { countWith, loadEncoding, tokensWith } from "./openai";
import { buildStream } from "./stream";

/**
 * Fixtures below are the published tiktoken values for these encodings. If one
 * of these fails after a dependency bump, the dependency changed behaviour and
 * the counts on the site moved with it.
 */

const o200k = await loadEncoding("o200k_base");
const cl100k = await loadEncoding("cl100k_base");
const harmony = await loadEncoding("o200k_harmony");

describe("o200k_base", () => {
  it("matches known token ids", () => {
    expect(o200k.encode("hello world")).toEqual([24912, 2375]);
  });

  it("counts the classic tiktoken fixture", () => {
    expect(countWith(o200k, "hello world").count).toBe(2);
    expect(countWith(o200k, "").count).toBe(0);
  });

  it("round-trips through decode", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    expect(o200k.decode(o200k.encode(text))).toBe(text);
  });
});

describe("cl100k_base", () => {
  it("matches known token ids", () => {
    expect(cl100k.encode("hello world")).toEqual([15339, 1917]);
  });

  it("assigns different ids from o200k for the same text", () => {
    const text = "  const value = compute();";
    expect(cl100k.encode(text)).not.toEqual(o200k.encode(text));
  });

  it("needs more tokens than o200k for Chinese, which is the whole point", () => {
    const text = "世界你好，今天天气很好。";
    expect(countWith(cl100k, text).count).toBeGreaterThan(countWith(o200k, text).count);
  });
});

describe("o200k_harmony", () => {
  it("shares the base vocabulary and differs only in special tokens", () => {
    expect(harmony.encode("hello world")).toEqual(o200k.encode("hello world"));
  });
});

describe("tokensWith", () => {
  it("exposes per-token bytes for every token", () => {
    const text = "hello world";
    const tokens = tokensWith(o200k, text);
    expect(tokens).not.toBeNull();
    expect(tokens!.map((token) => token.id)).toEqual(o200k.encode(text));
    expect(tokens!.every((token) => token.bytes instanceof Uint8Array)).toBe(true);
  });

  /**
   * This is the guard on the undocumented internal that `tokensWith` reads. If
   * gpt-tokenizer stops exposing per-token bytes, this fails loudly here rather
   * than silently downgrading the token stream in production.
   */
  it("still finds the byte-level accessor the token stream depends on", () => {
    expect(o200k.bytePairEncodingCoreProcessor).toBeDefined();
    expect(typeof o200k.bytePairEncodingCoreProcessor!.decodeNativeGenerator).toBe("function");
  });
});

describe("token stream reconstruction", () => {
  const samples = [
    "hello world",
    "",
    " ",
    "\n\n\ttabbed\n",
    "The quick brown fox jumps over the lazy dog.",
    "Hello 👋 world 世界 🇯🇵 привет",
    "🧑‍💻👩‍👩‍👧‍👦",
    "café naïve ünïcödé\n한국어 テスト العربية",
    "const x = { a: 1 };\n\tif (x) return `${x}`;\n",
    "0123456789".repeat(50),
  ];

  for (const encoding of [o200k, cl100k]) {
    for (const text of samples) {
      it(`rebuilds ${JSON.stringify(text.slice(0, 24))} exactly`, () => {
        const tokens = tokensWith(encoding, text)!;
        const stream = buildStream(text, tokens);
        expect(stream.verified).toBe(true);
        expect(stream.chunks.map((chunk) => chunk.text).join("")).toBe(text);
      });
    }
  }

  it("never leaves a replacement character in a chip", () => {
    const text = "🇯🇵🇩🇪🇫🇷 emoji flags split across tokens 👨‍👩‍👧‍👦";
    const stream = buildStream(text, tokensWith(o200k, text)!);
    expect(stream.verified).toBe(true);
    expect(stream.chunks.some((chunk) => chunk.text.includes("�"))).toBe(false);
  });

  it("merges tokens that split a multi-byte character into one chip", () => {
    const text = "👋";
    const tokens = tokensWith(o200k, text)!;
    const stream = buildStream(text, tokens);
    expect(stream.chunks).toHaveLength(1);
    expect(stream.chunks[0].text).toBe("👋");
    expect(stream.chunks[0].ids.length).toBeGreaterThan(1);
  });

  it("accounts for every token id exactly once", () => {
    const text = "Hello 👋 world 世界 🇯🇵 привет";
    const tokens = tokensWith(o200k, text)!;
    const stream = buildStream(text, tokens);
    expect(stream.chunks.flatMap((chunk) => chunk.ids)).toEqual(
      tokens.map((token) => token.id),
    );
  });

  it("reports incomplete when a limit truncates the stream", () => {
    const text = "one two three four five six seven eight nine ten";
    const tokens = tokensWith(o200k, text)!;
    const stream = buildStream(text, tokens, { limit: 3 });
    expect(stream.chunks).toHaveLength(3);
    expect(stream.complete).toBe(false);
    expect(stream.verified).toBe(true);
  });

  it("refuses to guess when the tokens do not add up to the source", () => {
    const stream = buildStream("hello", [{ id: 1, bytes: new TextEncoder().encode("goodbye") }]);
    expect(stream.verified).toBe(false);
    expect(stream.chunks).toHaveLength(0);
  });

  it("gives every chip a start offset that indexes back into the source", () => {
    const text = "Hello 👋 world 世界";
    const stream = buildStream(text, tokensWith(o200k, text)!);
    for (const chunk of stream.chunks) {
      expect(text.slice(chunk.start, chunk.start + chunk.text.length)).toBe(chunk.text);
    }
  });
});
