import { unstable_cache } from "next/cache";
import type { Movie, MovieUpdateFeeds } from "@/lib/movie-types";
import { getViewingProfile, type ViewingProfile } from "@/lib/viewing-history";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3/trending/movie/week";
const TMDB_TRENDING_ENDPOINT = "https://api.themoviedb.org/3/trending";
const TMDB_UPCOMING_ENDPOINT = "https://api.themoviedb.org/3/discover/movie";
const TMDB_TV_ENDPOINT = "https://api.themoviedb.org/3/discover/tv";
const TMDB_MOVIE_ENDPOINT = "https://api.themoviedb.org/3/movie";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w780";
const BIWEEKLY_REVALIDATE_SECONDS = 14 * 24 * 60 * 60;
const DAILY_REVALIDATE_SECONDS = 24 * 60 * 60;
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
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type?: "movie" | "tv" | "person";
  origin_country?: string[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  genre_ids?: number[];
  budget?: number;
  revenue?: number;
  runtime?: number;
  production_companies?: Array<{ name?: string }>;
  credits?: {
    cast?: Array<{ name?: string; order?: number }>;
  };
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
  mediaTypeOverride?: Movie["mediaType"],
): Movie {
  const title = movie.title?.trim() || movie.name?.trim() || movie.original_name?.trim() || "Untitled screening";
  const movieGenres = (movie.genre_ids ?? []).map((id) => genres[id]).filter(Boolean);
  const price = 14 + Math.min(index, 4) * 2;
  const upcoming = collection === "upcoming";
  const mediaType = mediaTypeOverride ?? (movie.media_type === "tv" ? "tv" : "movie");
  const label = segment ? `${segment} · ` : mediaType === "tv" ? "TV · " : "";
  const releaseDate = movie.release_date || movie.first_air_date;
  const finalGenres = mediaType === "anime" ? ["Anime", ...movieGenres] : movieGenres;

  return {
    id: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    mediaType,
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
    genres: finalGenres.length ? finalGenres : ["Film"],
    release: formatRelease(releaseDate, upcoming ? "Upcoming release" : "Trending now"),
    price,
    trendScore: movie.popularity ?? movie.vote_average ?? 0,
  };
}

type TrendScope = { region?: string };

