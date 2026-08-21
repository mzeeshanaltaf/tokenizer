type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<Result<T>> {
  const { attempts, baseDelayMs, maxDelayMs = 10_000, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const value = await fn();
      return ok(value);
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === attempts - 1) break;

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.random() * delay * 0.2;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  return err(lastError instanceof Error ? lastError : new Error(String(lastError)));
}

export type { Result, RetryOptions };
export { ok, err, withRetry };
