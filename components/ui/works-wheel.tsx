"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface WorksWheelItem {
  title: string;
  image: string;
  href?: string;
  meta?: string;
  details?: string;
}

export interface WorksWheelProps extends Omit<React.ComponentPropsWithoutRef<"section">, "children"> {
  items: WorksWheelItem[];
  label?: string;
  action?: string;
}

const MAX_ITEMS = 9;
const CARD_RATIO = 1.45;
const DRAG_UNITS = 300;
const WHEEL_UNITS = 240;
const SETTLE = 140;
const EASE = 0.14;
const CURSOR_SPEED = 0.62;
const CENTER_HOLD = 10_000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, count: number) => ((value % count) + count) % count;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

type Stage = { w: number; h: number };

export function WorksWheel({ items, label = "Works '26", action = "View", className, ...props }: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const turn = React.useRef(0);
  const target = React.useRef(0);
  const drag = React.useRef<number | null>(null);
  const cursorPosition = React.useRef(0);
  const settling = React.useRef(0);
  const centerTimer = React.useRef(0);
  const restoreTurn = React.useRef(0);
  const visibleItems = React.useMemo(() => items.slice(0, MAX_ITEMS), [items]);
  const count = visibleItems.length;
  const [active, setActive] = React.useState(0);
  const [zoomed, setZoomed] = React.useState<number | null>(null);
  const [stage, setStage] = React.useState<Stage>({ w: 0, h: 0 });
  const [reduced, setReduced] = React.useState(false);
  const activeItem = visibleItems[active] ?? visibleItems[0];

  React.useEffect(() => () => {
    window.clearTimeout(centerTimer.current);
  }, []);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  React.useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const read = () => setStage({ w: element.clientWidth, h: element.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const metrics = React.useMemo(() => {
    const cardW = clamp(Math.min(stage.w * 0.25, stage.h * 0.32), 88, 240);
    const cardH = cardW / CARD_RATIO;
    const radiusX = Math.max(24, (stage.w - cardW) / 2 - 18);
    const radiusY = Math.max(24, (stage.h - cardH) / 2 - 18);
    return {
      cardW,
      cardH,
      radius: Math.min(radiusX, radiusY),
      depth: Math.max(720, Math.min(stage.w || 720, stage.h || 720) * 1.8),
    };
  }, [stage]);

  React.useEffect(() => {
    if (!stage.w || !stage.h || !count) return;
    let frame = 0;
    let previousTime = performance.now();
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const now = performance.now();
      const elapsed = Math.min(now - previousTime, 80);
      previousTime = now;
      if (zoomed === null && drag.current === null && !reduced) {
        target.current += cursorPosition.current * (elapsed / 1000) * CURSOR_SPEED;
      }
      const gap = target.current - turn.current;
      if (reduced || Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * EASE;

      const position = turn.current;
      const step = 360 / count;
      for (let index = 0; index < count; index += 1) {
        const angle = -90 + (index + position) * step;
        const depth = (Math.cos(rad(angle + 90)) + 1) / 2;
        const x = Math.cos(rad(angle)) * metrics.radius;
        const y = Math.sin(rad(angle)) * metrics.radius;
        const rotation = Math.sin(rad(angle + 90)) * 52;
        const card = cardRefs.current[index];
        if (!card) continue;
        const isZoomed = zoomed === index;
        card.style.transform = isZoomed
          ? "translate3d(0, 0, 90px) rotateZ(0deg) scale(1.55)"
          : `translate3d(${x}px, ${y}px, ${depth * 24}px) rotateZ(${rotation}deg) scale(${0.7 + depth * 0.3})`;
        card.style.opacity = isZoomed ? "1" : String(0.52 + depth * 0.48);
        card.style.zIndex = isZoomed ? "50" : String(Math.round(10 + depth * 10));
      }

      const nextActive = wrap(Math.round(position), count);
      setActive((previous) => (previous === nextActive ? previous : nextActive));
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [count, metrics, reduced, stage, zoomed]);

  const to = React.useCallback((next: number) => {
    target.current = next;
  }, []);

  React.useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      to(target.current + event.deltaY / WHEEL_UNITS);
      window.clearTimeout(settling.current);
      settling.current = window.setTimeout(() => to(Math.round(target.current)), SETTLE);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      window.clearTimeout(settling.current);
    };
  }, [to]);

  return (
    <section aria-label={label} className={cn("relative grid h-full min-h-[24rem] w-full grid-cols-1 overflow-hidden bg-[#070707] text-white lg:grid-cols-[minmax(0,1fr)_22rem]", className)} {...props}>
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={`${label}, ${count} movie visuals`}
        aria-activedescendant={`works-wheel-${active}`}
        className="relative min-h-[24rem] cursor-grab touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-white active:cursor-grabbing"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => { drag.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          cursorPosition.current = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
          if (drag.current === null) return;
          to(target.current + (drag.current - event.clientY) / DRAG_UNITS);
          drag.current = event.clientY;
        }}
        onPointerLeave={() => { cursorPosition.current = 0; }}
        onPointerUp={() => { drag.current = null; window.clearTimeout(settling.current); settling.current = window.setTimeout(() => to(Math.round(target.current)), SETTLE); }}
        onPointerCancel={() => { drag.current = null; cursorPosition.current = 0; }}
        onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowRight") to(Math.round(target.current) + 1); else if (event.key === "ArrowUp" || event.key === "ArrowLeft") to(Math.round(target.current) - 1); else return; event.preventDefault(); }}
      >
        {visibleItems.map((item, index) => {
          const Tag = (item.href ? "a" : "div") as "a";
          return (
            <Tag
              key={index}
              id={`works-wheel-${index}`}
              role="option"
              aria-selected={index === active}
              href={item.href}
              ref={(node: HTMLElement | null) => { cardRefs.current[index] = node; }}
               onClick={(event) => {
                 event.preventDefault();
                 event.stopPropagation();
                 if (zoomed === null) restoreTurn.current = target.current;
                 const centered = -index + Math.round((target.current + index) / count) * count;
                 target.current = centered;
                 window.clearTimeout(centerTimer.current);
                 const element = event.currentTarget as HTMLElement;
                 element.style.transition = "transform 520ms cubic-bezier(.22,.8,.32,1), opacity 240ms ease";
                 window.setTimeout(() => { element.style.transition = ""; }, 560);
                 setZoomed(index);
                 centerTimer.current = window.setTimeout(() => {
                   setZoomed(null);
                   target.current = restoreTurn.current;
                 }, CENTER_HOLD);
               }}
              className="group absolute left-1/2 top-1/2 block overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-[0_24px_60px_rgba(0,0,0,.55)] [backface-visibility:hidden]"
              style={{ width: metrics.cardW, height: metrics.cardH, marginLeft: -metrics.cardW / 2, marginTop: -metrics.cardH / 2 }}
            >
              <img src={item.image} alt={item.title} draggable={false} className="size-full object-cover" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
              <span className="pointer-events-none absolute inset-x-2 bottom-2 z-10 text-right leading-[1.15] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,.95)]">
                <strong className="block truncate font-display text-[0.82rem] font-semibold">{item.title}</strong>
                {item.meta ? <span className="mt-1 block truncate font-mono text-[0.42rem] text-white/75">{item.meta}</span> : null}
                {item.details ? <span className="mt-1 block line-clamp-2 text-[0.44rem] text-white/80">{item.details}</span> : null}
                {action && item.href ? <span className="mt-1 block font-mono text-[0.4rem] uppercase tracking-[.12em] text-amber">{action} ↗</span> : null}
              </span>
            </Tag>
          );
        })}
        <div className="pointer-events-none absolute left-4 top-4 z-20 font-mono text-[9px] uppercase tracking-[.14em] text-white/55">Move cursor left / right to rotate · click to center for 10s</div>
        <div className={cn("pointer-events-none absolute inset-0 grid place-items-center text-center font-display text-2xl font-medium tracking-[-.06em] transition-opacity duration-300 sm:text-3xl", zoomed !== null && "opacity-0")}>{label}</div>
      </div>
      {activeItem ? (
        <aside className="relative z-20 flex min-h-[13rem] flex-col justify-end border-t border-white/10 bg-black/45 p-5 backdrop-blur-xl lg:min-h-0 lg:border-l lg:border-t-0 lg:bg-black/35">
          <div className="font-mono text-[9px] uppercase tracking-[.18em] text-amber">
            Active screening
          </div>
          <div className="mt-4 flex items-start gap-3">
            <img
              src={activeItem.image}
              alt=""
              className="size-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold leading-none tracking-[-.06em] text-white">
                {activeItem.title}
              </h2>
              {activeItem.meta ? (
                <p className="mt-2 font-mono text-[10px] text-white/60">
                  {activeItem.meta}
                </p>
              ) : null}
            </div>
          </div>
          {activeItem.details ? (
            <p className="mt-4 text-xs leading-5 text-white/70">
              {activeItem.details}
            </p>
          ) : null}
          {action ? (
            <div className="mt-5 font-mono text-[9px] uppercase tracking-[.14em] text-amber">
              {action} this screening ↗
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}

export default WorksWheel;
