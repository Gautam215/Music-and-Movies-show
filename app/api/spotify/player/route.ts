import { NextResponse } from "next/server";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyApiFetch,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

async function playTrack(uri: string, deviceId: string, tokenState: Awaited<ReturnType<typeof getSpotifyServerToken>>) {
  const url = new URL("https://api.spotify.com/v1/me/player/play");
  url.searchParams.set("device_id", deviceId);
  return spotifyApiFetch(tokenState, url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
    cache: "no-store",
  });
}

async function transferPlayback(deviceId: string, tokenState: Awaited<ReturnType<typeof getSpotifyServerToken>>) {
  return spotifyApiFetch(tokenState, "https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
    cache: "no-store",
  });
}

async function startTrack(uri: string, deviceId: string, tokenState: Awaited<ReturnType<typeof getSpotifyServerToken>>) {
  const playResponse = await playTrack(uri, deviceId, tokenState);
  if (playResponse.status !== 404) return playResponse;

  // A freshly-created Web Playback SDK device can briefly be unavailable to
  // the play endpoint. Transfer it only for that specific recovery case.
  const transferResponse = await transferPlayback(deviceId, tokenState);
  if (!transferResponse.ok) return transferResponse;
  return playTrack(uri, deviceId, tokenState);
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

  const tokenState = await getSpotifyServerToken();
  if (!tokenState.accessToken) {
    const response = NextResponse.json(
      { error: "Spotify is not connected." },
      { status: 401, headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  const spotifyResponse = await startTrack(uri, deviceId, tokenState);

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
    const response = NextResponse.json(
      { error },
      { status, headers: spotifyPrivateHeaders(spotifyResponse.headers.get("retry-after")) },
    );
    return status === 401
      ? clearSpotifyTokenCookies(response)
      : persistSpotifyToken(response, tokenState.refreshedToken);
  }

  return persistSpotifyToken(
    NextResponse.json({ playing: true }, { headers: spotifyPrivateHeaders() }),
    tokenState.refreshedToken,
  );
}
