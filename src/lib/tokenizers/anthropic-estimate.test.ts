import { describe, expect, it } from "vitest";
import {
  CALIBRATION,
  classifyCodePoint,
  estimateAnthropicTokens,
  isCodeLikeLine,
  segmentByClass,
} from "./anthropic-estimate";
import { loadEncoding } from "./openai";

const o200k = await loadEncoding("o200k_base");
const countBase = (text: string) => o200k.countTokens(text);
const estimate = (text: string) => estimateAnthropicTokens(text, countBase);

describe("CALIBRATION", () => {
  it("orders every class low <= mid <= high", () => {
    for (const [name, factor] of Object.entries(CALIBRATION)) {
      expect(factor.low, name).toBeLessThanOrEqual(factor.mid);
      expect(factor.mid, name).toBeLessThanOrEqual(factor.high);
    }
  });

  it("never claims Claude uses fewer tokens than o200k", () => {
    for (const [name, factor] of Object.entries(CALIBRATION)) {
      expect(factor.low, name).toBeGreaterThanOrEqual(1);
    }
  });

  it("documents where every factor came from", () => {
    for (const [name, factor] of Object.entries(CALIBRATION)) {
      expect(factor.note.length, name).toBeGreaterThan(40);
    }
  });
});

describe("classifyCodePoint", () => {
  it("recognises Latin script", () => {
    expect(classifyCodePoint("a".codePointAt(0)!)).toBe("latin");
    expect(classifyCodePoint("Z".codePointAt(0)!)).toBe("latin");
    expect(classifyCodePoint("7".codePointAt(0)!)).toBe("latin");
    expect(classifyCodePoint("ü".codePointAt(0)!)).toBe("latin");
  });

  it("recognises CJK", () => {
    expect(classifyCodePoint("世".codePointAt(0)!)).toBe("cjk");
    expect(classifyCodePoint("テ".codePointAt(0)!)).toBe("cjk");
    expect(classifyCodePoint("한".codePointAt(0)!)).toBe("cjk");
  });

  it("recognises other scripts", () => {
    expect(classifyCodePoint("п".codePointAt(0)!)).toBe("otherScript");
    expect(classifyCodePoint("α".codePointAt(0)!)).toBe("otherScript");
    expect(classifyCodePoint("ع".codePointAt(0)!)).toBe("otherScript");
  });

  it("recognises emoji and symbols", () => {
    expect(classifyCodePoint("😀".codePointAt(0)!)).toBe("emojiSymbol");
    expect(classifyCodePoint("→".codePointAt(0)!)).toBe("emojiSymbol");
  });
});

describe("isCodeLikeLine", () => {
  it("accepts dense punctuation", () => {
    expect(isCodeLikeLine("const x = foo(bar);")).toBe(true);
    expect(isCodeLikeLine("if (a && b) { return c; }")).toBe(true);
  });

  it("accepts an indented line with lighter punctuation", () => {
    expect(isCodeLikeLine("    value = compute")).toBe(true);
  });

  it("accepts an unpunctuated indented line that follows code", () => {
    expect(isCodeLikeLine("    return value", true)).toBe(true);
    expect(isCodeLikeLine("    return value", false)).toBe(false);
  });

  it("rejects ordinary prose", () => {
    expect(isCodeLikeLine("The quick brown fox jumps over the lazy dog.")).toBe(false);
    expect(isCodeLikeLine("This sentence has a comma, and then it ends.")).toBe(false);
  });

  it("rejects blank lines", () => {
    expect(isCodeLikeLine("")).toBe(false);
    expect(isCodeLikeLine("    ")).toBe(false);
  });
});

describe("segmentByClass", () => {
  it("loses no characters", () => {
    const text = "Hello 世界 привет 😀\n  const x = 1;\n";
    expect(segmentByClass(text).map((run) => run.text).join("")).toBe(text);
  });

  it("splits a mixed line into one run per class", () => {
    const runs = segmentByClass("ab世界cd");
    expect(runs.map((run) => run.charClass)).toEqual(["latin", "cjk", "latin"]);
  });

  it("marks Latin text on a code line as code", () => {
    const runs = segmentByClass("const x = foo(bar);");
    expect(runs.every((run) => run.charClass === "code")).toBe(true);
  });

  it("keeps CJK inside a code line classified as CJK", () => {
    const runs = segmentByClass('const label = "世界";');
    expect(runs.map((run) => run.charClass)).toContain("cjk");
    expect(runs.map((run) => run.charClass)).toContain("code");
  });

  it("classifies each line independently", () => {
    const classes = segmentByClass("Plain prose here.\nconst x = foo(bar);\n").map(
      (run) => run.charClass,
    );
    expect(classes).toContain("latin");
    expect(classes).toContain("code");
  });
});

describe("estimateAnthropicTokens", () => {
  it("is all zeroes for empty input", () => {
    expect(estimate("")).toEqual({ low: 0, mid: 0, high: 0 });
  });

  it("always returns low <= mid <= high", () => {
    const samples = [
      "a",
      "The quick brown fox jumps over the lazy dog.",
      "const x = { a: 1 };",
      "世界你好，今天天气很好。",
      "привет мир",
      "😀😀😀",
      "Mixed 世界 and code() and привет 😀",
    ];
    for (const sample of samples) {
      const range = estimate(sample);
      expect(range.low, sample).toBeLessThanOrEqual(range.mid);
      expect(range.mid, sample).toBeLessThanOrEqual(range.high);
    }
  });

  it("never estimates fewer tokens than o200k counts", () => {
    const text = "The quick brown fox jumps over the lazy dog, repeatedly and at length.";
    expect(estimate(text).mid).toBeGreaterThanOrEqual(countBase(text));
  });

  it("applies the Latin factor to plain prose", () => {
    const text =
      "This is an ordinary English sentence written without any punctuation density.";
    const base = countBase(text);
    const range = estimate(text);
    expect(range.mid).toBe(Math.round(base * CALIBRATION.latin.mid));
  });

  it("applies the CJK factor to Chinese text", () => {
    const text = "世界你好今天天气很好我们一起去公园散步吧";
    const base = countBase(text);
    const range = estimate(text);
    expect(range.mid).toBe(Math.round(base * CALIBRATION.cjk.mid));
  });

  it("scores CJK higher per token than prose", () => {
    const prose = "the quick brown fox jumps over the lazy dog again and again";
    const cjk = "世界你好今天天气很好我们一起去公园散步吧看看风景";
    const proseRatio = estimate(prose).mid / countBase(prose);
    const cjkRatio = estimate(cjk).mid / countBase(cjk);
    expect(cjkRatio).toBeGreaterThan(proseRatio);
  });

  it("scores code higher per token than prose", () => {
    const prose = "the quick brown fox jumps over the lazy dog again and again";
    const code = "const result = compute(a, b); if (result > 0) { return result; }";
    const proseRatio = estimate(prose).mid / countBase(prose);
    const codeRatio = estimate(code).mid / countBase(code);
    expect(codeRatio).toBeGreaterThan(proseRatio);
  });

  it("does not shrink as prose is appended", () => {
    const words = "the quick brown fox jumps over the lazy dog ".repeat(20).split(" ");
    let previous = 0;
    for (let i = 1; i <= words.length; i += 7) {
      const range = estimate(words.slice(0, i).join(" "));
      expect(range.mid).toBeGreaterThanOrEqual(previous);
      previous = range.mid;
    }
  });

  it("never returns zero for non-empty input", () => {
    expect(estimate("a").low).toBeGreaterThanOrEqual(1);
    expect(estimate(" ").low).toBeGreaterThanOrEqual(1);
  });
});
