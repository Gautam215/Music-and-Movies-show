import { ReelroomApp } from "@/components/reelroom-app";
import { getOmdbMovies } from "@/lib/omdb";
import { getTrendingMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialMovies = (await getOmdbMovies()) ?? (await getTrendingMovies());
  return <ReelroomApp initialMovies={initialMovies ?? undefined} />;
}
