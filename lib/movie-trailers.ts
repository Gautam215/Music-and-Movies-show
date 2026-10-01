import type { MovieTrailer } from "@/lib/movie-types";

const YOUTUBE_KEY_PATTERN = /^[A-Za-z0-9_-]{6,}$/;
const YOUTUBE_FALLBACK_KEY_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const TRAILER_TITLE_NOISE = new Set([
  "official",
  "trailer",
  "full",
  "hd",
  "4k",
  "1080p",
  "2160p",
  "final",
  "new",
  "the",
  "a",
  "an",
  "for",
  "from",
  "in",
  "coming",
  "soon",
]);
const NON_TRAILER_SIGNALS = new Set([
  "teaser",
  "reaction",
  "reacts",
  "reacting",
  "concept",
  "fan",
  "parody",
  "review",
  "breakdown",
  "explained",
  "recap",
  "compilation",
  "spoof",
]);
const OFFICIAL_CHANNEL_SIGNALS = new Set([
  "official",
  "picture",
  "pictures",
  "film",
  "films",
  "studio",
  "studios",
  "entertainment",
  "production",
  "productions",
  "netflix",
  "disney",
  "warner",
  "universal",
  "paramount",
  "sony",
  "lionsgate",
  "a24",
  "hulu",
  "bbc",
]);

export type TrailerCandidate = {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
};

export type YouTubeFallbackCandidate = {
  key?: string;
  name?: string;
  channelTitle?: string;
  description?: string;
  embeddable?: boolean;
  privacyStatus?: string;
  uploadStatus?: string;
  regionRestricted?: boolean;
};

