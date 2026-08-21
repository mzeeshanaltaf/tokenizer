"use client";

import { cn } from "@/lib/utils";
import type { TextStats } from "@/lib/text-stats";
import type { AccuracyTier, CountResult } from "@/lib/tokenizers/types";
import { AccuracyBadge } from "./accuracy-badge";

/**
 * The readout. Tokens first and largest, everything else beneath it.
 *
 * Two rules from PRODUCT.md are structural here rather than cosmetic:
 *  - the count never renders without its tier beside it
 *  - an `estimate` tier renders as a range, never as a point value
 */

const DASH = "—";

function format(value: number | null): string {
  return value === null ? DASH : value.toLocaleString();
}

export function StatRail({
  counts,
  stats,
  tier,
  tokenizerName,
  why,
  pending,
  hasText,
}: {
  counts: CountResult | null;
  stats: TextStats;
  tier: AccuracyTier;
  tokenizerName: string;
  why: string;
  pending: boolean;
  hasText: boolean;
}) {
  const range = counts?.range;
  const headline = hasText ? (counts?.count ?? null) : null;

  return (
    <div className="flex flex-col">
      <div className="label-unit text-muted-foreground">Tokens</div>

      <div
        className={cn(
          "mt-2 font-readout text-[2.75rem] leading-none tracking-[-0.03em] transition-opacity duration-150",
          pending && "opacity-50",
        )}
        // The count is the answer, so it is announced when it settles rather
        // than read out on every keystroke.
        aria-live="polite"
        aria-atomic="true"
      >
        {format(headline)}
        <span className="sr-only">
          {headline === null
            ? hasText
              ? " tokens, counting"
              : " tokens, waiting for input"
            : range
              ? ` tokens, estimated, between ${range.low} and ${range.high}`
              : " tokens"}
        </span>
      </div>

      {range && hasText && (
        <div className="mt-1.5 font-readout text-[0.875rem] text-muted-foreground">
          {range.low.toLocaleString()} to {range.high.toLocaleString()}
        </div>
      )}

      <AccuracyBadge
        tier={tier}
        tokenizerName={tokenizerName}
        why={why}
        className="mt-4"
      />

      <dl className="mt-6 flex flex-col">
        <Readout label="Characters" value={hasText ? stats.characters : null} />
        <Readout label="Words" value={hasText ? stats.words : null} />
        <Readout label="Lines" value={hasText ? stats.lines : null} />
        <Readout label="Bytes (UTF-8)" value={hasText ? stats.bytes : null} />
        <Readout
          label="Chars per token"
          value={
            hasText && headline && headline > 0
              ? Math.round((stats.characters / headline) * 100) / 100
              : null
          }
          precise
        />
      </dl>
    </div>
  );
}

function Readout({
  label,
  value,
  precise = false,
}: {
  label: string;
  value: number | null;
  precise?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 last:border-b-0">
      <dt className="label-unit text-muted-foreground">{label}</dt>
      <dd className="font-readout text-[0.9375rem]">
        {value === null ? DASH : precise ? value.toFixed(2) : value.toLocaleString()}
      </dd>
    </div>
  );
}
