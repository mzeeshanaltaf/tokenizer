import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { CONTEXT_ROWS, FAQS, VOCAB_ROWS } from "@/lib/faqs";
import { TOKENIZER_ASSETS } from "@/lib/models";
import { faqSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How tokens work, why the same text counts differently on different models, why Claude is estimated, and what the count does and does not tell you about cost.",
  alternates: { canonical: "/faq" },
};

/**
 * The FAQ lives on its own route rather than under the counter. It is the
 * E-E-A-T content and the FAQPage schema, so it has to be server-rendered into
 * the static HTML, but it was pushing the tool itself off the home page.
 */
export default function FaqPage() {
  const totalAssets = Object.keys(TOKENIZER_ASSETS).length;

  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 sm:px-8">
      <JsonLd data={faqSchema(FAQS)} />

      <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em]">
        Frequently asked questions
      </h1>

      <p className="mt-6 text-[1rem] leading-[1.7] text-muted-foreground">
        What a token is, why the number moves between models, and how far you can
        trust each count.
      </p>

      <dl className="mt-10 space-y-8">
        {FAQS.map((faq) => (
          <div key={faq.question} className="space-y-2">
            <dt className="text-[1.0625rem] font-semibold tracking-[-0.01em]">
              {faq.question}
            </dt>
            <dd className="text-[0.9375rem] leading-[1.7] text-muted-foreground">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-14">
        <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">
          Vocabulary sizes
        </h2>
        <p className="mt-3 text-[0.875rem] leading-[1.6] text-muted-foreground">
          Read directly from the {totalAssets} tokenizer files this tool runs, not
          quoted from documentation.
        </p>
        <div className="mt-4">
          <Table head={["Models", "Tokenizer", "Vocabulary"]} rows={VOCAB_ROWS} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">
          Context windows
        </h2>
        <p className="mt-3 text-[0.875rem] leading-[1.6] text-muted-foreground">
          Input limits for families with stable published figures. Newer releases
          move fast, so check the provider&apos;s own documentation before you
          design around a number.
        </p>
        <div className="mt-4">
          <Table head={["Model", "Input tokens"]} rows={CONTEXT_ROWS} />
        </div>
      </section>
    </div>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: ReadonlyArray<readonly string[]>;
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[24rem] border-collapse text-[0.8125rem]">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th
                key={cell}
                scope="col"
                className={`label-unit border-b border-border py-2 pr-4 font-normal text-muted-foreground ${
                  i === head.length - 1 ? "text-right" : "text-left"
                }`}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`border-b border-border/60 py-2 pr-4 ${
                    i === 0
                      ? "text-foreground"
                      : i === row.length - 1
                        ? "text-right font-readout text-muted-foreground"
                        : "font-readout text-muted-foreground"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
