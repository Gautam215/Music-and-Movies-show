import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/mongodb";

const HOLD_WINDOW_MS = 8 * 60 * 1000;
const CLAIMS_COLLECTION = "ticket_seat_claims";
const BOOKINGS_COLLECTION = "ticket_bookings";

type ClaimStatus = "HELD" | "CONFIRMED";

type SeatClaimDocument = {
  showKey: string;
  seatLabel: string;
  userId: string;
  bookingCode: string;
  status: ClaimStatus;
  expiresAt: Date;
  createdAt: Date;
};

type TicketBookingDocument = {
  bookingCode: string;
  userId: string;
  movieId: string;
  day: string;
  showtime: string;
  showKey: string;
  seatLabels: string[];
  status: "CONFIRMED";
  createdAt: Date;
};

let indexPromise: Promise<void> | null = null;

async function ensureTicketIndexes() {
  const db = await getDatabase();
  if (!indexPromise) {
    indexPromise = Promise.all([
      db
        .collection<SeatClaimDocument>(CLAIMS_COLLECTION)
        .createIndex({ showKey: 1, seatLabel: 1 }, { unique: true }),
      db
        .collection<TicketBookingDocument>(BOOKINGS_COLLECTION)
        .createIndex({ bookingCode: 1 }, { unique: true }),
    ]).then(() => undefined);
  }
  try {
    await indexPromise;
  } catch (error) {
    indexPromise = null;
    throw error;
  }
  return db;
}

export function ticketShowKey(movieId: string, day: string, showtime: string) {
  return `${movieId}:${day}:${showtime}`;
}

export async function getClaimedSeatLabels(showKey: string) {
  const db = await ensureTicketIndexes();
  const claims = db.collection<SeatClaimDocument>(CLAIMS_COLLECTION);
  const now = new Date();
  await claims.deleteMany({
    showKey,
    status: "HELD",
    expiresAt: { $lte: now },
  });
  const active = await claims
    .find({
      showKey,
      $or: [
        { status: "CONFIRMED" },
        { status: "HELD", expiresAt: { $gt: now } },
      ],
    })
    .project<{ seatLabel: string }>({ seatLabel: 1 })
    .toArray();
  return new Set(active.map((claim) => claim.seatLabel));
}

export class SeatUnavailableError extends Error {
  constructor() {
    super("One or more selected seats are no longer available.");
    this.name = "SeatUnavailableError";
  }
}

export async function confirmTicketReservation(input: {
  userId: string;
  movieId: string;
  day: string;
  showtime: string;
  seatLabels: string[];
}) {
  const db = await ensureTicketIndexes();
  const claims = db.collection<SeatClaimDocument>(CLAIMS_COLLECTION);
  const bookings = db.collection<TicketBookingDocument>(BOOKINGS_COLLECTION);
  const now = new Date();
  const bookingCode = `RR-${randomBytes(4).toString("hex").toUpperCase()}`;
  const showKey = ticketShowKey(input.movieId, input.day, input.showtime);
  const expiresAt = new Date(now.getTime() + HOLD_WINDOW_MS);

  try {
    await claims.insertMany(
      input.seatLabels.map((seatLabel) => ({
        showKey,
        seatLabel,
        userId: input.userId,
        bookingCode,
        status: "CONFIRMED" as const,
        expiresAt,
        createdAt: now,
      })),
      { ordered: true },
    );
    await bookings.insertOne({
      bookingCode,
      userId: input.userId,
      movieId: input.movieId,
      day: input.day,
      showtime: input.showtime,
      showKey,
      seatLabels: input.seatLabels,
      status: "CONFIRMED",
      createdAt: now,
    });
  } catch (error) {
    await claims.deleteMany({ bookingCode });
    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code?: number }).code === 11000
    ) {
      throw new SeatUnavailableError();
    }
    throw error;
  }

  return { bookingCode, createdAt: now.toISOString() };
}
