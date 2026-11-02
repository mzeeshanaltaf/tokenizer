import type { Metadata } from "next";
import { TOKENIZER_ASSETS } from "@/lib/models";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Token Counter counts tokens entirely in your browser. Your text is never transmitted, stored, or logged. What the page does and does not do, in full.",
  alternates: { canonical: "/privacy" },
};

const repos = Object.values(TOKENIZER_ASSETS).map((asset) => asset.repo);

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 sm:px-8">
      <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em]">
        Privacy
      </h1>

      <p className="mt-6 text-[1rem] leading-[1.7]">
        Text you paste into {SITE_NAME} never leaves your device. Not to us, not
        to a model provider, not to anyone. The counter has no server route that
        could receive it.
      </p>

      <Section title="How the counting works">
        <p>
          Every tokenizer runs inside a Web Worker in your browser. The counting
          itself involves no network activity at all. Close your network
          connection after the page has loaded and the tool keeps working for
          every model whose tokenizer is already in memory or cached.
        </p>
      </Section>

      <Section title="Tokenizer downloads">
        <p>
          Some models need a tokenizer file that is too large to bundle with the
          page. When you select one of those models for the first time, the file
          is downloaded from the Hugging Face Hub. Its size is shown before the
          download begins, and it is stored in your browser&apos;s Cache API so
          the next visit costs nothing.
        </p>
        <p>
          That request sends only what any browser sends when fetching a public
          file. Your pasted text is not part of it and is not involved in any
          way. The files come from these repositories:
        </p>
        <ul className="mt-1 space-y-1 font-readout text-[0.8125rem] text-muted-foreground">
          {repos.map((repo) => (
            <li key={repo}>huggingface.co/{repo}</li>
          ))}
        </ul>
        <p>
          OpenAI encodings are bundled with the page and need no download at all.
        </p>
      </Section>

      <Section title="What is stored on your device">
        <p>
          Two things, both local, both clearable by clearing site data: the
          downloaded tokenizer files in the Cache API, and your light or dark
          theme preference in local storage. Your text is not among them. It is
          held in memory while the tab is open and is gone when you close it.
        </p>
      </Section>

      <Section title="Analytics and cookies">
        <p>
          This site counts page views with Umami, an analytics tool we host
          ourselves at analytics.zeeshanai.cloud. Each page view sends the page
          URL and title, the referring site, your screen size, your browser
          language, and the site&apos;s hostname. As with any web request, that
          server also sees your IP address and browser details.
        </p>
        <p>
          Your pasted text is not part of this. The analytics script does not
          read the text box, and the text never appears in the page URL or title.
          It sets no cookies.
        </p>
        <p>
          There is no advertising and there are no third-party embeds. The fonts
          are self-hosted at build time, so viewing this page does not contact a
          font CDN either.
        </p>
      </Section>

      <Section title="The contact form">
        <p>
          The contact form is the one place that sends what you type, and only
          when you submit it. Your name, email address and message go through our
          server to an n8n workflow, so we can read your message and reply.
        </p>
        <p>
          To limit spam, your IP address is checked against a limit of five
          submissions every ten minutes, using Upstash, a hosted database service.
        </p>
      </Section>

      <Section title="Anthropic and the estimator">
        <p>
          Claude counts are produced by an estimator running locally. This
          application does not call Anthropic&apos;s{" "}
          <code className="rounded-[3px] bg-muted px-1 py-0.5 text-[0.875em]">
            count_tokens
          </code>{" "}
          endpoint, does not hold an API key, and has no way to send your text to
          Anthropic. That is precisely why Claude is an estimate here rather than
          an exact count.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-[1.7] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
