import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { recordUserSignal, type UserSignalType } from "@/lib/user-signals";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

const signalTypes: UserSignalType[] = ["favorite", "booking", "listen"];
const mediaTypes = ["movie", "tv", "anime"] as const;

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateJsonHeaders() });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      type?: unknown;
      title?: unknown;
      tmdbId?: unknown;
      mediaType?: unknown;
      genres?: unknown;
      metadata?: unknown;
    } | null;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const tmdbId = body?.tmdbId === undefined ? undefined : Number(body.tmdbId);
    const rawGenres = body?.genres;
    const genres = Array.isArray(rawGenres)
      ? rawGenres.filter((genre): genre is string => typeof genre === "string" && genre.length <= 80).slice(0, 8)
      : [];
    const rawMetadata = body?.metadata;
    const metadata: Record<string, string> | undefined = rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
      ? Object.entries(rawMetadata as Record<string, unknown>)
          .filter(([key, value]) => key.length <= 40 && typeof value === "string" && value.length <= 200)
          .slice(0, 8)
          .reduce<Record<string, string>>((result, [key, value]) => {
            result[key] = value as string;
            return result;
          }, {})
      : undefined;

    if (!signalTypes.includes(body?.type as UserSignalType) || !title || title.length > 200) {
      return NextResponse.json({ error: "Invalid user signal." }, { status: 400, headers: privateJsonHeaders() });
    }
    if (tmdbId !== undefined && (!Number.isInteger(tmdbId) || tmdbId <= 0)) {
      return NextResponse.json({ error: "Invalid TMDB id." }, { status: 400, headers: privateJsonHeaders() });
    }
    if (body?.mediaType !== undefined && !mediaTypes.includes(body.mediaType as (typeof mediaTypes)[number])) {
      return NextResponse.json({ error: "Invalid media type." }, { status: 400, headers: privateJsonHeaders() });
    }

    await recordUserSignal({
      userId: user.id,
      type: body?.type as UserSignalType,
      title,
      tmdbId,
      mediaType: body?.mediaType as (typeof mediaTypes)[number] | undefined,
      genres,
      metadata,
    });
    return NextResponse.json({ ok: true }, { status: 201, headers: privateJsonHeaders() });
  } catch (error) {
    console.error("User signal write failed", error);
    return NextResponse.json({ error: "Could not save this activity." }, { status: 500 });
  }
}
