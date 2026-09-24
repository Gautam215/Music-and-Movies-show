import type { Movie } from "@/lib/movie-types";

const OMDB_ENDPOINT = "https://www.omdbapi.com/";
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85";
const FALLBACK_BACKDROP =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=85";

const defaultMovieIds = [
  "tt3896198",
  "tt1375666",
  "tt0816692",
  "tt0468569",
  "tt6751668",
  "tt0245429",
  "tt0133093",
];

type OmdbMovie = {
  Response?: "True" | "False";
  imdbID?: string;
  Title?: string;
  Year?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Plot?: string;
  Poster?: string;
  imdbRating?: string;
  BoxOffice?: string;
  Error?: string;
};

function configuredMovieIds() {
  const value = process.env.OMDB_MOVIE_IDS?.trim();
  return value
    ? value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : defaultMovieIds;
}

function formatRelease(movie: OmdbMovie) {
  if (movie.Released && movie.Released !== "N/A") return movie.Released;
  return movie.Year && movie.Year !== "N/A" ? movie.Year : "Now showing";
}

function formatRuntime(value?: string) {
  return value && value !== "N/A" ? value : "Runtime unavailable";
}

function mapMovie(movie: OmdbMovie, index: number): Movie | null {
  if (movie.Response !== "True" || !movie.imdbID || !movie.Title) return null;

  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : FALLBACK_POSTER;
  const genres = (movie.Genre && movie.Genre !== "N/A" ? movie.Genre.split(",") : [])
    .map((genre) => genre.trim())
    .filter(Boolean);

  return {
    id: `omdb-${movie.imdbID}`,
    title: movie.Title,
    meta: `${genres[0] ?? "Film"} · ${formatRuntime(movie.Runtime)}`,
    status: index === 0 ? "NOW PLAYING" : "UPCOMING",
    rating: movie.imdbRating && movie.imdbRating !== "N/A" ? movie.imdbRating : "—",
    poster,
    backdrop: poster === FALLBACK_POSTER ? FALLBACK_BACKDROP : poster,
    synopsis:
      movie.Plot && movie.Plot !== "N/A"
        ? movie.Plot
        : "A featured title selected from the OMDb catalog.",
    showtimes: ["10:30 AM", "1:45 PM", "7:30 PM"],
    genres: genres.length ? genres : ["Film"],
    release: formatRelease(movie),
    // OMDb does not expose cinema ticket pricing; keep the app's local baseline until a ticket API is connected.
    price: 14 + Math.min(index, 4) * 2,
  };
}

async function fetchMovie(id: string, apiKey: string) {
  const params = new URLSearchParams({ apikey: apiKey, i: id, plot: "short" });
  const response = await fetch(`${OMDB_ENDPOINT}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as OmdbMovie;
}

export async function getOmdbMovies(): Promise<Movie[] | null> {
  const apiKey = process.env.OMDB_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const results = await Promise.all(
      configuredMovieIds().map((id) => fetchMovie(id, apiKey)),
    );
    const movies = results
      .map((movie, index) => (movie ? mapMovie(movie, index) : null))
      .filter((movie): movie is Movie => Boolean(movie));
    return movies.length ? movies : null;
  } catch {
    return null;
  }
}
