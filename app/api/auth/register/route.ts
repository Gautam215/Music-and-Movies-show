import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSession, hashPassword, normalizeEmail, setSessionCookie, toPublicUser, type UserDocument } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = body.name?.trim() ?? "";
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    if (name.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const db = await getDatabase();
    const users = db.collection<UserDocument>("users");
    await users.createIndex({ email: 1 }, { unique: true });
    const existing = await users.findOne({ email });
    if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const user: UserDocument = { _id: randomUUID(), name, email, passwordHash: await hashPassword(password), createdAt: new Date() };
    await users.insertOne(user);
    const token = await createSession(user._id);
    const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Could not create the account right now." }, { status: 500 });
  }
}
