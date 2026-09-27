"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 text-ink">
      <section
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-cinematic"
        role="alert"
      >
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-amber/40 bg-amber/10 text-amber">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[.18em] text-amber">
          Screening unavailable
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">
          We lost the reel.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">
          The catalog could not load right now. Try again and we&apos;ll bring
          the latest screenings back.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber bg-amber px-4 text-xs font-bold text-canvas transition hover:-translate-y-px hover:bg-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </section>
    </main>
  );
}
