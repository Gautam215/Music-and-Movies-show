import { getDatabase } from "@/lib/mongodb";

export type ViewingMediaType = "movie" | "tv" | "anime";

export type ViewingHistoryInput = {
  userId: string;
  tmdbId: number;
  mediaType: ViewingMediaType;
  title: string;
  genres: string[];
  region?: string;
};

type ViewingHistoryDocument = ViewingHistoryInput & {
  viewedAt: Date;
};

export type ViewingProfile = {
  genreWeights: Map<string, number>;
  mediaTypeWeights: Map<ViewingMediaType, number>;
  language?: string;
};

export async function recordViewing(input: ViewingHistoryInput) {
  const db = await getDatabase();
  const history = db.collection<ViewingHistoryDocument>("viewingHistory");
  await history.createIndex({ userId: 1, viewedAt: -1 });
  await history.insertOne({ ...input, viewedAt: new Date() });
}

export async function getViewingProfile(userId: string): Promise<ViewingProfile> {
  const db = await getDatabase();
  const history = await db
    .collection<ViewingHistoryDocument>("viewingHistory")
    .find({ userId })
    .sort({ viewedAt: -1 })
    .limit(60)
    .toArray();
  const genreWeights = new Map<string, number>();
  const mediaTypeWeights = new Map<ViewingMediaType, number>();

  history.forEach((entry, index) => {
    const weight = Math.max(1, history.length - index);
    entry.genres.forEach((genre) => genreWeights.set(genre, (genreWeights.get(genre) ?? 0) + weight));
    mediaTypeWeights.set(entry.mediaType, (mediaTypeWeights.get(entry.mediaType) ?? 0) + weight);
  });

  return { genreWeights, mediaTypeWeights };
}
