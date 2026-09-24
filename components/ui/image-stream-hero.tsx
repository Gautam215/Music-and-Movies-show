"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Resolution-independent geometry for the mirrored image corridor. */
export type CorridorPath = {
  perspective?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  birthHeight?: number;
  exitHeight?: number;
  railBirth?: number;
  railExit?: number;
  fan?: number;
  turnBirth?: number;
  turnExit?: number;
  stops?: number;
};

const PATH: Required<CorridorPath> = {
  perspective: 30,
  cardWidth: 18,
  cardHeight: 25,
  cardRadius: 0.4,
  birthHeight: 2.6,
  exitHeight: 46,
  railBirth: -11,
  railExit: 44,
  fan: 3.3,
  turnBirth: 6,
  turnExit: 28,
  stops: 24,
};

function keyframes(dir: 1 | -1, name: string, p: Required<CorridorPath>) {
  const steps: string[] = [];
  for (let s = 0; s <= p.stops; s++) {
    const u = s / p.stops;
    const scale =
      (p.birthHeight / p.cardHeight) *
      Math.pow(p.exitHeight / p.birthHeight, u);
    const z = p.perspective * (1 - 1 / scale);
    const rail =
      p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
    const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
    steps.push(
      `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(
        2,
      )}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
    );
  }
  return `@keyframes ${name}{${steps.join("")}}`;
}

export type StreamImage = {
  src: string;
  alt?: string;
  label?: string;
  meta?: string;
};

export type ImageStreamHeroProps = {
  images: StreamImage[];
  cards?: number;
  speed?: number;
  axis?: number;
  path?: CorridorPath;
  onCardDrop?: (image: StreamImage) => void;
  onCardSelect?: (image: StreamImage) => void;
  selectedSrc?: string;
  children?: React.ReactNode;
  className?: string;
};

export function ImageStreamHero({
  images,
  cards = 9,
  speed = 18,
  axis = 55,
  path,
  onCardDrop,
  onCardSelect,
  selectedSrc,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & ImageStreamHeroProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const right = `ish-r-${id}`;
  const left = `ish-l-${id}`;
  const card = `ish-c-${id}`;
  const p = React.useMemo(() => ({ ...PATH, ...path }), [path]);
  const [draggingSrc, setDraggingSrc] = React.useState<string | null>(null);

  const css = React.useMemo(
    () =>
      `${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
      `@media(prefers-reduced-motion:reduce){.${card}{animation-play-state:paused}}`,
    [right, left, card, p],
  );

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "inline-size", ...props.style }}
    >
      <style>{css}</style>
      <div
        aria-hidden={onCardDrop ? undefined : true}
        className="pointer-events-none absolute inset-0"
        style={{
          perspective: `${p.perspective}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
        }}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {[right, left].map((name) =>
            Array.from({ length: cards }, (_, i) => {
              const img = images[i % Math.max(images.length, 1)];
              const dragEnabled = Boolean(onCardDrop && img);
              const selectable = name === left && Boolean(onCardSelect);
              return (
                <div
                  key={`${name}-${i}`}
                  className={cn(
                    card,
                    "pointer-events-auto absolute flex flex-col overflow-hidden border border-white/10 bg-surface shadow-2xl",
                    dragEnabled && "cursor-grab active:cursor-grabbing",
                    draggingSrc === img?.src && "ring-2 ring-amber ring-offset-2 ring-offset-canvas",
                    selectable && selectedSrc === img?.src && "ring-2 ring-cobalt ring-offset-2 ring-offset-canvas",
                  )}
                  draggable={dragEnabled}
                  data-drag-enabled={dragEnabled ? "true" : undefined}
                  aria-grabbed={draggingSrc === img?.src ? true : undefined}
                  role={selectable ? "button" : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  aria-label={
                    img?.label
                      ? selectable
                        ? `Select ${img.label}`
                        : onCardDrop
                          ? `Drag ${img.label} to inspect`
                          : undefined
                      : undefined
                  }
                  onClick={() => {
                    if (selectable && img) onCardSelect?.(img);
                  }}
                  onKeyDown={(event) => {
                    if (!selectable || !img || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    onCardSelect?.(img);
                  }}
                  onDragStart={(event) => {
                    if (!dragEnabled || !onCardDrop || !img) return;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", img.src);
                    setDraggingSrc(img.src);
                  }}
                  onDragEnd={() => setDraggingSrc(null)}
                  style={{
                    left: "50%",
                    top: `${axis}%`,
                    width: `${p.cardWidth}cqw`,
                    height: `${p.cardHeight}cqw`,
                    marginLeft: `${-p.cardWidth / 2}cqw`,
                    marginTop: `${-p.cardHeight / 2}cqw`,
                    borderRadius: `${p.cardRadius}cqw`,
                    animation: `${name} ${speed}s linear infinite`,
                    animationDelay: `${-(i * speed) / cards}s`,
                    backfaceVisibility: "hidden",
                  }}
                >
                  {img ? (
                    <>
                      <div className="min-h-0 flex-1">
                        <img
                          src={img.src}
                          alt={img.alt ?? ""}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </div>
                      <div className="shrink-0 border-t border-white/10 bg-surface/95 px-[1.2cqw] py-[1cqw] text-left">
                        <strong className="block truncate font-display text-[clamp(7px,1.15cqw,12px)] font-semibold leading-tight text-ink">
                          {img.label}
                        </strong>
                        <span className="mt-0.5 block truncate font-mono text-[clamp(6px,.9cqw,9px)] uppercase tracking-[.08em] text-amber">
                          {img.meta}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
      </div>
      {onCardDrop ? (
        <div
          className={cn(
            "reelroom-stream-dropzone pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center rounded-2xl border border-dashed border-amber/45 bg-canvas/75 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[.14em] text-ink-2 backdrop-blur-md transition",
            draggingSrc && "border-amber bg-amber/10 text-amber shadow-[0_0_28px_rgba(251,191,36,.22)]",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const src = event.dataTransfer.getData("text/plain");
            const image = images.find((item) => item.src === src);
            if (image) onCardDrop(image);
            setDraggingSrc(null);
          }}
        >
          {draggingSrc ? "Release to inspect this movie" : "Drag any movie card here for details"}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default ImageStreamHero;
