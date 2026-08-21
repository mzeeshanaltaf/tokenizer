"use client";

import { ArrowCounterClockwiseIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * The input. Deliberately plain: a big monospace target and two controls.
 *
 * Empty by default, because the page is a tool rather than a demo, but with a
 * one-click sample for anyone who wants to see the stream populated before
 * committing their own text.
 */

/** Mixed on purpose: prose, code, CJK and emoji all tokenize differently. */
export const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog.

const total = items.reduce((sum, item) => sum + item.price, 0);

世界你好，今天天气很好。
Привет, мир. مرحبا بالعالم.

Tokenizers split on bytes, not characters 👋🇯🇵`;

export function InputPanel({
  value,
  onChange,
  id = "source",
}: {
  value: string;
  onChange: (text: string) => void;
  id?: string;
}) {
  return (
    <div className="flex min-h-[26rem] flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <label htmlFor={id} className="label-unit text-muted-foreground">
          Text
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(SAMPLE_TEXT)}
            className="h-7 px-2 text-[0.75rem]"
          >
            <SparkleIcon size={13} weight="bold" />
            Sample
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange("")}
            disabled={value.length === 0}
            className="h-7 px-2 text-[0.75rem]"
          >
            <ArrowCounterClockwiseIcon size={13} weight="bold" />
            Clear
          </Button>
        </div>
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder="Paste or type text to count its tokens. Nothing you type is sent anywhere."
        className="w-full flex-1 resize-none bg-transparent px-4 py-3.5 font-readout text-[0.875rem] leading-[1.7] outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
