import { NextResponse } from "next/server";
import { refreshSpotifyToken } from "@/lib/spotify-auth";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

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
  const requestOrigin = new URL(request.url).origin;
  const requestOriginHeader = request.headers.get("origin");
  if (requestOriginHeader && requestOriginHeader !== requestOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    uri?: string;
    deviceId?: string;
  } | null;
  const uri = body?.uri?.trim();
  const deviceId = body?.deviceId?.trim();

  if (!uri?.startsWith("spotify:track:") || !deviceId) {
    return NextResponse.json(
      { error: "A Spotify track and device are required." },
      { status: 400, headers: spotifyPrivateHeaders() },
    );
  }

  let { accessToken, refreshToken, refreshedToken } = await getSpotifyServerToken();
  if (!accessToken) {
    const response = NextResponse.json(
      { error: "Spotify is not connected." },
      { status: 401, headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
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
    return persistSpotifyToken(
      NextResponse.json({ error }, { status, headers: spotifyPrivateHeaders() }),
      refreshedToken,
    );
  }

  return persistSpotifyToken(
    NextResponse.json({ playing: true }, { headers: spotifyPrivateHeaders() }),
    refreshedToken,
  );
}
