import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDatabase } from "@/lib/mongodb";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "reelroom_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type PublicUser = { id: string; name: string; email: string };

export type UserDocument = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type SessionDocument = {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function toPublicUser(user: UserDocument): PublicUser {
  return { id: user._id, name: user.name, email: user.email };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const db = await getDatabase();

  await db.collection<SessionDocument>("sessions").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection<SessionDocument>("sessions").insertOne({
    _id: randomUUID(),
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
    createdAt: now,
  });

  return token;
}

export function setSessionCookie(response: Response, token: string) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const db = await getDatabase();
  await db.collection<SessionDocument>("sessions").deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDatabase();
  const session = await db.collection<SessionDocument>("sessions").findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await db.collection<UserDocument>("users").findOne({ _id: session.userId });
  return user ? toPublicUser(user) : null;
}
