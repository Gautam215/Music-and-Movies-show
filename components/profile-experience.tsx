"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, LogIn, LogOut, Mail, MapPin, ShieldCheck } from "lucide-react";

type ProfileSession = {
  name: string;
  email: string;
};

const sessionKey = "reelroom.profile.session";

type AuthMode = "signin" | "signup";
type FieldName = "name" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

function validateField(field: FieldName, value: string, mode: AuthMode) {
  if (field === "name" && mode === "signup" && value.trim().length < 2) return "Add your name";
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Use a valid email";
  if (field === "password" && value.length < 8) return "Use at least 8 characters";
  return "";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.37-.18-2H12v3.79h5.38a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.89-1.74 2.99-4.3 2.99-7.31Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.46l-3.22-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.13H3.08v2.58A9.98 9.98 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.87a6 6 0 0 1 0-3.74V7.55H3.08a10 10 0 0 0 0 8.9l3.33-2.58Z" />
      <path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.96 14.7 2 12 2a9.98 9.98 0 0 0-8.92 5.55l3.33 2.58C7.2 7.76 9.4 6 12 6Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M16.72 12.76c.02 2.28 2 3.04 2.02 3.05-.02.05-.32 1.1-1.05 2.18-.63.94-1.29 1.87-2.32 1.89-1.01.02-1.34-.61-2.5-.61-1.17 0-1.54.59-2.5.63-1 .04-1.76-1.02-2.39-1.96-1.3-1.89-2.29-5.34-.96-7.66.66-1.15 1.84-1.88 3.12-1.9 1-.02 1.94.67 2.5.67.56 0 1.61-.83 2.72-.71.46.02 1.77.18 2.61 1.4-.07.04-1.56.91-1.55 3.02Zm-1.78-5.38c.5-.61.84-1.46.75-2.3-.72.03-1.59.48-2.1 1.09-.46.53-.87 1.4-.76 2.22.8.06 1.61-.4 2.11-1.01Z" />
    </svg>
  );
}

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
        float ripple = sin(distanceToCursor * 30.0 - time * 2.6) * exp(-distanceToCursor * 4.0);
        vec2 liquidUv = uv + normalize(delta + 0.0001) * ripple * 0.035;
        float waveOne = sin(liquidUv.x * 9.0 + liquidUv.y * 5.0 + time * 0.22);
        float waveTwo = sin(liquidUv.y * 15.0 - liquidUv.x * 4.0 - time * 0.16);
        float contour = smoothstep(-0.35, 0.82, waveOne * 0.65 + waveTwo * 0.35);
        float cursorGlow = exp(-distanceToCursor * 4.4);
        vec3 midnight = vec3(0.018, 0.024, 0.045);
        vec3 cobalt = vec3(0.14, 0.2, 0.48);
        vec3 silver = vec3(0.58, 0.68, 0.82);
        vec3 color = mix(midnight, cobalt, contour * 0.78);
        color = mix(color, silver, cursorGlow * 0.22 + contour * 0.08);
        color += vec3(0.08, 0.12, 0.22) * (1.0 - uv.y) * 0.5;
        gl_FragColor = vec4(color, 0.94);
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    const render = (now: number) => {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, pointerPosition.x, pointerPosition.y);
      gl.uniform1f(time, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
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
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState<FieldName | null>("email");
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ kind: "error" | "info"; message: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const isSignup = mode === "signup";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => emailRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const values: Record<FieldName, string> = { name: fullName, email, password };
  const updateField = (field: FieldName, value: string) => {
    if (field === "name") setFullName(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (touched[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value, mode) || undefined }));
  };
  const touchField = (field: FieldName) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field, values[field], mode) || undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const fields: FieldName[] = isSignup ? ["name", "email", "password"] : ["email", "password"];
    fields.forEach((field) => {
      const error = validateField(field, values[field], mode);
      if (error) nextErrors[field] = error;
    });
    setTouched({ name: isSignup, email: true, password: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      haptic([12, 44, 12]);
      setFeedback({ kind: "error", message: "A couple of details need your attention." });
      return;
    }

    haptic(10);
    const name = (isSignup ? fullName : email)
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Reelscape member";
    const nextSession = { name, email };
    window.sessionStorage.setItem(sessionKey, JSON.stringify(nextSession));
    window.dispatchEvent(new Event("reelroom-profile-session"));
    setPassword("");
    setFeedback({ kind: "info", message: "Session ready." });
    onLogin(nextSession);
  };

  const toggleMode = () => {
    haptic();
    setMode((current) => current === "signin" ? "signup" : "signin");
    setTouched({});
    setErrors({});
    setFeedback(null);
  };
  const showInfo = (message: string) => {
    haptic();
    setFeedback({ kind: "info", message });
  };

  return (
    <section className="profile-auth-card" aria-labelledby="profile-login-title">
      <div className="profile-auth-card-topline">
        <span className="profile-auth-symbol">R</span>
        <span className="profile-kicker">Private by design / 01</span>
        <span className="profile-auth-live"><span /> live</span>
      </div>
      <h2 id="profile-login-title">{isSignup ? "Make room for more." : "Welcome back."}</h2>
      <p>{isSignup ? "Create a quiet place for your saved films, songs, and nights out." : "Your saved films, songs, and next screening are waiting."}</p>

      <form onSubmit={submit} noValidate>
        {isSignup ? (
          <div className="profile-field-wrap">
            <label className="profile-field" data-filled={Boolean(fullName)} data-focused={focused === "name"} data-invalid={Boolean(touched.name && errors.name)} htmlFor="profile-name">
              <input id="profile-name" name="name" value={fullName} onChange={(event) => updateField("name", event.target.value)} onFocus={() => setFocused("name")} onBlur={() => { setFocused(null); touchField("name"); }} placeholder=" " autoComplete="name" aria-invalid={Boolean(touched.name && errors.name)} aria-describedby={errors.name ? "profile-name-error" : undefined} />
              <span>Full name</span>
            </label>
            {touched.name && errors.name ? <span id="profile-name-error" className="profile-field-error" role="alert">{errors.name}</span> : null}
          </div>
        ) : null}
        <div className="profile-field-wrap">
          <label className="profile-field" data-filled={Boolean(email)} data-focused={focused === "email"} data-invalid={Boolean(touched.email && errors.email)} htmlFor="profile-email">
            <input ref={emailRef} id="profile-email" name="email" type="email" value={email} onChange={(event) => updateField("email", event.target.value)} onFocus={() => setFocused("email")} onBlur={() => { setFocused(null); touchField("email"); }} placeholder=" " autoComplete="email" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={errors.email ? "profile-email-error" : undefined} />
            <span>Email address</span>
          </label>
          {touched.email && errors.email ? <span id="profile-email-error" className="profile-field-error" role="alert">{errors.email}</span> : null}
        </div>
        <div className="profile-field-wrap">
          <label className="profile-field" data-filled={Boolean(password)} data-focused={focused === "password"} data-invalid={Boolean(touched.password && errors.password)} htmlFor="profile-password">
            <input id="profile-password" name="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => updateField("password", event.target.value)} onFocus={() => setFocused("password")} onBlur={() => { setFocused(null); touchField("password"); }} placeholder=" " autoComplete={isSignup ? "new-password" : "current-password"} aria-invalid={Boolean(touched.password && errors.password)} aria-describedby={errors.password ? "profile-password-error" : undefined} />
            <span>Password</span>
            <button type="button" className="profile-password-toggle" onClick={() => { haptic(); setPasswordVisible((current) => !current); }} aria-label={passwordVisible ? "Hide password" : "Show password"}>
              {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </label>
          {touched.password && errors.password ? <span id="profile-password-error" className="profile-field-error" role="alert">{errors.password}</span> : null}
        </div>

        <div className="profile-auth-actions">
          <button type="button" className="profile-inline-link" onClick={() => showInfo("Password recovery will be connected to the account service.")}>Forgot Password?</button>
          <span className="profile-form-hint"><ShieldCheck className="size-3.5" /> Encrypted session</span>
        </div>
        <button type="submit" className="profile-auth-submit"><LogIn className="size-4" /> {isSignup ? "Create account" : "Sign in"} <ArrowRight className="size-4" /></button>
      </form>

      <div className="profile-auth-divider"><span /> <span>or continue with</span> <span /></div>
      <div className="profile-social-grid">
        <button type="button" onClick={() => showInfo("Apple sign-in will connect when authentication is enabled.")}><AppleMark /> Apple</button>
        <button type="button" onClick={() => showInfo("Google sign-in will connect when authentication is enabled.")}><GoogleMark /> Google</button>
      </div>
      {feedback ? <div className={feedback.kind === "error" ? "profile-auth-feedback profile-auth-feedback-error" : "profile-auth-feedback"} role="status" aria-live="polite">{feedback.kind === "error" ? <ShieldCheck className="size-4" /> : <Check className="size-4" />}{feedback.message}</div> : null}
      <div className="profile-auth-switch">{isSignup ? "Already have an account?" : "New to Reelscape?"} <button type="button" onClick={toggleMode}>{isSignup ? "Sign in" : "Sign up"}</button></div>
      <div className="profile-auth-note"><ShieldCheck className="size-4" /> Your password never leaves this demo session.</div>
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

  useEffect(() => {
    if (!visible) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.location.hash = "";
      haptic();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [visible]);

  if (!visible) return null;

  const logout = () => {
    haptic();
    window.sessionStorage.removeItem(sessionKey);
    window.dispatchEvent(new Event("reelroom-profile-session"));
    setSession(null);
  };

  return (
    <section className="profile-experience" aria-label="Profile">
      <LiquidWaveCanvas />
      <div className="profile-experience-content">
        {session ? (
          <>
            <div className="profile-experience-topline"><span>REELSCAPE / YOUR SIGNAL</span><span>LIQUID FIELD / 01</span></div>
            <div className="profile-experience-heading"><div className="profile-kicker">A quieter corner of the reel</div><h1>Your signal.</h1><p>Saved scenes, songs, and the next place to land.</p></div>
            <LoggedInProfile session={session} onLogout={logout} />
          </>
        ) : (
          <div className="profile-login-stage">
            <div className="profile-login-brand"><span className="profile-login-brand-mark">R</span><div><strong>reelscape</strong><span>private cinema / profile</span></div></div>
            <ProfileLogin onLogin={setSession} />
            <div className="profile-login-footer"><span>NO TRACKING BY DEFAULT</span><span>ESC TO RETURN</span></div>
          </div>
        )}
      </div>
    </section>
  );
}
