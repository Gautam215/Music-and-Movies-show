import { NextResponse } from "next/server";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";
import { pickYouTubeTrailer } from "@/lib/movie-trailers";
import { fetchWithServerBackoff } from "@/lib/server-retry";

export const runtime = "nodejs";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 256;
const trailerCache = new Map<
  string,
  { expiresAt: number; trailer: ReturnType<typeof pickYouTubeTrailer> }
>();

type MediaType = "movie" | "tv";

type TmdbVideoResponse = {
  results?: Array<{
    key?: string;
    name?: string;
    site?: string;
    type?: string;
    official?: boolean;
  }>;
};

function errorResponse(message: string, status: 400 | 403 | 503) {
  return NextResponse.json(
    { error: message },
    { status, headers: privateJsonHeaders() },
  );
}

export async function GET(request: Request) {
  if (!isSameOrigin(request))
    return errorResponse("Invalid request origin.", 403);

  const params = new URL(request.url).searchParams;
  const tmdbId = Number(params.get("tmdbId"));
  const requestedMediaType = params.get("mediaType");
  const mediaType: MediaType =
    requestedMediaType === "tv"
      ? "tv"
      : requestedMediaType === "movie" || requestedMediaType === "anime"
        ? "movie"
        : "movie";

  if (
    !Number.isSafeInteger(tmdbId) ||
    tmdbId < 1 ||
    !["movie", "tv", "anime"].includes(requestedMediaType ?? "")
  ) {
    return errorResponse("A valid TMDB movie or TV id is required.", 400);
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return errorResponse("Trailer service is not configured.", 503);

  const cacheKey = `${mediaType}:${tmdbId}`;
  const now = Date.now();
  const cached = trailerCache.get(cacheKey);
  if (cached && cached.expiresAt > now)
    return NextResponse.json(
      { trailer: cached.trailer },
      { headers: privateJsonHeaders() },
    );

  try {
    const response = await fetchWithServerBackoff(
      `${TMDB_ENDPOINT}/${mediaType}/${tmdbId}/videos?language=en-US`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
      { maxRetries: 2, timeoutMs: 8_000 },
    );

    if (response.status === 404)
      return NextResponse.json(
        { trailer: null },
        { headers: privateJsonHeaders() },
      );
    if (!response.ok)
      return errorResponse("Trailer service is temporarily unavailable.", 503);

    const payload = (await response.json()) as TmdbVideoResponse;
    const trailer = pickYouTubeTrailer(payload.results ?? []);
    trailerCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, trailer });
    if (trailerCache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = trailerCache.keys().next().value;
      if (oldestKey) trailerCache.delete(oldestKey);
    }

    return NextResponse.json({ trailer }, { headers: privateJsonHeaders() });
  } catch {
    return errorResponse("Trailer service is temporarily unavailable.", 503);
  }
}
