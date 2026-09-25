const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_MAX_DELAY_MS = 10_000;

export type FetchWithBackoffOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryUnsafeMethods?: boolean;
};

function retryAfterMs(value: string | null, maxDelayMs: number) {
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

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The request was aborted.", "AbortError"));
      return;
    }
    let timeout = 0;
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("The request was aborted.", "AbortError"));
    };
    timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithBackoffOptions = {},
) {
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = options.retryUnsafeMethods === true || ["GET", "HEAD", "OPTIONS"].includes(method);
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS);
  const signal = init.signal;

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (!canRetry || attempt >= maxRetries || signal?.aborted) throw error;
      await wait(exponentialDelay(attempt, baseDelayMs, maxDelayMs), signal);
      continue;
    }

    if (!canRetry || !RETRYABLE_STATUSES.has(response.status) || attempt >= maxRetries) return response;

    const delay = retryAfterMs(response.headers.get("retry-after"), maxDelayMs)
      ?? exponentialDelay(attempt, baseDelayMs, maxDelayMs);
    await wait(delay, signal);
  }
}
