import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  refreshSpotifyToken,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";
import { fetchWithServerBackoff, type ServerRetryOptions } from "@/lib/server-retry";

export type SpotifyToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export type SpotifyServerTokenState = {
  accessToken?: string;
  refreshToken?: string;
  refreshedToken: SpotifyToken | null;
  refreshAttempted: boolean;
};

type ClientCredentialsCache = {
  accessToken: string;
  expiresAt: number;
};

let clientCredentialsCache: ClientCredentialsCache | null = null;
let clientCredentialsRequest: Promise<string> | null = null;
const refreshRequests = new Map<string, Promise<SpotifyToken | null>>();
const SPOTIFY_MIN_REQUEST_INTERVAL_MS = 150;
const SPOTIFY_CATALOG_CACHE_TTL_MS = 5 * 60_000;
const SPOTIFY_CATALOG_CACHE_LIMIT = 128;
let spotifyNextRequestAt = 0;
let spotifyCooldownUntil = 0;

type SpotifyResponseSnapshot = {
  status: number;
  headers: [string, string][];
  body: ArrayBuffer;
};

const spotifyCatalogCache = new Map<string, { expiresAt: number; response: SpotifyResponseSnapshot }>();
const spotifyCatalogRequests = new Map<string, Promise<SpotifyResponseSnapshot>>();

function retryAfterMs(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

async function waitForSpotifyRequestSlot() {
  const now = Date.now();
  const scheduledAt = Math.max(now, spotifyNextRequestAt, spotifyCooldownUntil);
  spotifyNextRequestAt = scheduledAt + SPOTIFY_MIN_REQUEST_INTERVAL_MS;
  if (scheduledAt > now) await new Promise((resolve) => setTimeout(resolve, scheduledAt - now));
}

function noteSpotifyResponse(response: Response) {
  if (response.status !== 429) return;
  const retryAfter = retryAfterMs(response.headers.get("retry-after"));
  if (retryAfter !== null) spotifyCooldownUntil = Math.max(spotifyCooldownUntil, Date.now() + retryAfter);
}

async function snapshotSpotifyResponse(response: Response): Promise<SpotifyResponseSnapshot> {
  return {
    status: response.status,
    headers: Array.from(response.headers.entries()),
    body: await response.arrayBuffer(),
  };
}

function responseFromSnapshot(snapshot: SpotifyResponseSnapshot) {
  return new Response(snapshot.body.slice(0), {
    status: snapshot.status,
    headers: Object.fromEntries(snapshot.headers),
  });
}

function cacheSpotifyCatalogResponse(key: string, response: SpotifyResponseSnapshot) {
  if (spotifyCatalogCache.size >= SPOTIFY_CATALOG_CACHE_LIMIT) {
    const oldestKey = spotifyCatalogCache.keys().next().value;
    if (oldestKey) spotifyCatalogCache.delete(oldestKey);
  }
  spotifyCatalogCache.set(key, {
    expiresAt: Date.now() + SPOTIFY_CATALOG_CACHE_TTL_MS,
    response,
  });
}

async function fetchSpotifyApi(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ServerRetryOptions,
) {
  return fetchWithServerBackoff(input, init, {
    ...options,
    beforeAttempt: async () => {
      await waitForSpotifyRequestSlot();
      await options.beforeAttempt?.();
    },
    onResponse: (response) => {
      noteSpotifyResponse(response);
      options.onResponse?.(response);
    },
  });
}

function refreshSpotifyTokenOnce(refreshToken: string) {
  const pending = refreshRequests.get(refreshToken);
  if (pending) return pending;
  const request = refreshSpotifyToken(refreshToken).finally(() => {
    refreshRequests.delete(refreshToken);
  });
  refreshRequests.set(refreshToken, request);
  return request;
}

export async function getSpotifyServerToken() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  let accessToken = cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value;
  let refreshedToken: SpotifyToken | null = null;
  if (!accessToken && refreshToken) {
    refreshedToken = await refreshSpotifyTokenOnce(refreshToken);
    accessToken = refreshedToken?.access_token;
  }
  return {
    accessToken,
    refreshToken,
    refreshedToken,
    refreshAttempted: Boolean(refreshedToken),
  } satisfies SpotifyServerTokenState;
}

