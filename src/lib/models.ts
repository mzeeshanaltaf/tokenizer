import type { AccuracyTier } from "@/lib/tokenizers/types";

/**
 * The model registry.
 *
 * Model -> encoding is stored explicitly here rather than delegated to
 * `gpt-tokenizer`'s built-in model map, which lags new model names and silently
 * falls back when it does not recognise one. An explicit table is the
 * difference between "we know" and "it probably guessed right".
 */

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "mistral"
  | "qwen"
  | "deepseek";

export interface Provider {
  id: ProviderId;
  name: string;
}

export const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "meta", name: "Meta" },
  { id: "mistral", name: "Mistral" },
  { id: "qwen", name: "Qwen" },
  { id: "deepseek", name: "DeepSeek" },
];

/** Encodings bundled with `gpt-tokenizer`. No download, no network. */
export type OpenAiEncoding = "o200k_base" | "o200k_harmony" | "cl100k_base";

/** How a tokenizer.json represents the bytes behind a vocabulary entry. */
export type TokenEncodingMode = "byte-level" | "metaspace";

/**
 * A tokenizer.json fetched from the Hugging Face Hub at runtime.
 *
 * Every entry was verified with `scripts/verify-tokenizers.mjs`: HTTP 200,
 * ungated, permissive CORS, real byte size recorded below, and a byte-accurate
 * round trip over a corpus of emoji, CJK, RTL text and source code.
 */
export interface TokenizerAsset {
  id: string;
  /** Hugging Face repo, resolved as `/{repo}/resolve/main/tokenizer.json`. */
  repo: string;
  /** Human label for the download prompt. */
  label: string;
  /** Real size of tokenizer.json in bytes. Measured, not estimated. */
  bytes: number;
  mode: TokenEncodingMode;
}

export const TOKENIZER_ASSETS: Record<string, TokenizerAsset> = {
  "gemma-3": {
    id: "gemma-3",
    repo: "onnx-community/gemma-3-1b-it-ONNX",
    label: "Gemma 3, 262k vocabulary",
    bytes: 20_323_013,
    mode: "metaspace",
  },
  "llama-3.1": {
    id: "llama-3.1",
    repo: "Xenova/Meta-Llama-3.1-Tokenizer",
    label: "Llama 3.1, 128k vocabulary",
    bytes: 9_085_657,
    mode: "byte-level",
  },
  "llama-4": {
    id: "llama-4",
    repo: "unsloth/Llama-4-Scout-17B-16E-Instruct",
    label: "Llama 4, 200k vocabulary",
    bytes: 27_948_578,
    mode: "byte-level",
  },
  "mistral-v3": {
    id: "mistral-v3",
    repo: "Xenova/mistral-tokenizer-v3",
    label: "Mistral v3, 32k vocabulary",
    bytes: 1_961_548,
    mode: "metaspace",
  },
  tekken: {
    id: "tekken",
    repo: "Xenova/Mistral-Nemo-Instruct-Tokenizer",
    label: "Mistral tekken, 131k vocabulary",
    bytes: 9_264_445,
    mode: "byte-level",
  },
  qwen3: {
    id: "qwen3",
    repo: "onnx-community/Qwen3-0.6B-ONNX",
    label: "Qwen3, 151k vocabulary",
    bytes: 9_117_040,
    mode: "byte-level",
  },
  "deepseek-v3": {
    id: "deepseek-v3",
    repo: "deepseek-ai/DeepSeek-V3",
    label: "DeepSeek V3, 128k vocabulary",
    bytes: 7_847_652,
    mode: "byte-level",
  },
};

export type TokenizerSource =
  | { kind: "openai"; encoding: OpenAiEncoding }
  | { kind: "hf"; asset: string }
  | { kind: "anthropic-estimate" };

export interface ModelEntry {
  id: string;
  name: string;
  provider: ProviderId;
  tier: AccuracyTier;
  source: TokenizerSource;
  /** The tokenizer actually used, named in the accuracy badge. */
  tokenizerName: string;
  /** Why this tier, in one sentence. Shown when the badge is opened. */
  why: string;
}

const EXACT_LOCAL_WHY =
  "This model's own tokenizer is published and runs on this page, so the count, the boundaries and the IDs are the real ones.";

