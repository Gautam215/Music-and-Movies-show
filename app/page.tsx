import { ReelroomApp } from "@/components/reelroom-app";
import { getOmdbMovies } from "@/lib/omdb";
import { getCuratedMovies, getDailyMovieUpdates, getTopReelMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [topReelMovies, curatedMovies, omdbMovies, dailyUpdates] = await Promise.all([
    getTopReelMovies(),
    getCuratedMovies(),
    getOmdbMovies(),
    getDailyMovieUpdates(),
  ]);
  const fallbackMovies = omdbMovies ?? dailyUpdates?.trending ?? undefined;
  const upcomingMovies = dailyUpdates?.comingSoon ?? null;
  const initialMovies = topReelMovies?.length
    ? topReelMovies
    : curatedMovies?.length || upcomingMovies?.length
    ? [...(curatedMovies ?? []), ...(upcomingMovies ?? [])].filter(
        (movie, index, allMovies) =>
          allMovies.findIndex((candidate) => candidate.id === movie.id) === index,
      )
    : fallbackMovies;
  return <ReelroomApp initialMovies={initialMovies ?? undefined} dailyUpdates={dailyUpdates ?? undefined} />;
}
