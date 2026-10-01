import type { MovieTrailer } from "@/lib/movie-types";

const YOUTUBE_KEY_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

export type TrailerCandidate = {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
};

export function youtubeEmbedUrl(key: string) {
  if (!YOUTUBE_KEY_PATTERN.test(key)) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?rel=0&modestbranding=1`;
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
