import type { Metadata } from "next";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact & Feedback",
  description:
    "Found a bug, have an idea, or just want to say hi? Send us a message, we read everything.",
  alternates: { canonical: "/contact" },
};

// Short error codes set by the API route's redirect (?error=...) mapped to
// human-readable copy. Keep keys in sync with the route handler's fail() calls.
const ERROR_MESSAGES: Record<string, string> = {
  fields: "Please fill in all fields.",
  email: "Please enter a valid email address.",
  length: "Message must be 5000 characters or fewer.",
  rate: "Too many submissions. Please try again later.",
  server: "Service is temporarily unavailable. Please try again later.",
  parse: "Invalid submission. Please try again.",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;
  const initialError = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.")
    : undefined;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <EnvelopeSimpleIcon size={22} weight="bold" className="text-primary" />
        </span>
        <div>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em]">
            Contact &amp; Feedback
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-[1.6] text-muted-foreground">
            Found a bug, have an idea, or just want to say hi? Send a message,
            we read everything.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
        <ContactForm initialSuccess={!!sent} initialError={initialError} />
      </div>
    </div>
  );
}
