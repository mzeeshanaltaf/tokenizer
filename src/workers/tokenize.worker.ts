/// <reference lib="webworker" />

import { getModel } from "@/lib/models";
import { prepare, streamFor, type LoadProgress } from "@/lib/tokenizers";
import type { CountResult, StreamResult } from "@/lib/tokenizers/types";

/**
 * The tokenize worker.
 *
 * All tokenizer code is imported here and only here, which is what keeps a
 * 2 MB vocabulary out of the page bundle and a 100k-character paste off the
 * main thread.
 *
 * Two-phase by design: counts come back first because they are cheap, then the
 * token stream, and only when the caller says the stream is actually visible.
 * On a large paste the stat rail updates while the chip list is still building.
 */

export interface TokenizeRequest {
  type: "tokenize";
  /** Monotonic id. Results carrying a superseded job id are dropped. */
  job: number;
  modelId: string;
  text: string;
  /** Skip phase two entirely when the token stream is collapsed. */
  wantStream: boolean;
  /** Chip cap for phase two. The UI offers an explicit escape hatch. */
  streamLimit: number;
}

export type WorkerRequest = TokenizeRequest;

export type WorkerResponse =
  | { type: "progress"; job: number; modelId: string; progress: LoadProgress }
  | { type: "counts"; job: number; modelId: string; result: CountResult }
  | { type: "stream"; job: number; modelId: string; result: StreamResult }
  | { type: "error"; job: number; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

/** Highest job id seen. Anything older is stale and must not be posted. */
let latestJob = 0;

function post(message: WorkerResponse) {
  if (message.job < latestJob) return;
  scope.postMessage(message);
}

scope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== "tokenize") return;

  latestJob = Math.max(latestJob, request.job);
  void run(request);
});

async function run(request: TokenizeRequest) {
  const { job, modelId, text, wantStream, streamLimit } = request;
  const model = getModel(modelId);

  try {
    const prepared = await prepare(model, (progress) => {
      post({ type: "progress", job, modelId, progress });
    });
    if (job < latestJob) return;

    post({ type: "counts", job, modelId, result: prepared.count(text) });

    if (!wantStream || text.length === 0) return;
    // Yield once so the counts message is delivered before the expensive pass.
    await Promise.resolve();
    if (job < latestJob) return;

    post({
      type: "stream",
      job,
      modelId,
      result: streamFor(prepared, text, { limit: streamLimit }),
    });
  } catch (error) {
    post({
      type: "error",
      job,
      message: error instanceof Error ? error.message : "Tokenizing failed.",
    });
  }
}
