import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ user: await getCurrentUser() });
}
