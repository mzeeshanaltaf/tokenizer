"use client";

import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { AccuracyTier } from "@/lib/tokenizers/types";
import { cn } from "@/lib/utils";

/**
 * The tier badge. The most important component on the page.
 *
 * The tier is never carried by color alone. Each one gets a word, a distinct
 * glyph, and a distinct fill treatment, so it survives greyscale, a
 * color-blind reader, and a low-quality screenshot.
 */

const TIER_GLYPH: Record<AccuracyTier, string> = {
  exact: "●",
  proxy: "◐",
  estimate: "○",
};

const TIER_SUMMARY: Record<AccuracyTier, string> = {
  exact: "Counted with this model's own published tokenizer.",
  proxy: "Counted with a published tokenizer from the same family.",
  estimate: "No public tokenizer exists for this model.",
};

export function AccuracyBadge({
  tier,
  tokenizerName,
  why,
  className,
}: {
  tier: AccuracyTier;
  tokenizerName: string;
  why: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-readout text-[0.6875rem] uppercase tracking-[0.08em] transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          tier === "exact" &&
            "bg-primary text-primary-foreground hover:bg-primary/90",
          tier === "proxy" &&
            "border border-primary/70 text-primary hover:bg-primary/10",
          tier === "estimate" &&
            "border border-dashed border-muted-foreground/60 text-muted-foreground hover:bg-muted",
        )}
      >
        <span aria-hidden="true" className="text-[0.8em] leading-none">
          {TIER_GLYPH[tier]}
        </span>
        {tier}
        <CaretDownIcon
          size={10}
          weight="bold"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="max-w-[46ch] space-y-1.5 rounded-sm bg-muted/60 p-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <p className="text-foreground">{TIER_SUMMARY[tier]}</p>
          <p>{why}</p>
          <p className="font-readout text-[0.75rem]">
            <span className="text-muted-foreground/70">tokenizer: </span>
            {tokenizerName}
          </p>
        </div>
      )}
    </div>
  );
}

/** One-line version for the model picker's option rows and the legend. */
export function TierPip({ tier }: { tier: AccuracyTier }) {
  return (
    <span
      aria-label={tier}
      className={cn(
        "font-readout text-[0.625rem] uppercase tracking-[0.08em]",
        tier === "exact" && "text-primary",
        tier !== "exact" && "text-muted-foreground",
      )}
    >
      <span aria-hidden="true">{TIER_GLYPH[tier]} </span>
      {tier}
    </span>
  );
}
