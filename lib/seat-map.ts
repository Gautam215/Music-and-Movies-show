export const SEAT_ROWS = ["A", "B", "C", "D", "E"] as const;
export const SEATS_PER_ROW = 8;

export type SeatStatus = "available" | "occupied" | "held";
export type SeatTier = "standard" | "premium" | "accessible";

const SEAT_CAMERA_MAX_YAW = 0.72;
const SEAT_CAMERA_MAX_SIDE_OFFSET = 6.7;

export type SeatRecord = {
  label: string;
  row: string;
  column: number;
  status: SeatStatus;
  tier: SeatTier;
  priceDelta: number;
  viewQuality: number;
  position: { x: number; y: number; z: number };
  rotationY: number;
};

const reservedLabels = new Set(["A3", "A4", "C6", "D2", "D3", "E7"]);

function seedValue(seed: string) {
  return [...seed].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) % 997,
    7,
  );
}

export function createSeatMap(seed = "reelroom-demo") {
  const offset = seedValue(seed) % 5;
  return SEAT_ROWS.flatMap((row, rowIndex) =>
    Array.from({ length: SEATS_PER_ROW }, (_, index) => {
      const column = index + 1;
      const label = `${row}${column}`;
      const golden = row === "C" && column >= 3 && column <= 6;
      const accessible = row === "E" && column === 1;
      const held = (rowIndex * SEATS_PER_ROW + column + offset) % 19 === 0;
      const status: SeatStatus = reservedLabels.has(label)
        ? "occupied"
        : held
          ? "held"
          : "available";
      return {
        label,
        row,
        column,
        status,
        tier: accessible ? "accessible" : golden ? "premium" : "standard",
        priceDelta: golden ? 3 : row === "B" ? 1 : 0,
        viewQuality: Math.max(
          72,
          100 - Math.abs(column - 4.5) * 5 - rowIndex * 2,
        ),
        position: {
          x: (column - 4.5) * 1.05,
          y: 0.34,
          z: rowIndex * 1.02,
        },
        rotationY: (4.5 - column) * 0.035,
      } satisfies SeatRecord;
    }),
  );
}

export function isWebglAvailable(
  getContext: (kind: "webgl2" | "webgl") => unknown,
) {
  return Boolean(getContext("webgl2") || getContext("webgl"));
}

export function clampSeatCamera(yaw: number, pitch: number, distance: number) {
  const clampedPitch = Math.max(0.12, Math.min(1.04, pitch));
  const clampedDistance = Math.max(5.4, Math.min(12, distance));
  const horizontalDistance = Math.cos(clampedPitch) * clampedDistance;
  const wallLimitedYaw = Math.asin(
    Math.min(1, SEAT_CAMERA_MAX_SIDE_OFFSET / horizontalDistance),
  );
  const maxYaw = Math.min(SEAT_CAMERA_MAX_YAW, wallLimitedYaw);

  return {
    yaw: Math.max(-maxYaw, Math.min(maxYaw, yaw)),
    pitch: clampedPitch,
    distance: clampedDistance,
  };
}
