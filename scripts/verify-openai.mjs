/**
 * Checks that an OpenAI model is really counted by o200k_base.
 *
 * tiktoken maps `gpt-5*` to o200k_base, but OpenAI publishes no mapping for
 * later lines. This script measures instead of assuming. For every text it
 * compares OpenAI's reported input tokens against a local o200k_base count.
 *
 *   1. Probes: a set of short strings built to split differently under
 *      different vocabularies (digit runs, whitespace runs, ZWJ emoji, CJK,
 *      combining marks, code operators), plus every non-empty line of the
 *      corpus, each counted on its own with `/responses/input_tokens`.
 *   2. Billing: every corpus file sent as a real `/responses` call on the
 *      `flex` service tier, reading `usage.input_tokens`, which is the number
 *      OpenAI actually bills.
 *
 * The Responses API adds message framing on top of the text, so no baseline is
 * assumed. If the tokenizer is o200k_base, `reported - o200k(text)` is the same
 * constant for every text. A single text with a different offset is a mismatch.
 * A control model (`gpt-5.5`, mapped by tiktoken) runs alongside to show what a
 * known o200k_base model reports.
 *
 * This never runs in the app, never ships a key, and never runs in CI.
 *
 * Usage (reads OPENAI_API_KEY from .env.local):
 *   npm run verify:openai ./corpus
 *   OPENAI_MODELS=gpt-6-astra,gpt-6-luna npm run verify:openai ./corpus
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const API_KEY = process.env.OPENAI_API_KEY;
const CORPUS_DIR = process.argv[2];
const CONTROL = "gpt-5.5";
const MODELS = (process.env.OPENAI_MODELS ?? "gpt-6-astra,gpt-6.1-sol,gpt-6.1-terra,gpt-6-luna")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const CONCURRENCY = 6;

if (!API_KEY) {
  console.error("Set OPENAI_API_KEY. This script is the only place a key is ever used.");
  process.exit(1);
}
if (!CORPUS_DIR) {
  console.error("Usage: node scripts/verify-openai.mjs <corpus-directory>");
  process.exit(1);
}

const o200k = (await import("gpt-tokenizer/encoding/o200k_base")).default;

/** Strings chosen because vocabularies disagree on them, not because they are typical. */
const PROBES = [
  "1234567890123456789",
  "3.14159265358979323846",
  "2026-11-02T03:04:05Z",
  "    four spaces then text",
  "\t\ttabs\tand\ttext",
  "trailing spaces   ",
  "line one\n\n\n\nline five",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "I'm sure we'll find they've gone, CAN'T STOP",
  "HTTPServerError camelCaseIdentifier snake_case_name",
  "https://example.com/path/to/page?query=1&x=y#frag",
  "def __init__(self, *args, **kwargs) -> None:",
  "if (a !== b && c >= d) { return x => x ** 2; }",
  "SELECT id, name FROM users WHERE id IN (1, 2, 3);",
  "👨‍👩‍👧‍👦 family, 👍🏽 thumbs, 🇺🇸🇯🇵 flags, 🫠 melting",
  "naïve café résumé",
  "é combining acute, ñ combining tilde",
  "ﬁne ligature, zero​width space, non breaking",
  "日本語のテキストを数えます。",
  "中文分词测试，这是一个句子。",
  "한국어 토큰화 테스트입니다",
  "ภาษาไทยไม่มีช่องว่างระหว่างคำ",
  "हिन्दी में संयुक्ताक्षर क्षत्रिय",
  "مَرْحَبًا بِالْعَالَمِ",
  "שָׁלוֹם עוֹלָם",
  "Привет, мир! Ёлка и щука.",
  "∑∫√∞ ≠ ≤ ≥ ∂x/∂y",
  "<div class=\"a\">&nbsp;&amp;</div>",
  "{\"key\": [1, 2, {\"nested\": null}]}",
  "  ",
];

