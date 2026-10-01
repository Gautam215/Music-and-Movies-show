import type { SeatRecord } from "@/lib/seat-map";

export type TheaterZone = "premium" | "standard" | "economy" | "accessible";

export type TheaterSeatPose = {
  label: string;
  row: string;
  column: number;
  zone: TheaterZone;
  rowIndex: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  distanceToScreen: number;
};

export type TheaterCameraPose = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
};

export type TheaterPoint3 = { x: number; y: number; z: number };

export type TheaterSeatDirection = "left" | "right" | "up" | "down";

const ROWS = ["A", "B", "C", "D", "E"] as const;
export const THEATER_ROW_COUNT = ROWS.length;
const ROW_RISE = 0.22;
export const THEATER_ROW_SPACING = 1.32;
export const THEATER_SEAT_SPACING = 1.05;
const FRONT_ROW_Z = -2.25;
const PLATFORM_FRONT_Y = 0.2;
const PLATFORM_THICKNESS = 0.18;
const SEAT_HALF_WIDTH = 0.4;
const SEAT_AISLE_CLEARANCE = 0.08;
const ROW_ARC_SAG = 0.22;
const MAX_INWARD_ROTATION = 0.12;
export const THEATER_SEAT_EYE_HEIGHT = 1.18;
export const THEATER_SEAT_CAMERA_REAR_OFFSET = 0.32;
export const THEATER_SEAT_CAMERA_FOV = 48;
export const THEATER_SCREEN_WIDTH = 7.6;
export const THEATER_SCREEN_HEIGHT = 3.18;
export const THEATER_SCREEN_CURVE_SAG = 0.15;
export const THEATER_SCREEN_CENTER = { x: 0, y: 3.55, z: -4.6 } as const;
export const THEATER_CENTER_AISLE_WIDTH = 1.15;

export function getTheaterScreenCurveOffset(x: number) {
  const normalizedX = Math.min(1, Math.abs(x) / (THEATER_SCREEN_WIDTH / 2));
  return normalizedX === 0 ? 0 : -THEATER_SCREEN_CURVE_SAG * normalizedX ** 2;
}

export function getSeatZone(seat: Pick<SeatRecord, "row" | "column" | "tier">) {
  if (seat.tier === "premium") return "premium" as const;
  if (seat.tier === "accessible") return "accessible" as const;
  if (
    seat.row === "D" ||
    seat.row === "E" ||
    seat.column === 1 ||
    seat.column === 8
  )
    return "economy" as const;
  return "standard" as const;
}

export function getTheaterRowPlatformPose(rowIndex: number) {
  const index = Math.max(
    0,
    Math.min(THEATER_ROW_COUNT - 1, Math.floor(rowIndex)),
  );
  const topY = PLATFORM_FRONT_Y + index * ROW_RISE;
  return {
    centerY: topY - PLATFORM_THICKNESS / 2,
    topY,
    z: FRONT_ROW_Z + index * THEATER_ROW_SPACING,
  };
}

function getTheaterSeatPose(
  seat: SeatRecord,
  index: number,
  seatIndex: number,
  seatsInRow: number,
): TheaterSeatPose {
  const zone = getSeatZone(seat);
  const leftBlockSize = Math.floor(seatsInRow / 2);
  const isLeft = seatIndex < leftBlockSize;
  const side = isLeft ? -1 : 1;
  const blockSeatCount = isLeft ? leftBlockSize : seatsInRow - leftBlockSize;
  const seatIndexFromAisle = isLeft
    ? leftBlockSize - seatIndex - 1
    : seatIndex - leftBlockSize;
  const largestBlockSize = Math.max(leftBlockSize, seatsInRow - leftBlockSize);
  const innerSeatX =
    THEATER_CENTER_AISLE_WIDTH / 2 + SEAT_HALF_WIDTH + SEAT_AISLE_CLEARANCE;
  const x =
    side * (innerSeatX + seatIndexFromAisle * THEATER_SEAT_SPACING);
  const outerSeatX =
    innerSeatX + Math.max(0, largestBlockSize - 1) * THEATER_SEAT_SPACING;
  const rowPlatform = getTheaterRowPlatformPose(index);
  const z = rowPlatform.z + ROW_ARC_SAG * (Math.abs(x) / outerSeatX) ** 2;
  const y = rowPlatform.topY + 0.1;
  const rotationProgress =
    blockSeatCount > 1 ? seatIndexFromAisle / (blockSeatCount - 1) : 0;

  return {
    label: seat.label,
    row: seat.row,
    column: seat.column,
    zone,
    rowIndex: index,
    x,
    y,
    z,
    rotationY:
      rotationProgress === 0
        ? 0
        : side * MAX_INWARD_ROTATION * rotationProgress,
    scale: 1,
    distanceToScreen: Math.hypot(
      THEATER_SCREEN_CENTER.x - x,
      THEATER_SCREEN_CENTER.y - y,
      THEATER_SCREEN_CENTER.z - z,
    ),
  };
}