function normalizedTitleTokens(value: string): string[] {
  return (
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function isReleaseYearToken(token: string) {
  const year = Number(token);
  return (
    /^\d{4}$/.test(token) &&
    year >= 1888 &&
    year <= new Date().getUTCFullYear() + 5
  );
}

function hasStrongTitleMatch(
  requestedTitle: string,
  candidateTitle: string,
  requestedYear?: number,
) {
  const requestedTokens = normalizedTitleTokens(requestedTitle);
  const candidateTokens = normalizedTitleTokens(candidateTitle);
  if (!requestedTokens.length || !candidateTokens.includes("trailer"))
    return false;

  const requestedTokenCounts = new Map<string, number>();
  for (const token of requestedTokens) {
    requestedTokenCounts.set(token, (requestedTokenCounts.get(token) ?? 0) + 1);
  }

  if (
    candidateTokens.some(
      (token) =>
        NON_TRAILER_SIGNALS.has(token) && !requestedTokenCounts.has(token),
    )
  ) {
    return false;
  }

  const requestedTokenSet = new Set(requestedTokens);
  const candidateYears = candidateTokens.filter(
    (token) => isReleaseYearToken(token) && !requestedTokenSet.has(token),
  );
  if (
    requestedYear !== undefined &&
    candidateYears.some(
      (candidateYear) => candidateYear !== String(requestedYear),
    )
  ) {
    return false;
  }

  const matchedTokens: string[] = [];
  for (let index = 0; index < candidateTokens.length; index += 1) {
    const token = candidateTokens[index];
    const remaining = requestedTokenCounts.get(token) ?? 0;
    if (remaining > 0) {
      matchedTokens.push(token);
      requestedTokenCounts.set(token, remaining - 1);
    } else if (
      TRAILER_TITLE_NOISE.has(token) ||
      isReleaseYearToken(token) ||
      (/^\d{1,2}$/.test(token) && candidateTokens[index - 1] === "trailer")
    ) {
      continue;
    } else {
      matchedTokens.push(token);
    }
  }

  return matchedTokens.join(" ") === requestedTokens.join(" ");
}

function hasOfficialChannelSignal(channelTitle: string) {
  return normalizedTitleTokens(channelTitle).some((token) =>
    OFFICIAL_CHANNEL_SIGNALS.has(token),
  );
}

export function youtubeEmbedUrl(key: string) {
  if (!YOUTUBE_KEY_PATTERN.test(key)) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?rel=0&modestbranding=1`;
}

export function getYouTubePlayerState(message: unknown) {
  let payload = message;
  if (typeof message === "string") {
    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;

  const event = payload as { event?: unknown; info?: unknown };
  const state =
    event.event === "onStateChange"
      ? event.info
      : event.event === "infoDelivery" &&
          event.info &&
          typeof event.info === "object"
        ? (event.info as { playerState?: unknown }).playerState
        : null;
  return typeof state === "number" && Number.isInteger(state) ? state : null;
}

export function isSafeYouTubeFallbackKey(key: string) {
  return YOUTUBE_FALLBACK_KEY_PATTERN.test(key);
}

export function pickYouTubeTrailer(
  candidates: TrailerCandidate[],
): MovieTrailer | null {
  const ranked = candidates
    .map((candidate, index) => {
      const key = candidate.key?.trim() ?? "";
      const embedUrl = youtubeEmbedUrl(key);
      if (candidate.site !== "YouTube" || !embedUrl) return null;
      const score =
        (candidate.type === "Trailer"
          ? 4
          : candidate.type === "Teaser"
            ? 2
            : 0) + (candidate.official ? 2 : 0);
      return { candidate, key, embedUrl, score, index };
    })
    .filter(
      (
        item,
      ): item is {
        candidate: TrailerCandidate;
        key: string;
        embedUrl: string;
        score: number;
        index: number;
      } => Boolean(item),
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const match = ranked[0];
  if (!match) return null;
  return {
    key: match.key,
    name: match.candidate.name?.trim() || "Official trailer",
    embedUrl: match.embedUrl,
  };
}

export function pickConfidentYouTubeFallback(
  candidates: YouTubeFallbackCandidate[],
  requestedTitle: string,
  requestedYear?: number,
): MovieTrailer | null {
  const ranked: Array<{
    candidate: YouTubeFallbackCandidate;
    key: string;
    score: number;
    officialSignal: boolean;
  }> = [];

  for (const candidate of candidates) {
    const key = candidate.key?.trim() ?? "";
    const name = candidate.name?.trim() ?? "";
    if (
      !isSafeYouTubeFallbackKey(key) ||
      candidate.embeddable !== true ||
      candidate.privacyStatus !== "public" ||
      candidate.uploadStatus !== "processed" ||
      candidate.regionRestricted === true ||
      !hasStrongTitleMatch(requestedTitle, name, requestedYear)
    ) {
      continue;
    }

    const nameTokens = normalizedTitleTokens(name);
    const requestedTokens = normalizedTitleTokens(requestedTitle);
    const officialSignal =
      (nameTokens.includes("official") &&
        !requestedTokens.includes("official")) ||
      hasOfficialChannelSignal(candidate.channelTitle ?? "");
    const yearSignal =
      requestedYear !== undefined &&
      ((nameTokens.includes(String(requestedYear)) &&
        !requestedTokens.includes(String(requestedYear))) ||
        normalizedTitleTokens(candidate.description ?? "").includes(
          String(requestedYear),
        ));

    ranked.push({
      candidate,
      key,
      score: (officialSignal ? 2 : 0) + (yearSignal ? 1 : 0),
      officialSignal,
    });
  }

  const uniqueByKey = new Map<string, (typeof ranked)[number]>();
  for (const item of ranked) {
    const existing = uniqueByKey.get(item.key);
    if (!existing || item.score > existing.score)
      uniqueByKey.set(item.key, item);
  }

  const matches = [...uniqueByKey.values()];
  const bestScore = Math.max(...matches.map((match) => match.score));
  const bestMatches = matches.filter((match) => match.score === bestScore);
  if (bestMatches.length !== 1) return null;

  const match = bestMatches[0];
  return pickYouTubeTrailer([
    {
      key: match.key,
      name: match.candidate.name,
      site: "YouTube",
      type: "Trailer",
      official: match.officialSignal,
    },
  ]);
}
