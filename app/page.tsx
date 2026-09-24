import { ReelroomApp } from "@/components/reelroom-app";
import { getOmdbMovies } from "@/lib/omdb";
import { getCuratedMovies, getTrendingMovies, getUpcomingMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [curatedMovies, omdbMovies, upcomingMovies] = await Promise.all([
    getCuratedMovies(),
    getOmdbMovies(),
    getUpcomingMovies(),
  ]);
  const fallbackMovies = omdbMovies ?? (await getTrendingMovies());
  const initialMovies = curatedMovies?.length
    ? curatedMovies
    : upcomingMovies?.length
    ? [...(omdbMovies?.slice(0, 1) ?? []), ...upcomingMovies]
    : fallbackMovies;
  return <ReelroomApp initialMovies={initialMovies ?? undefined} />;
}
