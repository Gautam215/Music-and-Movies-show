import assert from "node:assert/strict";
import test from "node:test";
import type { SeatRecord } from "../lib/seat-map.ts";
import {
  easeInOutCubic,
  getAdjacentTheaterSeat,
  getTheaterCameraTransitionPosition,
  getTheaterRowPlatformPose,
  getTheaterSeatPoses,
  getTheaterScreenCurveOffset,
  getSeatCameraPose,
  getScreenCameraPose,
  getSeatZone,
  THEATER_CENTER_AISLE_WIDTH,
  THEATER_ROW_SPACING,
  THEATER_SEAT_SPACING,
  THEATER_SEAT_CAMERA_REAR_OFFSET,
  THEATER_SEAT_CAMERA_FOV,
  THEATER_SEAT_EYE_HEIGHT,
  THEATER_SCREEN_CENTER,
  THEATER_SCREEN_CURVE_SAG,
  THEATER_SCREEN_HEIGHT,
  THEATER_SCREEN_WIDTH,
} from "../modules/theater/frontend/seat-geometry.ts";

function seat(
  label: string,
  row: string,
  column: number,
  tier: SeatRecord["tier"] = "standard",
): SeatRecord {
  return {
    label,
    row,
    column,
    status: "available",
    tier,
    priceDelta: tier === "premium" ? 3 : 0,
    viewQuality: 92,
    position: { x: 0, y: 0.3, z: 0 },
    rotationY: 0,
  };
}

function theaterSeats() {
  return ["A", "B", "C", "D", "E"].flatMap((row) =>
    Array.from({ length: 8 }, (_, index) => {
      const column = index + 1;
      const tier =
        row === "E" && column === 1
          ? "accessible"
          : row === "C" && column >= 3 && column <= 6
            ? "premium"
            : "standard";
      return seat(`${row}${column}`, row, column, tier);
    }),
  );
}

function poseMap(seats = theaterSeats()) {
  return new Map(getTheaterSeatPoses(seats).map((pose) => [pose.label, pose]));
}

test("cinema zones keep premium center, standard middle, and economy edges/back", () => {
  assert.equal(getSeatZone(seat("C4", "C", 4, "premium")), "premium");
  assert.equal(getSeatZone(seat("B4", "B", 4)), "standard");
  assert.equal(getSeatZone(seat("E5", "E", 5)), "economy");
  assert.equal(getSeatZone(seat("C1", "C", 1)), "economy");
  assert.equal(getSeatZone(seat("E1", "E", 1, "accessible")), "accessible");
});

test("cinema screen keeps theatrical proportions with a subtle inward curve", () => {
  const aspect = THEATER_SCREEN_WIDTH / THEATER_SCREEN_HEIGHT;

  assert.ok(aspect > 2.35 && aspect < 2.45);
  assert.ok(THEATER_SCREEN_HEIGHT > 3);
  assert.equal(getTheaterScreenCurveOffset(0), 0);
  assert.equal(
    getTheaterScreenCurveOffset(THEATER_SCREEN_WIDTH / 2),
    -THEATER_SCREEN_CURVE_SAG,
  );
  assert.equal(
    getTheaterScreenCurveOffset(-THEATER_SCREEN_WIDTH / 2),
    -THEATER_SCREEN_CURVE_SAG,
  );
});

test("seat poses form clean, symmetrical rows with a subtle fan", () => {
  const poses = poseMap();
  const left = poses.get("B1")!;
  const centerLeft = poses.get("B4")!;
  const centerRight = poses.get("B5")!;
  const right = poses.get("B8")!;
  const back = poses.get("E4")!;

  assert.ok(left.x < centerLeft.x);
  assert.ok(left.z > centerLeft.z);
  assert.ok(left.z - centerLeft.z < 0.23);
  assert.ok(back.y > centerLeft.y);
  assert.equal(centerLeft.rotationY, 0);
  assert.equal(centerRight.rotationY, 0);
  assert.ok(left.rotationY < 0);
  assert.ok(right.rotationY > 0);
  assert.ok(Math.abs(left.rotationY) <= 0.12);
  assert.ok(Math.abs(right.rotationY) <= 0.12);
  assert.ok(-Math.sin(left.rotationY) > 0);
  assert.ok(-Math.sin(right.rotationY) < 0);
  assert.ok(Math.abs(left.x + right.x) < 1e-9);
  assert.ok(Math.abs(left.z - right.z) < 1e-9);
  assert.ok(Math.abs(left.rotationY + right.rotationY) < 1e-9);
  assert.equal(left.scale, 1);
  assert.equal(poses.get("C3")?.scale, 1);

  const row = [...poses.values()]
    .filter((pose) => pose.row === "B")
    .sort((leftPose, rightPose) => leftPose.column - rightPose.column);
  for (const block of [row.slice(0, 4), row.slice(4)]) {
    for (let index = 1; index < block.length; index += 1) {
      assert.ok(
        Math.abs(block[index]!.x - block[index - 1]!.x - THEATER_SEAT_SPACING) <
          1e-9,
      );
    }
  }
  assert.ok(centerRight.x - centerLeft.x > THEATER_SEAT_SPACING * 1.9);
});

