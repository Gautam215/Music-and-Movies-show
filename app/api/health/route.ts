import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple health check for Vercel + an external uptime monitor.
// It only answers "is this server instance alive, and can it reach MongoDB?"
// It never throws: a failed check is a normal 503 response, not a crash.
export async function GET() {
  let database: "up" | "down" | "not-configured";

  if (!process.env.MONGODB_URI?.trim()) {
    database = "not-configured";
  } else {
    const check = (async () => {
      try {
        const db = await getDatabase();
        await db.command({ ping: 1 });
        return "up" as const;
      } catch {
        return "down" as const;
      }
    })();
    // Do not let a slow database hang the health check.
    const timeout = new Promise<"down">((resolve) =>
      setTimeout(() => resolve("down"), 3000),
    );
    database = await Promise.race([check, timeout]);
  }

  const ok = database !== "down";
  return NextResponse.json(
    { ok, database, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
