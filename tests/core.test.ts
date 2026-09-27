import assert from "node:assert/strict";
import test from "node:test";
import { isSameOrigin } from "../lib/request-security.ts";
import { consumeApiRateLimit, rateLimitHeaders } from "../lib/rate-limit.ts";
import { fetchWithServerBackoff } from "../lib/server-retry.ts";

test("same-origin checks reject foreign origins and allow same-origin requests", () => {
  assert.equal(
    isSameOrigin(
      new Request("https://reelroom.test/api/auth/signin", {
        headers: { origin: "https://reelroom.test" },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOrigin(
      new Request("https://reelroom.test/api/auth/signin", {
        headers: { origin: "https://attacker.test" },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOrigin(new Request("https://reelroom.test/api/auth/signin")),
    true,
  );
});

test("server backoff retries transient safe requests", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return attempts === 1
      ? new Response("busy", { status: 503, headers: { "retry-after": "0" } })
      : new Response("ok", { status: 200 });
  };

  try {
    const response = await fetchWithServerBackoff(
      "https://upstream.test/health",
      {},
      {
        baseDelayMs: 0,
        maxDelayMs: 0,
        maxRetries: 1,
        timeoutMs: 100,
      },
    );
    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("server backoff does not retry unsafe requests by default", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("busy", { status: 503 });
  };

  try {
    const response = await fetchWithServerBackoff(
      "https://upstream.test/write",
      { method: "POST" },
      {
        baseDelayMs: 0,
        maxDelayMs: 0,
        maxRetries: 3,
        timeoutMs: 100,
      },
    );
    assert.equal(response.status, 503);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fallback rate limiting returns reset and retry headers", async () => {
  const previousLimit = process.env.RATE_LIMIT_MAX_REQUESTS;
  const previousWindow = process.env.RATE_LIMIT_WINDOW_MS;
  process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  const request = () =>
    new Request("https://reelroom.test/api/health", {
      headers: { "x-forwarded-for": "unit-test-rate-limit" },
    });

  try {
    const first = await consumeApiRateLimit(request() as never);
    const second = await consumeApiRateLimit(request() as never);
    const third = await consumeApiRateLimit(request() as never);
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(third.status, 429);
    assert.ok(third.retryAfterSec);
    assert.equal(
      rateLimitHeaders(third)["Retry-After"],
      String(third.retryAfterSec),
    );
  } finally {
    if (previousLimit === undefined) delete process.env.RATE_LIMIT_MAX_REQUESTS;
    else process.env.RATE_LIMIT_MAX_REQUESTS = previousLimit;
    if (previousWindow === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
    else process.env.RATE_LIMIT_WINDOW_MS = previousWindow;
  }
});
