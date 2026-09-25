"use client";

import { useEffect, useRef } from "react";

type BassEqualizerBorderProps = {
  active: boolean;
  audioUrl?: string | null;
  className?: string;
};

const colors = [
  [255, 76, 92],
  [78, 236, 164],
  [92, 154, 255],
];

export function BassEqualizerBorder({ active, audioUrl, className = "" }: BassEqualizerBorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const audio = audioUrl ? new Audio(audioUrl) : null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let frame = 0;
    let destroyed = false;
    let level = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    if (audio) {
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.volume = 0;
      audio.preload = "auto";
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      void audioContext.resume().catch(() => undefined);
      void audio.play().catch(() => undefined);
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      height = Math.max(1, Math.floor(bounds.height * pixelRatio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
    };

    const pointOnBorder = (distance: number, inset: number, radius: number) => {
      const top = width - inset * 2 - radius * 2;
      const side = height - inset * 2 - radius * 2;
      const curve = Math.PI * radius * 0.5;
      const perimeter = top * 2 + side * 2 + curve * 4;
      let offset = ((distance % perimeter) + perimeter) % perimeter;

      if (offset < top) return { x: inset + radius + offset, y: inset, nx: 0, ny: -1 };
      offset -= top;
      if (offset < curve) {
        const angle = -Math.PI / 2 + offset / radius;
        return { x: width - inset - radius + Math.cos(angle) * radius, y: inset + radius + Math.sin(angle) * radius, nx: Math.cos(angle), ny: Math.sin(angle) };
      }
      offset -= curve;
      if (offset < side) return { x: width - inset, y: inset + radius + offset, nx: 1, ny: 0 };
      offset -= side;
      if (offset < curve) {
        const angle = offset / radius;
        return { x: width - inset - radius + Math.cos(angle) * radius, y: height - inset - radius + Math.sin(angle) * radius, nx: Math.cos(angle), ny: Math.sin(angle) };
      }
      offset -= curve;
      if (offset < top) return { x: width - inset - radius - offset, y: height - inset, nx: 0, ny: 1 };
      offset -= top;
      if (offset < curve) {
        const angle = Math.PI / 2 + offset / radius;
        return { x: inset + radius + Math.cos(angle) * radius, y: height - inset - radius + Math.sin(angle) * radius, nx: Math.cos(angle), ny: Math.sin(angle) };
      }
      offset -= curve;
      if (offset < side) return { x: inset, y: height - inset - radius - offset, nx: -1, ny: 0 };
      offset -= side;
      const angle = Math.PI + offset / radius;
      return { x: inset + radius + Math.cos(angle) * radius, y: inset + radius + Math.sin(angle) * radius, nx: Math.cos(angle), ny: Math.sin(angle) };
    };

    const draw = (now: number) => {
      frame = 0;
      if (destroyed) return;
      resize();
      context.clearRect(0, 0, width, height);

      let targetLevel = 0;
      if (active) {
        if (analyser) {
          const frequencies = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencies);
          const bassBins = Math.min(10, frequencies.length);
          targetLevel = frequencies.slice(0, bassBins).reduce((sum, value) => sum + value, 0) / (bassBins * 255);
        } else if (!reducedMotion) {
          targetLevel = 0.16 + (Math.sin(now * 0.008) + 1) * 0.08;
        }
      }
      level += (targetLevel - level) * (active ? 0.14 : 0.2);

      const inset = 7 * pixelRatio;
      const radius = Math.min(28 * pixelRatio, Math.min(width, height) * 0.16);
      const top = width - inset * 2 - radius * 2;
      const side = height - inset * 2 - radius * 2;
      const perimeter = (top + side) * 2 + Math.PI * radius * 2;
      const segments = Math.max(48, Math.floor(perimeter / (9 * pixelRatio)));

      if (level > 0.005) {
        for (let index = 0; index < segments; index += 1) {
          const point = pointOnBorder((index / segments) * perimeter, inset, radius);
          const variation = 0.75 + Math.sin(index * 2.7 + now * 0.012) * 0.25;
          const barHeight = (2 + level * 18 * variation) * pixelRatio;
          const [red, green, blue] = colors[index % colors.length];
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(point.x + point.nx * barHeight, point.y + point.ny * barHeight);
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(0.95, 0.24 + level * 1.1)})`;
          context.lineWidth = 2 * pixelRatio;
          context.lineCap = "round";
          context.stroke();
        }
      }

      if (active || level > 0.005) frame = window.requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      audio?.pause();
      source?.disconnect();
      analyser?.disconnect();
      void audioContext?.close().catch(() => undefined);
    };
  }, [active, audioUrl]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute -inset-3 z-0 size-[calc(100%+1.5rem)] ${className}`} aria-hidden="true" />;
}
