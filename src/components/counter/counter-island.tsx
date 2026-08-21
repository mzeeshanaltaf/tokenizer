"use client";

import dynamic from "next/dynamic";

/**
 * Client-only. The counter creates a Web Worker and reads `caches` during
 * mount, neither of which exists on the server, so it is never rendered there.
 * The page around it stays a Server Component and keeps the explainer content
 * in the static HTML for crawlers.
 */
export const CounterIsland = dynamic(
  () => import("./counter").then((m) => ({ default: m.Counter })),
  { ssr: false, loading: () => <CounterSkeleton /> },
);

/** Matches the real layout closely enough that nothing jumps on hydrate. */
function CounterSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_minmax(17rem,1fr)]">
        <div className="order-2 h-[26rem] animate-pulse rounded-lg border border-border bg-card lg:order-1" />
        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <div className="h-14 animate-pulse rounded-md bg-muted/50" />
          <div className="h-56 animate-pulse rounded-md bg-muted/50" />
        </div>
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  );
}
