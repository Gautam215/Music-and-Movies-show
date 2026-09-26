import { ReelroomApp } from "@/components/reelroom-app";
import { getCurrentUser } from "@/lib/auth-session";
import { getOmdbMovies } from "@/lib/omdb";
import { getCuratedMovies, getDailyMovieUpdates, getHomeTrending, getTopReelMovies } from "@/lib/tmdb";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  const regionHeader = requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry");
  const region = regionHeader && /^[A-Za-z]{2}$/.test(regionHeader) ? regionHeader.toUpperCase() : undefined;
  let userId: string | undefined;
  try {
    userId = (await getCurrentUser())?.id;
  } catch {
    userId = undefined;
  }
  const [homeTrending, topReelMovies, curatedMovies, omdbMovies, dailyUpdates] = await Promise.all([
    getHomeTrending({ userId, region }),
    getTopReelMovies(),
    getCuratedMovies(),
    getOmdbMovies(),
    getDailyMovieUpdates(),
  ]);
  const fallbackMovies = omdbMovies ?? dailyUpdates?.trending ?? undefined;
  const upcomingMovies = dailyUpdates?.comingSoon ?? null;
  const initialMovies = homeTrending?.length
    ? homeTrending
    : topReelMovies?.length
    ? topReelMovies
    : curatedMovies?.length || upcomingMovies?.length
    ? [...(curatedMovies ?? []), ...(upcomingMovies ?? [])].filter(
        (movie, index, allMovies) =>
          allMovies.findIndex((candidate) => candidate.id === movie.id) === index,
      )
    : fallbackMovies;
  return <ReelroomApp initialMovies={initialMovies ?? undefined} dailyUpdates={dailyUpdates ?? undefined} />;
}
