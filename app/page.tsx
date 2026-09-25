import { ReelroomApp } from "@/components/reelroom-app";
import { getOmdbMovies } from "@/lib/omdb";
import { getCuratedMovies, getTopReelMovies, getTrendingMovies, getUpcomingMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [topReelMovies, curatedMovies, omdbMovies, upcomingMovies] = await Promise.all([
    getTopReelMovies(),
    getCuratedMovies(),
    getOmdbMovies(),
    getUpcomingMovies(),
  ]);
  const fallbackMovies = omdbMovies ?? (await getTrendingMovies());
  const initialMovies = topReelMovies?.length
    ? topReelMovies
    : curatedMovies?.length || upcomingMovies?.length
    ? [...(curatedMovies ?? []), ...(upcomingMovies ?? [])].filter(
        (movie, index, allMovies) =>
          allMovies.findIndex((candidate) => candidate.id === movie.id) === index,
      )
    : fallbackMovies;
  return <ReelroomApp initialMovies={initialMovies ?? undefined} />;
}
