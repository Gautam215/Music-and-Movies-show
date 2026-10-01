"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type * as THREE from "three";
import {
  Compass,
  Eye,
  Gauge,
  LoaderCircle,
  Minus,
  MonitorPlay,
  Plus,
  RefreshCw,
  Rotate3d,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  clampSeatCamera,
  isWebglAvailable,
  type SeatRecord,
} from "@/lib/seat-map";
import {
  easeInOutCubic,
  getAdjacentTheaterSeat,
  getTheaterCameraTransitionPosition,
  getTheaterRowPlatformPose,
  getTheaterSeatPoses,
  getTheaterScreenCurveOffset,
  getScreenCameraPose,
  getSeatCameraPose,
  getSeatZone,
  THEATER_SCREEN_CENTER,
  THEATER_SCREEN_HEIGHT,
  THEATER_SCREEN_WIDTH,
  THEATER_CENTER_AISLE_WIDTH,
  THEATER_ROW_SPACING,
  THEATER_ROW_COUNT,
  type TheaterSeatDirection,
  type TheaterSeatPose,
  type TheaterZone,
} from "@/modules/theater/frontend/seat-geometry";

type ThreeModule = typeof import("three");
type ViewStatus = "loading" | "ready" | "unsupported" | "error" | "disabled";
type QualityMode = "full" | "reduced";
type CameraMode = "overview" | "pov" | "screen";

type Props = {
  seats: SeatRecord[];
  selectedSeats: string[];
  liveVersion: string;
  onToggleSeat: (label: string) => void;
  onHoverSeat: (seat: SeatRecord | null) => void;
  onFallback: () => void;
};

type ZoneMeshes = {
  zone: TheaterZone;
  indexes: number[];
  seats: THREE.InstancedMesh;
  backs: THREE.InstancedMesh;
  armrests: THREE.InstancedMesh;
  footrests: THREE.InstancedMesh | null;
};

type SceneRuntime = {
  three: ThreeModule;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  zones: ZoneMeshes[];
  seats: SeatRecord[];
  updateSeats: (nextSeats: SeatRecord[], selected: string[]) => void;
  raycastSeat: (event: PointerEvent) => SeatRecord | null;
  focusSeat: (label: string) => void;
  focusScreen: () => void;
  exitPov: () => void;
  adjustOrbit: (change: OrbitChange) => void;
  setQuality: (next: QualityMode) => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
};

type OrbitChange = {
  yawDelta?: number;
  distanceDelta?: number;
  reset?: boolean;
};

type AudioRuntime = {
  context: AudioContext;
  master: GainNode;
  oscillators: OscillatorNode[];
  projectorPanner: PannerNode;
};

type ConnectionInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionInformation;
};

