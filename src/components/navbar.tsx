import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_NAME } from "@/lib/site";

export function Navbar() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex h-14 max-w-[78rem] items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-readout text-[0.9375rem] tracking-tight"
        >
          <BrandMark />
          {SITE_NAME}
        </Link>

        <div className="ml-auto flex items-center gap-5">
          <Link
            href="/faq"
            className="text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
          <Link
            href="/privacy"
            className="text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

/**
 * A dimension between two jaws: the act of measuring a span. Same mark as
 * `icon.svg`. The arrowheads matter, since two bars and a crossbar on their own
 * read as the letter H.
 */
function BrandMark() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 256 256"
      aria-hidden="true"
      className="text-primary"
    >
      <g stroke="currentColor" strokeWidth="18" strokeLinecap="round" fill="none">
        <path d="M56 56 V200" />
        <path d="M200 56 V200" />
        <path d="M56 128 H200" />
        <path d="M92 104 L64 128 L92 152" />
        <path d="M164 104 L192 128 L164 152" />
      </g>
    </svg>
  );
}
