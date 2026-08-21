import type { TokenChunk } from "@/lib/tokenizers/types";
import type { AccuracyTier } from "@/lib/tokenizers/types";
import { cn } from "@/lib/utils";

/**
 * One chip in the token stream.
 *
 * Three things make this less trivial than it looks:
 *
 *  - A token is very often pure whitespace. Rendering it as a space produces an
 *    invisible chip, so whitespace is substituted with a visible glyph and
 *    marked as substituted for screen readers.
 *  - A chip can carry several IDs, because a multi-byte character split across
 *    tokens is merged back into one readable chip. The title shows all of them.
 *  - Substituting the spaces away removes every soft-wrap opportunity the line
 *    had, and the chips are emitted back to back with no whitespace between
 *    them, so a paragraph becomes one unbreakable run and overflows the panel
 *    horizontally. The explicit `<wbr>` after each chip puts the break
 *    opportunities back, at chip boundaries rather than mid-token.
 */

/** Visible stand-ins for characters that would otherwise render as a gap. */
const VISIBLE: Record<string, string> = {
  " ": "·",
  "\t": "→",
  "\n": "⏎",
  "\r": "⏎",
};

function renderText(text: string) {
  const parts: React.ReactNode[] = [];
  let buffer = "";

  const flush = () => {
    if (buffer) {
      parts.push(buffer);
      buffer = "";
    }
  };

  for (const char of text) {
    const substitute = VISIBLE[char];
    if (substitute) {
      flush();
      parts.push(
        <span key={parts.length} aria-hidden="true" className="text-[var(--chip-invisible)]">
          {substitute}
        </span>,
      );
    } else {
      buffer += char;
    }
  }
  flush();

  return parts;
}

export function TokenChip({
  chunk,
  index,
  tier,
  showId,
}: {
  chunk: TokenChunk;
  index: number;
  tier: AccuracyTier;
  showId: boolean;
}) {
  const ids = chunk.ids.join(" + ");
  const hasNewline = chunk.text.includes("\n");

  return (
    <>
      <span
        // Alternation is decoration only. The edge is what marks the boundary.
        style={{ background: index % 2 === 0 ? "var(--chip-a)" : "var(--chip-b)" }}
        className={cn(
          "rounded-[3px] border px-[0.1875rem] py-[0.0625rem] align-baseline whitespace-pre-wrap",
          "border-[var(--chip-edge)]",
          tier === "proxy" && "chip-hatched border-dashed",
          tier === "estimate" && "chip-hatched border-dashed",
        )}
        title={showId ? `id ${ids}` : undefined}
      >
        {renderText(chunk.text)}
        {showId && (
          <span className="ml-1 text-[0.6875rem] text-muted-foreground tabular-nums">
            {ids}
          </span>
        )}
      </span>
      {/* A token containing a newline has to actually break, or the stream
          stops resembling the text it came from. Everywhere else, offer a break
          the line breaker is allowed to take. */}
      {hasNewline ? <span className="block h-0 w-full" /> : <wbr />}
    </>
  );
}
