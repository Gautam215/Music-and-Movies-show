import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import test from "node:test";
import process from "node:process";

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const devPort = 3101;
const devBaseUrl = `http://localhost:${devPort}`;
const projectRoot = new URL("..", import.meta.url);

async function startServer() {
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
        ENABLE_PREMIUM_TEST_FIXTURE: "true",
      },
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

async function startDevServer() {
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "localhost",
      "-p",
      String(devPort),
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "development",
        ENABLE_PREMIUM_TEST_FIXTURE: "true",
        MONGODB_URI: "",
        MONGODB_DB_NAME: "reelroom_fixture_test",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const output = [];
  server.stdout.on("data", (chunk) => output.push(String(chunk)));
  server.stderr.on("data", (chunk) => output.push(String(chunk)));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next dev exited before ready:\n${output.join("")}`);
    }
    try {
      const response = await fetch(`${devBaseUrl}/api/auth/session`);
      if (response.status === 200) return server;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Next dev:\n${output.join("")}`);
}

async function devRequest(path, init) {
  const response = await fetch(`${devBaseUrl}${path}`, init);
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

    const disabledPremiumFixture = await request("/api/dev/premium-fixture", {
      method: "POST",
    });
    assert.equal(disabledPremiumFixture.response.status, 404);

    const invalidTrailer = await request(
      "/api/movies/trailer?tmdbId=not-a-number&mediaType=movie",
    );
    assert.equal(invalidTrailer.response.status, 400);

    const anonymousSeatMap = await request(
      "/api/tickets/seat-map?movieId=movie-1&day=today&showtime=1:40%20PM",
    );
    assert.equal(anonymousSeatMap.response.status, 401);

    const anonymousTicketConfirmation = await request("/api/tickets/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        movieId: "movie-1",
        day: "today",
        showtime: "1:40 PM",
        seatLabels: ["C4"],
      }),
    });
    assert.equal(anonymousTicketConfirmation.response.status, 401);

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

    const anonymousSignalList = await request(
      "/api/user-signals?type=favorite",
    );
    assert.equal(anonymousSignalList.response.status, 401);

    const anonymousSignalDelete = await request("/api/user-signals", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "favorite", key: "movie:m1" }),
    });
    assert.equal(anonymousSignalDelete.response.status, 401);

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

test("development Premium fixture is isolated and non-persistent", async () => {
  const server = await startDevServer();
  try {
    const foreignOrigin = await devRequest("/api/dev/premium-fixture", {
      method: "POST",
      headers: { origin: "https://attacker.test" },
    });
    assert.equal(foreignOrigin.response.status, 403);

    const activated = await devRequest("/api/dev/premium-fixture", {
      method: "POST",
      headers: { origin: devBaseUrl },
    });
    assert.equal(activated.response.status, 200);
    assert.equal(activated.body.user.isPremium, false);
    assert.equal(activated.body.user.canAccess3DTheater, true);
    const setCookie =
      activated.response.headers.getSetCookie?.()[0] ??
      activated.response.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/);
    const cookie = setCookie.split(";")[0];
    const sameOriginHeaders = { origin: devBaseUrl, cookie };

    const session = await devRequest("/api/auth/session", {
      headers: sameOriginHeaders,
    });
    assert.equal(session.body.user.email, "premium-3d-qa@example.test");
    assert.equal(session.body.user.isPremium, false);
    assert.equal(session.body.user.canAccess3DTheater, true);

    const page = await fetch(`${devBaseUrl}/`, { headers: { cookie } });
    assert.equal(page.status, 200);

    const seatMap = await devRequest(
      "/api/tickets/seat-map?movieId=movie-1&day=today&showtime=1%3A40%20PM",
      { headers: sameOriginHeaders },
    );
    assert.equal(seatMap.response.status, 200);
    assert.equal(seatMap.body.seats.length, 40);
    assert.equal(seatMap.body.live, false);

    const savedActivity = await devRequest("/api/user-signals?type=favorite", {
      headers: sameOriginHeaders,
    });
    assert.deepEqual(savedActivity.body.signals, []);

    const favoriteWrite = await devRequest("/api/user-signals", {
      method: "POST",
      headers: {
        ...sameOriginHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "favorite", title: "Fixture test" }),
    });
    assert.equal(favoriteWrite.response.status, 403);

    const viewingHistoryWrite = await devRequest("/api/viewing-history", {
      method: "POST",
      headers: {
        ...sameOriginHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tmdbId: 1,
        mediaType: "movie",
        title: "Fixture test",
      }),
    });
    assert.equal(viewingHistoryWrite.response.status, 403);

    const bookingWrite = await devRequest("/api/tickets/confirm", {
      method: "POST",
      headers: {
        ...sameOriginHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        movieId: "movie-1",
        day: "today",
        showtime: "1:40 PM",
        seatLabels: ["C4"],
      }),
    });
    assert.equal(bookingWrite.response.status, 403);

    const deactivated = await devRequest("/api/dev/premium-fixture", {
      method: "DELETE",
      headers: sameOriginHeaders,
    });
    assert.equal(deactivated.response.status, 200);
    assert.match(
      deactivated.response.headers.get("set-cookie") ?? "",
      /Max-Age=0/,
    );
    const anonymousSession = await devRequest("/api/auth/session");
    assert.equal(anonymousSession.body.user, null);
  } finally {
    server.kill("SIGTERM");
    await once(server, "close").catch(() => undefined);
  }
});