test("layout uses the existing row seat count and labels", () => {
  const seats = theaterSeats().filter(
    (record) => !(record.row === "C" && record.column === 8),
  );
  const poses = getTheaterSeatPoses(seats);
  const reversedPoses = poseMap([...seats].reverse());
  const byLabel = new Map(poses.map((pose) => [pose.label, pose]));

  assert.equal(poses.length, seats.length);
  assert.deepEqual(
    new Set(poses.map((pose) => pose.label)),
    new Set(seats.map((record) => record.label)),
  );
  poses.forEach((pose) =>
    assert.deepEqual(pose, reversedPoses.get(pose.label)),
  );
  assert.ok(Math.abs(byLabel.get("C3")!.x + byLabel.get("C4")!.x) < 1e-9);
});

test("seat rows leave a centered aisle and mirror across it", () => {
  const poses = poseMap();
  const left = poses.get("C4")!;
  const right = poses.get("C5")!;

  assert.equal(THEATER_CENTER_AISLE_WIDTH, 1.15);
  assert.ok(right.x - left.x > THEATER_CENTER_AISLE_WIDTH + 0.8);
  assert.ok(Math.abs(left.x + right.x) < 1e-9);
  assert.ok(Math.abs(left.z - right.z) < 1e-9);
});

test("row platforms rise with the seating tiers", () => {
  const front = getTheaterRowPlatformPose(0);
  const rear = getTheaterRowPlatformPose(4);

  assert.equal(front.topY, 0.2);
  assert.ok(Math.abs(rear.topY - front.topY - 0.88) < 1e-9);
  assert.ok(Math.abs(rear.z - front.z - 4 * THEATER_ROW_SPACING) < 1e-9);
});

test("seat cameras keep a fixed lens and use bounded cinematic easing", () => {
  const poses = poseMap();
  const front = getSeatCameraPose(poses.get("A4")!);
  const side = getSeatCameraPose(poses.get("D1")!);

  assert.notDeepEqual(front.position, side.position);
  assert.equal(front.fov, THEATER_SEAT_CAMERA_FOV);
  assert.equal(side.fov, THEATER_SEAT_CAMERA_FOV);
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(easeInOutCubic(0.25) < 0.25);
  assert.ok(easeInOutCubic(0.75) > 0.75);
});

test("seat POV follows the selected seat position and local orientation", () => {
  const pose = {
    ...poseMap().get("C4")!,
    x: 1.7,
    y: 0.63,
    z: 2.4,
    rotationY: Math.PI / 2,
  };
  const camera = getSeatCameraPose(pose);

  assert.ok(
    Math.abs(
      camera.position.x -
        (pose.x + THEATER_SEAT_CAMERA_REAR_OFFSET * Math.sin(pose.rotationY)),
    ) < 1e-9,
  );
  assert.equal(camera.position.y, pose.y + THEATER_SEAT_EYE_HEIGHT);
  assert.ok(
    Math.abs(
      camera.position.z -
        (pose.z + THEATER_SEAT_CAMERA_REAR_OFFSET * Math.cos(pose.rotationY)),
    ) < 1e-9,
  );
  assert.deepEqual(camera.target, THEATER_SCREEN_CENTER);
});

test("camera transitions arc above the seats and keep their endpoints", () => {
  const from = { x: -2, y: 1.6, z: 2.2 };
  const to = { x: 1.8, y: 2.1, z: 3.6 };
  const start = getTheaterCameraTransitionPosition(from, to, 0);
  const middle = getTheaterCameraTransitionPosition(from, to, 0.5);
  const end = getTheaterCameraTransitionPosition(from, to, 1);

  assert.deepEqual(start, from);
  assert.ok(middle.y > Math.max(from.y, to.y));
  assert.deepEqual(end, to);
});

test("screen camera is centered on the cinema screen", () => {
  const camera = getScreenCameraPose();

  assert.deepEqual(camera.target, THEATER_SCREEN_CENTER);
  assert.ok(camera.position.z > 0);
  assert.equal(camera.fov, 48);
});

test("seat POVs aim at the cinema screen from front, middle, and rear rows", () => {
  const seats = theaterSeats();
  const poses = poseMap(seats);
  const samples = ["A4", "C1", "C4", "C8", "E4", "E8"];

  for (const label of samples) {
    const seatPose = poses.get(label)!;
    const camera = getSeatCameraPose(seatPose);
    assert.deepEqual(camera.target, THEATER_SCREEN_CENTER, label);
    assert.equal(camera.position.y, seatPose.y + 1.18, label);
  }
});

test("keyboard seat navigation follows rows and clamps at the map edges", () => {
  const seats = [
    seat("A1", "A", 1),
    seat("A2", "A", 2),
    seat("A3", "A", 3),
    seat("B1", "B", 1),
    seat("B2", "B", 2),
    seat("B3", "B", 3),
  ];

  assert.equal(getAdjacentTheaterSeat(seats, "A2", "left")?.label, "A1");
  assert.equal(getAdjacentTheaterSeat(seats, "A2", "right")?.label, "A3");
  assert.equal(getAdjacentTheaterSeat(seats, "A2", "down")?.label, "B2");
  assert.equal(getAdjacentTheaterSeat(seats, "B2", "up")?.label, "A2");
  assert.equal(getAdjacentTheaterSeat(seats, "A1", "left")?.label, "A1");
  assert.equal(getAdjacentTheaterSeat([], null, "right"), null);
});
