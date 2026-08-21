"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  CaretRightIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { textStats } from "@/lib/text-stats";
import {
  assetFor,
  formatBytes,
  getModel,
  supportsTokenIds,
  DEFAULT_MODEL_ID,
} from "@/lib/models";
import { useTokenizer, DEFAULT_STREAM_LIMIT } from "@/hooks/use-tokenizer";
import { cn } from "@/lib/utils";
import { AccuracyBadge } from "./accuracy-badge";
import { InputPanel } from "./input-panel";
import { ModelPicker } from "./model-picker";
import { StatRail } from "./stat-rail";
import { TokenStream } from "./token-stream";

/**
 * The client root. Owns the text, the model, and the two display toggles.
 *
 * `useDeferredValue` on the text keeps typing responsive: the textarea updates
 * at full priority while the derived readouts trail by a frame. The worker
 * debounce sits behind that again.
 */
export function Counter() {
  const [text, setText] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [streamOpen, setStreamOpen] = useState(true);
  const [idsRequested, setIdsRequested] = useState(false);
  /**
   * Which text and model the user asked to render in full. Stored as the key it
   * applies to rather than as a boolean, so a new paste re-arms the cap without
   * an effect resetting it after the fact.
   */
  const [renderAllFor, setRenderAllFor] = useState<string | null>(null);

  const deferredText = useDeferredValue(text);
  const model = getModel(modelId);
  const asset = assetFor(model);
  const idsAllowed = supportsTokenIds(model);

  // Token IDs are refused for the estimate tier. Derived rather than synced, so
  // switching to Claude cannot leave a frame where IDs are still on screen.
  const showIds = idsRequested && idsAllowed;

  const streamKey = `${modelId}:${deferredText.length}:${deferredText.slice(0, 64)}`;
  const streamLimit =
    renderAllFor === streamKey ? Number.MAX_SAFE_INTEGER : DEFAULT_STREAM_LIMIT;

  const { status, counts, stream, progress, error, supported } = useTokenizer({
    text: deferredText,
    modelId,
    wantStream: streamOpen,
    streamLimit,
  });

  const stats = useMemo(() => textStats(deferredText), [deferredText]);
  const hasText = deferredText.length > 0;
  const pending = status === "working" || status === "downloading" || text !== deferredText;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_minmax(17rem,1fr)]">
        {/* Rail first in the DOM below lg, because the count is why they came. */}
        <div className="order-2 min-w-0 lg:order-1">
          <InputPanel value={text} onChange={setText} />
        </div>

        <aside className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
          <ModelPicker value={modelId} onChange={setModelId} />

          {!supported ? (
            <UnsupportedNotice />
          ) : (
            <StatRail
              counts={counts}
              stats={stats}
              tier={model.tier}
              tokenizerName={model.tokenizerName}
              why={model.why}
              pending={pending}
              hasText={hasText}
            />
          )}

          {status === "downloading" && asset && (
            <DownloadNotice
              label={asset.label}
              total={asset.bytes}
              received={progress?.received ?? 0}
              cached={progress?.cached ?? false}
            />
          )}

          {error && (
            <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-destructive">
              <WarningCircleIcon size={16} weight="duotone" className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </aside>
      </div>

      <section className="min-w-0 rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setStreamOpen((open) => !open)}
            aria-expanded={streamOpen}
            className="label-unit inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretRightIcon
              size={11}
              weight="bold"
              className={cn("transition-transform", streamOpen && "rotate-90")}
            />
            Token stream
          </button>

          <div className="flex items-center gap-2.5">
            {/*
              Base UI puts `id` on a hidden input rather than on the switch, so
              `<label htmlFor>` would name an aria-hidden element and leave the
              switch itself unnamed. `aria-labelledby` names the real control,
              and `aria-describedby` gives a screen reader the reason it is off
              rather than only a greyed-out affordance.
            */}
            <Switch
              aria-labelledby="token-ids-label"
              aria-describedby={idsAllowed ? undefined : "token-ids-reason"}
              checked={showIds}
              onCheckedChange={setIdsRequested}
              disabled={!idsAllowed}
            />
            <span
              id="token-ids-label"
              className={cn(
                "label-unit",
                idsAllowed ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            >
              Token IDs
            </span>
          </div>
        </header>

        {!idsAllowed && (
          <p
            id="token-ids-reason"
            className="border-b border-border px-4 py-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground"
          >
            Token IDs are turned off for {model.name}. Anthropic has not published
            a tokenizer, so any IDs shown here would be another model&apos;s.
            Plausible wrong numbers are worse than none.
          </p>
        )}

        {streamOpen && (
          <div className="p-4">
            {!hasText ? (
              <p className="text-[0.875rem] text-muted-foreground">
                Token boundaries appear here once there is text to segment.
              </p>
            ) : stream ? (
              // Dimmed while a newer result is still coming, so chips are never
              // presented as settled when they are one keystroke behind.
              <div className={cn("transition-opacity duration-150", pending && "opacity-50")}>
                <TokenStream
                  stream={stream}
                  tier={model.tier}
                  showIds={showIds}
                  renderingAll={streamLimit > DEFAULT_STREAM_LIMIT}
                  onRenderAll={() => setRenderAllFor(streamKey)}
                />
              </div>
            ) : (
              <div className="h-24 animate-pulse rounded-md bg-muted/50" />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DownloadNotice({
  label,
  total,
  received,
  cached,
}: {
  label: string;
  total: number;
  received: number;
  cached: boolean;
}) {
  // A cache hit is near-instant, so showing it climbing from 0% would be a lie
  // about what is happening. It reads as already complete, because it is.
  const percent = cached
    ? 100
    : total > 0
      ? Math.min(100, Math.round((received / total) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/60 p-3">
      <p className="flex items-center gap-2 font-readout text-[0.75rem] text-muted-foreground">
        <DownloadSimpleIcon size={14} weight="bold" />
        {label}, {formatBytes(total)}
      </p>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Downloading ${label}`}
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="font-readout text-[0.6875rem] text-muted-foreground">
        {cached ? "Loading from cache" : `${percent}%, cached after this`}
      </p>
    </div>
  );
}

function UnsupportedNotice() {
  return (
    <p className="max-w-[46ch] text-[0.875rem] leading-relaxed text-muted-foreground">
      This browser does not support Web Workers, which is what keeps tokenizing a
      large paste from freezing the page. Counting is unavailable rather than
      slow and misleading.
    </p>
  );
}

/** Re-exported so the skeleton and the island stay in one import site. */
export { AccuracyBadge };
