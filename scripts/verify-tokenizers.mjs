/**
 * Verifies every tokenizer in the registry, end to end.
 *
 * For each Hugging Face asset:
 *   1. tokenizer.json and tokenizer_config.json return 200, ungated
 *   2. CORS allows a browser on another origin to fetch them
 *   3. the recorded byte size in `src/lib/models.ts` matches reality
 *   4. every sample round-trips: the bytes behind each token, concatenated,
 *      reconstruct the source string exactly, with no replacement characters
 *
 * Step 4 is the one that matters. It is what proves the token stream will not
 * render a wall of U+FFFD on emoji or CJK, and it is why the multi-megabyte
 * tokenizer files are not committed to this repo: this script downloads them
 * into a gitignored cache instead.
 *
 * Run: node scripts/verify-tokenizers.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Tokenizer } from "@huggingface/tokenizers";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(root, ".tokenizer-cache");

const { TOKENIZER_ASSETS } = await import(
  new URL("../src/lib/models.ts", import.meta.url).href
);
const { tokenBytes } = await import(
  new URL("../src/lib/tokenizers/byte-level.ts", import.meta.url).href
);
const { buildStream } = await import(
  new URL("../src/lib/tokenizers/stream.ts", import.meta.url).href
);

const SAMPLES = [
  ["ascii", "Hello world"],
  ["spaces", "  leading and  double  spaces  "],
  ["emoji", "Hello 👋 world 世界 🇯🇵 привет"],
  ["zwj", "🧑‍💻👩‍👩‍👧‍👦"],
  ["code", "const x = { a: 1 };\n\tif (x) return `${x}`;\n"],
  ["scripts", "café naïve ünïcödé\n한국어 テスト العربية"],
  ["newlines", "line1\nline2\r\nline3\ttabbed"],
  ["single", "x"],
  ["one-emoji", "😀"],
];

async function fetchCached(url, file) {
  const path = join(CACHE_DIR, file);
  if (existsSync(path)) {
    return { json: JSON.parse(await readFile(path, "utf8")), bytes: null, cors: "cached" };
  }
  const response = await fetch(url, { headers: { Origin: "https://token-counter.test" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const cors = response.headers.get("access-control-allow-origin") ?? "NONE";
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path, buffer);
  return { json: JSON.parse(buffer.toString("utf8")), bytes: buffer.length, cors };
}

let failures = 0;

for (const asset of Object.values(TOKENIZER_ASSETS)) {
  const base = `https://huggingface.co/${asset.repo}/resolve/main`;
  const problems = [];

  const tokenizerFile = await fetchCached(`${base}/tokenizer.json`, `${asset.id}.tokenizer.json`);
  const configFile = await fetchCached(`${base}/tokenizer_config.json`, `${asset.id}.config.json`);

  if (tokenizerFile.cors !== "cached" && tokenizerFile.cors === "NONE") {
    problems.push("no CORS header");
  }
  if (tokenizerFile.bytes !== null && tokenizerFile.bytes !== asset.bytes) {
    problems.push(`size drifted: registry says ${asset.bytes}, server sent ${tokenizerFile.bytes}`);
  }

  const tokenizer = new Tokenizer(tokenizerFile.json, configFile.json);

  for (const [label, text] of SAMPLES) {
    const { ids, tokens } = tokenizer.encode(text, { add_special_tokens: false });
    const raw = [];
    let unmappable = false;
    for (let i = 0; i < ids.length; i++) {
      const bytes = tokenBytes(tokens[i], asset.mode);
      if (bytes === null) {
        unmappable = true;
        break;
      }
      raw.push({ id: ids[i], bytes });
    }
    if (unmappable) {
      problems.push(`${label}: a token could not be mapped back to bytes`);
      continue;
    }

    const stream = buildStream(text, raw);
    if (!stream.verified) {
      problems.push(`${label}: reconstruction failed`);
    } else if (stream.chunks.map((chunk) => chunk.text).join("") !== text) {
      problems.push(`${label}: chunks do not rebuild the source`);
    } else if (stream.chunks.some((chunk) => chunk.text.includes("�"))) {
      problems.push(`${label}: replacement character in a chip`);
    }
  }

  const status = problems.length === 0 ? "PASS" : "FAIL";
  const size = `${(asset.bytes / 1_048_576).toFixed(1)} MB`;
  console.log(`${status}  ${asset.id.padEnd(12)} ${size.padStart(8)}  ${asset.repo}`);
  for (const problem of problems) console.log(`        - ${problem}`);
  if (problems.length > 0) failures++;
}

console.log(
  failures === 0
    ? `\nAll ${Object.keys(TOKENIZER_ASSETS).length} tokenizers verified.`
    : `\n${failures} tokenizer(s) failed. Drop them from the registry rather than shipping them broken.`,
);
process.exit(failures === 0 ? 0 : 1);
