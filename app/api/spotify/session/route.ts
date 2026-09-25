import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  refreshSpotifyToken,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

type SpotifyProfile = {
  display_name?: string;
  product?: string;
};

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  let refreshedToken: { access_token?: string; refresh_token?: string; expires_in?: number } | null = null;

  if (!accessToken && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
  }

  if (!accessToken) {
    const response = NextResponse.json(
      { connected: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    if (refreshToken) {
      response.cookies.set(SPOTIFY_REFRESH_COOKIE, "", spotifyCookieOptions(0));
    }
    return response;
  }

  let profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (profileResponse.status === 401 && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
    if (accessToken) {
      profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    }
  }

  if (!profileResponse.ok) {
    const response = NextResponse.json(
      { connected: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    if (profileResponse.status === 401) {
      response.cookies.set(SPOTIFY_ACCESS_COOKIE, "", spotifyCookieOptions(0));
      response.cookies.set(SPOTIFY_REFRESH_COOKIE, "", spotifyCookieOptions(0));
    }
    return response;
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;
  const response = NextResponse.json({
    connected: true,
    displayName: profile.display_name ?? "Spotify listener",
    product: profile.product ?? null,
  }, { headers: { "Cache-Control": "private, no-store" } });

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
