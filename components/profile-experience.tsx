"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, LogIn, LogOut, Mail, MapPin, ShieldCheck } from "lucide-react";

type ProfileSession = {
  name: string;
  email: string;
};

const sessionKey = "reelroom.profile.session";

const savedMovies = [
  {
    title: "The Last Light",
    meta: "Drama / Now playing",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=420&q=85",
  },
  {
    title: "Neon Aftercare",
    meta: "Sci-Fi / Now playing",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=420&q=85",
  },
  {
    title: "Static Bloom",
    meta: "Documentary / Upcoming",
    image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=420&q=85",
  },
];

const savedSongs = [
  ["The Last Light", "Mara Vale", "Original motion picture score"],
  ["Aftercare", "Eli North", "Neon Aftercare"],
  ["Static Bloom", "June Park", "The closing credits"],
];

function readSession() {
  try {
    const stored = window.sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<ProfileSession>;
    return parsed.name && parsed.email ? { name: parsed.name, email: parsed.email } : null;
  } catch {
    return null;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "R";
}

function LiquidWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false });
    if (!canvas || !gl) return;

    const vertexSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;
    const fragmentSource = `
      precision highp float;
      uniform vec2 resolution;
      uniform vec2 pointer;
      uniform float time;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        vec2 centered = uv - 0.5;
        centered.x *= resolution.x / resolution.y;
        vec2 cursor = pointer - 0.5;
        cursor.x *= resolution.x / resolution.y;
        vec2 delta = centered - cursor;
        float distanceToCursor = length(delta);
        float ripple = sin(distanceToCursor * 34.0 - time * 2.8) * exp(-distanceToCursor * 4.2);
        vec2 liquidUv = uv + normalize(delta + 0.0001) * ripple * 0.025;
        float current = sin(liquidUv.x * 8.0 + liquidUv.y * 5.0 + time * 0.18);
        float sheen = smoothstep(-0.35, 0.8, current) * 0.18;
        float cursorGlow = exp(-distanceToCursor * 5.5) * 0.12;
        vec3 base = vec3(0.49, 0.52, 0.55);
        vec3 silver = vec3(0.77, 0.8, 0.82);
        vec3 color = mix(base, silver, sheen + cursorGlow);
        color += vec3(0.08, 0.1, 0.11) * (1.0 - uv.y) * 0.4;
        gl_FragColor = vec4(color, 0.86);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    const resolution = gl.getUniformLocation(program, "resolution");
    const pointer = gl.getUniformLocation(program, "pointer");
    const time = gl.getUniformLocation(program, "time");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const pointerPosition = { x: 0.5, y: 0.45 };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const move = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerPosition.x = (event.clientX - bounds.left) / bounds.width;
      pointerPosition.y = 1 - (event.clientY - bounds.top) / bounds.height;
    };

    resize();
    window.addEventListener("pointermove", move);
    window.addEventListener("resize", resize);
    let frame = 0;
    const startedAt = performance.now();
    const render = (now: number) => {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, pointerPosition.x, pointerPosition.y);
      gl.uniform1f(time, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="profile-liquid-wave" aria-hidden="true" />;
}

function ProfileLogin({ onLogin }: { onLogin: (session: ProfileSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Reelscape member";
    const nextSession = { name, email };
    window.sessionStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setPassword("");
    onLogin(nextSession);
  };

  return (
    <section className="profile-auth-card" aria-labelledby="profile-login-title">
      <div className="profile-kicker">Profile / return to your signal</div>
      <h2 id="profile-login-title">Welcome back.</h2>
      <p>Log in to keep your saved films and songs in one quiet place.</p>
      <form onSubmit={submit}>
        <label>
          <span>Email</span>
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" autoComplete="current-password" />
        </label>
        <button type="submit"><LogIn className="size-4" /> Login <ArrowRight className="size-4" /></button>
      </form>
      <div className="profile-auth-note"><ShieldCheck className="size-4" /> Password is used only to complete this demo session.</div>
    </section>
  );
}

function LoggedInProfile({ session, onLogout }: { session: ProfileSession; onLogout: () => void }) {
  return (
    <section className="profile-signed-in" aria-labelledby="profile-title">
      <div className="profile-identity">
        <div className="profile-avatar">{initials(session.name)}</div>
        <div>
          <div className="profile-kicker">Profile / active session</div>
          <h2 id="profile-title">{session.name}</h2>
          <p><Mail className="size-3.5" /> {session.email} <span>·</span> <MapPin className="size-3.5" /> Greater Noida</p>
        </div>
        <button type="button" className="profile-logout" onClick={onLogout}><LogOut className="size-4" /> Logout</button>
      </div>

      <div className="profile-saved-grid">
        <section className="profile-saved-panel" aria-labelledby="saved-movies-title">
          <div className="profile-panel-heading"><div><div className="profile-kicker">Saved for later</div><h3 id="saved-movies-title">Movies</h3></div><span>{savedMovies.length} saved</span></div>
          <div className="profile-movie-list">
            {savedMovies.map((movie) => <article key={movie.title}><img src={movie.image} alt="" /><div><strong>{movie.title}</strong><span>{movie.meta}</span></div></article>)}
          </div>
        </section>
        <section className="profile-saved-panel" aria-labelledby="saved-songs-title">
          <div className="profile-panel-heading"><div><div className="profile-kicker">Your soundtrack</div><h3 id="saved-songs-title">Songs</h3></div><span>{savedSongs.length} saved</span></div>
          <div className="profile-song-list">
            {savedSongs.map(([title, artist, movie], index) => <article key={title}><span className="profile-song-index">0{index + 1}</span><div><strong>{title}</strong><span>{artist} · {movie}</span></div></article>)}
          </div>
        </section>
      </div>
      <div className="profile-security-note"><ShieldCheck className="size-4" /> Your session stays in this browser tab and can be cleared with Logout.</div>
    </section>
  );
}

export function ProfileExperience() {
  const [visible, setVisible] = useState(false);
  const [session, setSession] = useState<ProfileSession | null>(null);

  useEffect(() => {
    const sync = () => {
      setVisible(window.location.pathname === "/" && window.location.hash === "#profile");
      setSession(readSession());
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  if (!visible) return null;

  const logout = () => {
    window.sessionStorage.removeItem(sessionKey);
    setSession(null);
  };

  return (
    <section className="profile-experience" aria-label="Profile">
      <LiquidWaveCanvas />
      <div className="profile-experience-content">
        <div className="profile-experience-topline"><span>REELSCAPE / SPACIAN GRAY</span><span>CURSOR LIQUID / 01</span></div>
        <div className="profile-experience-heading"><div className="profile-kicker">A quieter corner of the reel</div><h1>Your signal.</h1><p>Saved scenes, songs, and the next place to land.</p></div>
        {session ? <LoggedInProfile session={session} onLogout={logout} /> : <ProfileLogin onLogin={setSession} />}
      </div>
    </section>
  );
}