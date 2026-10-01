import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { getDatabase } from "@/lib/mongodb";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "reelroom_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEV_PREMIUM_FIXTURE_COOKIE = "reelroom_dev_premium_fixture";
const DEV_PREMIUM_FIXTURE_TOKEN = randomBytes(32).toString("base64url");
const DEV_PREMIUM_FIXTURE_TTL_SECONDS = 60 * 60;
let sessionExpiryIndexPromise: Promise<string> | null = null;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  canAccess3DTheater: boolean;
};

export type UserDocument = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  isPremium?: boolean;
};

export function toPublicUser(
  user: Pick<UserDocument, "_id" | "name" | "email" | "isPremium">,
): PublicUser {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isPremium: user.isPremium === true,
    canAccess3DTheater: true,
  };
}

export const PREMIUM_TEST_FIXTURE_USER = toPublicUser({
  _id: "dev-premium-3d-fixture",
  name: "Premium 3D QA Fixture",
  email: "premium-3d-qa@example.test",
  isPremium: false,
});

export function isPremiumTestFixtureEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_PREMIUM_TEST_FIXTURE === "true"
  );
}

export function isPremiumTestFixtureUser(
  user: Pick<PublicUser, "id"> | null | undefined,
) {
  return (
    isPremiumTestFixtureEnabled() && user?.id === PREMIUM_TEST_FIXTURE_USER.id
  );
}

export function setPremiumTestFixtureCookie(response: Response) {
  if (!isPremiumTestFixtureEnabled()) return;
  response.headers.append(
    "Set-Cookie",
    `${DEV_PREMIUM_FIXTURE_COOKIE}=${DEV_PREMIUM_FIXTURE_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEV_PREMIUM_FIXTURE_TTL_SECONDS}`,
  );
}

export function clearPremiumTestFixtureCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${DEV_PREMIUM_FIXTURE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

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
  if (
    !salt ||
    !keyHex ||
    keyHex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(keyHex)
  )
    return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== 64) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const db = await getDatabase();

  const sessions = db.collection<SessionDocument>("sessions");
  if (!sessionExpiryIndexPromise) {
    sessionExpiryIndexPromise = sessions.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
  }
  try {
    await sessionExpiryIndexPromise;
  } catch (error) {
    sessionExpiryIndexPromise = null;
    throw error;
  }
  await sessions.insertOne({
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
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const db = await getDatabase();
  await db
    .collection<SessionDocument>("sessions")
    .deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  if (
    isPremiumTestFixtureEnabled() &&
    cookieStore.get(DEV_PREMIUM_FIXTURE_COOKIE)?.value ===
      DEV_PREMIUM_FIXTURE_TOKEN
  ) {
    return { ...PREMIUM_TEST_FIXTURE_USER };
  }

  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDatabase();
  const session = await db.collection<SessionDocument>("sessions").findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await db
    .collection<UserDocument>("users")
    .findOne({ _id: session.userId });
  return user ? toPublicUser(user) : null;
}
