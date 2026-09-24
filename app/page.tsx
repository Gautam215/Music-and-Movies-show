import { ReelroomApp } from "@/components/reelroom-app";
import { getOmdbMovies } from "@/lib/omdb";
import { getTrendingMovies, getUpcomingMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [omdbMovies, upcomingMovies] = await Promise.all([
    getOmdbMovies(),
    getUpcomingMovies(),
  ]);
  const fallbackMovies = omdbMovies ?? (await getTrendingMovies());
  const initialMovies = upcomingMovies?.length
    ? [...(omdbMovies?.slice(0, 1) ?? []), ...upcomingMovies, ...(omdbMovies?.slice(1) ?? [])]
    : fallbackMovies;
  return <ReelroomApp initialMovies={initialMovies ?? undefined} />;
}
