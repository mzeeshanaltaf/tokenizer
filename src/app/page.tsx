import { CounterIsland } from "@/components/counter/counter-island";
import { JsonLd } from "@/components/json-ld";
import { organizationSchema, softwareApplicationSchema } from "@/lib/structured-data";

/**
 * Server Component. Renders the H1, the standfirst, and the client island.
 * Only the island is client-side, so the content a crawler needs is in the
 * static HTML. The long-form explanation and the FAQPage schema live on /faq,
 * which keeps the tool itself at the top of this page.
 */
export default function Home() {
  return (
    <div className="mx-auto max-w-[78rem] px-5 pt-10 pb-4 sm:px-8">
      <JsonLd data={[softwareApplicationSchema(), organizationSchema()]} />

      <header className="max-w-[54ch]">
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
          Token Counter for LLMs
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-[1.65] text-muted-foreground">
          Paste text, pick a model, see the count and where every boundary falls.
          Exact where the tokenizer is published, openly estimated where it is
          not, and never the two dressed the same. Everything runs in your
          browser, so your text never leaves the device.
        </p>
      </header>

      <div className="mt-10">
        <CounterIsland />
      </div>
    </div>
  );
}
