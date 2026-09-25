import { NextResponse } from "next/server";
import {
  createSpotifyState,
  createSpotifyCodeChallenge,
  createSpotifyCodeVerifier,
  getSpotifyRedirectUri,
  SPOTIFY_CODE_VERIFIER_COOKIE,
  SPOTIFY_POPUP_COOKIE,
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

  const redirectUri = getSpotifyRedirectUri(request);
  if (new URL(request.url).origin !== new URL(redirectUri).origin) {
    return NextResponse.redirect(new URL("/api/spotify/login", redirectUri));
  }

  const state = createSpotifyState();
  const codeVerifier = createSpotifyCodeVerifier();
  const codeChallenge = createSpotifyCodeChallenge(codeVerifier);
  const popupMode = new URL(request.url).searchParams.get("mode") === "popup";
  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set(
    "scope",
    [
      "streaming",
      "user-modify-playback-state",
      "user-read-playback-state",
      "user-read-currently-playing",
      "user-read-private",
      "user-read-email",
      "user-top-read",
    ].join(" "),
  );

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    SPOTIFY_STATE_COOKIE,
    state,
    spotifyCookieOptions(10 * 60),
  );
  response.cookies.set(
    SPOTIFY_CODE_VERIFIER_COOKIE,
    codeVerifier,
    spotifyCookieOptions(10 * 60),
  );
  if (popupMode) {
    response.cookies.set(SPOTIFY_POPUP_COOKIE, "1", spotifyCookieOptions(10 * 60));
  }
  return response;
}
