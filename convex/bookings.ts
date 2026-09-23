import { mutation } from "./_generated/server";
import { v } from "convex/values";

const HOLD_WINDOW_MS = 8 * 60 * 1000;

type HoldStatus = "HELD" | "EXPIRED" | "CONVERTED";
type SeatHold = { _id: string; seatId: string; expiresAt: number; status: HoldStatus };
type QueryBuilder = { eq: (field: string, value: unknown) => QueryBuilder; lt: (field: string, value: unknown) => QueryBuilder };
type HoldQuery = { withIndex: (name: string, builder: (query: QueryBuilder) => QueryBuilder) => HoldQuery; collect: () => Promise<SeatHold[]> };
type BookingContext = {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: { query: (table: "seatHolds") => HoldQuery; insert: (table: "seatHolds", value: Record<string, unknown>) => Promise<unknown>; patch: (id: string, value: Record<string, unknown>) => Promise<unknown> };
};
type HoldArgs = { showId: string; seatIds: string[] };

export const createSeatHold = mutation({
  args: { showId: v.id("shows"), seatIds: v.array(v.id("seats")) },
  handler: async (ctx: BookingContext, args: HoldArgs) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    if (args.seatIds.length === 0) throw new Error("At least one seat is required");
    const now = Date.now();
    const holds = await ctx.db.query("seatHolds").withIndex("by_show_seat", (q) => q.eq("showId", args.showId)).collect();
    const active = holds.filter((hold) => hold.status === "HELD" && hold.expiresAt > now);
    if (args.seatIds.some((seatId) => active.some((hold) => hold.seatId === seatId))) throw new Error("One or more seats were just taken");
    const expiresAt = now + HOLD_WINDOW_MS;
    for (const seatId of args.seatIds) await ctx.db.insert("seatHolds", { showId: args.showId, seatId, userId: identity.subject, expiresAt, status: "HELD" });
    return { expiresAt };
  },
});

export const releaseExpiredHolds = mutation({
  args: {},
  handler: async (ctx: BookingContext) => {
    const expired = await ctx.db.query("seatHolds").withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now())).collect();
    for (const hold of expired) if (hold.status === "HELD") await ctx.db.patch(hold._id, { status: "EXPIRED" });
    return { released: expired.length };
  },
});
