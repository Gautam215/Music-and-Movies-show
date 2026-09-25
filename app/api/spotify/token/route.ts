import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  refreshSpotifyToken,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  let refreshedToken: { access_token?: string; refresh_token?: string; expires_in?: number } | null = null;

  if (accessToken) {
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (profileResponse.status === 401) accessToken = undefined;
  }

  if (!accessToken && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Spotify is not connected." }, { status: 401 });
  }

  const response = NextResponse.json(
    { accessToken, expiresIn: refreshedToken?.expires_in ?? 3600 },
    { headers: { "Cache-Control": "private, no-store" } },
  );

  if (refreshedToken?.access_token) {
    response.cookies.set(
      SPOTIFY_ACCESS_COOKIE,
      refreshedToken.access_token,
      spotifyCookieOptions(Math.max(refreshedToken.expires_in ?? 3600, 60)),
    );
    if (refreshedToken.refresh_token) {
      response.cookies.set(
        SPOTIFY_REFRESH_COOKIE,
        refreshedToken.refresh_token,
        spotifyCookieOptions(60 * 60 * 24 * 30),
      );
    }
  }

  return response;
}
