import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { recordUserSignal, type UserSignalType } from "@/lib/user-signals";

export const runtime = "nodejs";

const signalTypes: UserSignalType[] = ["favorite", "booking", "listen"];
const mediaTypes = ["movie", "tv", "anime"] as const;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json()) as {
      type?: UserSignalType;
      title?: string;
      tmdbId?: number;
      mediaType?: (typeof mediaTypes)[number];
      genres?: string[];
      metadata?: Record<string, string>;
    };
    const title = body.title?.trim() ?? "";
    const tmdbId = body.tmdbId === undefined ? undefined : Number(body.tmdbId);
    const genres = Array.isArray(body.genres)
      ? body.genres.filter((genre): genre is string => typeof genre === "string").slice(0, 8)
      : [];
    const metadata = body.metadata && typeof body.metadata === "object"
      ? Object.fromEntries(
          Object.entries(body.metadata)
            .filter(([, value]) => typeof value === "string")
            .slice(0, 8),
        )
      : undefined;

    if (!signalTypes.includes(body.type as UserSignalType) || !title) {
      return NextResponse.json({ error: "Invalid user signal." }, { status: 400 });
    }
    if (tmdbId !== undefined && (!Number.isInteger(tmdbId) || tmdbId <= 0)) {
      return NextResponse.json({ error: "Invalid TMDB id." }, { status: 400 });
    }
    if (body.mediaType !== undefined && !mediaTypes.includes(body.mediaType)) {
      return NextResponse.json({ error: "Invalid media type." }, { status: 400 });
    }

    await recordUserSignal({
      userId: user.id,
      type: body.type as UserSignalType,
      title,
      tmdbId,
      mediaType: body.mediaType,
      genres,
      metadata,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("User signal write failed", error);
    return NextResponse.json({ error: "Could not save this activity." }, { status: 500 });
  }
}