const OPENAI_O200K: Array<[string, string]> = [
  ["gpt-5.6-sol", "GPT-5.6 Sol"],
  ["gpt-5.6-terra", "GPT-5.6 Terra"],
  ["gpt-5.6-luna", "GPT-5.6 Luna"],
  ["gpt-5.5", "GPT-5.5"],
  ["gpt-5.5-pro", "GPT-5.5 Pro"],
  ["gpt-5.4", "GPT-5.4"],
  ["gpt-5.4-mini", "GPT-5.4 mini"],
  ["gpt-5.4-nano", "GPT-5.4 nano"],
  ["gpt-5.3-codex", "GPT-5.3-Codex"],
  ["gpt-5.2", "GPT-5.2"],
  ["gpt-5.2-pro", "GPT-5.2 Pro"],
  ["gpt-5.1", "GPT-5.1"],
  ["gpt-5", "GPT-5"],
  ["gpt-4.1", "GPT-4.1"],
  ["gpt-4.1-mini", "GPT-4.1 mini"],
  ["gpt-4o", "GPT-4o"],
  ["gpt-4o-mini", "GPT-4o mini"],
  ["o3", "o3"],
  ["o4-mini", "o4-mini"],
];

const OPENAI_HARMONY: Array<[string, string]> = [
  ["gpt-oss-120b", "gpt-oss-120b"],
  ["gpt-oss-20b", "gpt-oss-20b"],
];

const OPENAI_CL100K: Array<[string, string]> = [
  ["gpt-4-turbo", "GPT-4 Turbo"],
  ["gpt-4", "GPT-4"],
  ["gpt-3.5-turbo", "GPT-3.5 Turbo"],
];

const ANTHROPIC: Array<[string, string]> = [
  ["claude-opus-5", "Claude Opus 5"],
  ["claude-sonnet-5", "Claude Sonnet 5"],
  ["claude-opus-4.8", "Claude Opus 4.8"],
  ["claude-opus-4.7", "Claude Opus 4.7"],
  ["claude-opus-4.6", "Claude Opus 4.6"],
  ["claude-sonnet-4.6", "Claude Sonnet 4.6"],
  ["claude-haiku-4.5", "Claude Haiku 4.5"],
];

const GEMINI: Array<[string, string]> = [
  ["gemini-3.7-pro", "Gemini 3.7 Pro"],
  ["gemini-3.6", "Gemini 3.6"],
  ["gemini-3.5-flash", "Gemini 3.5 Flash"],
  ["gemini-3.1-pro", "Gemini 3.1 Pro"],
  ["gemini-2.5-pro", "Gemini 2.5 Pro"],
  ["gemini-2.5-flash", "Gemini 2.5 Flash"],
];

function openAiGroup(
  entries: Array<[string, string]>,
  encoding: OpenAiEncoding,
): ModelEntry[] {
  return entries.map(([id, name]) => ({
    id,
    name,
    provider: "openai" as const,
    tier: "exact" as const,
    source: { kind: "openai" as const, encoding },
    tokenizerName: encoding,
    why: EXACT_LOCAL_WHY,
  }));
}