function makeRoundedBoxGeometry(
  three: ThreeModule,
  width: number,
  height: number,
  depth: number,
  bevel = 0.04,
) {
  const edge = Math.min(bevel, width / 5, height / 5, depth / 5);
  const halfWidth = (width - edge * 2) / 2;
  const halfHeight = (height - edge * 2) / 2;
  const radius = Math.min(edge * 1.6, halfWidth, halfHeight);
  const shape = new three.Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(
    halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight + radius,
  );
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(
    -halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight - radius,
  );
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(
    -halfWidth,
    -halfHeight,
    -halfWidth + radius,
    -halfHeight,
  );

  const innerDepth = depth - edge * 2;
  const geometry = new three.ExtrudeGeometry(shape, {
    depth: innerDepth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: edge,
    bevelThickness: edge,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -innerDepth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function makeRoundedSeatCushionGeometry(
  three: ThreeModule,
  width: number,
  height: number,
  depth: number,
) {
  const geometry = makeRoundedBoxGeometry(three, width, depth, height, 0.05);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function makeSeatBackGeometry(
  three: ThreeModule,
  width: number,
  height: number,
  depth: number,
) {
  const geometry = makeRoundedBoxGeometry(three, width, height, depth);
  geometry.rotateX(0.08);
  return geometry;
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type TheaterEvent =
  | "seat_hover"
  | "seat_selected"
  | "POV_enter"
  | "POV_exit"
  | "network_fallback_triggered"
  | "seat_locked"
  | "seat_released"
  | "seat_booked";

const THEATER_3D_ENABLED =
  process.env.NEXT_PUBLIC_THEATER_3D_ENABLED !== "false";

function getInitialQuality(): QualityMode {
  if (typeof navigator === "undefined") return "full";
  const connection = (navigator as NavigatorWithConnection).connection;
  return !navigator.onLine ||
    connection?.saveData ||
    ["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
    ? "reduced"
    : "full";
}

function getAudioConstructor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext ?? null
  );
}

function trackTheaterEvent(
  event: TheaterEvent,
  metadata: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("reelroom-theater-analytics", {
      detail: { event, ...metadata },
    }),
  );
}

function makeSeatLabelAtlas(three: ThreeModule, poses: TheaterSeatPose[]) {
  const columns = 8;
  const rows = 5;
  const cellSize = 64;
  const canvas = document.createElement("canvas");
  canvas.width = columns * cellSize;
  canvas.height = rows * cellSize;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indexes: number[] = [];
  poses.forEach((pose) => {
    const column = pose.column - 1;
    const row = pose.rowIndex;
    if (column < 0 || column >= columns || row < 0 || row >= rows) return;

    const cellX = column * cellSize;
    const cellY = row * cellSize;
    context.fillStyle = "#151923";
    context.fillRect(cellX, cellY, cellSize, cellSize);
    context.strokeStyle = "#b89966";
    context.lineWidth = 2;
    context.strokeRect(cellX + 3, cellY + 3, cellSize - 6, cellSize - 6);
    context.fillStyle = "#f4d28c";
    context.font = "600 27px ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(pose.label, cellX + cellSize / 2, cellY + cellSize / 2);

    const halfWidth = 0.18;
    const halfHeight = 0.062;
    const localDepth = 0.347;
    const corners = [
      [-halfWidth, -halfHeight, localDepth],
      [halfWidth, -halfHeight, localDepth],
      [halfWidth, halfHeight, localDepth],
      [-halfWidth, halfHeight, localDepth],
    ];
    const cosine = Math.cos(pose.rotationY);
    const sine = Math.sin(pose.rotationY);
    const base = positions.length / 3;
    corners.forEach(([x, y, z]) => {
      positions.push(
        pose.x + x * cosine + z * sine,
        pose.y + 0.44 + y,
        pose.z - x * sine + z * cosine,
      );
    });

    const u0 = column / columns;
    const u1 = (column + 1) / columns;
    const v1 = 1 - row / rows;
    const v0 = 1 - (row + 1) / rows;
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    indexes.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  const geometry = new three.BufferGeometry();
  geometry.setAttribute(
    "position",
    new three.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new three.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indexes);
  geometry.computeVertexNormals();

  const texture = new three.CanvasTexture(canvas);
  texture.colorSpace = three.SRGBColorSpace;
  return { geometry, texture };
}

function setPannerPosition(
  panner: PannerNode,
  position: { x: number; y: number; z: number },
) {
  const spatialPanner = panner as PannerNode & {
    positionX?: AudioParam;
    positionY?: AudioParam;
    positionZ?: AudioParam;
  };
  const now = panner.context.currentTime;
  if (
    spatialPanner.positionX &&
    spatialPanner.positionY &&
    spatialPanner.positionZ
  ) {
    spatialPanner.positionX.setTargetAtTime(position.x, now, 0.06);
    spatialPanner.positionY.setTargetAtTime(position.y, now, 0.06);
    spatialPanner.positionZ.setTargetAtTime(position.z, now, 0.06);
  } else {
    panner.setPosition(position.x, position.y, position.z);
  }
}

function setAudioListenerPosition(
  context: AudioContext,
  position: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
) {
  const listener = context.listener as AudioListener & {
    positionX?: AudioParam;
    positionY?: AudioParam;
    positionZ?: AudioParam;
    forwardX?: AudioParam;
    forwardY?: AudioParam;
    forwardZ?: AudioParam;
    upX?: AudioParam;
    upY?: AudioParam;
    upZ?: AudioParam;
  };
  const now = context.currentTime;
  if (listener.positionX && listener.positionY && listener.positionZ) {
    listener.positionX.setTargetAtTime(position.x, now, 0.08);
    listener.positionY.setTargetAtTime(position.y, now, 0.08);
    listener.positionZ.setTargetAtTime(position.z, now, 0.08);
  } else {
    listener.setPosition(position.x, position.y, position.z);
  }

  if (
    listener.forwardX &&
    listener.forwardY &&
    listener.forwardZ &&
    listener.upX &&
    listener.upY &&
    listener.upZ
  ) {
    listener.forwardX.setTargetAtTime(forward.x, now, 0.08);
    listener.forwardY.setTargetAtTime(forward.y, now, 0.08);
    listener.forwardZ.setTargetAtTime(forward.z, now, 0.08);
    listener.upX.setTargetAtTime(0, now, 0.08);
    listener.upY.setTargetAtTime(1, now, 0.08);
    listener.upZ.setTargetAtTime(0, now, 0.08);
  } else {
    listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
  }
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const uniqueMaterials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => {
      if (!material) return;
      const materialWithMap = material as THREE.Material & {
        map?: THREE.Texture | null;
      };
      if (materialWithMap.map) textures.add(materialWithMap.map);
      uniqueMaterials.add(material);
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  uniqueMaterials.forEach((material) => material.dispose());
}

function isSeatRecord(value: unknown): value is SeatRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.row === "string" &&
    typeof candidate.column === "number" &&
    ["available", "occupied", "held"].includes(String(candidate.status)) &&
    ["standard", "premium", "accessible"].includes(String(candidate.tier))
  );
}

function parseSeatStreamMessage(raw: string) {
  try {
    const value = JSON.parse(raw) as {
      type?: string;
      seats?: unknown;
    };
    const seats = Array.isArray(value.seats)
      ? value.seats.filter(isSeatRecord)
      : [];
    return {
      type: value.type ?? "seat_sync",
      seats,
    };
  } catch {
    return null;
  }
}

function seatColor(three: ThreeModule, seat: SeatRecord, selected: boolean) {
  if (selected) return new three.Color("#f4d28c");
  if (seat.status === "occupied") return new three.Color("#303444");
  if (seat.status === "held") return new three.Color("#6d75b6");
  if (seat.tier === "premium") return new three.Color("#7c88ff");
  if (seat.tier === "accessible") return new three.Color("#72d6bd");
  if (getSeatZone(seat) === "economy") return new three.Color("#77809f");
  return new three.Color("#a7aec7");
}

export function TicketSeat3DView({
  seats,
  selectedSeats,
  liveVersion,
  onToggleSeat,
  onHoverSeat,
  onFallback,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const seatsRef = useRef(seats);
  const selectedRef = useRef(selectedSeats);
  const toggleRef = useRef(onToggleSeat);
  const hoverRef = useRef(onHoverSeat);
  const [status, setStatus] = useState<ViewStatus>(
    THEATER_3D_ENABLED ? "loading" : "disabled",
  );
  const [qualityMode, setQualityMode] =
    useState<QualityMode>(getInitialQuality);
  const qualityRef = useRef(qualityMode);
  const [networkOnline, setNetworkOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [screenView, setScreenView] = useState(false);
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [ambienceVolume, setAmbienceVolume] = useState(0.025);
  const [heading, setHeading] = useState("center");
  const [focusedSeat, setFocusedSeat] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reducedMotionRef = useRef(false);
  const keyboardSeatRef = useRef<string | null>(null);
  const audioRef = useRef<AudioRuntime | null>(null);
  const headingRef = useRef(heading);

  useEffect(() => {
    seatsRef.current = seats;
    selectedRef.current = selectedSeats;
    toggleRef.current = onToggleSeat;
    hoverRef.current = onHoverSeat;
    if (
      keyboardSeatRef.current &&
      !seats.some((seat) => seat.label === keyboardSeatRef.current)
    )
      keyboardSeatRef.current = selectedSeats.at(-1) ?? null;
    runtimeRef.current?.updateSeats(seats, selectedSeats);
  }, [seats, selectedSeats, onToggleSeat, onHoverSeat]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("reelroom.seat3d.tutorial") !== "seen")
        return;
      const frame = window.requestAnimationFrame(() => setTutorialOpen(false));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!THEATER_3D_ENABLED || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/ticket-seat-cache-sw.js", { scope: "/" })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setNetworkOnline(true);
      trackTheaterEvent("network_fallback_triggered", { state: "online" });
    };
    const goOffline = () => {
      setNetworkOnline(false);
      runtimeRef.current?.setQuality("reduced");
      trackTheaterEvent("network_fallback_triggered", { state: "offline" });
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      reducedMotionRef.current = preference.matches;
      runtimeRef.current?.setReducedMotion(preference.matches);
    };
    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const streamUrl = process.env.NEXT_PUBLIC_TICKET_SEAT_STREAM_URL?.trim();
    if (!streamUrl) return;

    let stream: EventSource | WebSocket | null = null;
    const handleMessage = (raw: string) => {
      const message = parseSeatStreamMessage(raw);
      if (!message || !message.seats.length) return;
      runtimeRef.current?.updateSeats(message.seats, selectedRef.current);
      if (
        message.type === "seat_locked" ||
        message.type === "seat_released" ||
        message.type === "seat_booked"
      ) {
        trackTheaterEvent(message.type, { count: message.seats.length });
      }
    };

    try {
      if (streamUrl.startsWith("ws")) {
        const socket = new WebSocket(streamUrl);
        socket.onmessage = (event) => handleMessage(String(event.data));
        socket.onerror = () =>
          trackTheaterEvent("network_fallback_triggered", {
            source: "websocket",
          });
        stream = socket;
      } else {
        const source = new EventSource(streamUrl);
        source.onmessage = (event) => handleMessage(event.data);
        source.onerror = () =>
          trackTheaterEvent("network_fallback_triggered", { source: "sse" });
        stream = source;
      }
    } catch {
      trackTheaterEvent("network_fallback_triggered", { source: "stream" });
    }

    return () => {
      if (stream instanceof WebSocket) stream.close();
      else stream?.close();
    };
  }, []);

  useEffect(() => {
    if (!THEATER_3D_ENABLED) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getContext = (
      kind: "webgl2" | "webgl",
    ): WebGLRenderingContext | WebGL2RenderingContext | null =>
      canvas.getContext(kind, {
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!isWebglAvailable(getContext)) {
      window.setTimeout(() => setStatus("unsupported"), 0);
      trackTheaterEvent("network_fallback_triggered", { source: "webgl" });
      return;
    }

    let cancelled = false;
    let frame = 0;
    let idleHandle: number | null = null;
    let cleanupInteractions = () => undefined;

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const loadScene = async () => {
      setStatus("loading");
      try {
        const three = await import("three");
        if (cancelled) return;
        const context = getContext("webgl2") ?? getContext("webgl");
        if (!context) {
          setStatus("unsupported");
          trackTheaterEvent("network_fallback_triggered", { source: "webgl" });
          return;
        }

        const renderer = new three.WebGLRenderer({
          canvas,
          context,
          antialias: true,
          alpha: true,
        });
        renderer.outputColorSpace = three.SRGBColorSpace;
        renderer.toneMapping = three.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.type = three.PCFSoftShadowMap;

        const scene = new three.Scene();
        scene.background = new three.Color("#090b13");
        scene.fog = new three.Fog("#090b13", 13, 30);
        const camera = new three.PerspectiveCamera(38, 1, 0.1, 60);
        const room = new three.Group();
        scene.add(room);
        const audioForward = new three.Vector3();
        const syncAudioListener = () => {
          const audio = audioRef.current;
          if (!audio) return;
          camera.getWorldDirection(audioForward);
          setAudioListenerPosition(
            audio.context,
            camera.position,
            audioForward,
          );
        };

        const floor = new three.Mesh(
          new three.PlaneGeometry(14, 12),
          new three.MeshStandardMaterial({
            color: "#111521",
            roughness: 0.84,
            metalness: 0.08,
          }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        room.add(floor);

        const wallMaterial = new three.MeshStandardMaterial({
          color: "#141824",
          roughness: 0.92,
          metalness: 0.04,
        });
        const screenWall = new three.Mesh(
          new three.BoxGeometry(14, 5.6, 0.28),
          wallMaterial,
        );
        screenWall.position.set(0, 2.8, -5.05);
        screenWall.receiveShadow = true;
        room.add(screenWall);

        const sideWallGeometry = new three.BoxGeometry(0.18, 4.8, 11.4);
        for (const side of [-1, 1]) {
          const wall = new three.Mesh(sideWallGeometry, wallMaterial);
          wall.position.set(side * 6.9, 2.4, 0.1);
          wall.receiveShadow = true;
          room.add(wall);
        }

        const acousticPanels = new three.InstancedMesh(
          new three.BoxGeometry(0.07, 2.7, 0.34),
          new three.MeshStandardMaterial({
            color: "#202635",
            roughness: 0.86,
          }),
          20,
        );
        const panelTransform = new three.Object3D();
        let panelIndex = 0;
        for (const side of [-1, 1]) {
          for (let index = 0; index < 10; index += 1) {
            panelTransform.position.set(side * 6.77, 1.9, -4.5 + index);
            panelTransform.updateMatrix();
            acousticPanels.setMatrixAt(panelIndex, panelTransform.matrix);
            panelIndex += 1;
          }
        }
        acousticPanels.instanceMatrix.needsUpdate = true;
        acousticPanels.castShadow = true;
        acousticPanels.receiveShadow = true;
        room.add(acousticPanels);

        const wallAccent = new three.InstancedMesh(
          new three.BoxGeometry(0.04, 0.035, 10.2),
          new three.MeshStandardMaterial({
            color: "#78613c",
            emissive: "#60451f",
            emissiveIntensity: 0.36,
            roughness: 0.62,
          }),
          2,
        );
        for (const [index, side] of [-1, 1].entries()) {
          panelTransform.position.set(side * 6.76, 0.18, 0.1);
          panelTransform.updateMatrix();
          wallAccent.setMatrixAt(index, panelTransform.matrix);
        }
        wallAccent.instanceMatrix.needsUpdate = true;
        room.add(wallAccent);

        const aisleMaterial = new three.MeshStandardMaterial({
          color: "#202535",
          roughness: 0.82,
          metalness: 0.08,
        });
        const platformWidth = 4.05;
        const sideAisleWidth = 0.58;
        const sideAisleOffset =
          THEATER_CENTER_AISLE_WIDTH / 2 + platformWidth + sideAisleWidth / 2;
        for (const [x, width] of [
          [0, THEATER_CENTER_AISLE_WIDTH],
          [-sideAisleOffset, sideAisleWidth],
          [sideAisleOffset, sideAisleWidth],
        ] as const) {
          const aisle = new three.Mesh(
            new three.PlaneGeometry(width, 7.2),
            aisleMaterial,
          );
          aisle.rotation.x = -Math.PI / 2;
          aisle.position.set(x, 0.012, 0.3);
          aisle.receiveShadow = true;
          room.add(aisle);
        }

        const stage = new three.Mesh(
          new three.BoxGeometry(8.8, 0.24, 1.42),
          new three.MeshStandardMaterial({
            color: "#202330",
            roughness: 0.72,
            metalness: 0.16,
          }),
        );
        stage.position.set(0, 0.12, -3.55);
        stage.receiveShadow = true;
        room.add(stage);
        const stageLip = new three.Mesh(
          new three.BoxGeometry(8.5, 0.035, 0.08),
          new three.MeshStandardMaterial({
            color: "#b89966",
            emissive: "#5f421e",
            emissiveIntensity: 0.35,
            roughness: 0.52,
          }),
        );
        stageLip.position.set(0, 0.245, -2.86);
        room.add(stageLip);

        const stepMaterial = new three.MeshStandardMaterial({
          color: "#303648",
          roughness: 0.84,
          metalness: 0.06,
        });
        const stepNosingMaterial = new three.MeshStandardMaterial({
          color: "#bc9a65",
          emissive: "#725124",
          emissiveIntensity: 0.42,
          roughness: 0.48,
        });
        const rowPlatforms = new three.InstancedMesh(
          new three.BoxGeometry(1, 0.18, THEATER_ROW_SPACING),
          new three.MeshStandardMaterial({
            color: "#1b202d",
            roughness: 0.9,
            metalness: 0.04,
          }),
          THEATER_ROW_COUNT * 2,
        );
        const aisleSteps = new three.InstancedMesh(
          new three.BoxGeometry(1, 0.18, THEATER_ROW_SPACING - 0.1),
          stepMaterial,
          THEATER_ROW_COUNT * 3,
        );
        const stepNosings = new three.InstancedMesh(
          new three.BoxGeometry(1, 0.025, 0.045),
          stepNosingMaterial,
          THEATER_ROW_COUNT * 3,
        );
        const platformTransform = new three.Object3D();
        const aisleXs = [-sideAisleOffset, 0, sideAisleOffset];
        const aisleWidths = [
          sideAisleWidth,
          THEATER_CENTER_AISLE_WIDTH,
          sideAisleWidth,
        ];
        let platformIndex = 0;
        let stairIndex = 0;
        for (let row = 0; row < THEATER_ROW_COUNT; row += 1) {
          const placement = getTheaterRowPlatformPose(row);
          for (const side of [-1, 1]) {
            platformTransform.position.set(
              side * (THEATER_CENTER_AISLE_WIDTH / 2 + platformWidth / 2),
              placement.centerY,
              placement.z,
            );
            platformTransform.scale.set(platformWidth, 1, 1);
            platformTransform.updateMatrix();
            rowPlatforms.setMatrixAt(platformIndex, platformTransform.matrix);
            platformIndex += 1;
          }
          aisleXs.forEach((x, index) => {
            const width = aisleWidths[index] ?? 0.58;
            platformTransform.position.set(x, placement.centerY, placement.z);
            platformTransform.scale.set(width, 1, 1);
            platformTransform.updateMatrix();
            aisleSteps.setMatrixAt(stairIndex, platformTransform.matrix);
            platformTransform.position.set(
              x,
              placement.topY + 0.0125,
              placement.z - (THEATER_ROW_SPACING - 0.1) / 2 + 0.02,
            );
            platformTransform.scale.set(width - 0.08, 1, 1);
            platformTransform.updateMatrix();
            stepNosings.setMatrixAt(stairIndex, platformTransform.matrix);
            stairIndex += 1;
          });
        }
        rowPlatforms.instanceMatrix.needsUpdate = true;
        aisleSteps.instanceMatrix.needsUpdate = true;
        stepNosings.instanceMatrix.needsUpdate = true;
        rowPlatforms.castShadow = true;
        rowPlatforms.receiveShadow = true;
        aisleSteps.receiveShadow = true;
        room.add(rowPlatforms, aisleSteps, stepNosings);

        const screenMaterial = new three.MeshStandardMaterial({
          color: "#e6e8f4",
          emissive: "#6670b4",
          emissiveIntensity: 0.28,
          roughness: 0.5,
        });
        const screenGeometry = new three.PlaneGeometry(
          THEATER_SCREEN_WIDTH,
          THEATER_SCREEN_HEIGHT,
          32,
          1,
        );
        const screenPositions = screenGeometry.getAttribute("position");
        for (let index = 0; index < screenPositions.count; index += 1) {
          screenPositions.setZ(
            index,
            getTheaterScreenCurveOffset(screenPositions.getX(index)),
          );
        }
        screenPositions.needsUpdate = true;
        screenGeometry.computeVertexNormals();
        screenGeometry.computeBoundingBox();
        screenGeometry.computeBoundingSphere();
        const screen = new three.Mesh(screenGeometry, screenMaterial);
        screen.position.set(
          THEATER_SCREEN_CENTER.x,
          THEATER_SCREEN_CENTER.y,
          THEATER_SCREEN_CENTER.z,
        );
        screen.castShadow = true;
        room.add(screen);

        const screenFrame = new three.Mesh(
          new three.BoxGeometry(
            THEATER_SCREEN_WIDTH + 0.4,
            THEATER_SCREEN_HEIGHT + 0.4,
            0.18,
          ),
          new three.MeshStandardMaterial({
            color: "#292e3d",
            roughness: 0.5,
            metalness: 0.35,
          }),
        );
        screenFrame.position.set(
          0,
          THEATER_SCREEN_CENTER.y,
          THEATER_SCREEN_CENTER.z - 0.32,
        );
        room.add(screenFrame);

        const screenGlow = new three.Mesh(
          new three.PlaneGeometry(
            THEATER_SCREEN_WIDTH + 1.2,
            THEATER_SCREEN_HEIGHT + 0.6,
          ),
          new three.MeshBasicMaterial({
            color: "#5969d8",
            transparent: true,
            opacity: 0.075,
            blending: three.AdditiveBlending,
            depthWrite: false,
          }),
        );
        screenGlow.position.set(
          0,
          THEATER_SCREEN_CENTER.y,
          THEATER_SCREEN_CENTER.z - 0.29,
        );
        room.add(screenGlow);

        const lowDetail = new three.Mesh(
          new three.BoxGeometry(11, 0.08, 6.4),
          new three.MeshStandardMaterial({ color: "#171b29", roughness: 0.92 }),
        );
        const highDetail = new three.Group();
        for (let row = 0; row < 5; row += 1) {
          const points = Array.from({ length: 9 }, (_, index) => {
            const x = (index - 4) * 1.42;
            return new three.Vector3(
              x,
              0.12 + row * 0.22,
              -2.1 + row * 1.06 + x * x * 0.035,
            );
          });
          const curve = new three.CatmullRomCurve3(points);
          const rail = new three.Mesh(
            new three.TubeGeometry(curve, 18, 0.026, 6, false),
            new three.MeshStandardMaterial({
              color: "#687193",
              metalness: 0.45,
              roughness: 0.4,
            }),
          );
          highDetail.add(rail);
        }
        const roomLod = new three.LOD();
        roomLod.addLevel(highDetail, 0);
        roomLod.addLevel(lowDetail, 13);
        room.add(roomLod);

        scene.add(new three.HemisphereLight("#d9dcff", "#080912", 1.7));
        const keyLight = new three.SpotLight(
          "#f4d9b0",
          5.2,
          25,
          Math.PI / 5,
          0.58,
          1.4,
        );
        keyLight.position.set(0, 8, 3);
        keyLight.target = screen;
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        scene.add(keyLight);
        const screenLight = new three.PointLight("#6977ff", 4.2, 16, 2);
        screenLight.position.set(0, 2.8, -3.2);
        scene.add(screenLight);
        const rimLight = new three.PointLight("#7684ff", 2.7, 14, 2);
        rimLight.position.set(-4.5, 2.8, 1.2);
        scene.add(rimLight);

        const poseList = getTheaterSeatPoses(seatsRef.current);
        const poseByLabel = new Map(
          poseList.map((pose) => [pose.label, pose] as const),
        );
        const seatViewBounds = poseList.reduce(
          (bounds, pose) => {
            bounds.minX = Math.min(bounds.minX, pose.x);
            bounds.maxX = Math.max(bounds.maxX, pose.x);
            bounds.minY = Math.min(bounds.minY, pose.y);
            bounds.maxY = Math.max(bounds.maxY, pose.y);
            bounds.minZ = Math.min(bounds.minZ, pose.z);
            bounds.maxZ = Math.max(bounds.maxZ, pose.z);
            return bounds;
          },
          {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity,
            minZ: Infinity,
            maxZ: -Infinity,
          },
        );
        const seatViewCenter = new three.Vector3(
          Number.isFinite(seatViewBounds.minX)
            ? (seatViewBounds.minX + seatViewBounds.maxX) / 2
            : 0,
          Number.isFinite(seatViewBounds.minY)
            ? (seatViewBounds.minY + seatViewBounds.maxY) / 2
            : 0,
          Number.isFinite(seatViewBounds.minZ)
            ? (seatViewBounds.minZ + seatViewBounds.maxZ) / 2
            : 0,
        );
        const seatViewHalfWidth = Number.isFinite(seatViewBounds.minX)
          ? (seatViewBounds.maxX - seatViewBounds.minX) / 2 + 0.45
          : 0.45;
        const seatLabels = makeSeatLabelAtlas(three, poseList);
        if (seatLabels) {
          const labelMesh = new three.Mesh(
            seatLabels.geometry,
            new three.MeshBasicMaterial({
              map: seatLabels.texture,
              side: three.DoubleSide,
              depthWrite: false,
            }),
          );
          labelMesh.renderOrder = 1;
          room.add(labelMesh);
        }
        const zoneMeshes: ZoneMeshes[] = [];
        const zoneOrder: TheaterZone[] = [
          "premium",
          "accessible",
          "standard",
          "economy",
        ];
        const geometryByZone = {
          premium: {
            seat: makeRoundedSeatCushionGeometry(three, 0.68, 0.22, 0.76),
            back: makeSeatBackGeometry(three, 0.78, 0.62, 0.16),
            armrest: makeRoundedBoxGeometry(three, 0.11, 0.27, 0.72),
            armrestOffset: 0.33,
            foot: makeRoundedSeatCushionGeometry(three, 0.68, 0.1, 0.5),
          },
          accessible: {
            seat: makeRoundedSeatCushionGeometry(three, 0.62, 0.22, 0.64),
            back: makeSeatBackGeometry(three, 0.72, 0.62, 0.16),
            armrest: makeRoundedBoxGeometry(three, 0.12, 0.27, 0.6),
            armrestOffset: 0.32,
            foot: null,
          },
          standard: {
            seat: makeRoundedSeatCushionGeometry(three, 0.58, 0.2, 0.66),
            back: makeSeatBackGeometry(three, 0.7, 0.58, 0.15),
            armrest: makeRoundedBoxGeometry(three, 0.1, 0.24, 0.62),
            armrestOffset: 0.32,
            foot: null,
          },
          economy: {
            seat: makeRoundedSeatCushionGeometry(three, 0.52, 0.22, 0.56),
            back: makeSeatBackGeometry(three, 0.64, 0.52, 0.14),
            armrest: makeRoundedBoxGeometry(three, 0.09, 0.22, 0.54),
            armrestOffset: 0.29,
            foot: null,
          },
        } satisfies Record<
          TheaterZone,
          {
            seat: THREE.BufferGeometry;
            back: THREE.BufferGeometry;
            armrest: THREE.BufferGeometry;
            armrestOffset: number;
            foot: THREE.BufferGeometry | null;
          }
        >;

        for (const zone of zoneOrder) {
          const indexes = poseList
            .map((pose, index) => (pose.zone === zone ? index : -1))
            .filter((index) => index !== -1);
          if (!indexes.length) continue;
          const material = new three.MeshStandardMaterial({
            color: "#ffffff",
            roughness: zone === "premium" ? 0.52 : 0.68,
            metalness: zone === "premium" ? 0.16 : 0.08,
          });
          const seatMesh = new three.InstancedMesh(
            geometryByZone[zone].seat,
            material,
            indexes.length,
          );
          const backs = new three.InstancedMesh(
            geometryByZone[zone].back,
            material,
            indexes.length,
          );
          const armrests = new three.InstancedMesh(
            geometryByZone[zone].armrest,
            material,
            indexes.length * 2,
          );
          const footrests = geometryByZone[zone].foot
            ? new three.InstancedMesh(
                geometryByZone[zone].foot,
                material,
                indexes.length,
              )
            : null;
          [seatMesh, backs, armrests, footrests].forEach((mesh) => {
            if (!mesh) return;
            mesh.instanceMatrix.setUsage(three.DynamicDrawUsage);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
            room.add(mesh);
          });
          zoneMeshes.push({
            zone,
            indexes,
            seats: seatMesh,
            backs,
            armrests,
            footrests,
          });
        }

        const raycastObjects: THREE.Object3D[] = [];
        const groupByMesh = new Map<THREE.InstancedMesh, ZoneMeshes>();
        zoneMeshes.forEach((group) => {
          [group.seats, group.backs, group.armrests, group.footrests].forEach(
            (mesh) => {
              if (!mesh) return;
              raycastObjects.push(mesh);
              groupByMesh.set(mesh, group);
            },
          );
        });
        const seatRaycaster = new three.Raycaster();
        const seatPointer = new three.Vector2();
        const seatHits: THREE.Intersection[] = [];
        const overviewPosition = new three.Vector3(0, 5.2, 8.9);
        const overviewTarget = new three.Vector3(0, 2.1, 0.1);
        const currentTarget = overviewTarget.clone();
        camera.position.copy(overviewPosition);
        camera.lookAt(currentTarget);
        syncAudioListener();

        let currentSeats = seatsRef.current;
        let currentPoses = poseList;
        let focusLabel: string | null = null;
        let cameraMode: CameraMode = "overview";
        let orbit = { yaw: 0, pitch: 0.58, distance: 8.4 };
        let transition: {
          startedAt: number;
          duration: number;
          fromPosition: THREE.Vector3;
          fromTarget: THREE.Vector3;
          fromFov: number;
          toPosition: THREE.Vector3;
          toTarget: THREE.Vector3;
          toFov: number;
        } | null = null;
        let povPose: ReturnType<typeof getSeatCameraPose> | null = null;
        let previousHover: string | null = null;
        let lastFpsAt = performance.now();
        let framesSinceFpsCheck = 0;
        let reducedMotion = reducedMotionRef.current;
        let contextLost = false;
        let screenPose: ReturnType<typeof getScreenCameraPose> | null = null;
        const seatTransform = new three.Object3D();
        const transitionPositionScratch = { x: 0, y: 0, z: 0 };
        let render: (now: number) => void = () => undefined;
        const scheduleRender = () => {
          if (
            frame ||
            cancelled ||
            contextLost ||
            document.visibilityState === "hidden"
          )
            return;
          frame = window.requestAnimationFrame(render);
        };
        const stopRender = () => {
          if (frame) window.cancelAnimationFrame(frame);
          frame = 0;
        };

        const updateHeading = () => {
          const next =
            orbit.yaw > 0.25 ? "right" : orbit.yaw < -0.25 ? "left" : "center";
          if (headingRef.current === next) return;
          headingRef.current = next;
          setHeading(next);
        };

        const updateOrbit = (change: OrbitChange) => {
          orbit = clampSeatCamera(
            change.reset ? 0 : orbit.yaw + (change.yawDelta ?? 0),
            change.reset ? 0.58 : orbit.pitch,
            change.reset ? 8.4 : orbit.distance + (change.distanceDelta ?? 0),
          );
          updateHeading();
          scheduleRender();
        };

        const overviewPose = () => {
          const horizontal = Math.cos(orbit.pitch) * orbit.distance;
          const position = new three.Vector3(
            Math.sin(orbit.yaw) * horizontal,
            Math.sin(orbit.pitch) * orbit.distance + 0.25,
            Math.cos(orbit.yaw) * horizontal + 2.2,
          );
          const forward = overviewTarget.clone().sub(position).normalize();
          const seatDepth = seatViewCenter.clone().sub(position).dot(forward);
          const horizontalHalfFov = Math.atan(
            Math.tan(three.MathUtils.degToRad(38) / 2) *
              Math.max(camera.aspect, 0.1),
          );
          const requiredSeatDepth =
            (seatViewHalfWidth * 1.1) / Math.tan(horizontalHalfFov);
          position.addScaledVector(
            forward,
            -Math.max(0, requiredSeatDepth - seatDepth),
          );
          return {
            position,
            target: overviewTarget.clone(),
            fov: 38,
          };
        };

        const renderSeatInstances = () => {
          const selected = new Set(selectedRef.current);
          const focusedPose = focusLabel
            ? currentPoses.find((pose) => pose.label === focusLabel)
            : null;
          const setInstance = (
            mesh: THREE.InstancedMesh,
            localIndex: number,
            pose: TheaterSeatPose,
            scale: number,
            offsetY: number,
            offsetZ: number,
            color: THREE.Color,
          ) => {
            const localZ = offsetZ * scale;
            seatTransform.position.set(
              pose.x + Math.sin(pose.rotationY) * localZ,
              pose.y + offsetY * scale,
              pose.z + Math.cos(pose.rotationY) * localZ,
            );
            seatTransform.rotation.set(0, pose.rotationY, 0);
            seatTransform.scale.setScalar(scale);
            seatTransform.updateMatrix();
            mesh.setMatrixAt(localIndex, seatTransform.matrix);
            mesh.setColorAt(localIndex, color);
          };
          const setArmrests = (
            group: ZoneMeshes,
            localIndex: number,
            pose: TheaterSeatPose,
            scale: number,
            color: THREE.Color,
          ) => {
            const offset = geometryByZone[pose.zone].armrestOffset * scale;
            [-1, 1].forEach((side, armIndex) => {
              seatTransform.position.set(
                pose.x + Math.cos(pose.rotationY) * offset * side,
                pose.y + 0.22 * scale,
                pose.z - Math.sin(pose.rotationY) * offset * side,
              );
              seatTransform.rotation.set(0, pose.rotationY, 0);
              seatTransform.scale.setScalar(scale);
              seatTransform.updateMatrix();
              const instanceIndex = localIndex * 2 + armIndex;
              group.armrests.setMatrixAt(instanceIndex, seatTransform.matrix);
              group.armrests.setColorAt(instanceIndex, color);
            });
          };

          zoneMeshes.forEach((group) => {
            group.indexes.forEach((globalIndex, localIndex) => {
              const pose = currentPoses[globalIndex];
              const seat = currentSeats[globalIndex];
              if (!pose || !seat) return;
              const isFocused = seat.label === focusLabel;
              const emphasis = isFocused ? 1.025 : 1;
              const scale = pose.scale * emphasis;
              const color = seatColor(three, seat, selected.has(seat.label));
              if (focusedPose && !isFocused) {
                const distance = Math.hypot(
                  pose.x - focusedPose.x,
                  pose.z - focusedPose.z,
                );
                color.multiplyScalar(
                  Math.max(0.58, Math.min(1, 0.7 + distance * 0.08)),
                );
              }
              setInstance(group.seats, localIndex, pose, scale, 0, 0, color);
              setInstance(
                group.backs,
                localIndex,
                pose,
                scale,
                0.32,
                0.27,
                color,
              );
              setArmrests(group, localIndex, pose, scale, color);
              if (group.footrests)
                setInstance(
                  group.footrests,
                  localIndex,
                  pose,
                  scale,
                  -0.04,
                  -0.55,
                  color,
                );
            });
            group.seats.instanceMatrix.needsUpdate = true;
            group.backs.instanceMatrix.needsUpdate = true;
            group.armrests.instanceMatrix.needsUpdate = true;
            if (group.footrests)
              group.footrests.instanceMatrix.needsUpdate = true;
            if (group.seats.instanceColor)
              group.seats.instanceColor.needsUpdate = true;
            if (group.backs.instanceColor)
              group.backs.instanceColor.needsUpdate = true;
            if (group.armrests.instanceColor)
              group.armrests.instanceColor.needsUpdate = true;
            if (group.footrests?.instanceColor)
              group.footrests.instanceColor.needsUpdate = true;
            group.seats.computeBoundingSphere();
            group.backs.computeBoundingSphere();
            group.armrests.computeBoundingSphere();
            group.footrests?.computeBoundingSphere();
          });
        };

        const startTransition = (pose: {
          position: { x: number; y: number; z: number };
          target: { x: number; y: number; z: number };
          fov: number;
        }) => {
          const toPosition = new three.Vector3(
            pose.position.x,
            pose.position.y,
            pose.position.z,
          );
          const toTarget = new three.Vector3(
            pose.target.x,
            pose.target.y,
            pose.target.z,
          );
          if (reducedMotion) {
            transition = null;
            camera.position.copy(toPosition);
            currentTarget.copy(toTarget);
            camera.fov = pose.fov;
            camera.lookAt(currentTarget);
            camera.updateProjectionMatrix();
            scheduleRender();
            return;
          }
          transition = {
            startedAt: performance.now(),
            duration: 850,
            fromPosition: camera.position.clone(),
            fromTarget: currentTarget.clone(),
            fromFov: camera.fov,
            toPosition,
            toTarget,
            toFov: pose.fov,
          };
          scheduleRender();
        };

        const beginPov = (label: string) => {
          const pose = poseByLabel.get(label);
          if (!pose) return;
          povPose = getSeatCameraPose(pose);
          screenPose = null;
          focusLabel = label;
          cameraMode = "pov";
          setFocusedSeat(label);
          renderSeatInstances();
          startTransition(povPose);
          trackTheaterEvent("POV_enter", { seat: label, zone: pose.zone });
        };

        const beginScreen = () => {
          cameraMode = "screen";
          focusLabel = null;
          povPose = null;
          screenPose = getScreenCameraPose();
          setFocusedSeat(null);
          renderSeatInstances();
          startTransition(screenPose);
        };

        const beginOverview = () => {
          if (cameraMode === "pov") trackTheaterEvent("POV_exit");
          cameraMode = "overview";
          focusLabel = null;
          povPose = null;
          screenPose = null;
          setFocusedSeat(null);
          renderSeatInstances();
          startTransition(overviewPose());
        };

        const updateSeats = (nextSeats: SeatRecord[], selected: string[]) => {
          currentSeats = nextSeats;
          currentPoses = getTheaterSeatPoses(nextSeats);
          poseByLabel.clear();
          currentPoses.forEach((pose) => poseByLabel.set(pose.label, pose));
          selectedRef.current = selected;
          const nextFocus = selected.at(-1) ?? null;
          if (nextFocus && cameraMode !== "screen" && nextFocus !== focusLabel)
            beginPov(nextFocus);
          if (!nextFocus && focusLabel) beginOverview();
          renderSeatInstances();
          scheduleRender();
        };

        const focusSeat = (label: string) => beginPov(label);
        const focusScreen = () => beginScreen();
        const exitPov = () => beginOverview();

        render = (now: number) => {
          frame = 0;
          if (cancelled || contextLost || document.visibilityState === "hidden")
            return;

          framesSinceFpsCheck += 1;
          if (now - lastFpsAt > 1200) {
            const fps = (framesSinceFpsCheck * 1000) / (now - lastFpsAt);
            if (
              framesSinceFpsCheck >= 2 &&
              fps < 30 &&
              qualityRef.current !== "reduced"
            )
              runtimeRef.current?.setQuality("reduced");
            framesSinceFpsCheck = 0;
            lastFpsAt = now;
          }

          let keepAnimating = false;
          if (transition) {
            const progress = Math.min(
              1,
              (now - transition.startedAt) / transition.duration,
            );
            const eased = easeInOutCubic(progress);
            const nextPosition = getTheaterCameraTransitionPosition(
              transition.fromPosition,
              transition.toPosition,
              eased,
              transitionPositionScratch,
            );
            camera.position.set(nextPosition.x, nextPosition.y, nextPosition.z);
            currentTarget.lerpVectors(
              transition.fromTarget,
              transition.toTarget,
              eased,
            );
            camera.fov = three.MathUtils.lerp(
              transition.fromFov,
              transition.toFov,
              eased,
            );
            if (progress >= 1) {
              camera.position.copy(transition.toPosition);
              currentTarget.copy(transition.toTarget);
              camera.fov = transition.toFov;
              transition = null;
            } else {
              keepAnimating = true;
            }
          } else if (cameraMode === "pov" && povPose) {
            if (reducedMotion || qualityRef.current === "reduced") {
              camera.position.set(
                povPose.position.x,
                povPose.position.y,
                povPose.position.z,
              );
              currentTarget.set(
                povPose.target.x,
                povPose.target.y,
                povPose.target.z,
              );
            } else {
              const breathing = Math.sin(now * 0.0018) * 0.014;
              camera.position.set(
                povPose.position.x + Math.sin(now * 0.0011) * 0.01,
                povPose.position.y + breathing,
                povPose.position.z,
              );
              currentTarget.set(
                povPose.target.x,
                povPose.target.y + breathing * 0.35,
                povPose.target.z,
              );
              keepAnimating = true;
            }
            camera.fov = povPose.fov;
          } else if (cameraMode === "screen" && screenPose) {
            camera.position.set(
              screenPose.position.x,
              screenPose.position.y,
              screenPose.position.z,
            );
            currentTarget.set(
              screenPose.target.x,
              screenPose.target.y,
              screenPose.target.z,
            );
            camera.fov = screenPose.fov;
          } else {
            const overview = overviewPose();
            if (reducedMotion) {
              camera.position.copy(overview.position);
              currentTarget.copy(overview.target);
              camera.fov = overview.fov;
            } else {
              keepAnimating =
                camera.position.distanceToSquared(overview.position) > 0.0004 ||
                currentTarget.distanceToSquared(overview.target) > 0.0004 ||
                Math.abs(camera.fov - overview.fov) > 0.02;
              camera.position.lerp(overview.position, 0.12);
              currentTarget.lerp(overview.target, 0.12);
              camera.fov = three.MathUtils.lerp(camera.fov, overview.fov, 0.12);
              if (!keepAnimating) {
                camera.position.copy(overview.position);
                currentTarget.copy(overview.target);
                camera.fov = overview.fov;
              }
            }
          }

          camera.lookAt(currentTarget);
          syncAudioListener();
          camera.updateProjectionMatrix();
          try {
            renderer.render(scene, camera);
          } catch {
            contextLost = true;
            setStatus("error");
            trackTheaterEvent("network_fallback_triggered", {
              source: "renderer",
            });
            return;
          }
          if (keepAnimating) scheduleRender();
          else {
            framesSinceFpsCheck = 0;
            lastFpsAt = now;
          }
        };

        const runtime: SceneRuntime = {
          three,
          renderer,
          camera,
          scene,
          zones: zoneMeshes,
          seats: currentSeats,
          updateSeats,
          raycastSeat: (_event: PointerEvent) => null,
          focusSeat,
          focusScreen,
          exitPov,
          adjustOrbit: (change: OrbitChange) => {
            if (cameraMode !== "overview") beginOverview();
            updateOrbit(change);
          },
          setQuality: (_next: QualityMode) => undefined,
          setReducedMotion: (next: boolean) => {
            reducedMotion = next;
            if (next && transition) {
              camera.position.copy(transition.toPosition);
              currentTarget.copy(transition.toTarget);
              camera.fov = transition.toFov;
              transition = null;
            }
            scheduleRender();
          },
          dispose: () => undefined,
        };

        runtime.raycastSeat = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          seatPointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          seatRaycaster.setFromCamera(seatPointer, camera);
          seatHits.length = 0;
          seatRaycaster.intersectObjects(raycastObjects, false, seatHits);
          for (const hit of seatHits) {
            if (hit.instanceId === undefined) continue;
            const group = groupByMesh.get(hit.object as THREE.InstancedMesh);
            if (!group) continue;
            const localIndex =
              hit.object === group.armrests
                ? Math.floor(hit.instanceId / 2)
                : hit.instanceId;
            const globalIndex = group.indexes[localIndex];
            if (globalIndex !== undefined)
              return currentSeats[globalIndex] ?? null;
          }
          return null;
        };

        const applyQuality = (next: QualityMode) => {
          qualityRef.current = next;
          setQualityMode(next);
          renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, next === "full" ? 1.5 : 0.9),
          );
          renderer.shadowMap.enabled = next === "full";
          screenMaterial.emissiveIntensity = next === "full" ? 0.28 : 0.16;
          if (scene.fog instanceof three.Fog)
            scene.fog.far = next === "full" ? 30 : 20;
          scheduleRender();
          if (next === "reduced")
            trackTheaterEvent("network_fallback_triggered", {
              source: "quality",
            });
        };
        runtime.setQuality = applyQuality;
        runtimeRef.current = runtime;
        applyQuality(qualityRef.current);
        runtime.setReducedMotion(reducedMotion);
        runtime.updateSeats(currentSeats, selectedRef.current);

        runtime.dispose = () => {
          stopRender();
          disposeScene(scene);
          renderer.dispose();
        };

        let orbitDrag = {
          active: false,
          moved: false,
          x: 0,
          y: 0,
        };
        const pointers = new Map<number, { x: number; y: number }>();
        let pinchDistance: number | null = null;
        const distanceBetweenPointers = () => {
          const [first, second] = [...pointers.values()];
          if (!first || !second) return null;
          return Math.hypot(first.x - second.x, first.y - second.y);
        };
        const playSelectionWhoosh = (pose: TheaterSeatPose) => {
          const audio = audioRef.current;
          if (!audio) return;
          const oscillator = audio.context.createOscillator();
          const gain = audio.context.createGain();
          const panner = audio.context.createPanner();
          const now = audio.context.currentTime;
          panner.panningModel = "HRTF";
          panner.distanceModel = "inverse";
          panner.refDistance = 2;
          panner.rolloffFactor = 0.45;
          setPannerPosition(panner, pose);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(280, now);
          oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.16);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
          oscillator.connect(gain).connect(panner).connect(audio.master);
          oscillator.onended = () => {
            gain.disconnect();
            panner.disconnect();
          };
          oscillator.start(now);
          oscillator.stop(now + 0.2);
        };
        const onPointerDown = (event: PointerEvent) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (cameraMode !== "overview") {
            beginOverview();
            setScreenView(false);
          }
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size > 1) {
            pinchDistance = distanceBetweenPointers();
            orbitDrag.active = false;
            canvas.setPointerCapture(event.pointerId);
            return;
          }
          orbitDrag = {
            active: true,
            moved: false,
            x: event.clientX,
            y: event.clientY,
          };
          canvas.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (pointers.has(event.pointerId))
            pointers.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
          if (pointers.size > 1) {
            const nextDistance = distanceBetweenPointers();
            if (pinchDistance !== null && nextDistance !== null)
              updateOrbit({
                distanceDelta: -(nextDistance - pinchDistance) * 0.012,
              });
            pinchDistance = nextDistance;
            return;
          }
          if (orbitDrag.active) {
            const dx = event.clientX - orbitDrag.x;
            const dy = event.clientY - orbitDrag.y;
            if (Math.abs(dx) + Math.abs(dy) > 5) orbitDrag.moved = true;
            updateOrbit({ yawDelta: -dx * 0.006 });
            orbit.pitch = clampSeatCamera(
              orbit.yaw,
              orbit.pitch + dy * 0.004,
              orbit.distance,
            ).pitch;
            orbitDrag.x = event.clientX;
            orbitDrag.y = event.clientY;
            return;
          }
          const seat = runtime.raycastSeat(event);
          if (seat?.label === previousHover) return;
          previousHover = seat?.label ?? null;
          if (seat) keyboardSeatRef.current = seat.label;
          if (seat) trackTheaterEvent("seat_hover", { seat: seat.label });
          hoverRef.current(seat);
        };
        const onPointerUp = (event: PointerEvent) => {
          pointers.delete(event.pointerId);
          if (pointers.size) {
            pinchDistance = distanceBetweenPointers();
            return;
          }
          pinchDistance = null;
          if (!orbitDrag.active) return;
          if (!orbitDrag.moved) {
            const seat = runtime.raycastSeat(event);
            if (seat?.status === "available") {
              keyboardSeatRef.current = seat.label;
              const wasSelected = selectedRef.current.includes(seat.label);
              hoverRef.current(seat);
              toggleRef.current(seat.label);
              if (!wasSelected) {
                setScreenView(false);
                runtime.focusSeat(seat.label);
              }
              const pose = poseByLabel.get(seat.label);
              if (pose) playSelectionWhoosh(pose);
              trackTheaterEvent("seat_selected", {
                seat: seat.label,
                zone: getSeatZone(seat),
              });
              navigator.vibrate?.(8);
            }
          }
          orbitDrag.active = false;
          if (canvas.hasPointerCapture(event.pointerId))
            canvas.releasePointerCapture(event.pointerId);
        };
        const onPointerLeave = () => {
          previousHover = null;
          hoverRef.current(null);
        };
        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          if (cameraMode !== "overview") {
            beginOverview();
            setScreenView(false);
          }
          updateOrbit({ distanceDelta: event.deltaY * 0.008 });
        };
        const onContextLost = (event: Event) => {
          event.preventDefault();
          contextLost = true;
          stopRender();
          setStatus("error");
          trackTheaterEvent("network_fallback_triggered", {
            source: "context",
          });
        };
        const onContextRestored = () => {
          contextLost = false;
          setStatus("ready");
          runtime.updateSeats(currentSeats, selectedRef.current);
        };
        const onOrbitCommand = (event: Event) => {
          runtime.adjustOrbit((event as CustomEvent<OrbitChange>).detail ?? {});
        };
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, rect.width);
          const height = Math.max(1, rect.height);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          scheduleRender();
        };
        const onVisibilityChange = () => {
          if (document.visibilityState === "hidden") stopRender();
          else {
            lastFpsAt = performance.now();
            framesSinceFpsCheck = 0;
            scheduleRender();
          }
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        document.addEventListener("visibilitychange", onVisibilityChange);
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("pointerleave", onPointerLeave);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        canvas.addEventListener("reelroom-seat-orbit", onOrbitCommand);
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);
        cleanupInteractions = () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("pointerleave", onPointerLeave);
          canvas.removeEventListener("wheel", onWheel);
          canvas.removeEventListener("reelroom-seat-orbit", onOrbitCommand);
          canvas.removeEventListener("webglcontextlost", onContextLost);
          canvas.removeEventListener("webglcontextrestored", onContextRestored);
        };
        resize();
        setStatus("ready");
        scheduleRender();
      } catch {
        if (!cancelled) {
          setStatus("error");
          trackTheaterEvent("network_fallback_triggered", {
            source: "renderer",
          });
        }
      }
    };

    idleHandle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(loadScene, { timeout: 1200 })
      : window.setTimeout(loadScene, 50);

    return () => {
      cancelled = true;
      cleanupInteractions();
      if (idleHandle !== null) {
        if (idleWindow.cancelIdleCallback)
          idleWindow.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }
      if (frame) window.cancelAnimationFrame(frame);
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [reloadKey]);

  const toggleScreenView = () => {
    if (screenView) runtimeRef.current?.exitPov();
    else runtimeRef.current?.focusScreen();
    setScreenView(!screenView);
  };

  const adjustOrbit = (change: OrbitChange) => {
    setScreenView(false);
    runtimeRef.current?.adjustOrbit(change);
  };

  const stopAmbience = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = audio.context.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    audio.oscillators.forEach((oscillator) => oscillator.stop(now + 0.18));
    audio.projectorPanner.disconnect();
    window.setTimeout(() => void audio.context.close(), 220);
    audioRef.current = null;
    setAmbienceOn(false);
  };

  const toggleAmbience = async () => {
    if (ambienceOn) {
      stopAmbience();
      return;
    }
    const AudioContextConstructor = getAudioConstructor();
    if (!AudioContextConstructor) return;
    try {
      const context = new AudioContextConstructor();
      await context.resume();
      const master = context.createGain();
      master.gain.value = ambienceVolume;
      master.connect(context.destination);
      const projectorPanner = context.createPanner();
      projectorPanner.panningModel = "HRTF";
      projectorPanner.distanceModel = "inverse";
      projectorPanner.refDistance = 4;
      projectorPanner.maxDistance = 30;
      projectorPanner.rolloffFactor = 0.4;
      setPannerPosition(projectorPanner, THEATER_SCREEN_CENTER);
      const hum = context.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 72;
      const projector = context.createOscillator();
      projector.type = "triangle";
      projector.frequency.value = 144;
      const humGain = context.createGain();
      humGain.gain.value = 0.38;
      const projectorGain = context.createGain();
      projectorGain.gain.value = 0.08;
      hum.connect(humGain).connect(projectorPanner);
      projector.connect(projectorGain).connect(projectorPanner).connect(master);
      const runtime = runtimeRef.current;
      if (runtime) {
        const forward = runtime.camera.getWorldDirection(
          new runtime.three.Vector3(),
        );
        setAudioListenerPosition(context, runtime.camera.position, forward);
      }
      hum.start();
      projector.start();
      audioRef.current = {
        context,
        master,
        oscillators: [hum, projector],
        projectorPanner,
      };
      setAmbienceOn(true);
    } catch {
      setAmbienceOn(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.master.gain.value = ambienceVolume;
  }, [ambienceVolume]);

  useEffect(
    () => () => {
      audioRef.current?.oscillators.forEach((oscillator) => oscillator.stop());
      audioRef.current?.projectorPanner.disconnect();
      void audioRef.current?.context.close();
    },
    [],
  );

  const dismissTutorial = () => {
    setTutorialOpen(false);
    try {
      window.localStorage.setItem("reelroom.seat3d.tutorial", "seen");
    } catch {
      // The tutorial remains available for the current session.
    }
  };

  const retry = () => {
    runtimeRef.current?.dispose();
    runtimeRef.current = null;
    setStatus("loading");
    setReloadKey((value) => value + 1);
  };

  const focusedRecord = focusedSeat
    ? (seats.find((seat) => seat.label === focusedSeat) ?? null)
    : null;
  const qualityLabel =
    qualityMode === "full" ? "Full quality" : "Reduced effects";
  const handleCanvasKeyDown = (
    event: ReactKeyboardEvent<HTMLCanvasElement>,
  ) => {
    const directions: Partial<Record<string, TheaterSeatDirection>> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      const firstAvailable =
        seatsRef.current.find((seat) => seat.status === "available") ??
        seatsRef.current[0];
      const activeLabel =
        keyboardSeatRef.current ?? selectedRef.current.at(-1) ?? null;
      const seat = activeLabel
        ? getAdjacentTheaterSeat(seatsRef.current, activeLabel, direction)
        : firstAvailable;
      if (!seat) return;
      keyboardSeatRef.current = seat.label;
      setScreenView(false);
      hoverRef.current(seat);
      runtimeRef.current?.focusSeat(seat.label);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setScreenView(false);
      runtimeRef.current?.exitPov();
      return;
    }

    if (event.key !== "Enter" && event.code !== "Space") return;
    if (event.repeat) return;
    const seat =
      seatsRef.current.find(
        (record) =>
          record.label ===
          (keyboardSeatRef.current ?? selectedRef.current.at(-1)),
      ) ?? seatsRef.current.find((record) => record.status === "available");
    if (!seat) return;
    event.preventDefault();
    keyboardSeatRef.current = seat.label;
    setScreenView(false);
    hoverRef.current(seat);
    if (seat.status !== "available") {
      runtimeRef.current?.focusSeat(seat.label);
      return;
    }

    const wasSelected = selectedRef.current.includes(seat.label);
    toggleRef.current(seat.label);
    if (!wasSelected) runtimeRef.current?.focusSeat(seat.label);
    trackTheaterEvent("seat_selected", {
      seat: seat.label,
      zone: getSeatZone(seat),
      selected: !wasSelected,
      input: "keyboard",
    });
  };

  return (
    <div className="reelroom-3d-view relative overflow-hidden rounded-[1.25rem] border border-border bg-canvas/60">
      <canvas
        ref={canvasRef}
        className="reelroom-3d-canvas block h-[22rem] w-full touch-none sm:h-[28rem]"
        role="group"
        aria-label="Interactive 3D theatre seat view"
        aria-describedby="reelroom-3d-instructions"
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
      />
      <p id="reelroom-3d-instructions" className="sr-only">
        Use the arrow keys to move between seats. Press Enter or Space to select
        or remove an available seat. Press Escape to return to the theatre
        overview. Seat labels are printed on chair backs. Selected seats are
        amber, held seats are indigo, occupied seats are charcoal, and pale
        seats are available. Mint seats are accessible and slightly wider.
      </p>
      {status === "loading" ? (
        <div
          className="reelroom-3d-loading absolute inset-0 grid place-items-center"
          role="status"
        >
          <div className="w-[min(18rem,80%)] space-y-3 text-center">
            <div className="reelroom-3d-skeleton h-28 rounded-2xl" />
            <LoaderCircle className="mx-auto size-5 animate-spin text-amber" />
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              Loading premium room assets
            </p>
          </div>
        </div>
      ) : null}
      {status === "disabled" ||
      status === "unsupported" ||
      status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-canvas/90 p-6 text-center">
          <div className="max-w-sm">
            <Sparkles className="mx-auto size-6 text-amber" />
            <h4 className="mt-3 font-display text-xl font-semibold text-ink">
              {status === "disabled"
                ? "Premium room is temporarily off."
                : status === "error"
                  ? "The 3D room needs a quick reset."
                  : "3D needs a compatible graphics mode."}
            </h4>
            <p className="mt-2 text-xs leading-5 text-ink-2">
              The accessible 2D seat map keeps every booking action available.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {status !== "disabled" ? (
                <button
                  type="button"
                  onClick={retry}
                  className="reelroom-action-button inline-flex items-center gap-2 rounded-full border border-amber px-4 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-amber"
                >
                  <RefreshCw className="size-3.5" /> Retry 3D
                </button>
              ) : null}
              <button
                type="button"
                onClick={onFallback}
                className="reelroom-action-button rounded-full border border-amber px-4 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-amber"
              >
                Use 2D view
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-canvas/60 px-3 py-2 font-mono text-[9px] uppercase tracking-[.1em] text-ink-2 backdrop-blur-md">
            {focusedRecord ? (
              <Eye className="size-3.5 text-amber" />
            ) : screenView ? (
              <MonitorPlay className="size-3.5 text-amber" />
            ) : (
              <Compass className="size-3.5 text-amber" />
            )}
            {screenView
              ? "Screen view"
              : focusedRecord
                ? `POV ${focusedRecord.label}`
                : `View ${heading}`}
          </div>
          <button
            type="button"
            onClick={toggleScreenView}
            disabled={status !== "ready"}
            aria-pressed={screenView}
            aria-label={
              screenView ? "Return to theatre overview" : "Focus on screen"
            }
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-canvas/60 px-3 font-mono text-[9px] uppercase tracking-[.1em] text-ink-2 backdrop-blur-md hover:border-amber/40 hover:text-amber disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            <MonitorPlay className="size-3.5 text-amber" />
            {screenView ? "Overview" : "Screen"}
          </button>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-canvas/60 px-3 py-2 font-mono text-[9px] uppercase tracking-[.1em] text-ink-2 backdrop-blur-md">
            <Gauge className="size-3.5 text-amber" /> {qualityLabel}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[.1em] text-mint backdrop-blur-md">
            {networkOnline ? (
              <Wifi className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {networkOnline
              ? `Live sync / ${liveVersion}`
              : "Offline / cached room"}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-end gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-canvas/70 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => adjustOrbit({ yawDelta: -0.14 })}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/10"
            aria-label="Rotate theatre view left"
          >
            <Rotate3d className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => adjustOrbit({ distanceDelta: -0.7 })}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/10"
            aria-label="Zoom in theatre view"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => adjustOrbit({ distanceDelta: 0.7 })}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/10"
            aria-label="Zoom out theatre view"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => adjustOrbit({ reset: true })}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/10"
            aria-label="Reset theatre view"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-canvas/70 px-2 py-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => void toggleAmbience()}
            className="grid size-11 place-items-center rounded-full text-amber hover:bg-white/10"
            aria-label={
              ambienceOn ? "Mute theatre ambience" : "Play theatre ambience"
            }
          >
            {ambienceOn ? (
              <Volume2 className="size-3.5" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
          </button>
          <label className="flex items-center gap-1.5 font-mono text-[9px] text-muted">
            <span className="sr-only">Ambience volume</span>
            <input
              type="range"
              min="0"
              max="0.06"
              step="0.005"
              value={ambienceVolume}
              onChange={(event) =>
                setAmbienceVolume(Number(event.target.value))
              }
              className="w-16 accent-amber"
            />
          </label>
        </div>
      </div>
      {tutorialOpen && status === "ready" ? (
        <div className="absolute bottom-28 left-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-amber/30 bg-canvas/90 p-4 text-center shadow-cinematic backdrop-blur-xl sm:bottom-20">
          <p className="font-mono text-[9px] uppercase tracking-[.14em] text-amber">
            Quick orientation
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-2">
            Drag to orbit, scroll or pinch to zoom. Tap a free chair to enter
            its cinematic point of view, or use Screen for a centered look at
            the picture.
          </p>
          <button
            type="button"
            onClick={dismissTutorial}
            className="mt-3 rounded-full bg-amber px-4 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-canvas"
          >
            Got it
          </button>
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        3D seat view {status}. Seat map version {liveVersion}.
        {selectedSeats.length
          ? ` Selected seats: ${selectedSeats.join(", ")}.`
          : " No seats selected."}
        {focusedRecord
          ? ` Camera focused on seat ${focusedRecord.label}, ${focusedRecord.status}, ${focusedRecord.tier} tier.`
          : screenView
            ? " Camera focused on the cinema screen."
            : ""}
      </div>
    </div>
  );
}
