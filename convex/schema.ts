import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({ userId: v.string(), name: v.string(), city: v.string(), favoriteGenres: v.array(v.string()), notifications: v.boolean(), releaseAlerts: v.boolean(), role: v.union(v.literal("user"), v.literal("moderator"), v.literal("admin")) }).index("by_user", ["userId"]),
  movies: defineTable({ title: v.string(), slug: v.string(), synopsis: v.string(), poster: v.string(), backdrop: v.string(), status: v.union(v.literal("NOW_PLAYING"), v.literal("UPCOMING")), releaseDate: v.string(), runtimeMinutes: v.number(), rating: v.optional(v.number()), language: v.string(), certification: v.string(), genres: v.array(v.string()) }).index("by_status", ["status"]).index("by_slug", ["slug"]),
  theaters: defineTable({ name: v.string(), city: v.string(), address: v.string(), amenities: v.array(v.string()) }).index("by_city", ["city"]),
  shows: defineTable({ movieId: v.id("movies"), theaterId: v.id("theaters"), startsAt: v.string(), format: v.string(), basePriceCents: v.number(), status: v.union(v.literal("OPEN"), v.literal("SOLD_OUT"), v.literal("CANCELLED")) }).index("by_movie", ["movieId"]).index("by_theater", ["theaterId"]),
  seats: defineTable({ showId: v.id("shows"), label: v.string(), tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("accessible")) }).index("by_show", ["showId"]),
  seatHolds: defineTable({ showId: v.id("shows"), seatId: v.id("seats"), userId: v.string(), expiresAt: v.number(), status: v.union(v.literal("HELD"), v.literal("EXPIRED"), v.literal("CONVERTED")) }).index("by_show_seat", ["showId", "seatId"]).index("by_expiry", ["expiresAt"]),
  orders: defineTable({ userId: v.string(), showId: v.id("shows"), seatIds: v.array(v.id("seats")), subtotalCents: v.number(), feeCents: v.number(), totalCents: v.number(), bookingCode: v.string(), paymentStatus: v.union(v.literal("PENDING"), v.literal("PAID"), v.literal("FAILED"), v.literal("REFUNDED")) }).index("by_user", ["userId"]).index("by_booking_code", ["bookingCode"]),
  songs: defineTable({ title: v.string(), artist: v.string(), album: v.string(), movieId: v.id("movies"), durationSeconds: v.number(), artwork: v.string(), providerUrl: v.optional(v.string()), published: v.boolean() }).index("by_movie", ["movieId"]),
  reviews: defineTable({ userId: v.string(), movieId: v.id("movies"), rating: v.number(), body: v.string(), state: v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("FLAGGED")), verifiedPurchase: v.boolean() }).index("by_movie", ["movieId"]).index("by_user_movie", ["userId", "movieId"]),
});
