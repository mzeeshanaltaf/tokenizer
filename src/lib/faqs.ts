/**
 * The FAQ content, kept as data so two consumers stay in sync: the /faq page
 * renders it, and `faqSchema` turns the same array into FAQPage JSON-LD. A
 * question answered on the page but missing from the schema (or the reverse)
 * would be a silent SEO regression, so there is only one array.
 *
 * Framework-free, like the rest of `lib/`, so a Server Component can import it.
 */

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What is a token?",
    answer:
      "A token is the unit a language model actually reads. It is usually a common word, a word fragment, a piece of punctuation, or a run of bytes. English prose averages roughly four characters per token, so 1,000 tokens is about 750 words, but that ratio moves a lot with code, with numbers, and with non-Latin scripts.",
  },
  {
    question: "Why does the same text count differently on different models?",
    answer:
      "Every model family trains its own tokenizer with its own vocabulary. A word that is one token in one vocabulary can be three in another. Vocabulary size matters most for text the tokenizer was not optimised for: Chinese, Arabic, and heavily punctuated code are where the families diverge hardest, sometimes by more than fifty percent on the same input.",
  },
  {
    question: "Why can Claude only be estimated?",
    answer:
      "Anthropic does not publish a tokenizer for Claude. The only exact count comes from its count_tokens API endpoint, which returns a single integer, requires an API key, and means sending your text to a server. This tool runs entirely in your browser and never transmits what you paste, so Claude is estimated per character class and shown as a range rather than a point value. Token IDs are disabled for Claude, because showing plausible but wrong integers would be worse than showing nothing.",
  },
  {
    question: "Is my text sent anywhere?",
    answer:
      "No. Every tokenizer runs in your browser in a Web Worker. There is no server route, no API key, and no analytics on the text. The only network request the page ever makes is downloading a tokenizer file from Hugging Face when you pick a model that needs one, and the file size is shown before that download starts.",
  },
  {
    question: "Does the token count match what an API call will charge me?",
    answer:
      "Not exactly, and it will always be lower. This counts the tokens in a piece of text. A real API request also spends tokens on message framing, the system prompt, any tool or function definitions you send, and images. Treat this number as the cost of your content, then add the overhead of the request that carries it.",
  },
  {
    question: "What do the exact, proxy, and estimate labels mean?",
    answer:
      "Exact means the model's own published tokenizer is running on this page, so the count, the boundaries and the IDs are the real ones. Proxy means a published tokenizer from the same family is standing in, which is the case for Gemini, where Gemma 3 is used because Google does not publish Gemini's. Estimate means no public tokenizer exists at all, which today applies only to Claude.",
  },
];

/**
 * Measured, not quoted. The three OpenAI figures are `vocabularySize` read from
 * `gpt-tokenizer` and include special tokens; the rest are `model.vocab` lengths
 * read from the tokenizer.json files this app downloads. All ten are pinned by
 * tests so the table cannot drift away from the tokenizers actually shipping.
 */
export const VOCAB_ROWS: Array<[string, string, string]> = [
  ["GPT-5.x", "o200k_base", "200,006"],
  ["Gemma 3, and Gemini 3.x by proxy", "Gemma 3", "262,144"],
  ["Llama 4", "Llama 4", "200,000"],
  ["Llama 3.3, Llama 3.1", "Llama 3.1", "128,000"],
  ["Mistral Small 3, Mistral Nemo", "tekken", "131,072"],
  ["Mistral Large 2", "Mistral v3", "32,768"],
  ["Qwen3", "Qwen3", "151,643"],
  ["DeepSeek-V4", "DeepSeek V4", "128,000"],
  ["GLM-5.x", "GLM-5", "154,820"],
];
