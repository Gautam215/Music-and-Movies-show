import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSession, hashPassword, normalizeEmail, setSessionCookie, toPublicUser, type UserDocument } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateJsonHeaders() });
    const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown; password?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    const password = typeof body?.password === "string" ? body.password : "";

    if (name.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    if (name.length > 80) return NextResponse.json({ error: "Name must be 80 characters or fewer." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (email.length > 254) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });

    const db = await getDatabase();
    const users = db.collection<UserDocument>("users");
    await users.createIndex({ email: 1 }, { unique: true });
    const existing = await users.findOne({ email });
    if (existing) return NextResponse.json({ error: "Could not create an account with those details." }, { status: 409, headers: privateJsonHeaders() });

    const user: UserDocument = { _id: randomUUID(), name, email, passwordHash: await hashPassword(password), createdAt: new Date() };
    await users.insertOne(user);
    const token = await createSession(user._id);
    const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201, headers: privateJsonHeaders() });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Could not create the account right now." }, { status: 500 });
  }
}
