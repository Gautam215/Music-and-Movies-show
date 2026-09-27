import { getDatabase } from "@/lib/mongodb";

export type UserSignalType = "favorite" | "booking" | "listen";

export type UserSignalInput = {
  userId: string;
  type: UserSignalType;
  title: string;
  key?: string;
  tmdbId?: number;
  mediaType?: "movie" | "tv" | "anime";
  genres?: string[];
  metadata?: Record<string, string>;
};

export type UserSignal = UserSignalInput & {
  _id: string;
  createdAt: Date;
};

let userSignalIndexPromise: Promise<string> | null = null;

function normalizeSignalKey(input: UserSignalInput) {
  const explicitKey = input.key?.trim();
  if (explicitKey) return explicitKey;
  if (input.tmdbId && input.mediaType)
    return `${input.mediaType}:${input.tmdbId}`;
  return input.title.trim().toLocaleLowerCase();
}

export async function recordUserSignal(input: UserSignalInput) {
  const db = await getDatabase();
  const signals = db.collection<UserSignal>("userSignals");
  if (!userSignalIndexPromise)
    userSignalIndexPromise = signals.createIndex({ userId: 1, createdAt: -1 });
  try {
    await userSignalIndexPromise;
  } catch (error) {
    userSignalIndexPromise = null;
    throw error;
  }
  const createdAt = new Date();
  if (input.type === "favorite") {
    const key = normalizeSignalKey(input);
    await signals.updateOne(
      { userId: input.userId, type: input.type, key },
      {
        $set: { ...input, key, createdAt },
        $setOnInsert: {
          _id: `${input.userId}:${input.type}:${Buffer.from(key).toString("base64url")}`,
        },
      },
      { upsert: true },
    );
    return;
  }
  await signals.insertOne({
    ...input,
    _id: `${input.userId}:${input.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
  });
}

export async function getRecentUserSignals(userId: string, limit = 20) {
  return getUserSignals(userId, undefined, limit);
}

export async function getUserSignals(
  userId: string,
  type?: UserSignalType,
  limit = 100,
) {
  const db = await getDatabase();
  return db
    .collection<UserSignal>("userSignals")
    .find(type ? { userId, type } : { userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .toArray();
}

export async function removeUserSignal(input: {
  userId: string;
  type: UserSignalType;
  key?: string;
  title?: string;
  tmdbId?: number;
  mediaType?: "movie" | "tv" | "anime";
}) {
  const db = await getDatabase();
  const signals = db.collection<UserSignal>("userSignals");
  let deletedCount = 0;

  if (input.key) {
    const keyed = await signals.deleteMany({
      userId: input.userId,
      type: input.type,
      key: input.key,
    });
    deletedCount += keyed.deletedCount;
  }

  const legacyIdentity = [] as Record<string, unknown>[];
  if (input.tmdbId && input.mediaType)
    legacyIdentity.push({ tmdbId: input.tmdbId, mediaType: input.mediaType });
  if (input.title) legacyIdentity.push({ title: input.title });
  if (legacyIdentity.length) {
    const legacy = await signals.deleteMany({
      userId: input.userId,
      type: input.type,
      key: { $exists: false },
      $or: legacyIdentity,
    });
    deletedCount += legacy.deletedCount;
  }

  return { deletedCount };
}
