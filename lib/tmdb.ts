import type { Movie } from "@/lib/movie-types";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3/trending/movie/week";
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

type TrendingMovie = {
  id: number;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
};

type TrendingResponse = { results?: TrendingMovie[] };

function formatRelease(value?: string) {
  if (!value) return "Trending this week";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Trending this week";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapMovie(movie: TrendingMovie, index: number): Movie {
  const title = movie.title?.trim() || "Untitled screening";
  const movieGenres = (movie.genre_ids ?? []).map((id) => genres[id]).filter(Boolean);
  const price = 14 + Math.min(index, 4) * 2;

  return {
    id: `tmdb-${movie.id}`,
    title,
    meta: `${movieGenres[0] ?? "Film"} · TMDB trending`,
    status: index === 0 ? "NOW PLAYING" : "UPCOMING",
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : "—",
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : FALLBACK_POSTER,
    backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : FALLBACK_BACKDROP,
    synopsis: movie.overview?.trim() || "A trending feature selected from this week’s TMDB catalog.",
    showtimes: ["10:30 AM", "1:45 PM", "7:30 PM"],
    genres: movieGenres.length ? movieGenres : ["Film"],
    release: formatRelease(movie.release_date),
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
    const data = (await response.json()) as TrendingResponse;
    const results = data.results?.slice(0, 7) ?? [];
    return results.length ? results.map(mapMovie) : null;
  } catch {
    return null;
  }
}
