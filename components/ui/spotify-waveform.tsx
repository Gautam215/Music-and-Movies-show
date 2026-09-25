"use client";

import { useEffect, useRef } from "react";

type SpotifyWaveformProps = {
  className?: string;
};

const vertexShaderSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_motion;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  float waveform(vec2 point, float frequency, float phase, float amplitude) {
    float cursorPull = exp(-abs(point.x - u_pointer.x) * 1.8);
    float breathing = sin(u_time * 0.7 + phase) * 0.012;
    float carrier = sin(point.x * frequency + u_time * (0.55 + u_motion * 0.4) + phase);
    float detail = sin(point.x * (frequency * 2.1) - u_time * 0.38 + phase * 1.6) * 0.28;
    float target = (carrier + detail) * (amplitude + cursorPull * 0.095) + breathing;
    float distanceToWave = abs(point.y - target);
    float core = 1.0 - smoothstep(0.004, 0.012, distanceToWave);
    float halo = 1.0 - smoothstep(0.012, 0.12, distanceToWave);
    return core + halo * 0.38;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 point = (uv - 0.5) * vec2(aspect, 1.0);
    float pointerDistance = distance(point, u_pointer);
    float cursorEnergy = 1.0 - smoothstep(0.1, 1.15, pointerDistance);
    float edgeFade = 1.0 - smoothstep(0.65, 1.45, abs(point.x));

    vec3 color = vec3(0.018, 0.024, 0.034);
    color += vec3(0.018, 0.023, 0.035) * (1.0 - uv.y) * 0.8;
    color += vec3(0.035, 0.026, 0.024) * cursorEnergy * edgeFade;

    float gridX = 1.0 - smoothstep(0.0, 0.018, abs(fract(point.x * 3.0) - 0.5));
    float gridY = 1.0 - smoothstep(0.0, 0.018, abs(fract(point.y * 5.0) - 0.5));
    color += vec3(0.07, 0.075, 0.09) * (gridX + gridY) * 0.045;

    float first = waveform(point, 4.8, 0.2, 0.11);
    float second = waveform(point + vec2(0.0, 0.07), 7.2, 2.8, 0.075);
    float third = waveform(point - vec2(0.0, 0.08), 10.4, 4.6, 0.052);

    color += vec3(0.98, 0.58, 0.24) * first * (0.48 + cursorEnergy * 0.55);
    color += vec3(0.48, 0.67, 0.95) * second * 0.52;
    color += vec3(0.66, 0.42, 0.88) * third * 0.38;

    float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;
    color += grain;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function SpotifyWaveform({ className }: SpotifyWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;
    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointer = gl.getUniformLocation(program, "u_pointer");
    const time = gl.getUniformLocation(program, "u_time");
    const motion = gl.getUniformLocation(program, "u_motion");
    const targetPointer = { x: 0, y: 0 };
    const currentPointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;
    let visible = true;
    let destroyed = false;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      const height = Math.max(1, Math.floor(bounds.height * pixelRatio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
      const y = 1 - ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2;
      targetPointer.x = x * (bounds.width / Math.max(bounds.height, 1));
      targetPointer.y = y;
    };
    const resetPointer = () => {
      targetPointer.x = 0;
      targetPointer.y = 0;
    };
    const schedule = () => {
      if (destroyed || frame || !visible || document.visibilityState === "hidden") return;
      frame = window.requestAnimationFrame(draw);
    };
    const draw = (now: number) => {
      frame = 0;
      if (destroyed || !visible || document.visibilityState === "hidden") return;
      if (!reducedMotion.matches && now - lastFrame < 1000 / 30) {
        schedule();
        return;
      }
      lastFrame = now;
      currentPointer.x += (targetPointer.x - currentPointer.x) * 0.075;
      currentPointer.y += (targetPointer.y - currentPointer.y) * 0.075;
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, currentPointer.x, currentPointer.y);
      gl.uniform1f(time, reducedMotion.matches ? 0 : now * 0.001);
      gl.uniform1f(motion, reducedMotion.matches ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (reducedMotion.matches) return;
      schedule();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      schedule();
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    }, { threshold: 0.01 });
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        schedule();
      }
    };
    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);
    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerleave", resetPointer, { passive: true });
    resize();
    schedule();

    return () => {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerleave", resetPointer);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_48%,transparent_0_14%,rgba(7,10,15,.12)_54%,rgba(7,10,15,.52)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}