async function post(path, body, attempt = 0) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  // Flex capacity is best-effort: 429 means "try again later", not "wrong".
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    return post(path, body, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`${path} ${body.model}: HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function countTokens(model, text) {
  const body = await post("/responses/input_tokens", { model, input: text });
  return body.input_tokens;
}

async function billedTokens(model, text, attempt = 0) {
  const body = await post("/responses", {
    model,
    input: text,
    service_tier: "flex",
    max_output_tokens: 16,
    reasoning: { effort: "low" },
    store: false,
  });
  if (body.service_tier !== "flex") {
    throw new Error(`${model}: asked for flex, served on "${body.service_tier}"`);
  }
  // A response cut off at max_output_tokens sometimes reports all-zero usage.
  // That is a missing measurement, not a count of zero, so ask again.
  if (body.usage.total_tokens === 0) {
    if (attempt < 5) return billedTokens(model, text, attempt + 1);
    throw new Error(`${model}: usage reported as zero ${attempt + 1} times`);
  }
  return body.usage.input_tokens;
}

/** Runs `task` over `items` with a fixed number in flight, preserving order. */
async function pool(items, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

const files = (await readdir(CORPUS_DIR)).filter((name) => !name.startsWith("."));
const documents = [];
for (const name of files) {
  const text = await readFile(join(CORPUS_DIR, name), "utf8");
  if (text.trim().length > 0) documents.push({ label: name, text });
}
if (documents.length === 0) {
  console.error(`No files in ${CORPUS_DIR}.`);
  process.exit(1);
}

const lines = documents.flatMap((doc) =>
  doc.text
    .split("\n")
    .map((line, index) => ({ label: `${doc.label}:${index + 1}`, text: line }))
    .filter((line) => line.text.trim().length > 0),
);
const probes = [
  ...PROBES.map((text, index) => ({ label: `probe ${index + 1}`, text })),
  ...lines,
];

/**
 * Measures one model over one set of texts with one counting method and
 * returns the distinct framing offsets plus every text that broke the pattern.
 */
async function measure(model, texts, count) {
  const reported = await pool(texts, (item) => count(model, item.text));
  const rows = texts.map((item, index) => ({
    ...item,
    local: o200k.countTokens(item.text),
    reported: reported[index],
  }));
  const offsets = new Map();
  for (const row of rows) {
    const offset = row.reported - row.local;
    offsets.set(offset, (offsets.get(offset) ?? 0) + 1);
  }
  const framing = [...offsets.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const mismatches = rows.filter((row) => row.reported - row.local !== framing);
  const localTotal = rows.reduce((sum, row) => sum + row.local, 0);
  return { framing, offsets, mismatches, localTotal, rows };
}

const report = [];
let failed = false;

for (const model of [CONTROL, ...MODELS]) {
  console.log(`\n== ${model}${model === CONTROL ? " (control)" : ""}`);
  for (const [phase, texts, count] of [
    ["probes, /responses/input_tokens", probes, countTokens],
    ["corpus, billed flex usage", documents, billedTokens],
  ]) {
    const result = await measure(model, texts, count);
    const ok = result.mismatches.length === 0;
    if (!ok && model !== CONTROL) failed = true;
    console.log(
      `  ${phase.padEnd(34)} ${String(texts.length).padStart(4)} texts, ${String(result.localTotal).padStart(6)} o200k tokens, framing +${result.framing}  ${ok ? "MATCH" : `${result.mismatches.length} MISMATCH`}`,
    );
    for (const row of result.mismatches.slice(0, 10)) {
      console.log(
        `    ${row.label}: o200k=${row.local} reported=${row.reported} (offset ${row.reported - row.local}) ${JSON.stringify(row.text.slice(0, 60))}`,
      );
    }
    report.push({ model, phase, texts: texts.length, ok, framing: result.framing });
  }
}

const framings = new Set(report.map((row) => `${row.phase}:${row.framing}`));
const consistentFraming = framings.size === 2;

console.log("\nSummary");
for (const row of report) {
  console.log(`  ${row.model.padEnd(16)} ${row.phase.padEnd(34)} ${row.ok ? "match" : "MISMATCH"}  framing +${row.framing}`);
}
if (!consistentFraming) {
  console.log("  Framing differs between models; every text matched within a model, but compare the offsets above.");
}
console.log(
  failed
    ? "\nAt least one model does not count like o200k_base. Do not mark it exact."
    : `\nEvery text, on every model, equals o200k_base plus a constant framing offset (${probes.length} probes, ${documents.length} billed files per model).`,
);
process.exit(failed ? 1 : 0);