export async function spotifyApiFetch(
  state: SpotifyServerTokenState,
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ServerRetryOptions = {},
) {
  const request = (accessToken: string | undefined) => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetchSpotifyApi(input, { ...init, headers }, options);
  };

  let response = await request(state.accessToken);
  if (response.status !== 401 || !state.refreshToken || state.refreshAttempted) return response;

  state.refreshAttempted = true;
  state.refreshedToken = await refreshSpotifyTokenOnce(state.refreshToken);
  state.accessToken = state.refreshedToken?.access_token;
  if (!state.accessToken) return response;

  await response.body?.cancel();
  response = await request(state.accessToken);
  return response;
}

async function requestClientCredentialsToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials are not configured.");

  const response = await fetchWithServerBackoff("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  }, { retryUnsafeMethods: true });
  if (!response.ok) throw new Error(`Spotify authentication failed with ${response.status}.`);

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Spotify did not return an access token.");
  clientCredentialsCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max((payload.expires_in ?? 3600) - 60, 60) * 1000,
  };
  return payload.access_token;
}

export async function spotifyCatalogFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ServerRetryOptions = {},
) {
  const cacheKey = new URL(input.toString()).toString();
  const cached = spotifyCatalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return responseFromSnapshot(cached.response);
  if (cached) spotifyCatalogCache.delete(cacheKey);

  const pending = spotifyCatalogRequests.get(cacheKey);
  if (pending) return responseFromSnapshot(await pending);

  const getToken = async () => {
    if (clientCredentialsCache && clientCredentialsCache.expiresAt > Date.now()) {
      return clientCredentialsCache.accessToken;
    }
    if (!clientCredentialsRequest) {
      clientCredentialsRequest = requestClientCredentialsToken().finally(() => {
        clientCredentialsRequest = null;
      });
    }
    return clientCredentialsRequest;
  };
  const request = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetchSpotifyApi(input, { ...init, headers }, options);
  };

  const requestPromise = (async () => {
    let response = await request(await getToken());
    if (response.status === 401) {
      clientCredentialsCache = null;
      await response.body?.cancel();
      response = await request(await getToken());
    }
    const snapshot = await snapshotSpotifyResponse(response);
    if (snapshot.status === 200) cacheSpotifyCatalogResponse(cacheKey, snapshot);
    return snapshot;
  })();
  spotifyCatalogRequests.set(cacheKey, requestPromise);
  try {
    return responseFromSnapshot(await requestPromise);
  } finally {
    if (spotifyCatalogRequests.get(cacheKey) === requestPromise) spotifyCatalogRequests.delete(cacheKey);
  }
}

export function persistSpotifyToken(response: NextResponse, token: SpotifyToken | null) {
  if (!token?.access_token) return response;

  response.cookies.set(
    SPOTIFY_ACCESS_COOKIE,
    token.access_token,
    spotifyCookieOptions(Math.max((token.expires_in ?? 3600) - 30, 60)),
  );
  if (token.refresh_token) {
    response.cookies.set(
      SPOTIFY_REFRESH_COOKIE,
      token.refresh_token,
      spotifyCookieOptions(60 * 60 * 24 * 30),
    );
  }
  return response;
}

export function clearSpotifyTokenCookies(response: NextResponse) {
  response.cookies.set(SPOTIFY_ACCESS_COOKIE, "", spotifyCookieOptions(0));
  response.cookies.set(SPOTIFY_REFRESH_COOKIE, "", spotifyCookieOptions(0));
  return response;
}

export function spotifyPrivateHeaders(retryAfter?: string | null) {
  return {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie",
    ...(retryAfter ? { "Retry-After": retryAfter } : {}),
  };
}
