"use client";

import { useEffect, useRef } from "react";

const interactiveSelector =
  "a, button, input, select, textarea, [role=\"button\"], [data-cursor-hover]";

export function MinimalCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let animationFrame = 0;
    let targetX = -100;
    let targetY = -100;
    let currentX = targetX;
    let currentY = targetY;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animate = () => {
      const blend = reducedMotion ? 1 : 0.42;
      currentX += (targetX - currentX) * blend;
      currentY += (targetY - currentY) * blend;
      cursor.style.setProperty("--cursor-x", `${currentX}px`);
      cursor.style.setProperty("--cursor-y", `${currentY}px`);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const setHoverState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(interactiveSelector) : null;
      cursor.dataset.hover = element ? "true" : "false";
    };
    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor.dataset.visible = "true";
      setHoverState(event.target);
    };
    const onPointerLeave = () => {
      cursor.dataset.visible = "false";
      cursor.dataset.hover = "false";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div ref={cursorRef} className="reelroom-cursor" aria-hidden="true">
      <span className="reelroom-cursor-mark" />
    </div>
  );
}
