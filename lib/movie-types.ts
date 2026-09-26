export type Movie = {
  id: string;
  title: string;
  meta: string;
  status: "NOW PLAYING" | "UPCOMING";
  rating: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  showtimes: string[];
  genres: string[];
  release: string;
  price: number;
  runtime?: number;
  production?: string;
  actors?: string[];
  tmdbId?: number;
  mediaType?: "movie" | "tv" | "anime";
  trendScore?: number;
  trendRegion?: string;
};

export type MovieUpdateFeeds = {
  trending: Movie[];
  comingSoon: Movie[];
};
