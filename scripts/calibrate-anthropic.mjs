/**
 * Refits the Claude estimator against the real thing.
 *
 * The factors in `src/lib/tokenizers/anthropic-estimate.ts` are
 * literature-derived defaults. This script replaces them with measurements.
 *
 *   1. Reads every file in a corpus directory.
 *   2. Measures the empty-message baseline once, because
 *      `messages.count_tokens` charges for message framing on top of the text
 *      itself, and that overhead must not be attributed to the text.
 *   3. Splits each sample into character-class runs using the same
 *      `segmentByClass` the app uses, and counts each run with o200k_base.
 *   4. Solves a non-negative least-squares fit for the per-class factors, so
 *      every sample constrains every class it contains.
 *   5. Prints a replacement CALIBRATION table to paste in.
 *
 * This never runs in the app, never ships a key, and never runs in CI.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/calibrate-anthropic.mjs ./corpus
 *
 * The corpus wants a spread that matches how the tool is used: English prose,
 * source code in a few languages, Chinese or Japanese, a Cyrillic or Arabic
 * sample, and something emoji-heavy. Twenty files of a few hundred words each
 * is plenty; the fit is over classes, not over files.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const CORPUS_DIR = process.argv[2];
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

if (!API_KEY) {
  console.error("Set ANTHROPIC_API_KEY. This script is the only place a key is ever used.");
  process.exit(1);
}
if (!CORPUS_DIR) {
  console.error("Usage: node scripts/calibrate-anthropic.mjs <corpus-directory>");
  process.exit(1);
}

const { segmentByClass, CALIBRATION } = await import(
  new URL("../src/lib/tokenizers/anthropic-estimate.ts", import.meta.url).href
);
const o200k = (await import("gpt-tokenizer/encoding/o200k_base")).default;

const CLASSES = Object.keys(CALIBRATION);

async function countTokens(text) {
  const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: text }] }),
  });
  if (!response.ok) {
    throw new Error(`count_tokens failed: HTTP ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  return body.input_tokens;
}

/** The framing overhead the endpoint adds to any message, measured not assumed. */
const baseline = await countTokens(".") - o200k.countTokens(".");
console.log(`Measured message-framing baseline: ${baseline} tokens\n`);

const files = (await readdir(CORPUS_DIR)).filter((name) => !name.startsWith("."));
if (files.length === 0) {
  console.error(`No files in ${CORPUS_DIR}.`);
  process.exit(1);
}

/** One row per sample: the o200k count per class, and the measured Claude total. */
const rows = [];

for (const name of files) {
  const text = await readFile(join(CORPUS_DIR, name), "utf8");
  if (text.trim().length === 0) continue;

  const features = Object.fromEntries(CLASSES.map((cls) => [cls, 0]));
  for (const run of segmentByClass(text)) {
    features[run.charClass] += o200k.countTokens(run.text);
  }

  const measured = (await countTokens(text)) - baseline;
  rows.push({ name, features, measured });

  const base = Object.values(features).reduce((a, b) => a + b, 0);
  console.log(
    `${name.padEnd(28)} o200k=${String(base).padStart(6)}  claude=${String(measured).padStart(6)}  ratio=${(measured / base).toFixed(3)}`,
  );
}

/**
 * Multiplicative-update non-negative least squares. Small, dependency-free, and
 * appropriate here because every factor must stay positive; a negative "factor"
 * would be meaningless.
 */
function solve(rows, classes, iterations = 5000) {
  const weights = Object.fromEntries(classes.map((cls) => [cls, CALIBRATION[cls].mid]));
  for (let step = 0; step < iterations; step++) {
    const numerator = Object.fromEntries(classes.map((cls) => [cls, 0]));
    const denominator = Object.fromEntries(classes.map((cls) => [cls, 1e-9]));
    for (const row of rows) {
      let predicted = 0;
      for (const cls of classes) predicted += weights[cls] * row.features[cls];
      if (predicted <= 0) continue;
      for (const cls of classes) {
        numerator[cls] += row.features[cls] * row.measured;
        denominator[cls] += row.features[cls] * predicted;
      }
    }
    for (const cls of classes) weights[cls] *= numerator[cls] / denominator[cls];
  }
  return weights;
}

const present = CLASSES.filter((cls) => rows.some((row) => row.features[cls] > 0));
const missing = CLASSES.filter((cls) => !present.includes(cls));
const fitted = solve(rows, present);

/**
 * Per-class spread from the residuals of the samples that class dominates.
 * A class with only one dominant sample keeps the default spread, because one
 * measurement cannot tell you its own variance.
 */
function spreadFor(cls, mid) {
  const dominated = rows.filter((row) => {
    const total = Object.values(row.features).reduce((a, b) => a + b, 0);
    return total > 0 && row.features[cls] / total > 0.6;
  });
  if (dominated.length < 2) {
    const fallback = CALIBRATION[cls];
    const ratio = (fallback.high - fallback.low) / fallback.mid / 2;
    return { low: mid * (1 - ratio), high: mid * (1 + ratio), samples: dominated.length };
  }
  const ratios = dominated.map((row) => {
    const total = Object.values(row.features).reduce((a, b) => a + b, 0);
    return row.measured / total;
  });
  return { low: Math.min(...ratios), high: Math.max(...ratios), samples: dominated.length };
}

console.log("\nPaste this over CALIBRATION in src/lib/tokenizers/anthropic-estimate.ts:\n");
console.log("export const CALIBRATION: Record<CharClass, ClassFactor> = {");
for (const cls of CLASSES) {
  if (missing.includes(cls)) {
    const kept = CALIBRATION[cls];
    console.log(`  ${cls}: {`);
    console.log(`    low: ${kept.low}, mid: ${kept.mid}, high: ${kept.high},`);
    console.log(`    note: "UNCHANGED: the corpus contained no ${cls} samples.",`);
    console.log("  },");
    continue;
  }
  const mid = fitted[cls];
  const { low, high, samples } = spreadFor(cls, mid);
  console.log(`  ${cls}: {`);
  console.log(
    `    low: ${Math.min(low, mid).toFixed(3)}, mid: ${mid.toFixed(3)}, high: ${Math.max(high, mid).toFixed(3)},`,
  );
  console.log(
    `    note: "Fitted against ${MODEL} count_tokens over ${rows.length} samples on ${new Date().toISOString().slice(0, 10)}; spread from ${samples} ${cls}-dominant sample(s).",`,
  );
  console.log("  },");
}
console.log("};");

if (missing.length > 0) {
  console.log(
    `\nNote: no samples covered ${missing.join(", ")}. Those factors were left at their defaults; add corpus files for them before trusting those classes.`,
  );
}
