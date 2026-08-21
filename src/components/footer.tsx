import Link from "next/link";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-[78rem] flex-col gap-4 px-5 py-8 text-[0.8125rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-readout text-foreground">{SITE_NAME}</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            Developed with 💖 by{" "}
            <a
              href="https://www.zeeshanai.cloud"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Zeeshan Altaf
            </a>
          </span>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/faq"
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            FAQ
          </Link>
          <Link
            href="/privacy"
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Contact
          </Link>
          <p className="inline-flex items-center gap-2">
            <ShieldCheckIcon size={15} weight="bold" className="text-primary" />
            Counted on your device. Your text is never sent anywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
