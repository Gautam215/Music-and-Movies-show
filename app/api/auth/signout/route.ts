import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, revokeSession, SESSION_COOKIE } from "@/lib/auth-session";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateJsonHeaders() });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await revokeSession(token);
  const response = NextResponse.json({ ok: true }, { headers: privateJsonHeaders() });
  clearSessionCookie(response);
  return response;
}
