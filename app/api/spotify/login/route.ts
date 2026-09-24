import { NextResponse } from "next/server";
import {
  createSpotifyState,
  getSpotifyRedirectUri,
  SPOTIFY_STATE_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Spotify credentials are not configured." },
      { status: 500 },
    );
  }

  const state = createSpotifyState();
  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", getSpotifyRedirectUri(request));
  authorizeUrl.searchParams.set(
    "scope",
    "user-read-private user-read-email user-top-read",
  );

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    SPOTIFY_STATE_COOKIE,
    state,
    spotifyCookieOptions(10 * 60),
  );
  return response;
}
