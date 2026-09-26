import type { Movie } from "@/lib/movie-types";
import { getCurrentReel } from "@/lib/tmdb";
import { getViewingProfile } from "@/lib/viewing-history";
import { getRecentUserSignals, type UserSignal } from "@/lib/user-signals";

export type NotificationItemData = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  age: string;
  artwork: string;
  actionLabel: string;
  actionHref?: string;
  actionType?: "link" | "reminder";
  priority?: "high" | "medium" | "low";
};

export type NotificationGroupData = {
  id: string;
  label: string;
  meta: string;
  accent: string;
  icon: "film" | "flame" | "music" | "ticket" | "calendar";
  items: NotificationItemData[];
};

function movieNotification(movie: Movie, id: string, detail: string): NotificationItemData {
  return {
    id,
    eyebrow: movie.mediaType === "tv" ? "TV signal" : movie.mediaType === "anime" ? "Anime signal" : "Movie signal",
    title: movie.title,
    detail,
    age: "Today",
    artwork: movie.poster,
    actionLabel: "Open the reel",
    actionHref: "#updates",
    priority: "medium",
  };
}

function signalAge(signal: UserSignal) {
  const minutes = Math.max(1, Math.round((Date.now() - signal.createdAt.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : "Recently";
}

function firstName(name: string) {
  return name.split(" ")[0] || "there";
}

export async function getNotificationGroups({
  userId,
  name,
  region,
}: {
  userId?: string;
  name?: string;
  region?: string;
}): Promise<NotificationGroupData[]> {
  const catalog = (await getCurrentReel({ userId, region })) ?? [];
  if (!userId) {
    const lead = catalog[0];
    const second = catalog[1] ?? lead;
    const third = catalog[2] ?? second;
    return [
      {
        id: "guest-trending",
        label: "Trending near you",
        meta: "A first look at your next signal",
        accent: "#ff9f0a",
        icon: "flame",
        items: lead
          ? [
              movieNotification(lead, `guest-trend-${lead.id}`, `${lead.title} is leading the current regional reel.`),
              movieNotification(second, `guest-trend-${second.id}`, `${second.title} is gaining attention across the market.`),
            ]
          : [],
      },
      {
        id: "guest-soundtrack",
        label: "Soundtrack desk",
        meta: "A general recommendation",
        accent: "#bf9aff",
        icon: "music",
        items: third
          ? [{ ...movieNotification(third, `guest-soundtrack-${third.id}`, `Explore the soundtrack and mood around ${third.title}.`), eyebrow: "Soundtrack preview", actionLabel: "Open songs", actionHref: "#songs", priority: "low" }]
          : [],
      },
      {
        id: "guest-ticket-desk",
        label: "Ticket desk",
        meta: "One reason to make a plan",
        accent: "#64d2ff",
        icon: "ticket",
        items: lead
          ? [{ ...movieNotification(lead, `guest-ticket-${lead.id}`, `${lead.title} is on the current reel. Browse available showtimes.`), eyebrow: "Now playing", actionLabel: "See showtimes", actionHref: "#tickets", priority: "high" }]
          : [],
      },
    ];
  }

  const [profile, signals] = await Promise.all([
    getViewingProfile(userId),
    getRecentUserSignals(userId),
  ]);
  const preferredGenre = profile.preferredGenres[0] ?? "your recent picks";
  const latestFavorite = signals.find((signal) => signal.type === "favorite");
  const latestBooking = signals.find((signal) => signal.type === "booking");
  const latestListen = signals.find((signal) => signal.type === "listen");
  const personalizedMovie = catalog[0];
  const groups: NotificationGroupData[] = [];

  if (personalizedMovie) {
    groups.push({
      id: "member-daily",
      label: `Good morning, ${firstName(name ?? "there")}`,
      meta: `Daily signal · matched to ${preferredGenre}`,
      accent: "#ff9f0a",
      icon: "film",
      items: [movieNotification(personalizedMovie, `personal-reel-${personalizedMovie.id}`, `Picked from today’s market signal using your viewing history and preferred genres.`)],
    });
  }

  if (latestFavorite) {
    const related = catalog.find((movie) => movie.id !== `tmdb-${latestFavorite.tmdbId}`) ?? personalizedMovie;
    if (related) {
      groups.push({
        id: "member-saved",
        label: "From your saved shelf",
        meta: "A follow-up to something you kept close",
        accent: "#64d2ff",
        icon: "flame",
        items: [{ ...movieNotification(related, `favorite-followup-${latestFavorite._id}`, `Because you saved ${latestFavorite.title}, this ${related.genres[0] ?? "new"} pick is waiting in your reel.`), age: signalAge(latestFavorite), priority: "high" }],
      });
    }
  }

  if (latestBooking) {
    groups.push({
      id: "member-ticket-desk",
      label: "Ticket desk",
      meta: "Your Reelscape demo booking activity",
      accent: "#64d2ff",
      icon: "ticket",
      items: [{
        id: `booking-${latestBooking._id}`,
        eyebrow: "Demo booking saved",
        title: `${latestBooking.title} is in your screening history`,
        detail: "This is an in-app booking signal only. No payment or external ticket provider was contacted.",
        age: signalAge(latestBooking),
        artwork: personalizedMovie?.poster ?? "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=160&q=82",
        actionLabel: "Open tickets",
        actionHref: "#tickets",
        priority: "medium",
      }],
    });
  }

  if (latestListen) {
    groups.push({
      id: "member-soundtrack",
      label: "Your soundtrack",
      meta: "A signal from what you played",
      accent: "#bf9aff",
      icon: "music",
      items: [{
        id: `listen-${latestListen._id}`,
        eyebrow: "Spotify activity",
        title: `A new scene starts with ${latestListen.title}`,
        detail: `${latestListen.metadata?.artist ?? "Your recent artist"} · ${latestListen.metadata?.movie ?? "Your recent soundtrack"}. Keep the mood moving through the next reel.`,
        age: signalAge(latestListen),
        artwork: personalizedMovie?.poster ?? "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=160&q=82",
        actionLabel: "Open songs",
        actionHref: "#songs",
        priority: "low",
      }],
    });
  }

  return groups.length
    ? groups
    : [{
        id: "member-empty",
        label: `Good morning, ${firstName(name ?? "there")}`,
        meta: "Your daily signal",
        accent: "#ff9f0a",
        icon: "film",
        items: personalizedMovie ? [movieNotification(personalizedMovie, `member-first-${personalizedMovie.id}`, "Open a title to start building your personalized signal.")] : [],
      }];
}