export function getTheaterSeatPoses(
  seats: readonly SeatRecord[],
): TheaterSeatPose[] {
  const seatsByRow = new Map<string, SeatRecord[]>();
  seats.forEach((seat) => {
    const rowSeats = seatsByRow.get(seat.row) ?? [];
    rowSeats.push(seat);
    seatsByRow.set(seat.row, rowSeats);
  });
  seatsByRow.forEach((rowSeats) =>
    rowSeats.sort(
      (left, right) =>
        left.column - right.column || left.label.localeCompare(right.label),
    ),
  );
  const rowIndexes = new Map(
    [...seatsByRow.keys()]
      .sort(compareRows)
      .map((row, index) => [row, index] as const),
  );

  return seats.map((seat) => {
    const rowSeats = seatsByRow.get(seat.row) ?? [];
    return getTheaterSeatPose(
      seat,
      rowIndexes.get(seat.row) ?? 0,
      rowSeats.findIndex((rowSeat) => rowSeat.label === seat.label),
      rowSeats.length,
    );
  });
}

export function getScreenCameraPose(): TheaterCameraPose {
  return {
    position: { x: 0, y: 2.1, z: 3.6 },
    target: THEATER_SCREEN_CENTER,
    fov: 48,
  };
}

export function getSeatCameraPose(pose: TheaterSeatPose): TheaterCameraPose {
  const rearOffset = THEATER_SEAT_CAMERA_REAR_OFFSET;
  const position = {
    x: pose.x + Math.sin(pose.rotationY) * rearOffset,
    y: pose.y + THEATER_SEAT_EYE_HEIGHT,
    z: pose.z + Math.cos(pose.rotationY) * rearOffset,
  };
  return {
    position,
    target: THEATER_SCREEN_CENTER,
    fov: THEATER_SEAT_CAMERA_FOV,
  };
}

export function getTheaterCameraTransitionPosition(
  from: TheaterPoint3,
  to: TheaterPoint3,
  progress: number,
  result: TheaterPoint3 = { x: 0, y: 0, z: 0 },
) {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.max(from.y, to.y, 3.2) + 1.2;
  const controlZ = (from.z + to.z) / 2;

  result.x =
    inverse * inverse * from.x + 2 * inverse * t * controlX + t * t * to.x;
  result.y =
    inverse * inverse * from.y + 2 * inverse * t * controlY + t * t * to.y;
  result.z =
    inverse * inverse * from.z + 2 * inverse * t * controlZ + t * t * to.z;
  return result;
}

function compareRows(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true });
}

export function getAdjacentTheaterSeat<
  T extends Pick<SeatRecord, "label" | "row" | "column">,
>(seats: T[], activeLabel: string | null, direction: TheaterSeatDirection) {
  if (!seats.length) return null;
  const current = seats.find((seat) => seat.label === activeLabel) ?? seats[0];
  if (!current) return null;

  if (direction === "left" || direction === "right") {
    const rowSeats = seats
      .filter((seat) => seat.row === current.row)
      .sort((left, right) => left.column - right.column);
    const index = rowSeats.findIndex((seat) => seat.label === current.label);
    const nextIndex = Math.max(
      0,
      Math.min(rowSeats.length - 1, index + (direction === "left" ? -1 : 1)),
    );
    return rowSeats[nextIndex] ?? current;
  }

  const rows = [...new Set(seats.map((seat) => seat.row))].sort(compareRows);
  const rowIndex = rows.indexOf(current.row);
  const nextRowIndex = Math.max(
    0,
    Math.min(rows.length - 1, rowIndex + (direction === "up" ? -1 : 1)),
  );
  const nextRow = rows[nextRowIndex];
  return (
    seats
      .filter((seat) => seat.row === nextRow)
      .sort(
        (left, right) =>
          Math.abs(left.column - current.column) -
            Math.abs(right.column - current.column) ||
          left.column - right.column,
      )[0] ?? current
  );
}

export function easeInOutCubic(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
