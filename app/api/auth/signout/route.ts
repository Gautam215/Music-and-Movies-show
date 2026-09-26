import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, revokeSession, SESSION_COOKIE } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await revokeSession(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
