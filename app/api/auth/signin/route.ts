import { NextResponse } from "next/server";
import { createSession, normalizeEmail, setSessionCookie, toPublicUser, verifyPassword, type UserDocument } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateJsonHeaders() });
    const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    const password = typeof body?.password === "string" ? body.password : "";
    if (email.length > 254 || password.length > 128) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401, headers: privateJsonHeaders() });
    const db = await getDatabase();
    const user = await db.collection<UserDocument>("users").findOne({ email });

    if (!user || typeof user.passwordHash !== "string" || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const token = await createSession(user._id);
    const response = NextResponse.json({ user: toPublicUser(user) }, { headers: privateJsonHeaders() });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Sign in failed", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
