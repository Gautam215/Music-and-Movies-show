import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  SPOTIFY_STATE_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

function redirectToSongs(request: Request, status: string) {
  const destination = new URL("/", new URL(request.url).origin);
  destination.searchParams.set("spotify", status);
  destination.hash = "songs";
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(SPOTIFY_STATE_COOKIE)?.value;

  if (oauthError || !code || !returnedState || returnedState !== savedState) {
    return redirectToSongs(request, "error");
  }

  try {
    const token = await exchangeSpotifyCode(
      code,
      getSpotifyRedirectUri(request),
    );
    if (!token?.access_token) return redirectToSongs(request, "error");

    const response = redirectToSongs(request, "connected");
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
    response.cookies.set(
      SPOTIFY_STATE_COOKIE,
      "",
      spotifyCookieOptions(0),
    );
    return response;
  } catch {
    return redirectToSongs(request, "error");
  }
}
