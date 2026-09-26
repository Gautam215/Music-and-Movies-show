# Reelscape Booking Realtime Architecture

## Current Boundary

The existing Convex booking contract is the authoritative checkout boundary:

- `convex/bookings.ts#createSeatHold` authenticates the member, rejects active holds, and creates an eight-minute hold.
- `convex/bookings.ts#releaseExpiredHolds` releases expired holds.
- `convex/schema.ts` stores shows, seats, seat holds, and orders.

The new booking UI is optimistic, but payment and final seat ownership must still be confirmed by the server.

## Shared Room State

Use an ephemeral Redis record for a collaborative room:

```text
booking:room:{roomId}
  showId
  showtime
  revision
  hostUserId
  participants: { userId, displayName, color, lastSeenAt }[]
  selections: { seatId, userId, clientMutationId, updatedAt }[]
  expiresAt
```

Give the record a short TTL, refresh it while a participant is active, and delete it when checkout completes or the last participant leaves. Do not treat this record as the final booking ledger.

## Transport

Use WebSockets for the primary room connection because seating needs bidirectional events:

```text
room.join       -> server validates room and returns snapshot + revision
seat.intent     -> server atomically accepts or rejects the intent
seat.accepted   -> broadcast to every participant
seat.rejected   -> return the winning owner and current revision
presence.update -> broadcast debounced presence changes
room.expiring   -> warn clients before the hold window ends
```

Support Server-Sent Events as a read-only fallback for constrained networks. Mutations still go through authenticated HTTP/Convex mutations, using the same `clientMutationId` and revision checks.

## Optimistic UI

1. Apply a local seat selection immediately and mark it `pending`.
2. Send `seat.intent` with `roomId`, `showId`, `seatId`, `action`, `clientMutationId`, and the last known `revision`.
3. Render the pending seat with a subtle sync state instead of blocking the user.
4. On `seat.accepted`, replace the pending state and advance the revision.
5. On `seat.rejected`, roll back only that intent, refresh the authoritative seat, and explain that another guest selected it first.
6. If the connection drops, keep local intent state, show an offline indicator, and replay idempotently after reconnecting.

## Conflict Resolution

- The server owns the ordering decision. Use an atomic Redis script or Convex transaction so two users cannot both win the same seat.
- The first valid intent at the current revision wins. Later intents receive `409 SEAT_CONFLICT` with the winning revision and owner presence metadata.
- Every mutation requires an idempotency key. Replayed messages return the original result instead of creating duplicate holds.
- A room selection is only a preference. At checkout, call `createSeatHold` for the final seat list; the existing hold conflict remains the last line of defense.
- Broadcast a new snapshot after any conflict so every client converges without a full page refresh.

## Checkout Handoff

1. Freeze room mutations when the host starts checkout.
2. Validate that the room showtime and seat list still match the current revision.
3. Create authenticated Convex seat holds.
4. Create the payment intent with the server-calculated subtotal, fee, and discount.
5. Convert holds to an order only after signed payment confirmation.
6. Publish `room.completed` and invalidate the ephemeral room key.

Never calculate final prices or trust seat ownership from the browser.
