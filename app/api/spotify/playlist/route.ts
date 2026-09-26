import { NextResponse } from "next/server";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyApiFetch,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images?: Array<{ url: string }>;
  };
};

type SpotifyPlaylist = {
  id: string;
  name: string;
};

type SpotifyPlaylistItem = {
  item?: SpotifyTrack | null;
  track?: SpotifyTrack | null;
};

type SpotifyFetchResult = {
  response: Response | null;
  error: "timeout" | "network" | null;
};

const SPOTIFY_REQUEST_TIMEOUT_MS = 10_000;

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function setRefreshedCookies(
  response: NextResponse,
  token: { access_token?: string; refresh_token?: string; expires_in?: number } | null,
) {
  return persistSpotifyToken(response, token);
}

export async function GET(request: Request) {
  const playlistName = new URL(request.url).searchParams.get("name")?.trim() || "Hehe";
  const tokenState = await getSpotifyServerToken();
  if (!tokenState.accessToken) {
    const response = NextResponse.json(
      { error: "Spotify is not connected." },
      { status: 401, headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  const spotifyFetch = async (url: URL | string): Promise<SpotifyFetchResult> => {
    const path = new URL(url).pathname;
    try {
      const response = await spotifyApiFetch(tokenState, url, {
        cache: "no-store",
      }, { timeoutMs: SPOTIFY_REQUEST_TIMEOUT_MS });
      if (!response.ok) {
        console.warn("[spotify/playlist] upstream response", { path, status: response.status });
      }
      return { response, error: null };
    } catch (error) {
      const timeout = error instanceof Error && error.name === "TimeoutError";
      console.error("[spotify/playlist] upstream request failed", {
        path,
        error: timeout ? "timeout" : "network",
      });
      return { response: null, error: timeout ? "timeout" : "network" };
    }
  };

  let playlistsResponse: Response | null = null;
  let playlistsError: SpotifyFetchResult["error"] = null;
  let playlistsPayload: { items?: SpotifyPlaylist[]; next?: string | null } = {};
  let playlist: SpotifyPlaylist | undefined;
  let nextPlaylistsUrl: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

  for (let page = 0; page < 10 && nextPlaylistsUrl && !playlist; page += 1) {
    const result = await spotifyFetch(nextPlaylistsUrl);
    playlistsResponse = result.response;
    playlistsError = result.error;
    if (playlistsError || !playlistsResponse) break;
    if (!playlistsResponse.ok) break;
    playlistsPayload = (await playlistsResponse.json()) as typeof playlistsPayload;
    playlist = (playlistsPayload.items ?? []).find(
      (item) => item.name.trim().toLowerCase() === playlistName.toLowerCase(),
    );
    nextPlaylistsUrl = playlistsPayload.next ?? null;
  }

  if (playlistsError || !playlistsResponse?.ok) {
    const upstreamStatus = playlistsResponse?.status;
    const status = playlistsError === "timeout"
      ? 504
      : playlistsError
        ? 502
        : upstreamStatus === 401
          ? 401
          : upstreamStatus === 403
            ? 403
            : upstreamStatus === 429
              ? 429
              : 502;
    const message = playlistsError === "timeout"
      ? "Spotify took too long to respond. Please try again."
      : playlistsError
        ? "Spotify could not be reached. Please try again."
        : upstreamStatus === 401
          ? "Spotify session expired. Reconnect Spotify to continue."
          : upstreamStatus === 403
            ? "Spotify playlist access needs approval. Reconnect Spotify to continue."
            : "Spotify playlists could not be loaded.";
    const response = NextResponse.json(
      { error: message, needsReauth: status === 401 || status === 403 },
      { status, headers: spotifyPrivateHeaders(playlistsResponse?.headers.get("retry-after")) },
    );
    return status === 401
      ? clearSpotifyTokenCookies(response)
      : setRefreshedCookies(response, tokenState.refreshedToken);
  }

  if (!playlist) {
    return setRefreshedCookies(
      NextResponse.json(
        {
          error: `Spotify playlist “${playlistName}” was not found in the visible playlists. If it is private, reconnect Spotify to grant playlist access.`,
          needsReauth: true,
        },
        { status: 404, headers: spotifyPrivateHeaders() },
      ),
      tokenState.refreshedToken,
    );
  }

  const itemsUrl = new URL(`https://api.spotify.com/v1/playlists/${playlist.id}/items`);
  itemsUrl.searchParams.set("limit", "50");
  const itemsResult = await spotifyFetch(itemsUrl);
  const itemsResponse = itemsResult.response;
  if (itemsResult.error || !itemsResponse || !itemsResponse.ok) {
    const upstreamStatus = itemsResponse?.status;
    const status = itemsResult.error === "timeout"
      ? 504
      : itemsResult.error
        ? 502
        : upstreamStatus === 401
          ? 401
          : upstreamStatus === 403
            ? 403
            : upstreamStatus === 429
              ? 429
              : 502;
    const response = NextResponse.json(
      {
        error: itemsResult.error === "timeout"
          ? "Spotify took too long to return playlist tracks. Please try again."
          : itemsResult.error
            ? "Spotify could not be reached. Please try again."
            : upstreamStatus === 401
              ? "Spotify session expired. Reconnect Spotify to continue."
              : upstreamStatus === 403
                ? "Spotify playlist tracks need permission. Reconnect Spotify to continue."
                : "Tracks from this Spotify playlist could not be loaded.",
        needsReauth: status === 401 || status === 403,
      },
      { status, headers: spotifyPrivateHeaders(itemsResponse?.headers.get("retry-after")) },
    );
    return status === 401
      ? clearSpotifyTokenCookies(response)
      : setRefreshedCookies(response, tokenState.refreshedToken);
  }

  const itemsPayload = (await itemsResponse.json()) as { items?: SpotifyPlaylistItem[] };
  const songs = (itemsPayload.items ?? [])
    .map((item) => item.item ?? item.track)
    .filter((track): track is SpotifyTrack => Boolean(track?.uri && track.external_urls?.spotify))
    .map((track) => ({
      id: track.id,
      spotifyUri: track.uri,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      movie: track.album.name,
      duration: formatDuration(track.duration_ms),
      art: track.album.images?.[0]?.url ?? "",
      genre: "Hehe / recommended",
      spotifyUrl: track.external_urls?.spotify,
      previewUrl: track.preview_url,
    }));

  return setRefreshedCookies(
    NextResponse.json(
      { playlistName: playlist.name, songs, updatedAt: new Date().toISOString() },
      { headers: spotifyPrivateHeaders() },
    ),
    tokenState.refreshedToken,
  );
}
