"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type HolographicBeamsProps = React.HTMLAttributes<HTMLDivElement> & {
  density?: number;
  speed?: number;
  aberration?: number;
  opacity?: number;
};

export default function HolographicBeams({
  className,
  density = 30,
  speed = 1,
  aberration = 2.5,
  opacity = 50,
  style,
  ...props
}: HolographicBeamsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !container || !context) return;

    let width = 0;
    let height = 0;
    let time = 0;
    let animationFrame = 0;

    const noise = (x: number, t: number) =>
      (Math.sin(x * 0.01 + t) +
        Math.sin(x * 0.03 + t * 2) * 0.5 +
        Math.sin(x * 0.1 + t * 4) * 0.25) /
      1.75;

    const resize = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const drawBeam = (x: number, t: number, color: string, widthMod: number) => {
      const beamHeight = height * (0.6 + noise(x, t * 0.5) * 0.4);
      const beamWidth = (width / density) * widthMod;
      const gradient = context.createLinearGradient(x, height, x, height - beamHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(x - beamWidth / 2, height);
      context.lineTo(x + beamWidth / 2, height);
      context.lineTo(x + beamWidth, height - beamHeight);
      context.lineTo(x - beamWidth, height - beamHeight);
      context.fill();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      time += 0.01 * speed;
      const beamWidth = width / density;

      for (let index = 0; index <= density; index += 1) {
        const x = index * beamWidth;
        const redAlpha = (opacity / 100) * (0.5 + 0.5 * Math.cos(index * 0.5 + time));
        drawBeam(x - aberration, time + index * 0.1, `rgba(255, 0, 0, ${redAlpha * 0.5})`, 1.5);
        const blueAlpha = (opacity / 100) * (0.5 + 0.5 * Math.sin(index * 0.6 + time * 1.1));
        drawBeam(x + aberration, time + index * 0.12 + 10, `rgba(0, 50, 255, ${blueAlpha * 0.5})`, 1.5);
        const coreAlpha = (opacity / 100) * (0.6 + 0.4 * Math.sin(index * 0.3 - time));
        drawBeam(x, time + index * 0.1 + 5, `rgba(200, 255, 255, ${coreAlpha * 0.3})`, 0.8);
      }

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [aberration, density, opacity, speed]);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black", className)}
      style={style}
      {...props}
    >
      <canvas ref={canvasRef} className="block size-full blur-[4px]" />
      <div
        className="absolute inset-0 z-10 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,1) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))",
          backgroundSize: "100% 4px, 3px 100%",
        }}
      />
      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />
    </div>
  );
}
