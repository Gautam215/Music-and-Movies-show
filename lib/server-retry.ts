const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type ServerRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryUnsafeMethods?: boolean;
  beforeAttempt?: () => Promise<void>;
  onResponse?: (response: Response) => void;
};

function parseRetryAfter(value: string | null, maxDelayMs: number) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(0, seconds * 1000), maxDelayMs);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.min(Math.max(0, timestamp - Date.now()), maxDelayMs)
    : null;
}

function exponentialDelay(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.round(Math.random() * ceiling);
}

function createAttemptSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parent?.reason);
  const timeout = setTimeout(
    () => controller.abort(new DOMException("The request timed out.", "TimeoutError")),
    timeoutMs,
  );

  if (parent) {
    if (parent.aborted) onParentAbort();
    else parent.addEventListener("abort", onParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("The request was aborted.", "AbortError"));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason ?? new DOMException("The request was aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchWithServerBackoff(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ServerRetryOptions = {},
) {
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = options.retryUnsafeMethods === true || ["GET", "HEAD", "OPTIONS"].includes(method);
  const maxRetries = Math.max(0, options.maxRetries ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 400);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 30_000);
  const timeoutMs = Math.max(1, options.timeoutMs ?? 10_000);

  for (let attempt = 0; ; attempt += 1) {
    await options.beforeAttempt?.();
    const attemptSignal = createAttemptSignal(init.signal ?? undefined, timeoutMs);
    let response: Response;
    try {
      response = await fetch(input, { ...init, signal: attemptSignal.signal });
    } catch (error) {
      attemptSignal.cleanup();
      if (!canRetry || attempt >= maxRetries || init.signal?.aborted) throw error;
      await wait(exponentialDelay(attempt, baseDelayMs, maxDelayMs), init.signal ?? undefined);
      continue;
    }
    attemptSignal.cleanup();
    options.onResponse?.(response);

    if (!canRetry || !RETRYABLE_STATUSES.has(response.status) || attempt >= maxRetries) {
      return response;
    }

    await response.body?.cancel();
    const delay = parseRetryAfter(response.headers.get("retry-after"), maxDelayMs)
      ?? exponentialDelay(attempt, baseDelayMs, maxDelayMs);
    await wait(delay, init.signal ?? undefined);
  }
}
