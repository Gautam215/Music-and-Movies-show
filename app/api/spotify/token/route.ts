import { NextResponse } from "next/server";
import { refreshSpotifyToken } from "@/lib/spotify-auth";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const requestOriginHeader = request.headers.get("origin");
  if (requestOriginHeader && requestOriginHeader !== requestOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let { accessToken, refreshToken, refreshedToken } = await getSpotifyServerToken();

  if (accessToken) {
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (profileResponse.status === 401 && refreshToken) {
      refreshedToken = await refreshSpotifyToken(refreshToken);
      accessToken = refreshedToken?.access_token;
    }
  }

  if (!accessToken) {
    const response = NextResponse.json(
      { error: "Spotify is not connected." },
      { status: 401, headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  // Spotify's Web Playback SDK requires a short-lived access token in the browser.
  const response = NextResponse.json(
    { accessToken, expiresIn: refreshedToken?.expires_in ?? 3600 },
    { headers: spotifyPrivateHeaders() },
  );
  return persistSpotifyToken(response, refreshedToken);
}
