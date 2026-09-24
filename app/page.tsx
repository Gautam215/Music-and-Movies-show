import { ReelroomApp } from "@/components/reelroom-app";
import { getTrendingMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialMovies = await getTrendingMovies();
  return <ReelroomApp initialMovies={initialMovies ?? undefined} />;
}
