import assert from "node:assert/strict";
import test from "node:test";
import {
  clampSeatCamera,
  createSeatMap,
  isWebglAvailable,
  SEAT_ROWS,
  SEATS_PER_ROW,
} from "../lib/seat-map.ts";

test("seat maps are deterministic and contain the complete theatre", () => {
  const first = createSeatMap("screen-04:today:1:40 PM");
  const second = createSeatMap("screen-04:today:1:40 PM");

  assert.deepEqual(first, second);
  assert.equal(first.length, SEAT_ROWS.length * SEATS_PER_ROW);
  assert.equal(new Set(first.map((seat) => seat.label)).size, first.length);
  assert.ok(first.some((seat) => seat.tier === "premium"));
  assert.ok(first.some((seat) => seat.tier === "accessible"));
  assert.ok(first.some((seat) => seat.status === "occupied"));
});

test("seat maps vary by screening without changing their shape", () => {
  const first = createSeatMap("movie-a:today:1:40 PM");
  const second = createSeatMap("movie-b:tomorrow:8:20 AM");

  assert.equal(first.length, second.length);
  assert.notDeepEqual(
    first.map((seat) => seat.status),
    second.map((seat) => seat.status),
  );
});

test("camera limits keep orbit controls inside the theatre", () => {
  const wideOrbit = clampSeatCamera(-10, -2, 100);
  assert.equal(wideOrbit.pitch, 0.12);
  assert.equal(wideOrbit.distance, 12);
  assert.ok(wideOrbit.yaw < 0 && wideOrbit.yaw >= -0.72);

  assert.deepEqual(clampSeatCamera(10, 2, 1), {
    yaw: 0.72,
    pitch: 1.04,
    distance: 5.4,
  });
});

test("widest orbit stays inside both side walls", () => {
  const right = clampSeatCamera(10, 0.12, 12);
  const left = clampSeatCamera(-10, 0.12, 12);
  const cameraX = (yaw: number) => Math.sin(yaw) * Math.cos(0.12) * 12;

  assert.ok(cameraX(right.yaw) <= 6.7 + 1e-12);
  assert.ok(cameraX(left.yaw) >= -6.7 - 1e-12);
  assert.equal(left.yaw, -right.yaw);
  assert.ok(right.yaw < 0.72);
});

test("WebGL detection accepts either supported context", () => {
  assert.equal(
    isWebglAvailable((kind) => (kind === "webgl" ? {} : null)),
    true,
  );
  assert.equal(
    isWebglAvailable(() => null),
    false,
  );
});
