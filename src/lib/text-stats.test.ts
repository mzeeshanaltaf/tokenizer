import { describe, expect, it } from "vitest";
import {
  countBytes,
  countGraphemes,
  countLines,
  countParagraphs,
  countWords,
  textStats,
} from "./text-stats";

describe("countWords", () => {
  it("counts whitespace-separated runs", () => {
    expect(countWords("the quick brown fox")).toBe(4);
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(countWords("   a \n\n b \t c   ")).toBe(3);
  });

  it("is zero for empty and whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });

  it("counts CJK runs as words, since they carry no spaces", () => {
    expect(countWords("世界 你好")).toBe(2);
  });
});

describe("countLines", () => {
  it("is zero for empty input rather than one", () => {
    expect(countLines("")).toBe(0);
  });

  it("does not open a new line for a trailing newline", () => {
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\nb\n")).toBe(2);
  });

  it("counts a blank line between two lines", () => {
    expect(countLines("a\n\nb")).toBe(3);
  });

  it("treats CRLF as one break", () => {
    expect(countLines("a\r\nb\r\nc")).toBe(3);
  });
});

describe("countParagraphs", () => {
  it("splits on blank lines and drops empty blocks", () => {
    expect(countParagraphs("one\n\ntwo\n\n\n\nthree")).toBe(3);
  });

  it("is zero for whitespace-only input", () => {
    expect(countParagraphs("\n\n   \n")).toBe(0);
  });
});

describe("countBytes", () => {
  it("counts UTF-8 bytes, not characters", () => {
    expect(countBytes("abc")).toBe(3);
    expect(countBytes("é")).toBe(2);
    expect(countBytes("世")).toBe(3);
    expect(countBytes("😀")).toBe(4);
  });
});

describe("countGraphemes", () => {
  it("counts a joined emoji family as one character", () => {
    expect(countGraphemes("👩‍👩‍👧‍👦")).toBe(1);
  });

  it("counts a flag as one character", () => {
    expect(countGraphemes("🇯🇵")).toBe(1);
  });

  it("counts a combining accent with its base letter", () => {
    expect(countGraphemes("é")).toBe(1);
  });
});

describe("textStats", () => {
  it("separates UTF-16 length from grapheme count", () => {
    const stats = textStats("😀");
    expect(stats.characters).toBe(2);
    expect(stats.graphemes).toBe(1);
    expect(stats.bytes).toBe(4);
  });

  it("excludes every kind of whitespace from charactersNoSpaces", () => {
    const stats = textStats("a b\tc\nd");
    expect(stats.characters).toBe(7);
    expect(stats.charactersNoSpaces).toBe(4);
  });

  it("is all zeroes for empty input", () => {
    expect(textStats("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      graphemes: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      bytes: 0,
    });
  });
});
