import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";

interface Faq {
  question: string;
  answer: string;
}

/**
 * All schemas are rendered from the page's Server Component, so they land in
 * the static HTML rather than being injected after hydration. A crawler that
 * does not run JavaScript still sees them, which is the entire point.
 */

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_TITLE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (browser-based)",
    browserRequirements: "Requires JavaScript and Web Workers",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Token counts for OpenAI, Anthropic, Google, Meta, Mistral, Qwen and DeepSeek models",
      "Token boundary highlighting",
      "Token IDs for models with a published tokenizer",
      "Character, word, line and UTF-8 byte counts",
      "Runs entirely in the browser with no server round trip",
    ],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };
}

export function faqSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
