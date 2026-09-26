import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { recordViewing, type ViewingMediaType } from "@/lib/viewing-history";

export const runtime = "nodejs";

const mediaTypes: ViewingMediaType[] = ["movie", "tv", "anime"];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json()) as {
      tmdbId?: number;
      mediaType?: ViewingMediaType;
      title?: string;
      genres?: string[];
      region?: string;
    };
    const tmdbId = Number(body.tmdbId);
    const title = body.title?.trim() ?? "";
    const genres = Array.isArray(body.genres) ? body.genres.filter((genre): genre is string => typeof genre === "string").slice(0, 8) : [];

    if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaTypes.includes(body.mediaType as ViewingMediaType) || !title) {
      return NextResponse.json({ error: "Invalid viewing history entry." }, { status: 400 });
    }

    await recordViewing({
      userId: user.id,
      tmdbId,
      mediaType: body.mediaType as ViewingMediaType,
      title,
      genres,
      region: body.region?.trim().slice(0, 2).toUpperCase(),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Viewing history write failed", error);
    return NextResponse.json({ error: "Could not save viewing history." }, { status: 500 });
  }
}
