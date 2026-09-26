import { NextResponse } from "next/server";
import { spotifyCatalogFetch } from "@/lib/spotify-server";

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

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify credentials are not configured." },
      { status: 500 },
    );
  }

    try {
      const requestUrl = new URL(request.url);
      const query = requestUrl.searchParams.get("q")?.trim() || "movie soundtrack";
      if (query.length > 120) return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
    const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 20)
      : 10;
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "track");
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("market", "US");

    const tracksResponse = await spotifyCatalogFetch(searchUrl, { cache: "no-store" });

    if (!tracksResponse.ok) {
      const error = tracksResponse.status === 403
        ? "Spotify catalog access requires an active Premium subscription for the app owner."
        : tracksResponse.status === 429
          ? "Spotify is rate limiting catalog requests. Please try again shortly."
          : "Spotify tracks could not be loaded.";
      return NextResponse.json(
        { error },
        {
          status: tracksResponse.status === 403 ? 403 : tracksResponse.status === 429 ? 429 : 502,
          headers: tracksResponse.status === 429
            ? { "Retry-After": tracksResponse.headers.get("retry-after") ?? "30" }
            : undefined,
        },
      );
    }

    const payload = (await tracksResponse.json()) as {
      tracks?: { items?: SpotifyTrack[] };
    };
    const songs = (payload.tracks?.items ?? [])
      .filter((track) => track.external_urls?.spotify)
      .map((track) => ({
        id: track.id,
        spotifyUri: track.uri,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        movie: track.album.name,
        duration: formatDuration(track.duration_ms),
        art: track.album.images?.[0]?.url ?? "",
        genre: "Spotify",
        spotifyUrl: track.external_urls?.spotify,
        previewUrl: track.preview_url,
      }));

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json(
      { error: "Spotify is temporarily unavailable." },
      { status: 502 },
    );
  }
}
