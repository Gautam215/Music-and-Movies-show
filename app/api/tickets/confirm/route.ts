import { NextResponse } from "next/server";
import { getCurrentUser, isPremiumTestFixtureUser } from "@/lib/auth-session";
import { createSeatMap } from "@/lib/seat-map";
import {
  confirmTicketReservation,
  getClaimedSeatLabels,
  SeatUnavailableError,
  ticketShowKey,
} from "@/lib/ticket-bookings";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

const movieIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const dayPattern = /^[A-Za-z0-9_-]{1,24}$/;
const showtimePattern = /^[0-9]{1,2}:[0-9]{2} (AM|PM)$/;
const seatPattern = /^[A-E][1-8]$/;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: privateJsonHeaders() },
  );
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request))
      return jsonError("Invalid request origin.", 403);
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (isPremiumTestFixtureUser(user))
      return jsonError("Ticket booking is disabled for the test fixture.", 403);

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 20_000)
      return jsonError("The booking request is too large.", 413);

    const body = (await request.json().catch(() => null)) as {
      movieId?: unknown;
      day?: unknown;
      showtime?: unknown;
      seatLabels?: unknown;
    } | null;
    const movieId =
      typeof body?.movieId === "string" ? body.movieId.trim() : "";
    const day = typeof body?.day === "string" ? body.day.trim() : "";
    const showtime =
      typeof body?.showtime === "string" ? body.showtime.trim() : "";
    const seatLabels = Array.isArray(body?.seatLabels)
      ? body.seatLabels.filter(
          (label): label is string => typeof label === "string",
        )
      : [];

    if (!movieIdPattern.test(movieId))
      return jsonError("A valid movie id is required.", 400);
    if (!dayPattern.test(day))
      return jsonError("A valid screening day is required.", 400);
    if (!showtimePattern.test(showtime))
      return jsonError("A valid showtime is required.", 400);
    if (
      seatLabels.length < 1 ||
      seatLabels.length > 8 ||
      new Set(seatLabels).size !== seatLabels.length ||
      seatLabels.some((label) => !seatPattern.test(label))
    )
      return jsonError("Choose between 1 and 8 unique valid seats.", 400);

    const showKey = ticketShowKey(movieId, day, showtime);
    const baseSeats = createSeatMap(showKey);
    const available = new Set(
      baseSeats
        .filter((seat) => seat.status === "available")
        .map((seat) => seat.label),
    );
    if (seatLabels.some((label) => !available.has(label)))
      return jsonError("One or more selected seats are unavailable.", 409);

    const claimed = await getClaimedSeatLabels(showKey);
    if (seatLabels.some((label) => claimed.has(label)))
      return jsonError("One or more selected seats were just taken.", 409);

    const confirmation = await confirmTicketReservation({
      userId: user.id,
      movieId,
      day,
      showtime,
      seatLabels,
    });
    return NextResponse.json(
      { ...confirmation, seatLabels },
      { status: 201, headers: privateJsonHeaders() },
    );
  } catch (error) {
    if (error instanceof SeatUnavailableError)
      return jsonError(error.message, 409);
    console.error("Ticket confirmation failed", error);
    return jsonError("The ticket reservation could not be confirmed.", 500);
  }
}
