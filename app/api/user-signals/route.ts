import { NextResponse } from "next/server";
import { getCurrentUser, isPremiumTestFixtureUser } from "@/lib/auth-session";
import {
  getUserSignals,
  recordUserSignal,
  removeUserSignal,
  type UserSignalType,
} from "@/lib/user-signals";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

const signalTypes: UserSignalType[] = ["favorite", "booking", "listen"];
const mediaTypes = ["movie", "tv", "anime"] as const;

async function requireUser(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403, headers: privateJsonHeaders() },
    );
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: privateJsonHeaders() },
    );
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (user instanceof NextResponse) return user;
    const requestedType = new URL(request.url).searchParams.get("type");
    if (requestedType && !signalTypes.includes(requestedType as UserSignalType))
      return NextResponse.json(
        { error: "Invalid user signal type." },
        { status: 400, headers: privateJsonHeaders() },
      );
    if (isPremiumTestFixtureUser(user))
      return NextResponse.json(
        { signals: [] },
        { status: 200, headers: privateJsonHeaders() },
      );
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limitValue = limitParam === null ? 100 : Number(limitParam);
    const signals = await getUserSignals(
      user.id,
      requestedType as UserSignalType | undefined,
      Number.isFinite(limitValue) ? limitValue : 100,
    );
    return NextResponse.json(
      { signals },
      { status: 200, headers: privateJsonHeaders() },
    );
  } catch (error) {
    console.error("User signal read failed", error);
    return NextResponse.json(
      { error: "Could not load saved activity." },
      { status: 500, headers: privateJsonHeaders() },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (user instanceof NextResponse) return user;
    if (isPremiumTestFixtureUser(user))
      return NextResponse.json(
        { error: "Saved activity is disabled for the test fixture." },
        { status: 403, headers: privateJsonHeaders() },
      );

    const body = (await request.json().catch(() => null)) as {
      type?: unknown;
      title?: unknown;
      key?: unknown;
      tmdbId?: unknown;
      mediaType?: unknown;
      genres?: unknown;
      metadata?: unknown;
    } | null;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const key = typeof body?.key === "string" ? body.key.trim() : undefined;
    const tmdbId = body?.tmdbId === undefined ? undefined : Number(body.tmdbId);
    const rawGenres = body?.genres;
    const genres = Array.isArray(rawGenres)
      ? rawGenres
          .filter(
            (genre): genre is string =>
              typeof genre === "string" && genre.length <= 80,
          )
          .slice(0, 8)
      : [];
    const rawMetadata = body?.metadata;
    const metadata: Record<string, string> | undefined =
      rawMetadata &&
      typeof rawMetadata === "object" &&
      !Array.isArray(rawMetadata)
        ? Object.entries(rawMetadata as Record<string, unknown>).reduce<
            Record<string, string>
          >((result, [key, value]) => {
            if (
              Object.keys(result).length < 8 &&
              key.length <= 40 &&
              typeof value === "string" &&
              value.length <= 200
            ) {
              result[key] = value;
            }
            return result;
          }, {})
        : undefined;

    if (
      !signalTypes.includes(body?.type as UserSignalType) ||
      !title ||
      title.length > 200 ||
      (key !== undefined && (!key || key.length > 200))
    ) {
      return NextResponse.json(
        { error: "Invalid user signal." },
        { status: 400, headers: privateJsonHeaders() },
      );
    }
    if (tmdbId !== undefined && (!Number.isInteger(tmdbId) || tmdbId <= 0)) {
      return NextResponse.json(
        { error: "Invalid TMDB id." },
        { status: 400, headers: privateJsonHeaders() },
      );
    }
    if (
      body?.mediaType !== undefined &&
      !mediaTypes.includes(body.mediaType as (typeof mediaTypes)[number])
    ) {
      return NextResponse.json(
        { error: "Invalid media type." },
        { status: 400, headers: privateJsonHeaders() },
      );
    }

    await recordUserSignal({
      userId: user.id,
      type: body?.type as UserSignalType,
      title,
      key,
      tmdbId,
      mediaType: body?.mediaType as (typeof mediaTypes)[number] | undefined,
      genres,
      metadata,
    });
    return NextResponse.json(
      { ok: true, key },
      { status: 201, headers: privateJsonHeaders() },
    );
  } catch (error) {
    console.error("User signal write failed", error);
    return NextResponse.json(
      { error: "Could not save this activity." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (user instanceof NextResponse) return user;
    if (isPremiumTestFixtureUser(user))
      return NextResponse.json(
        { error: "Saved activity is disabled for the test fixture." },
        { status: 403, headers: privateJsonHeaders() },
      );
    const body = (await request.json().catch(() => null)) as {
      type?: unknown;
      key?: unknown;
      title?: unknown;
      tmdbId?: unknown;
      mediaType?: unknown;
    } | null;
    const type = body?.type ?? "favorite";
    const key = typeof body?.key === "string" ? body.key.trim() : undefined;
    const title =
      typeof body?.title === "string" ? body.title.trim() : undefined;
    const tmdbId = body?.tmdbId === undefined ? undefined : Number(body.tmdbId);

    if (
      !signalTypes.includes(type as UserSignalType) ||
      (key !== undefined && (!key || key.length > 200)) ||
      (title !== undefined && (!title || title.length > 200)) ||
      (tmdbId !== undefined && (!Number.isInteger(tmdbId) || tmdbId <= 0)) ||
      (body?.mediaType !== undefined &&
        !mediaTypes.includes(body.mediaType as (typeof mediaTypes)[number]))
    ) {
      return NextResponse.json(
        { error: "Invalid user signal." },
        { status: 400, headers: privateJsonHeaders() },
      );
    }
    if (!key && !title && tmdbId === undefined) {
      return NextResponse.json(
        { error: "A saved item identity is required." },
        { status: 400, headers: privateJsonHeaders() },
      );
    }

    const result = await removeUserSignal({
      userId: user.id,
      type: type as UserSignalType,
      key,
      title,
      tmdbId,
      mediaType: body?.mediaType as (typeof mediaTypes)[number] | undefined,
    });
    return NextResponse.json(
      { ok: true, deletedCount: result.deletedCount },
      { status: 200, headers: privateJsonHeaders() },
    );
  } catch (error) {
    console.error("User signal delete failed", error);
    return NextResponse.json(
      { error: "Could not remove saved activity." },
      { status: 500, headers: privateJsonHeaders() },
    );
  }
}
