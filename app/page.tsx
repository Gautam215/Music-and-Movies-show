import { ReelroomApp } from "@/components/reelroom-app";
import { getCurrentUser } from "@/lib/auth-session";
import { getOmdbMovies } from "@/lib/omdb";
import { getCuratedMovies, getCurrentReel, getDailyMovieUpdates, getFeaturedScreening, getTopReelMovies } from "@/lib/tmdb";
import { getRequestLocation } from "@/lib/request-location";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  const regionHeader = requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry");
  const region = regionHeader && /^[A-Za-z]{2}$/.test(regionHeader) ? regionHeader.toUpperCase() : undefined;
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }
  const [featuredMovie, currentReel, topReelMovies, curatedMovies, omdbMovies, dailyUpdates] = await Promise.all([
    getFeaturedScreening({ region }),
    getCurrentReel({ userId: currentUser?.id, region }),
    getTopReelMovies(),
    getCuratedMovies(),
    getOmdbMovies(),
    getDailyMovieUpdates(),
  ]);
  const fallbackMovies = omdbMovies ?? dailyUpdates?.trending ?? undefined;
  const upcomingMovies = dailyUpdates?.comingSoon ?? null;
  const initialMovies = currentReel?.length
    ? currentReel
    : topReelMovies?.length
    ? topReelMovies
    : curatedMovies?.length || upcomingMovies?.length
    ? [...(curatedMovies ?? []), ...(upcomingMovies ?? [])].filter(
        (movie, index, allMovies) =>
          allMovies.findIndex((candidate) => candidate.id === movie.id) === index,
      )
    : fallbackMovies;
  const profileLocation = getRequestLocation(requestHeaders);
  return (
    <ReelroomApp
      initialMovies={initialMovies ?? undefined}
      featuredMovie={featuredMovie ?? currentReel?.[0] ?? initialMovies?.[0]}
      dailyUpdates={dailyUpdates ?? undefined}
      initialProfile={currentUser ? { name: currentUser.name, email: currentUser.email, location: profileLocation } : null}
    />
  );
}