async function fetchTrendEndpoint(path: string, token: string, params?: URLSearchParams) {
  const url = new URL(path);
  url.searchParams.set("language", "en-US");
  params?.forEach((value, key) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return [] as TmdbMovie[];
  const data = (await response.json()) as TmdbResponse;
  return data.results ?? [];
}

async function fetchTrendCatalog(token: string, scope: TrendScope) {
  const region = scope.region?.toUpperCase();
  const movieParams = region ? new URLSearchParams({ region, sort_by: "popularity.desc", include_adult: "false", include_video: "false", page: "1" }) : undefined;
  const tvParams = region ? new URLSearchParams({ watch_region: region, sort_by: "popularity.desc", include_adult: "false", include_video: "false", page: "1" }) : undefined;
  const animeParams = new URLSearchParams({ with_genres: "16", with_origin_country: "JP", sort_by: "popularity.desc", include_adult: "false", include_video: "false", page: "1", ...(region ? { watch_region: region } : {}) });
  const [moviesResult, tvResult, animeResult] = await Promise.all([
    fetchTrendEndpoint(region ? TMDB_UPCOMING_ENDPOINT : `${TMDB_TRENDING_ENDPOINT}/movie/week`, token, movieParams),
    fetchTrendEndpoint(region ? TMDB_TV_ENDPOINT : `${TMDB_TRENDING_ENDPOINT}/tv/week`, token, tvParams),
    fetchTrendEndpoint(TMDB_TV_ENDPOINT, token, animeParams),
  ]);
  const seen = new Set<string>();
  const results: Movie[] = [];
  const add = (items: TmdbMovie[], mediaType: Movie["mediaType"]) => {
    items.forEach((item, index) => {
      const key = `${mediaType}:${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const mapped = mapMovie(item, results.length + index, "trending", mediaType === "anime" ? "Anime" : undefined, mediaType);
      results.push({ ...mapped, trendRegion: region });
    });
  };
  add(moviesResult, "movie");
  add(tvResult, "tv");
  add(animeResult, "anime");
  return results
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, 30);
}

const getCachedTrendCatalog = async (region: string | undefined, revalidate: number, cacheNamespace: string) => {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const cacheKey = region?.toUpperCase() || "GLOBAL";
  const getCached = unstable_cache(
    () => fetchTrendCatalog(token, { region }),
    [cacheNamespace, cacheKey],
    { revalidate, tags: [cacheNamespace] },
  );
  try {
    const results = await getCached();
    return results.length ? results : null;
  } catch {
    return null;
  }
};

const getBiweeklyTrendCatalog = (region?: string) =>
  getCachedTrendCatalog(region, BIWEEKLY_REVALIDATE_SECONDS, "reelscape-biweekly-trending-v1");

const getDailyTrendCatalog = (region?: string) =>
  getCachedTrendCatalog(region, DAILY_REVALIDATE_SECONDS, "reelscape-daily-current-reel-v1");

function personalizeTrends(trends: Movie[], profile: ViewingProfile) {
  return trends
    .map((movie, index) => {
      const genreScore = movie.genres.reduce((score, genre) => score + (profile.genreWeights.get(genre) ?? 0), 0);
      const preferredGenreScore = movie.genres.filter((genre) => profile.preferredGenres.includes(genre)).length;
      const mediaScore = profile.mediaTypeWeights.get(movie.mediaType ?? "movie") ?? 0;
      return { movie, score: (movie.trendScore ?? 0) + genreScore * 0.35 + preferredGenreScore * 1.5 + mediaScore * 0.2 - index * 0.02 };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);
}

export async function getFeaturedScreening({ region }: { region?: string }) {
  const trends = await getBiweeklyTrendCatalog(region);
  return trends?.[0] ?? null;
}

export async function getCurrentReel({ userId, region }: { userId?: string; region?: string }) {
  const trends = await getDailyTrendCatalog(region);
  if (!trends) return null;
  if (!userId) return trends.slice(0, 12);
  try {
    const profile = await getViewingProfile(userId);
    return personalizeTrends(trends, profile).slice(0, 12);
  } catch {
    return trends.slice(0, 12);
  }
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
    const results = data.results?.slice(0, 9) ?? [];
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

export async function getTopReelMovies(): Promise<Movie[] | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const today = new Date();
  const todayValue = today.toISOString().slice(0, 10);
  const recentStart = new Date(today);
  recentStart.setUTCMonth(recentStart.getUTCMonth() - 18);
  const params = new URLSearchParams({
    language: "en-US",
    region: "US",
    sort_by: "vote_average.desc",
    include_adult: "false",
    include_video: "false",
    page: "1",
    "primary_release_date.gte": recentStart.toISOString().slice(0, 10),
    "primary_release_date.lte": todayValue,
    "vote_count.gte": "25",
    with_release_type: "2|3",
  });

  try {
    const response = await fetch(`${TMDB_UPCOMING_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as TmdbResponse;
    const candidates = (data.results ?? [])
      .filter((movie) => {
        const release = releaseTimestamp(movie.release_date);
        return Number.isFinite(release) && release <= Date.parse(`${todayValue}T00:00:00Z`);
      })
      .sort((a, b) => {
        const ratingDifference = (b.vote_average ?? 0) - (a.vote_average ?? 0);
        if (ratingDifference !== 0) return ratingDifference;
        const voteDifference = (b.vote_count ?? 0) - (a.vote_count ?? 0);
        return voteDifference || releaseTimestamp(b.release_date) - releaseTimestamp(a.release_date);
      })
      .slice(0, 10);

    if (candidates.length !== 10) return null;

    const enriched = await Promise.all(
      candidates.map(async (movie) => {
        try {
          const details = await getMovieCommercialDetails(movie.id, token, true);
          return { ...movie, ...(details ?? {}) };
        } catch {
          return movie;
        }
      }),
    );

    return enriched.map((movie, index) => ({
      ...mapMovie(movie, index, "trending"),
      runtime: movie.runtime,
      production: movie.production_companies
        ?.map((company) => company.name?.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" · "),
      actors: movie.credits?.cast
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((actor) => actor.name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, 4),
    }));
  } catch {
    return null;
  }
}

async function getMovieCommercialDetails(movieId: number, token: string, includeCredits = false) {
  const appendCredits = includeCredits ? "&append_to_response=credits" : "";
  const response = await fetch(`${TMDB_MOVIE_ENDPOINT}/${movieId}?language=en-US${appendCredits}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as Pick<
    TmdbMovie,
    "budget" | "revenue" | "runtime" | "production_companies" | "credits"
  >;
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
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    page: "1",
    "primary_release_date.gte": todayValue,
    "primary_release_date.lte": nextYear.toISOString().slice(0, 10),
  });

  try {
    const response = await fetch(`${TMDB_UPCOMING_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as TmdbResponse;
    const candidates = (data.results ?? [])
      .filter((movie) => releaseTimestamp(movie.release_date) >= Date.parse(`${todayValue}T00:00:00Z`))
      .sort((a, b) => {
        const popularityDifference = (b.popularity ?? 0) - (a.popularity ?? 0);
        if (popularityDifference !== 0) return popularityDifference;
        const ratingDifference = (b.vote_average ?? 0) - (a.vote_average ?? 0);
        return ratingDifference || releaseTimestamp(a.release_date) - releaseTimestamp(b.release_date);
      })
      .slice(0, 18);

    const enriched = await Promise.all(
      candidates.map(async (movie) => {
        try {
          const details = await getMovieCommercialDetails(movie.id, token);
          return { ...movie, ...(details ?? {}) };
        } catch {
          return movie;
        }
      }),
    );
    const results = enriched
      .sort(
        (a, b) =>
          (b.popularity ?? 0) - (a.popularity ?? 0) ||
          (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
          releaseTimestamp(a.release_date) - releaseTimestamp(b.release_date),
      )
      .slice(0, 9);

    return results.length
      ? results.map((movie, index) => mapMovie(movie, index, "upcoming"))
      : null;
  } catch {
    return null;
  }
}

const getDailyMovieUpdatesCached = unstable_cache(
  async (): Promise<MovieUpdateFeeds | null> => {
    const [trending, comingSoon] = await Promise.all([
      getTrendingMovies(),
      getUpcomingMovies(),
    ]);

    if (!trending?.length && !comingSoon?.length) return null;
    return {
      trending: trending ?? [],
      comingSoon: comingSoon ?? [],
    };
  },
  ["reelscape-daily-movie-updates-v3"],
  { revalidate: 86_400, tags: ["reelscape-daily-movie-updates-v3"] },
);

export async function getDailyMovieUpdates() {
  return getDailyMovieUpdatesCached();
}
