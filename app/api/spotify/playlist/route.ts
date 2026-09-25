import { NextResponse } from "next/server";
import { refreshSpotifyToken } from "@/lib/spotify-auth";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
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
  let { accessToken, refreshToken, refreshedToken } = await getSpotifyServerToken();
  if (!accessToken) {
    const response = NextResponse.json(
      { error: "Spotify is not connected." },
      { status: 401, headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  const spotifyFetch = (url: URL | string) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${accessToken ?? ""}` },
      cache: "no-store",
    });

  let playlistsResponse: Response | null = null;
  let playlistsPayload: { items?: SpotifyPlaylist[]; next?: string | null } = {};
  let playlist: SpotifyPlaylist | undefined;
  let nextPlaylistsUrl: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";
  let refreshedAfter401 = false;

  for (let page = 0; page < 10 && nextPlaylistsUrl && !playlist; page += 1) {
    playlistsResponse = await spotifyFetch(nextPlaylistsUrl);
    if (playlistsResponse.status === 401 && refreshToken && !refreshedAfter401) {
      refreshedToken = await refreshSpotifyToken(refreshToken);
      accessToken = refreshedToken?.access_token;
      refreshedAfter401 = true;
      if (accessToken) {
        page -= 1;
        continue;
      }
    }
    if (!playlistsResponse.ok) break;
    playlistsPayload = (await playlistsResponse.json()) as typeof playlistsPayload;
    playlist = (playlistsPayload.items ?? []).find(
      (item) => item.name.trim().toLowerCase() === playlistName.toLowerCase(),
    );
    nextPlaylistsUrl = playlistsPayload.next ?? null;
  }

  if (!playlistsResponse?.ok) {
    const message = playlistsResponse?.status === 403
      ? "Spotify playlist access needs approval. Reconnect Spotify to continue."
      : "Spotify playlists could not be loaded.";
    return setRefreshedCookies(
      NextResponse.json(
        { error: message, needsReauth: playlistsResponse?.status === 403 },
        {
          status: playlistsResponse?.status === 403 ? 403 : 502,
          headers: spotifyPrivateHeaders(),
        },
      ),
      refreshedToken,
    );
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
      refreshedToken,
    );
  }

  const itemsUrl = new URL(`https://api.spotify.com/v1/playlists/${playlist.id}/items`);
  itemsUrl.searchParams.set("limit", "50");
  let itemsResponse = await spotifyFetch(itemsUrl);
  if (itemsResponse.status === 401 && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
    if (accessToken) itemsResponse = await spotifyFetch(itemsUrl);
  }
  if (!itemsResponse.ok) {
    return setRefreshedCookies(
      NextResponse.json(
        {
          error: itemsResponse.status === 403
            ? "Spotify playlist tracks need permission. Reconnect Spotify to continue."
            : "Tracks from this Spotify playlist could not be loaded.",
          needsReauth: itemsResponse.status === 403,
        },
        {
          status: itemsResponse.status === 403 ? 403 : 502,
          headers: spotifyPrivateHeaders(),
        },
      ),
      refreshedToken,
    );
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
    refreshedToken,
  );
}
