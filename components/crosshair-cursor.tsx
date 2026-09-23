"use client";

import { useEffect, useRef } from "react";

const interactiveSelector =
  "a, button, input, select, textarea, [role=\"button\"], [data-cursor-hover]";

export function CrosshairCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let movingTimer = 0;
    const setHoverState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(interactiveSelector) : null;
      cursor.dataset.hover = element ? "true" : "false";
    };
    const onPointerMove = (event: PointerEvent) => {
      cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
      cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
      cursor.dataset.visible = "true";
      cursor.dataset.moving = "true";
      setHoverState(event.target);
      window.clearTimeout(movingTimer);
      movingTimer = window.setTimeout(() => {
        cursor.dataset.moving = "false";
      }, 180);
    };
    const onPointerLeave = () => {
      cursor.dataset.visible = "false";
      cursor.dataset.hover = "false";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.clearTimeout(movingTimer);
    };
  }, []);

  return (
    <div ref={cursorRef} className="reelroom-cursor" aria-hidden="true">
      <span className="reelroom-cursor-mark" />
    </div>
  );
}
