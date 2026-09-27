export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-canvas px-6 text-ink"
      aria-busy="true"
      aria-label="Loading Reelscape"
    >
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto h-2 w-16 animate-pulse rounded-full bg-amber/70" />
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-ink-2">
          Preparing your next screening
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cobalt" />
        </div>
      </div>
    </main>
  );
}
