"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assetFor, getModel } from "@/lib/models";
import type { CountResult, StreamResult } from "@/lib/tokenizers/types";
import type { LoadProgress } from "@/lib/tokenizers/hf";
import type { WorkerRequest, WorkerResponse } from "@/workers/tokenize.worker";

/**
 * Owns the worker: debounce in, cancellation out.
 *
 * Three rules make this feel instant on a 100k-character paste:
 *
 *  1. Nothing tokenizes on the main thread. The worker is created once and
 *     reused, so a model switch never pays worker startup again.
 *  2. Every job carries a monotonic id. A result whose id is behind the current
 *     one is dropped rather than painted, so a fast typist never sees a count
 *     from three keystrokes ago flash on screen.
 *  3. The expensive phase is opt-in. When the token stream is collapsed the
 *     worker is told not to build it at all.
 */

/** Chip cap before the stream offers an explicit "render all". */
export const DEFAULT_STREAM_LIMIT = 4000;

/**
 * Counts are debounced briefly so they feel live.
 *
 * The token stream waits considerably longer, because rebuilding several
 * thousand chip nodes is the one genuinely expensive thing left on the main
 * thread: measured at ~128 ms per keystroke on a 43k-character document,
 * against ~13 ms for the same keystroke with the stream collapsed. Nobody reads
 * chips while they are still typing, so the stream is rebuilt on a pause.
 */
const COUNT_DEBOUNCE_MS = 120;
const STREAM_DEBOUNCE_MS = 400;

export type TokenizerStatus = "idle" | "working" | "downloading" | "ready" | "error";

export interface TokenizerState {
  status: TokenizerStatus;
  counts: CountResult | null;
  stream: StreamResult | null;
  progress: LoadProgress | null;
  error: string | null;
  /** True once this model's tokenizer is in memory and needs no download. */
  loaded: boolean;
  /**
   * The model that produced `counts` and `stream`. A readout must never be
   * shown beside a tier that did not produce it, so anything whose origin does
   * not match the currently selected model is withheld rather than displayed.
   */
  resultFor: string | null;
}

const INITIAL: TokenizerState = {
  status: "idle",
  counts: null,
  stream: null,
  progress: null,
  error: null,
  loaded: false,
  resultFor: null,
};

/**
 * What empty input looks like. Derived at render time rather than pushed into
 * state, so clearing the textarea cannot leave a stale count behind and no
 * effect has to synchronise it back.
 */
const EMPTY: Omit<TokenizerState, "loaded" | "resultFor"> = {
  status: "ready",
  counts: { count: 0 },
  stream: { chunks: [], complete: true, verified: true },
  progress: null,
  error: null,
};

export interface UseTokenizerOptions {
  text: string;
  modelId: string;
  /** False when the token stream is collapsed, so phase two is skipped. */
  wantStream: boolean;
  streamLimit?: number;
}

export function useTokenizer({
  text,
  modelId,
  wantStream,
  streamLimit = DEFAULT_STREAM_LIMIT,
}: UseTokenizerOptions): TokenizerState & { supported: boolean } {
  const [state, setState] = useState<TokenizerState>(INITIAL);
  // Lazily initialised, never synchronised: this component tree is client-only
  // (`ssr: false`), so the initialiser runs in the browser where `Worker` is
  // either there or is not, and the answer cannot change afterwards.
  const [supported] = useState(() => typeof Worker !== "undefined");

  const workerRef = useRef<Worker | null>(null);
  const jobRef = useRef(0);
  /** Assets already downloaded this session, so we do not re-show progress. */
  const readyAssetsRef = useRef(new Set<string>());
  /** Asset the in-flight job needs, marked ready only once it actually lands. */
  const pendingAssetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supported) return;

    const worker = new Worker(new URL("../workers/tokenize.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      // Stale results are dropped here as well as in the worker, because a job
      // can be superseded while its message is already in flight.
      if (message.job !== jobRef.current) return;

      switch (message.type) {
        case "progress":
          setState((previous) => ({
            ...previous,
            status: "downloading",
            progress: message.progress,
            error: null,
          }));
          break;

        case "counts":
          // Marked ready here rather than at send time: a download that failed
          // must still show its progress state on the next attempt.
          if (pendingAssetRef.current) {
            readyAssetsRef.current.add(pendingAssetRef.current);
            pendingAssetRef.current = null;
          }
          setState((previous) => ({
            ...previous,
            status: "ready",
            counts: message.result,
            progress: null,
            error: null,
            loaded: true,
            resultFor: message.modelId,
          }));
          break;

        case "stream":
          setState((previous) => ({
            ...previous,
            stream: message.result,
            resultFor: message.modelId,
          }));
          break;

        case "error":
          setState((previous) => ({
            ...previous,
            status: "error",
            progress: null,
            error: message.message,
          }));
          break;
      }
    };

    worker.addEventListener("message", onMessage);
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [supported]);

  const send = useCallback((request: WorkerRequest) => {
    workerRef.current?.postMessage(request);
  }, []);

  useEffect(() => {
    if (!supported) return;

    const model = getModel(modelId);
    const asset = assetFor(model);

    // Empty input needs no job at all. Bumping the counter drops anything still
    // in flight from the text that was just cleared.
    if (text.length === 0) {
      jobRef.current += 1;
      return;
    }

    const job = jobRef.current + 1;
    jobRef.current = job;

    // A model whose tokenizer still has to be fetched should say "downloading"
    // immediately, not after the first progress event arrives.
    const needsDownload = asset !== null && !readyAssetsRef.current.has(asset.id);
    // The stream is deliberately left in place here. Clearing it would remount
    // several thousand chip nodes on every keystroke, which is the single most
    // expensive thing this page can do. Chips from a *different model* are
    // still withheld, by the `resultFor` check below.
    setState((previous) => ({
      ...previous,
      status: needsDownload ? "downloading" : "working",
      error: null,
    }));

    pendingAssetRef.current = asset?.id ?? null;

    const countTimer = setTimeout(() => {
      send({ type: "tokenize", job, modelId, text, wantStream: false, streamLimit });
    }, COUNT_DEBOUNCE_MS);

    // A second, later job carries the stream. It supersedes the first by job id,
    // so a chip list can never outlive the count it belongs to.
    const streamTimer = wantStream
      ? setTimeout(() => {
          const streamJob = jobRef.current + 1;
          jobRef.current = streamJob;
          send({
            type: "tokenize",
            job: streamJob,
            modelId,
            text,
            wantStream: true,
            streamLimit,
          });
        }, STREAM_DEBOUNCE_MS)
      : undefined;

    return () => {
      clearTimeout(countTimer);
      if (streamTimer !== undefined) clearTimeout(streamTimer);
    };
  }, [text, modelId, wantStream, streamLimit, supported, send]);

  if (text.length === 0) {
    return { ...EMPTY, loaded: state.loaded, resultFor: modelId, supported };
  }

  // Results from the previously selected model are withheld rather than shown
  // under the new model's accuracy badge.
  const matches = state.resultFor === modelId;
  return {
    ...state,
    counts: matches ? state.counts : null,
    stream: matches ? state.stream : null,
    supported,
  };
}
