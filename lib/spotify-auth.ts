import { createHash, randomBytes } from "node:crypto";

export const SPOTIFY_STATE_COOKIE = "spotify_oauth_state";
export const SPOTIFY_POPUP_COOKIE = "spotify_oauth_popup";
export const SPOTIFY_CODE_VERIFIER_COOKIE = "spotify_code_verifier";
export const SPOTIFY_ACCESS_COOKIE = "spotify_access_token";
export const SPOTIFY_REFRESH_COOKIE = "spotify_refresh_token";

export function spotifyCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export function getSpotifyRedirectUri(request: Request) {
  const configuredUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (configuredUri) return configuredUri;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  return new URL("/api/spotify/callback", appUrl).toString();
}

export function createSpotifyState() {
  return randomBytes(32).toString("hex");
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createSpotifyCodeVerifier() {
  return base64Url(randomBytes(64));
}

export function createSpotifyCodeChallenge(codeVerifier: string) {
  return base64Url(createHash("sha256").update(codeVerifier).digest());
}

export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export async function refreshSpotifyToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}
