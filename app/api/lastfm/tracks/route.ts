import { NextResponse } from "next/server";

type LastFmImage = {
  "#text": string;
  size?: string;
};

type LastFmTrack = {
  name?: string;
  mbid?: string;
  url?: string;
  duration?: string;
  artist?: {
    name?: string;
  };
  image?: LastFmImage[];
};

function formatDuration(value?: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export async function GET() {
  const apiKey = process.env.LASTFM_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Last.fm API credentials are not configured." },
      { status: 500 },
    );
  }

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "chart.gettoptracks");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "12");

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json()) as {
      error?: number;
      message?: string;
      tracks?: { track?: LastFmTrack[] };
    };

    if (!response.ok || payload.error) {
      return NextResponse.json(
        { error: payload.message ?? "Last.fm tracks could not be loaded." },
        { status: 502 },
      );
    }

    const songs = (payload.tracks?.track ?? [])
      .map((track) => {
        const title = track.name?.trim();
        const artist = track.artist?.name?.trim();
        const art =
          track.image?.find((image) => image.size === "extralarge")?.["#text"] ||
          track.image?.at(-1)?.["#text"] ||
          "";
        if (!title || !artist) return null;
        return {
          id: track.mbid || `${artist}-${title}`,
          title,
          artist,
          movie: "Last.fm global chart",
          duration: formatDuration(track.duration),
          art,
          genre: "Last.fm",
          lastFmUrl: track.url,
        };
      })
      .filter((track): track is NonNullable<typeof track> => Boolean(track));

    return NextResponse.json({ songs, source: "lastfm" });
  } catch {
    return NextResponse.json(
      { error: "Last.fm is temporarily unavailable." },
      { status: 502 },
    );
  }
}
