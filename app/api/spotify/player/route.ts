import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  refreshSpotifyToken,
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
  spotifyCookieOptions,
} from "@/lib/spotify-auth";

async function playTrack(accessToken: string, uri: string, deviceId: string) {
  const url = new URL("https://api.spotify.com/v1/me/player/play");
  url.searchParams.set("device_id", deviceId);
  return fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [uri] }),
    cache: "no-store",
  });
}

async function transferPlayback(accessToken: string, deviceId: string) {
  return fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
    cache: "no-store",
  });
}

async function startTrack(accessToken: string, uri: string, deviceId: string) {
  const transferResponse = await transferPlayback(accessToken, deviceId);
  if (!transferResponse.ok) return transferResponse;
  return playTrack(accessToken, uri, deviceId);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    uri?: string;
    deviceId?: string;
  } | null;
  const uri = body?.uri?.trim();
  const deviceId = body?.deviceId?.trim();

  if (!uri?.startsWith("spotify:track:") || !deviceId) {
    return NextResponse.json({ error: "A Spotify track and device are required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  let refreshedToken: { access_token?: string; refresh_token?: string; expires_in?: number } | null = null;

  if (!accessToken && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
  }
  if (!accessToken) {
    return NextResponse.json({ error: "Spotify is not connected." }, { status: 401 });
  }

  let spotifyResponse = await startTrack(accessToken, uri, deviceId);
  if (spotifyResponse.status === 401 && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
    if (accessToken) spotifyResponse = await startTrack(accessToken, uri, deviceId);
  }

  if (!spotifyResponse.ok) {
    const error = spotifyResponse.status === 403
      ? "Spotify playback requires an active Premium subscription."
      : spotifyResponse.status === 404
        ? "Spotify could not activate the Web Player device. Keep this tab open and try again."
        : spotifyResponse.status === 401
          ? "Spotify session expired. Connect Spotify again."
          : "Spotify could not start this track.";
    const status = spotifyResponse.status === 401 || spotifyResponse.status === 403
      ? spotifyResponse.status
      : 502;
    return NextResponse.json({ error }, { status });
  }

  const response = NextResponse.json({ playing: true });
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
