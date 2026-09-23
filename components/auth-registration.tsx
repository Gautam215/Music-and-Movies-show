"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

type AuthMode = "register" | "signin";

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

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor="password" className="text-xs font-medium text-[#e8e1f5]">Password</label>
      <div className="relative">
        <input
          id="password"
          name="password"
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-[#827990] focus:border-[#b99cff] focus:bg-white/[.07] focus:ring-4 focus:ring-[#a883ff]/10"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#8e849d] transition hover:text-white"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function AuthRegistration() {
  const [mode, setMode] = useState<AuthMode>("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegistering = mode === "register";
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <main className="auth-page min-h-screen overflow-hidden bg-[#08070d] text-white selection:bg-[#b99cff]/30" data-background="astronaut">
      <div className="grid min-h-screen md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-12 flex items-center gap-3">
              <span className="grid size-9 rotate-45 place-items-center rounded-xl border border-[#b99cff]/50 bg-[#b99cff]/10 text-[#d9c8ff]">
                <span className="-rotate-45 text-sm font-semibold">G</span>
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.24em] text-[#9d91ae]">Gautam / access</p>
                <p className="mt-1 text-sm font-medium text-[#f5efff]">Make room for what&apos;s next.</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#b99cff]">New orbit</p>
              <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-[-.06em] text-[#faf7ff] sm:text-5xl">
                {isRegistering ? "Create your account." : "Welcome back."}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#9d91ae]">
                {isRegistering ? "Your next chapter starts with a name and a place to land." : "Sign in to continue your journey."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering ? (
                <div className="space-y-2">
                  <label htmlFor="full-name" className="text-xs font-medium text-[#e8e1f5]">Full Name</label>
                  <input
                    id="full-name"
                    name="name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Gautam Kumar"
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 text-sm text-white outline-none transition placeholder:text-[#827990] focus:border-[#b99cff] focus:bg-white/[.07] focus:ring-4 focus:ring-[#a883ff]/10"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs font-medium text-[#e8e1f5]">Email</label>
                <input
                  id="auth-email"
                  name="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 text-sm text-white outline-none transition placeholder:text-[#827990] focus:border-[#b99cff] focus:bg-white/[.07] focus:ring-4 focus:ring-[#a883ff]/10"
                />
              </div>
              <PasswordField value={password} onChange={setPassword} />
              <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d9c8ff] text-sm font-semibold text-[#17111f] transition hover:bg-[#ede5ff] focus:outline-none focus:ring-4 focus:ring-[#a883ff]/20">
                {isRegistering ? "Sign Up" : "Sign In"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#9d91ae]">
              {isRegistering ? "Already have an account?" : "Don&apos;t have an account?"}{" "}
              <button type="button" onClick={() => setMode(isRegistering ? "signin" : "register")} className="font-medium text-[#d9c8ff] underline-offset-4 hover:underline">
                {isRegistering ? "Sign in" : "Sign up"}
              </button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#6f657c]">
              <span className="h-px flex-1 bg-white/10" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[.035] text-sm font-medium text-[#eee9f5] transition hover:border-white/25 hover:bg-white/[.07]">
              <GoogleMark />
              Continue with Google
            </button>
          </div>
        </section>

        <section className="relative min-h-[520px] overflow-hidden border-t border-white/10 bg-[#11101b] md:min-h-screen md:border-l md:border-t-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_40%,rgba(185,156,255,.24),transparent_36%),linear-gradient(145deg,#11101b,#090811)]" />
          <div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[.22em] text-[#81758f]">01 / new beginning</div>
          <div className="relative flex min-h-[520px] flex-col items-center justify-end px-6 pb-10 pt-20 md:min-h-screen md:px-12 md:pb-14">
            <div className="relative w-full max-w-[620px] flex-1 overflow-hidden">
              <img
                src="/astronaut.png"
                alt="Astronaut floating through a violet star field"
                className="absolute inset-0 h-[118%] w-full object-cover object-right-top mix-blend-screen"
              />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-xl font-medium tracking-[-.03em] text-[#f8f3ff] sm:text-2xl">A new chapter awaits.</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#9d91ae]">— Gautam</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
