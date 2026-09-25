import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_CODE_VERIFIER_COOKIE,
  SPOTIFY_POPUP_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  SPOTIFY_STATE_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

function songsDestination(request: Request, status: string) {
  const destination = new URL("/", new URL(request.url).origin);
  destination.searchParams.set("spotify", status);
  destination.hash = "songs";
  return destination;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(SPOTIFY_STATE_COOKIE, "", spotifyCookieOptions(0));
  response.cookies.set(SPOTIFY_CODE_VERIFIER_COOKIE, "", spotifyCookieOptions(0));
  response.cookies.set(SPOTIFY_POPUP_COOKIE, "", spotifyCookieOptions(0));
  return response;
}

function redirectToSongs(request: Request, status: string, popupMode: boolean) {
  const destination = songsDestination(request, status);
  if (!popupMode) return clearOAuthCookies(NextResponse.redirect(destination));

  const origin = new URL(request.url).origin;
  const message = JSON.stringify({ type: "reelroom-spotify-auth", status });
  const safeOrigin = JSON.stringify(origin);
  const safeDestination = JSON.stringify(destination.toString());
  const response = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Spotify connection</title></head><body><p>Returning to Reelscape...</p><script>const message=${message};if(window.opener&&!window.opener.closed){window.opener.postMessage(message,${safeOrigin});window.close();}else{window.location.replace(${safeDestination});}</script></body></html>`,
    { headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" } },
  );
  return clearOAuthCookies(response);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(SPOTIFY_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(SPOTIFY_CODE_VERIFIER_COOKIE)?.value;
  const popupMode = cookieStore.get(SPOTIFY_POPUP_COOKIE)?.value === "1";

  if (oauthError || !code || !returnedState || returnedState !== savedState || !codeVerifier) {
    return redirectToSongs(request, "error", popupMode);
  }

  try {
    const token = await exchangeSpotifyCode(
      code,
      getSpotifyRedirectUri(request),
      codeVerifier,
    );
    if (!token?.access_token) return redirectToSongs(request, "error", popupMode);

    const response = redirectToSongs(request, "connected", popupMode);
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
  } catch {
    return redirectToSongs(request, "error", popupMode);
  }
}
