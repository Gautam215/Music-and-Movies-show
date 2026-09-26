import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { recordViewing, type ViewingMediaType } from "@/lib/viewing-history";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

const mediaTypes: ViewingMediaType[] = ["movie", "tv", "anime"];

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateJsonHeaders() });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      tmdbId?: unknown;
      mediaType?: unknown;
      title?: unknown;
      genres?: unknown;
      region?: unknown;
    } | null;
    const tmdbId = Number(body?.tmdbId);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const rawGenres = body?.genres;
    const genres = Array.isArray(rawGenres)
      ? rawGenres.filter((genre): genre is string => typeof genre === "string" && genre.length <= 80).slice(0, 8)
      : [];
    const region = typeof body?.region === "string" && /^[A-Za-z]{2}$/.test(body.region) ? body.region.toUpperCase() : undefined;

    if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaTypes.includes(body?.mediaType as ViewingMediaType) || !title || title.length > 200) {
      return NextResponse.json({ error: "Invalid viewing history entry." }, { status: 400, headers: privateJsonHeaders() });
    }

    await recordViewing({
      userId: user.id,
      tmdbId,
      mediaType: body?.mediaType as ViewingMediaType,
      title,
      genres,
      region,
    });
    return NextResponse.json({ ok: true }, { status: 201, headers: privateJsonHeaders() });
  } catch (error) {
    console.error("Viewing history write failed", error);
    return NextResponse.json({ error: "Could not save viewing history." }, { status: 500 });
  }
}
