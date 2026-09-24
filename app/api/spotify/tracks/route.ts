import { NextResponse } from "next/server";

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

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify credentials are not configured." },
      { status: 500 },
    );
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "Spotify authentication failed." },
        { status: 502 },
      );
    }

    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) {
      return NextResponse.json(
        { error: "Spotify did not return an access token." },
        { status: 502 },
      );
    }

    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", "movie soundtrack");
    searchUrl.searchParams.set("type", "track");
    searchUrl.searchParams.set("limit", "10");
    searchUrl.searchParams.set("market", "US");

    const tracksResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });

    if (!tracksResponse.ok) {
      const error =
        tracksResponse.status === 403
          ? "Spotify catalog access requires an active Premium subscription for the app owner."
          : "Spotify tracks could not be loaded.";
      return NextResponse.json(
        { error },
        { status: tracksResponse.status === 403 ? 403 : 502 },
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
