import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  refreshSpotifyToken,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

export type SpotifyToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function getSpotifyServerToken() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  let accessToken = cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value;
  let refreshedToken: SpotifyToken | null = null;

  if (!accessToken && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
  }

  return { accessToken, refreshToken, refreshedToken };
}

export function persistSpotifyToken(response: NextResponse, token: SpotifyToken | null) {
  if (!token?.access_token) return response;

  response.cookies.set(
    SPOTIFY_ACCESS_COOKIE,
    token.access_token,
    spotifyCookieOptions(Math.max(token.expires_in ?? 3600, 60)),
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

export function spotifyPrivateHeaders() {
  return {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie",
  };
}
