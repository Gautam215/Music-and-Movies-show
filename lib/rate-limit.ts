import type { NextRequest } from "next/server";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 120;
const REDIS_TIMEOUT_MS = 1_500;

// INCR and PEXPIRE must happen in one Redis command to avoid split-brain counters.
const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if count == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
local limit = tonumber(ARGV[2])
local remaining = math.max(limit - count, 0)
if count > limit then
  return {0, 0, ttl}
end
return {1, remaining, ttl}
`;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSec?: number;
  status?: 429 | 503;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isEnabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function redisConfig() {
  return {
    url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_REST_URL)?.replace(/\/$/, ""),
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.REDIS_REST_TOKEN,
  };
}

function clientIdentifier(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return address.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 120) || "unknown";
}

function unavailableResult(limit: number, failClosed: boolean): RateLimitResult {
  return {
    allowed: !failClosed,
    limit,
    remaining: failClosed ? 0 : limit,
    resetMs: 1_000,
    retryAfterSec: failClosed ? 1 : undefined,
    status: failClosed ? 503 : undefined,
  };
}

export async function consumeApiRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const windowMs = positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const limit = positiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_LIMIT);
  const { url, token } = redisConfig();
  const failClosed = isEnabled(process.env.RATE_LIMIT_FAIL_CLOSED);

  if (!url || !token) return unavailableResult(limit, failClosed);

  const key = `${process.env.RATE_LIMIT_KEY_PREFIX ?? "reelroom:api"}:${clientIdentifier(request)}`;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["EVAL", RATE_LIMIT_SCRIPT, "1", key, String(windowMs), String(limit)],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Redis returned ${response.status}`);

    const payload = (await response.json()) as
      | Array<{ result?: unknown; error?: string }>
      | { result?: unknown; error?: string };
    const command = Array.isArray(payload) ? payload[0] : payload;
    const result = command?.result;
    if (command?.error || !Array.isArray(result)) throw new Error("Invalid Redis result");

    const [allowed, remaining, resetMs] = result.map(Number);
    if (![allowed, remaining, resetMs].every(Number.isFinite)) throw new Error("Invalid rate-limit values");

    const retryAfterSec = Math.max(1, Math.ceil(resetMs / 1000));
    return {
      allowed: allowed === 1,
      limit,
      remaining: Math.max(0, Math.floor(remaining)),
      resetMs: Math.max(1, Math.floor(resetMs)),
      retryAfterSec: allowed === 1 ? undefined : retryAfterSec,
      status: allowed === 1 ? undefined : 429,
    };
  } catch (error) {
    console.warn("[rate-limit] Redis unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return unavailableResult(limit, failClosed);
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetMs) / 1000)),
  };
  if (result.retryAfterSec !== undefined) headers["Retry-After"] = String(result.retryAfterSec);
  return headers;
}