export const MODELS: ModelEntry[] = [
  ...openAiGroup(OPENAI_O200K, "o200k_base"),
  ...openAiGroup(OPENAI_HARMONY, "o200k_harmony"),
  ...openAiGroup(OPENAI_CL100K, "cl100k_base"),

  ...ANTHROPIC.map(
    ([id, name]): ModelEntry => ({
      id,
      name,
      provider: "anthropic",
      tier: "estimate",
      source: { kind: "anthropic-estimate" },
      tokenizerName: "calibrated estimator",
      why: "Anthropic does not publish a tokenizer, and its only exact count needs an API key and a round trip to a server. This page never sends your text anywhere, so Claude is estimated per script and shown as a range.",
    }),
  ),

  {
    id: "gemma-3",
    name: "Gemma 3",
    provider: "google",
    tier: "exact",
    source: { kind: "hf", asset: "gemma-3" },
    tokenizerName: "Gemma 3",
    why: EXACT_LOCAL_WHY,
  },
  ...GEMINI.map(
    ([id, name]): ModelEntry => ({
      id,
      name,
      provider: "google",
      tier: "proxy",
      source: { kind: "hf", asset: "gemma-3" },
      tokenizerName: "Gemma 3, standing in",
      why: "Google does not publish a tokenizer for Gemini. Gemma 3 is the open model from the same family and the closest published stand-in, so the boundaries below are real Gemma boundaries rather than Gemini's.",
    }),
  ),

  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    provider: "meta",
    tier: "exact",
    source: { kind: "hf", asset: "llama-4" },
    tokenizerName: "Llama 4",
    why: EXACT_LOCAL_WHY,
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "meta",
    tier: "exact",
    source: { kind: "hf", asset: "llama-4" },
    tokenizerName: "Llama 4",
    why: EXACT_LOCAL_WHY,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "meta",
    tier: "exact",
    source: { kind: "hf", asset: "llama-3.1" },
    tokenizerName: "Llama 3.1",
    why: "Llama 3.3 ships the same 128k vocabulary as Llama 3.1, verified entry for entry, so this is the model's real tokenizer.",
  },
  {
    id: "llama-3.1",
    name: "Llama 3.1",
    provider: "meta",
    tier: "exact",
    source: { kind: "hf", asset: "llama-3.1" },
    tokenizerName: "Llama 3.1",
    why: EXACT_LOCAL_WHY,
  },

  {
    id: "mistral-large-2",
    name: "Mistral Large 2",
    provider: "mistral",
    tier: "exact",
    source: { kind: "hf", asset: "mistral-v3" },
    tokenizerName: "Mistral v3",
    why: EXACT_LOCAL_WHY,
  },
  {
    id: "mistral-small-3",
    name: "Mistral Small 3",
    provider: "mistral",
    tier: "exact",
    source: { kind: "hf", asset: "tekken" },
    tokenizerName: "Mistral tekken",
    why: "Shares the tekken vocabulary. The two files differ only in ten reserved special-token slots, none of which plain text can produce, so counts and IDs match.",
  },
  {
    id: "mistral-nemo",
    name: "Mistral Nemo",
    provider: "mistral",
    tier: "exact",
    source: { kind: "hf", asset: "tekken" },
    tokenizerName: "Mistral tekken",
    why: EXACT_LOCAL_WHY,
  },

  {
    id: "qwen3",
    name: "Qwen3",
    provider: "qwen",
    tier: "exact",
    source: { kind: "hf", asset: "qwen3" },
    tokenizerName: "Qwen3",
    why: EXACT_LOCAL_WHY,
  },

  {
    id: "deepseek-v3",
    name: "DeepSeek-V3",
    provider: "deepseek",
    tier: "exact",
    source: { kind: "hf", asset: "deepseek-v3" },
    tokenizerName: "DeepSeek V3",
    why: EXACT_LOCAL_WHY,
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1",
    provider: "deepseek",
    tier: "exact",
    source: { kind: "hf", asset: "deepseek-v3" },
    tokenizerName: "DeepSeek V3",
    why: "DeepSeek-R1 ships a byte-identical tokenizer to DeepSeek-V3, so one download serves both.",
  },
];

export const DEFAULT_MODEL_ID = "gpt-5.6-sol";

const BY_ID = new Map(MODELS.map((model) => [model.id, model]));

export function getModel(id: string): ModelEntry {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_MODEL_ID)!;
}

/** Models grouped by provider, in `PROVIDERS` order, for the picker. */
export function modelsByProvider(): Array<{ provider: Provider; models: ModelEntry[] }> {
  return PROVIDERS.map((provider) => ({
    provider,
    models: MODELS.filter((model) => model.provider === provider.id),
  })).filter((group) => group.models.length > 0);
}

/** The asset a model needs downloaded, or null when it runs from the bundle. */
export function assetFor(model: ModelEntry): TokenizerAsset | null {
  return model.source.kind === "hf" ? TOKENIZER_ASSETS[model.source.asset] : null;
}

/** Whether token IDs are meaningful for this model. Never true for estimates. */
export function supportsTokenIds(model: ModelEntry): boolean {
  return model.tier !== "estimate";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
