import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, isPremiumTestFixtureUser } from "@/lib/auth-session";
import { createSeatMap } from "@/lib/seat-map";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";
import { getClaimedSeatLabels, ticketShowKey } from "@/lib/ticket-bookings";

export const runtime = "nodejs";

const CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 64;
const seatMapCache = new Map<
  string,
  { expiresAt: number; seats: ReturnType<typeof createSeatMap> }
>();

function anonymousUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400, headers: privateJsonHeaders() },
  );
}

export async function GET(request: Request) {
  try {
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
    if (!user.canAccess3DTheater)
      return NextResponse.json(
        { error: "This account cannot access the 3D seat view." },
        { status: 403, headers: privateJsonHeaders() },
      );

    const params = new URL(request.url).searchParams;
    const movieId = params.get("movieId")?.trim() ?? "";
    const showtime = params.get("showtime")?.trim() ?? "";
    const day = params.get("day")?.trim() ?? "today";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(movieId))
      return badRequest("A valid movie id is required.");
    if (!/^[0-9]{1,2}:[0-9]{2} (AM|PM)$/.test(showtime))
      return badRequest("A valid showtime is required.");
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(day))
      return badRequest("A valid screening day is required.");

    const cacheKey = ticketShowKey(movieId, day, showtime);
    const now = Date.now();
    const cached = seatMapCache.get(cacheKey);
    const baseSeats = cached && cached.expiresAt > now ? cached.seats : null;
    if (!baseSeats) {
      const seats = createSeatMap(cacheKey);
      seatMapCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, seats });
      if (seatMapCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = seatMapCache.keys().next().value;
        if (oldestKey) seatMapCache.delete(oldestKey);
      }
    }

    const currentSeats = baseSeats ?? seatMapCache.get(cacheKey)?.seats;
    if (!currentSeats) throw new Error("Seat map cache failed to initialize");
    const fixtureUser = isPremiumTestFixtureUser(user);
    const claimed = fixtureUser
      ? new Set<string>()
      : await getClaimedSeatLabels(cacheKey);
    const seats = currentSeats.map((seat) =>
      claimed.has(seat.label) && seat.status === "available"
        ? { ...seat, status: "occupied" as const }
        : seat,
    );
    if (cached && cached.expiresAt > now)
      return NextResponse.json(
        {
          version: now,
          updatedAt: new Date(now).toISOString(),
          seats,
          live: !fixtureUser,
        },
        { headers: privateJsonHeaders() },
      );

    console.info("3D seat map served", {
      user: anonymousUserId(user.id),
      movieId,
      day,
      showtime,
      seats: seats.length,
    });
    return NextResponse.json(
      {
        version: now,
        updatedAt: new Date(now).toISOString(),
        seats,
        live: !fixtureUser,
      },
      { headers: privateJsonHeaders() },
    );
  } catch (error) {
    console.error("3D seat map failed", error);
    return NextResponse.json(
      { error: "The live seat map is temporarily unavailable." },
      { status: 500, headers: privateJsonHeaders() },
    );
  }
}
