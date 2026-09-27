import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import test from "node:test";
import process from "node:process";

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const projectRoot = new URL("..", import.meta.url);

async function startServer() {
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const output = [];
  server.stdout.on("data", (chunk) => output.push(String(chunk)));
  server.stderr.on("data", (chunk) => output.push(String(chunk)));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next.js exited before becoming ready:\n${output.join("")}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`);
      if (response.status === 200) return server;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Next.js:\n${output.join("")}`);
}

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

test("public pages and API boundaries communicate reliably", async () => {
  const server = await startServer();
  try {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Reelscape/);

    const session = await request("/api/auth/session");
    assert.equal(session.response.status, 200);
    assert.equal(session.body.user, null);
    assert.ok(session.response.headers.get("x-ratelimit-remaining"));

    const notifications = await request("/api/notifications");
    assert.equal(notifications.response.status, 200);
    assert.equal(notifications.body.personalized, false);

    const spotifySession = await request("/api/spotify/session");
    assert.equal(spotifySession.response.status, 200);
    assert.equal(spotifySession.body.connected, false);

    const spotifyToken = await request("/api/spotify/token");
    assert.equal(spotifyToken.response.status, 401);

    const playlist = await request("/api/spotify/playlist");
    assert.equal(playlist.response.status, 401);

    const tracks = await request("/api/spotify/tracks");
    assert.equal(tracks.response.status, 500);

    const invalidRegistration = await request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });
    assert.equal(invalidRegistration.response.status, 400);

    const anonymousSignal = await request("/api/user-signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "favorite", title: "Test" }),
    });
    assert.equal(anonymousSignal.response.status, 401);

    const invalidPlayer = await request("/api/spotify/player", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(invalidPlayer.response.status, 400);

    const foreignOrigin = await request("/api/auth/register", {
      method: "POST",
      headers: {
        origin: "https://attacker.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    });
    assert.equal(foreignOrigin.response.status, 403);
  } finally {
    server.kill("SIGTERM");
    await once(server, "close").catch(() => undefined);
  }
});
