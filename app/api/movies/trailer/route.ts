import { NextResponse } from "next/server";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";
import {
  isSafeYouTubeFallbackKey,
  pickConfidentYouTubeFallback,
  pickYouTubeTrailer,
  type YouTubeFallbackCandidate,
} from "@/lib/movie-trailers";
import { fetchWithServerBackoff } from "@/lib/server-retry";

export const runtime = "nodejs";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";
const YOUTUBE_ENDPOINT = "https://www.googleapis.com/youtube/v3";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 256;
const MAX_TITLE_LENGTH = 120;
const YOUTUBE_SEARCH_RESULT_LIMIT = 10;
const YOUTUBE_REQUEST_OPTIONS = {
  maxRetries: 1,
  baseDelayMs: 200,
  maxDelayMs: 400,
  timeoutMs: 5_000,
};
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

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      description?: string;
    };
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
      uploadStatus?: string;
    };
    contentDetails?: {
      regionRestriction?: {
        allowed?: string[];
        blocked?: string[];
      };
    };
  }>;
};

function errorResponse(message: string, status: 400 | 403) {
  return NextResponse.json(
    { error: message },
    { status, headers: privateJsonHeaders() },
  );
}

function trailerResponse(trailer: ReturnType<typeof pickYouTubeTrailer>) {
  return NextResponse.json({ trailer }, { headers: privateJsonHeaders() });
}

function cacheTrailer(
  key: string,
  trailer: ReturnType<typeof pickYouTubeTrailer>,
  now: number,
) {
  trailerCache.set(key, {
    expiresAt: now + (trailer ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS),
    trailer,
  });
  if (trailerCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = trailerCache.keys().next().value;
    if (oldestKey) trailerCache.delete(oldestKey);
  }
}

async function fetchYouTubeFallback(
  title: string,
  year: number | undefined,
  apiKey: string,
) {
  try {
    const searchUrl = new URL(`${YOUTUBE_ENDPOINT}/search`);
    searchUrl.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      maxResults: String(YOUTUBE_SEARCH_RESULT_LIMIT),
      q: [title, year?.toString(), "official trailer"]
        .filter(Boolean)
        .join(" "),
      key: apiKey,
    }).toString();

    const searchResponse = await fetchWithServerBackoff(
      searchUrl,
      { cache: "no-store" },
      YOUTUBE_REQUEST_OPTIONS,
    );
    if (!searchResponse.ok) return null;

    const searchPayload =
      (await searchResponse.json()) as YouTubeSearchResponse;
    const videoIds = [
      ...new Set(
        (searchPayload.items ?? [])
          .map((item) => item.id?.videoId?.trim() ?? "")
          .filter(isSafeYouTubeFallbackKey),
      ),
    ].slice(0, YOUTUBE_SEARCH_RESULT_LIMIT);
    if (!videoIds.length) return null;

    const videosUrl = new URL(`${YOUTUBE_ENDPOINT}/videos`);
    videosUrl.search = new URLSearchParams({
      part: "snippet,status,contentDetails",
      id: videoIds.join(","),
      key: apiKey,
    }).toString();

    const videosResponse = await fetchWithServerBackoff(
      videosUrl,
      { cache: "no-store" },
      YOUTUBE_REQUEST_OPTIONS,
    );
    if (!videosResponse.ok) return null;

    const videosPayload =
      (await videosResponse.json()) as YouTubeVideosResponse;
    const candidates: YouTubeFallbackCandidate[] = (
      videosPayload.items ?? []
    ).map((video) => {
      const restrictions = video.contentDetails?.regionRestriction;
      return {
        key: video.id,
        name: video.snippet?.title,
        channelTitle: video.snippet?.channelTitle,
        description: video.snippet?.description,
        embeddable: video.status?.embeddable,
        privacyStatus: video.status?.privacyStatus,
        uploadStatus: video.status?.uploadStatus,
        regionRestricted: Boolean(
          restrictions?.allowed?.length || restrictions?.blocked?.length,
        ),
      };
    });

    return pickConfidentYouTubeFallback(candidates, title, year);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!isSameOrigin(request))
    return errorResponse("Invalid request origin.", 403);

  const params = new URL(request.url).searchParams;
  const tmdbId = Number(params.get("tmdbId"));
  const requestedMediaType = params.get("mediaType");
  const titleParam = params.get("title");
  const requestedTitle = titleParam?.trim() || undefined;
  const yearParam = params.get("year");
  const requestedYear = yearParam === null ? undefined : Number(yearParam);
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

  if (
    titleParam !== null &&
    (!requestedTitle ||
      [...requestedTitle].length > MAX_TITLE_LENGTH ||
      /[\u0000-\u001f\u007f]/u.test(requestedTitle) ||
      !/[\p{L}\p{N}]/u.test(requestedTitle))
  ) {
    return errorResponse("The movie title is invalid.", 400);
  }

  if (
    yearParam !== null &&
    (!/^\d{4}$/.test(yearParam) ||
      requestedYear! < 1888 ||
      requestedYear! > new Date().getUTCFullYear() + 5)
  ) {
    return errorResponse("The release year is invalid.", 400);
  }

  const cacheKey = JSON.stringify([
    mediaType,
    tmdbId,
    requestedTitle ?? null,
    requestedYear ?? null,
  ]);
  const now = Date.now();
  const cached = trailerCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return trailerResponse(cached.trailer);

  let trailer: ReturnType<typeof pickYouTubeTrailer> = null;
  const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (tmdbToken) {
    try {
      const response = await fetchWithServerBackoff(
        `${TMDB_ENDPOINT}/${mediaType}/${tmdbId}/videos?language=en-US`,
        {
          headers: { Authorization: `Bearer ${tmdbToken}` },
          cache: "no-store",
        },
        { maxRetries: 2, timeoutMs: 8_000 },
      );

      if (response.ok) {
        const payload = (await response.json()) as TmdbVideoResponse;
        trailer = pickYouTubeTrailer(payload.results ?? []);
      }
    } catch {
      trailer = null;
    }
  }

  if (!trailer && requestedTitle) {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (youtubeApiKey)
      trailer = await fetchYouTubeFallback(
        requestedTitle,
        requestedYear,
        youtubeApiKey,
      );
  }

  cacheTrailer(cacheKey, trailer, now);
  return trailerResponse(trailer);
}
