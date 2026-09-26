import { getDatabase } from "@/lib/mongodb";

export type UserSignalType = "favorite" | "booking" | "listen";

export type UserSignalInput = {
  userId: string;
  type: UserSignalType;
  title: string;
  tmdbId?: number;
  mediaType?: "movie" | "tv" | "anime";
  genres?: string[];
  metadata?: Record<string, string>;
};

export type UserSignal = UserSignalInput & {
  _id: string;
  createdAt: Date;
};

export async function recordUserSignal(input: UserSignalInput) {
  const db = await getDatabase();
  const signals = db.collection<UserSignal>("userSignals");
  await signals.createIndex({ userId: 1, createdAt: -1 });
  await signals.insertOne({
    ...input,
    _id: `${input.userId}:${input.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date(),
  });
}

export async function getRecentUserSignals(userId: string, limit = 20) {
  const db = await getDatabase();
  return db
    .collection<UserSignal>("userSignals")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
