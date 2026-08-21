"use client";

import { useMemo } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccuracyTier, StreamResult } from "@/lib/tokenizers/types";
import { TokenChip } from "./token-chip";

/**
 * The token stream.
 *
 * This is the part of the product worth lingering over: it is where a user sees
 * *why* their text costs what it costs. It also has to survive tens of
 * thousands of chips without dropping frames, and stay inside its panel on a
 * long paste, which takes three separate measures:
 *
 *  - Each chunk carries `content-visibility: auto`, so chips scrolled out of
 *    view cost nothing to lay out.
 *  - Past a screenful the stream scrolls in its own box rather than pushing the
 *    rest of the page down, so the counter above stays reachable on a long
 *    paste. `overscroll-contain` keeps that scroll from chaining to the page.
 *  - The whole chip tree is memoized on the three things that can change it.
 *    Without this, every keystroke in the textarea re-renders several thousand
 *    chip components, which measured at ~117 ms per keystroke on a
 *    43k-character document. The parent re-renders constantly while typing; the
 *    chips must not.
 */

const CHUNK_SIZE = 250;

export function TokenStream({
  stream,
  tier,
  showIds,
  onRenderAll,
  renderingAll,
}: {
  stream: StreamResult;
  tier: AccuracyTier;
  showIds: boolean;
  onRenderAll: () => void;
  renderingAll: boolean;
}) {
  const tokens = stream.chunks;

  const body = useMemo(() => {
    const chunkCount = Math.ceil(tokens.length / CHUNK_SIZE);
    return Array.from({ length: chunkCount }, (_, chunkIndex) => {
      const start = chunkIndex * CHUNK_SIZE;
      return (
        <div key={chunkIndex} className="chunk-defer inline">
          {tokens.slice(start, start + CHUNK_SIZE).map((token, i) => (
            <TokenChip
              key={token.start}
              chunk={token}
              index={start + i}
              tier={tier}
              showId={showIds}
            />
          ))}
        </div>
      );
    });
  }, [tokens, tier, showIds]);

  if (!stream.verified) {
    return (
      <div className="flex items-start gap-2.5 rounded-md bg-muted/60 p-4 text-[0.875rem] leading-relaxed text-muted-foreground">
        <WarningCircleIcon size={18} weight="duotone" className="mt-0.5 shrink-0" />
        <p className="max-w-[62ch]">
          The token boundaries could not be reconstructed from this text with
          certainty, so they are not shown. The count above is still correct.
          This is deliberate: a segmentation that cannot be checked is worse than
          no segmentation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        className={cn(
          "max-h-[min(70vh,44rem)] min-w-0 overflow-y-auto overscroll-contain",
          // `break-words` only breaks a chip that cannot fit a line on its own;
          // ordinary wrapping happens at the `<wbr>` between chips.
          "font-readout text-[0.8125rem] leading-[1.9] break-words",
        )}
      >
        {body}
      </div>

      {!stream.complete && !renderingAll && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-[0.8125rem] text-muted-foreground">
            Showing the first {stream.chunks.length.toLocaleString()} tokens.
          </p>
          <Button size="sm" variant="outline" onClick={onRenderAll}>
            Render all tokens
          </Button>
        </div>
      )}
    </div>
  );
}
