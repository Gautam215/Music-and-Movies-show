import { NextResponse } from "next/server";
import { createSession, normalizeEmail, setSessionCookie, toPublicUser, verifyPassword, type UserDocument } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    const db = await getDatabase();
    const user = await db.collection<UserDocument>("users").findOne({ email });

    if (!user || typeof user.passwordHash !== "string" || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const token = await createSession(user._id);
    const response = NextResponse.json({ user: toPublicUser(user) });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Sign in failed", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
