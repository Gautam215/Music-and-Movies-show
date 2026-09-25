import { randomBytes } from "node:crypto";

export const SPOTIFY_STATE_COOKIE = "spotify_oauth_state";
export const SPOTIFY_POPUP_COOKIE = "spotify_oauth_popup";
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

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
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
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
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
