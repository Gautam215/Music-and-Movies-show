import type { Movie } from "@/lib/movie-types";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3/trending/movie/week";
const TMDB_UPCOMING_ENDPOINT = "https://api.themoviedb.org/3/discover/movie";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w780";
const FALLBACK_POSTER = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85";
const FALLBACK_BACKDROP = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=85";

const genres: Record<number, string> = {
  12: "Adventure",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  53: "Thriller",
  80: "Crime",
  878: "Sci-Fi",
  9648: "Mystery",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

type TmdbMovie = {
  id: number;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  genre_ids?: number[];
};

type TmdbResponse = { results?: TmdbMovie[] };

type CuratedFeed = {
  language: string;
  label: string;
  quota: number;
  region: string;
};

const curatedFeeds: CuratedFeed[] = [
  { language: "en", label: "Hollywood", quota: 3, region: "US" },
  { language: "hi", label: "Bollywood", quota: 3, region: "IN" },
  { language: "te", label: "Tollywood", quota: 2, region: "IN" },
  { language: "ko", label: "K-drama", quota: 2, region: "KR" },
];

function formatRelease(value?: string, fallback = "Trending this week") {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapMovie(
  movie: TmdbMovie,
  index: number,
  collection: "trending" | "upcoming" | "curated" = "trending",
  segment?: string,
): Movie {
  const title = movie.title?.trim() || "Untitled screening";
  const movieGenres = (movie.genre_ids ?? []).map((id) => genres[id]).filter(Boolean);
  const price = 14 + Math.min(index, 4) * 2;
  const upcoming = collection === "upcoming";
  const label = segment ? `${segment} · ` : "";

  return {
    id: `tmdb-${movie.id}`,
    title,
    meta: `${label}${movieGenres[0] ?? "Film"} · TMDB`,
    status: upcoming ? "UPCOMING" : "NOW PLAYING",
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : "—",
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : FALLBACK_POSTER,
    backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : FALLBACK_BACKDROP,
    synopsis:
      movie.overview?.trim() ||
      (upcoming
        ? "An upcoming feature selected from TMDB’s release calendar."
        : "A current audience favorite selected from TMDB’s popularity and rating signals."),
    showtimes: ["10:30 AM", "1:45 PM", "7:30 PM"],
    genres: segment ? [segment, ...movieGenres] : movieGenres.length ? movieGenres : ["Film"],
    release: formatRelease(movie.release_date, upcoming ? "Upcoming release" : "Trending now"),
    price,
  };
}

export async function getTrendingMovies(): Promise<Movie[] | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return null;

  try {
    const response = await fetch(TMDB_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as TmdbResponse;
    const results = data.results?.slice(0, 7) ?? [];
    return results.length ? results.map((movie, index) => mapMovie(movie, index)) : null;
  } catch {
    return null;
  }
}

async function getCuratedFeed(feed: CuratedFeed, token: string) {
  const params = new URLSearchParams({
    language: "en-US",
    region: feed.region,
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    page: "1",
    "vote_count.gte": "25",
    with_original_language: feed.language,
  });

  const response = await fetch(`${TMDB_UPCOMING_ENDPOINT}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return { feed, movies: [] as TmdbMovie[] };
  const data = (await response.json()) as TmdbResponse;
  return { feed, movies: data.results ?? [] };
}

export async function getCuratedMovies(): Promise<Movie[] | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return null;

  try {
    const feeds = await Promise.all(curatedFeeds.map((feed) => getCuratedFeed(feed, token)));
    const selected: Array<{ movie: TmdbMovie; segment: string }> = [];
    const seen = new Set<number>();

    for (const { feed, movies: feedMovies } of feeds) {
      for (const movie of feedMovies) {
        if (seen.has(movie.id)) continue;
        seen.add(movie.id);
        selected.push({ movie, segment: feed.label });
        if (selected.filter((item) => item.segment === feed.label).length >= feed.quota) break;
      }
    }

    if (selected.length < 10) {
      const remaining = feeds
        .flatMap(({ feed, movies: feedMovies }) =>
          feedMovies.map((movie) => ({ movie, segment: feed.label })),
        )
        .filter(({ movie }) => !selected.some((item) => item.movie.id === movie.id))
        .sort(
          (a, b) =>
            (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0) ||
            (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0),
        );
      selected.push(...remaining.slice(0, 10 - selected.length));
    }

    return selected.length
      ? selected.slice(0, 10).map(({ movie, segment }, index) =>
          mapMovie(movie, index, "curated", segment),
        )
      : null;
  } catch {
    return null;
  }
}

function releaseTimestamp(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export async function getUpcomingMovies(): Promise<Movie[] | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const today = new Date();
  const todayValue = today.toISOString().slice(0, 10);
  const nextYear = new Date(today);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  const params = new URLSearchParams({
    language: "en-US",
    region: "US",
    sort_by: "primary_release_date.asc",
    include_adult: "false",
    include_video: "false",
    page: "1",
    "primary_release_date.gte": todayValue,
    "primary_release_date.lte": nextYear.toISOString().slice(0, 10),
    with_release_type: "2|3",
  });

  try {
    const response = await fetch(`${TMDB_UPCOMING_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as TmdbResponse;
    const results = (data.results ?? [])
      .filter((movie) => releaseTimestamp(movie.release_date) >= Date.parse(`${todayValue}T00:00:00Z`))
      .sort((a, b) => {
        const releaseDifference = releaseTimestamp(a.release_date) - releaseTimestamp(b.release_date);
        if (releaseDifference !== 0) return releaseDifference;
        const ratingDifference = (b.vote_average ?? 0) - (a.vote_average ?? 0);
        return ratingDifference || (b.popularity ?? 0) - (a.popularity ?? 0);
      })
      .slice(0, 7);

    return results.length
      ? results.map((movie, index) => mapMovie(movie, index, "upcoming"))
      : null;
  } catch {
    return null;
  }
}
