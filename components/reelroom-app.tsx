"use client";

import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  Armchair,
  Bell,
  Bookmark,
  Check,
  Clock3,
  Disc3,
  EllipsisVertical,
  Film,
  Headphones,
  Heart,
  Home,
  LogIn,
  MapPin,
  Music2,
  Pause,
  Play,
  FastForward,
  Rewind,
  Repeat,
  Search,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Ticket,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import { BlackHoleHeroSection } from "@/components/ui/black-hole-hero-section";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import HolographicBeams from "@/components/ui/beams-background";
import { cn } from "@/lib/utils";
import type { Movie } from "@/lib/movie-types";

type Song = {
  id?: string;
  title: string;
  artist: string;
  movie: string;
  duration: string;
  art: string;
  genre: string;
  spotifyUri?: string;
  spotifyUrl?: string;
  previewUrl?: string | null;
};

type SpotifyPlayerState = {
  paused: boolean;
  position?: number;
  duration?: number;
  track_window: {
    current_track: {
      uri?: string;
      name?: string;
      duration_ms?: number;
    } | null;
  };
};

type SpotifyPlayer = {
  addListener: (event: string, callback: (data: any) => void) => boolean;
  activateElement: () => Promise<void>;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState?: () => Promise<SpotifyPlayerState | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek?: (positionMs: number) => Promise<void>;
};

type SpotifySession = {
  connected?: boolean;
  product?: string | null;
};

async function fetchSpotifySession() {
  const response = await fetch("/api/spotify/session", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) return null;
  return (await response.json()) as SpotifySession;
}

function formatPlaybackTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        volume: number;
        getOAuthToken: (callback: (token: string) => void) => void;
      }) => SpotifyPlayer;
    };
  }
}

const art = [
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85",
];

const movies: Movie[] = [
  {
    id: "m1",
    title: "The Last Light",
    meta: "Drama · 2h 08m",
    status: "NOW PLAYING",
    rating: "8.7",
    poster: art[0],
    backdrop: art[0],
    synopsis:
      "In a city that forgets its nights, one projectionist keeps the final reel alive long enough for a missing daughter to find her way home.",
    showtimes: ["10:15 AM", "1:40 PM", "4:25 PM", "8:10 PM"],
    genres: ["Drama", "Mystery"],
    release: "Now playing",
    price: 16,
  },
  {
    id: "m2",
    title: "Neon Aftercare",
    meta: "Sci-Fi · 1h 54m",
    status: "NOW PLAYING",
    rating: "8.3",
    poster: art[1],
    backdrop: art[1],
    synopsis:
      "A night-shift medic discovers the city’s predictive system has started prescribing memories instead of medicine.",
    showtimes: ["11:20 AM", "3:05 PM", "7:30 PM"],
    genres: ["Sci-Fi", "Thriller"],
    release: "Now playing",
    price: 16,
  },
  {
    id: "m3",
    title: "Rooms With Weather",
    meta: "Romance · 1h 47m",
    status: "UPCOMING",
    rating: "—",
    poster: art[2],
    backdrop: art[2],
    synopsis:
      "Two architects build a house that changes climate every time they tell the truth.",
    showtimes: ["12:10 PM", "5:00 PM", "9:20 PM"],
    genres: ["Romance", "Indie"],
    release: "Oct 18, 2026",
    price: 18,
  },
  {
    id: "m4",
    title: "Static Bloom",
    meta: "Documentary · 1h 31m",
    status: "UPCOMING",
    rating: "—",
    poster: art[3],
    backdrop: art[3],
    synopsis:
      "A portrait of underground musicians composing a city-wide symphony from broken machines.",
    showtimes: ["2:20 PM", "6:45 PM"],
    genres: ["Documentary"],
    release: "Oct 24, 2026",
    price: 18,
  },
  {
    id: "m5",
    title: "Oceans Between Us",
    meta: "Adventure · 2h 16m",
    status: "UPCOMING",
    rating: "8.1",
    poster: art[4],
    backdrop: art[4],
    synopsis:
      "Three siblings cross an unfamiliar coast to return a reel of home movies before the tide erases the road.",
    showtimes: ["9:45 AM", "12:55 PM", "6:15 PM"],
    genres: ["Adventure", "Drama"],
    release: "Oct 31, 2026",
    price: 20,
  },
  {
    id: "m6",
    title: "The Quiet Frequency",
    meta: "Thriller · 1h 48m",
    status: "UPCOMING",
    rating: "7.9",
    poster: art[5],
    backdrop: art[5],
    synopsis:
      "A radio producer hears tomorrow’s emergency broadcasts one night early — and recognizes her own voice.",
    showtimes: ["4:00 PM", "9:05 PM"],
    genres: ["Thriller", "Mystery"],
    release: "Nov 07, 2026",
    price: 20,
  },
];

const fallbackSoundtrackColors = [
  "rgba(116, 74, 104, .42)",
  "rgba(46, 86, 112, .38)",
  "rgba(104, 83, 54, .36)",
  "rgba(72, 91, 105, .34)",
  "rgba(104, 68, 55, .36)",
  "rgba(63, 77, 105, .38)",
];

const wheelItems: WorksWheelItem[] = [
  ...movies
    .filter((item) => item.status === "UPCOMING")
    .map((item) => ({
      title: item.title,
      image: item.poster,
      href: `#${item.id}`,
      meta: `${item.meta} · ${item.release}`,
      details: item.synopsis,
    })),
  {
    title: "Prismatic Rift",
    image: art[0],
    href: "#prismatic-rift",
    meta: "Sci-Fi · 1h 58m · Dec 12",
    details:
      "A cartographer maps a split in the sky before it closes around the city.",
  },
  {
    title: "Ember Clouds",
    image: art[1],
    href: "#ember-clouds",
    meta: "Drama · 1h 42m · Dec 19",
    details:
      "A weather archivist follows a vanished storm through three generations.",
  },
  {
    title: "Neon Portal",
    image: art[2],
    href: "#neon-portal",
    meta: "Thriller · 2h 04m · Jan 09",
    details:
      "A midnight courier finds a door that only appears in reflections.",
  },
  {
    title: "Red Ribbon",
    image: art[3],
    href: "#red-ribbon",
    meta: "Romance · 1h 51m · Jan 16",
    details:
      "Two strangers trace a ribbon through a city that keeps rearranging itself.",
  },
  {
    title: "Celestial Room",
    image: art[4],
    href: "#celestial-room",
    meta: "Mystery · 1h 46m · Jan 23",
    details: "A closed cinema screens a film no one remembers making.",
  },
];

const nav = [
  ["home", "Home", Home],
  ["movies", "Movies", Film],
  ["updates", "Updates", Disc3],
  ["songs", "Songs", Music2],
  ["tickets", "Tickets", Ticket],
  ["profile", "Profile", UserRound],
  ["login", "Login", LogIn],
] as const;
type NavId = (typeof nav)[number][0];

function Button({
  children,
  className,
  variant = "surface",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "ghost";
}) {
  return (
    <button
      className={cn(
        "reelroom-action-button inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition duration-500 ease-out hover:-translate-y-px focus-visible:outline-none",
        variant === "primary" &&
          "border-amber bg-amber text-canvas",
        variant === "surface" &&
          "border-border bg-surface-2 text-ink",
        variant === "ghost" &&
          "border-border bg-transparent text-ink-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  copy,
  action,
  compact = false,
  headingLevel = "h2",
  titleId,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: ReactNode;
  compact?: boolean;
  headingLevel?: "h1" | "h2";
  titleId?: string;
}) {
  const Heading = headingLevel;

  return (
    <div className={cn(compact ? "mb-2" : "mb-5", "flex min-w-0 max-w-full items-end justify-between gap-4")}>
      <div className="min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
          {eyebrow}
        </span>
        <Heading
          id={titleId}
          className={cn(compact ? "mt-1 text-xl md:text-2xl" : "mt-2 text-2xl md:text-3xl", "font-display font-semibold leading-none tracking-[-.05em] text-ink")}
        >
          {title}
        </Heading>
        {copy ? (
          <p className="mt-3 max-w-xl text-xs leading-6 text-ink-2">{copy}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function PreferenceSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full min-w-0 items-center justify-between gap-4 border-b border-border pb-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <span className="min-w-0">
        <strong className="block font-display text-xs text-ink">{label}</strong>
        <span className="mt-1 block text-[10px] text-ink-2">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 rounded-full px-2 py-1 font-mono text-[9px] transition-colors",
          checked ? "bg-cobalt text-ink" : "bg-surface-3 text-ink-2",
        )}
      >
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function PosterCard({
  item,
  onOpen,
  saved,
  onSave,
}: {
  item: Movie;
  onOpen: (item: Movie) => void;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <article
      className="reelroom-poster-card group min-w-0 cursor-pointer"
      onClick={() => onOpen(item)}
    >
      <div className="relative aspect-[2/2.8] overflow-hidden rounded-xl border border-border bg-surface">
        <img
          src={item.poster}
          alt={`${item.title} poster`}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 font-mono text-[9px] text-ink-2">
          {item.status}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSave(item.id);
          }}
          className={cn(
            "absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-white/20 bg-canvas/70 text-ink-2 backdrop-blur",
            saved && "text-amber",
          )}
          aria-label={
            saved ? `Remove ${item.title} from favorites` : `Save ${item.title}`
          }
        >
          {saved ? (
            <Bookmark className="size-3.5 fill-current" />
          ) : (
            <Bookmark className="size-3.5" />
          )}
        </button>
      </div>
      <div className="pt-3">
        <h3 className="truncate font-display text-sm font-semibold text-ink">
          {item.title}
        </h3>
        <p className="mt-1 truncate font-mono text-[10px] text-muted">
          {item.meta} · {item.rating === "—" ? item.status : `★ ${item.rating}`}
        </p>
      </div>
    </article>
  );
}

function FeaturedScreening({
  item,
  onOpen,
  onBook,
}: {
  item: Movie;
  onOpen: (item: Movie) => void;
  onBook: () => void;
}) {
  return (
    <article className="group reelroom-featured-screening grid w-full items-center gap-6 md:grid-cols-[minmax(12rem,.72fr)_minmax(0,1.28fr)] md:gap-10">
      <div>
        <div className="relative min-h-[22rem] overflow-hidden rounded-2xl md:min-h-[31rem]">
          <img
            src={item.poster}
            alt={`${item.title} poster`}
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas/95 via-canvas/25 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full border border-amber/50 bg-canvas/55 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-amber backdrop-blur">
            Featured event
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h2 className="font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink sm:text-3xl">
              {item.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[.08em] text-ink-2">
              <span className="flex items-center gap-1.5 text-amber">
                <Clock3 className="size-3" /> {item.release}
              </span>
              <span className="text-amber">•</span>
              <span>★ {item.rating}</span>
              <span className="text-amber">•</span>
              <span>{item.meta}</span>
              <span className="text-amber">•</span>
              <span>Approx. ₹{item.price}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center py-2 md:py-8">
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
          Featured event
        </div>
        <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[.91] tracking-[-.08em] text-ink sm:text-6xl md:text-7xl">
          Your First Screening
        </h1>
        <p className="mt-5 max-w-xl font-display text-2xl font-medium leading-[1.05] tracking-[-.05em] text-ink sm:text-3xl">
          Don&apos;t Just Watch. Be Part of It. The Journey Starts Here.
        </p>
        <p className="mt-5 max-w-xl text-sm leading-6 text-ink-2">
          Get behind-the-scenes access to the people, process, and stories that
          make every screening more than a movie. Discover what happens before
          the lights go down and stay for the conversation after.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => onOpen(item)}>
            See Event Details <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={onBook}>
            Book Ticket
          </Button>
        </div>
      </div>
    </article>
  );
}

function MoreAccessMenu({
  open,
  mobile = false,
  header = false,
  currentPage,
  onNavigate,
}: {
  open: boolean;
  mobile?: boolean;
  header?: boolean;
  currentPage: NavId;
  onNavigate: (page: NavId) => void;
}) {
  if (!open) return null;
  const items = nav.filter(([id]) => {
    if (id === currentPage) return false;
    if (mobile && id === "updates") return false;
    return true;
  });
  return (
    <div
      className={cn(
        header ? "reelroom-header-menu" : "reelroom-more-menu",
        "z-50 w-52 rounded-xl border border-border bg-surface p-1 shadow-cinematic",
        header ? "absolute right-0 top-11" : mobile ? "fixed bottom-20 right-4" : "absolute bottom-12 left-0",
        mobile && "lg:hidden",
      )}
      role="menu"
      aria-label="More navigation"
    >
      {items.map(([id, label, Icon]) => (
        <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => onNavigate(id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-ink-2 hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
          <Icon className="size-4 text-amber" />
          {label}
        </button>
      ))}
    </div>
  );
}

function pageFromLocation(): NavId {
  if (typeof window === "undefined") return "home";
  const candidate = window.location.hash.slice(1);
  return nav.some(([id]) => id === candidate) ? (candidate as NavId) : "home";
}

export function ReelroomApp({ initialMovies }: { initialMovies?: Movie[] }) {
  const catalog = initialMovies?.length ? initialMovies : movies;
  const heroCandidates = catalog.filter((item) => item.status === "UPCOMING");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroMovie = heroCandidates[heroIndex % Math.max(heroCandidates.length, 1)] ?? movies[0];
  const [page, setPageState] = useState<NavId>("home");
  const [routeReady, setRouteReady] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [favorites, setFavorites] = useState<string[]>([heroMovie.id]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [droppedMovie, setDroppedMovie] = useState<Movie | null>(null);
  const [detailsShownAt, setDetailsShownAt] = useState<number | null>(null);
  const [seatZoom, setSeatZoom] = useState(1);
  const [showtime, setShowtime] = useState("1:40 PM");
  const [booking, setBooking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [spotifyCatalog, setSpotifyCatalog] = useState<Song[]>([]);
  const [spotifyPlaylistName, setSpotifyPlaylistName] = useState("Hehe");
  const [spotifyPlaylistLoading, setSpotifyPlaylistLoading] = useState(false);
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState("Connect Spotify");
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyTrackUri, setSpotifyTrackUri] = useState<string | null>(null);
  const [spotifyPaused, setSpotifyPaused] = useState(true);
  const [spotifyPositionMs, setSpotifyPositionMs] = useState(0);
  const [spotifyDurationMs, setSpotifyDurationMs] = useState(0);
  const [spotifySearchOpen, setSpotifySearchOpen] = useState(false);
  const [spotifyTrackListOpen, setSpotifyTrackListOpen] = useState(true);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifySearchResults, setSpotifySearchResults] = useState<Song[]>([]);
  const [spotifySearchLoading, setSpotifySearchLoading] = useState(false);
  const [spotifySearchError, setSpotifySearchError] = useState<string | null>(null);
  const [releaseAlerts, setReleaseAlerts] = useState(true);
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [preferredCity, setPreferredCity] = useState("Greater Noida");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [soundtrackColors, setSoundtrackColors] = useState(fallbackSoundtrackColors);
  const preferencesRef = useRef<HTMLElement>(null);
  const spotifyPlayerRef = useRef<SpotifyPlayer | null>(null);
  const spotifyDeviceIdRef = useRef<string | null>(null);
  const spotifySearchInputRef = useRef<HTMLInputElement>(null);
  const spotifySearchAbortRef = useRef<AbortController | null>(null);
  const spotifyAuthWindowRef = useRef<Window | null>(null);
  const isLastLightDetailsVisible = droppedMovie?.title === "The Last Light";

  useEffect(() => {
    if (heroCandidates.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroCandidates.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [heroCandidates.length]);

  useEffect(() => {
    if (!droppedMovie || detailsShownAt === null) return;
    const timeout = window.setTimeout(() => {
      setDroppedMovie(null);
      setDetailsShownAt(null);
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [droppedMovie, detailsShownAt]);

  useEffect(() => {
    if (!spotifyConnected) return;

    let cancelled = false;
    const loadPlaylist = async () => {
      setSpotifyPlaylistLoading(true);
      try {
        const response = await fetch("/api/spotify/playlist?name=Hehe", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as {
          playlistName?: string;
          songs?: Song[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!response.ok) {
          setSpotifyCatalog([]);
          setSpotifyPlaylistError(payload?.error ?? "Hehe playlist tracks are unavailable.");
          return;
        }
        setSpotifyPlaylistName(payload?.playlistName ?? "Hehe");
        setSpotifyCatalog(payload?.songs ?? []);
        setSpotifyPlaylistError(null);
      } catch {
        if (!cancelled) setSpotifyPlaylistError("Hehe playlist tracks are unavailable.");
      } finally {
        if (!cancelled) setSpotifyPlaylistLoading(false);
      }
    };

    void loadPlaylist();
    const refreshInterval = window.setInterval(loadPlaylist, 120_000);
    window.addEventListener("focus", loadPlaylist);
    document.addEventListener("visibilitychange", loadPlaylist);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", loadPlaylist);
      document.removeEventListener("visibilitychange", loadPlaylist);
    };
  }, [spotifyConnected]);

  useEffect(() => {
    if (!spotifyConnected && !spotifyConnecting) return;
    const syncSession = () => {
      void fetchSpotifySession().then((session) => {
        if (session?.connected) {
          setSpotifyConnecting(false);
          setSpotifyConnected(true);
          if (!spotifyReady) setSpotifyStatus("Preparing player");
          return;
        }
        if (spotifyConnected) {
          setSpotifyConnected(false);
          setSpotifyReady(false);
          setSpotifyStatus("Reconnect Spotify");
        }
      }).catch(() => undefined);
    };
    window.addEventListener("focus", syncSession);
    document.addEventListener("visibilitychange", syncSession);
    return () => {
      window.removeEventListener("focus", syncSession);
      document.removeEventListener("visibilitychange", syncSession);
    };
  }, [spotifyConnected, spotifyConnecting, spotifyReady]);

  useEffect(() => {
    let cancelled = false;
    fetchSpotifySession()
      .then((session) => {
        if (!cancelled && session?.connected) {
          setSpotifyConnected(true);
          setSpotifyStatus("Preparing player");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const onSpotifyAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "reelroom-spotify-auth") return;
      setSpotifyConnecting(false);
      spotifyAuthWindowRef.current = null;
      if (event.data.status === "connected") {
        setSpotifyStatus("Checking Spotify session");
        void fetchSpotifySession().then((session) => {
          if (cancelled) return;
          if (session?.connected) {
            setSpotifyConnected(true);
            setSpotifyStatus("Preparing player");
            setSpotifyError(null);
          } else {
            setSpotifyStatus("Connect Spotify");
            setSpotifyError("Spotify did not return a usable playback session.");
          }
        }).catch(() => {
          if (!cancelled) {
            setSpotifyStatus("Connect Spotify");
            setSpotifyError("Spotify session verification failed.");
          }
        });
      } else {
        setSpotifyStatus("Connect Spotify");
        setSpotifyError("Spotify connection was not completed.");
      }
    };

    window.addEventListener("message", onSpotifyAuthMessage);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onSpotifyAuthMessage);
    };
  }, []);

  useEffect(() => {
    if (!spotifyConnected) return;
    let cancelled = false;
    const setupPlayer = () => {
      if (cancelled || !window.Spotify || spotifyPlayerRef.current) return;
      const player = new window.Spotify.Player({
        name: "Reelscape Web Player",
        volume: 0.72,
        getOAuthToken: (callback) => {
          fetch("/api/spotify/token", { cache: "no-store", credentials: "same-origin" })
            .then(async (response) => {
              const payload = (await response.json()) as { accessToken?: string };
              if (!response.ok || !payload.accessToken) throw new Error("Spotify session expired");
              callback(payload.accessToken);
            })
            .catch(() => {
              setSpotifyConnected(false);
              setSpotifyReady(false);
              setSpotifyStatus("Reconnect Spotify");
            });
        },
      });
      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        spotifyDeviceIdRef.current = device_id;
        setSpotifyReady(true);
        setSpotifyStatus("Ready to play");
        setSpotifyError(null);
      });
      player.addListener("not_ready", () => {
        setSpotifyReady(false);
        setSpotifyStatus("Player offline");
      });
      player.addListener("player_state_changed", (state: SpotifyPlayerState | null) => {
        const track = state?.track_window.current_track;
        setSpotifyTrackUri(track?.uri ?? null);
        setSpotifyPaused(state?.paused ?? true);
        setSpotifyPositionMs(state?.position ?? 0);
        setSpotifyDurationMs(state?.duration ?? track?.duration_ms ?? 0);
        setPlaying(state?.paused ? null : track?.name ?? null);
      });
      player.addListener("initialization_error", ({ message }: { message: string }) => {
        setSpotifyError(message);
        setSpotifyStatus("Player unavailable");
      });
      player.addListener("authentication_error", ({ message }: { message: string }) => {
        setSpotifyError(message);
        setSpotifyStatus("Reconnect Spotify");
        setSpotifyConnected(false);
      });
      player.addListener("account_error", ({ message }: { message: string }) => {
        setSpotifyError("An active Spotify Premium account is required for playback.");
        setSpotifyStatus("Premium required");
      });
      spotifyPlayerRef.current = player;
      player.connect().then((connected) => {
        if (!connected && !cancelled) setSpotifyStatus("Player unavailable");
      });
    };

    if (window.Spotify) {
      setupPlayer();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.getElementById("spotify-player-sdk");
    const script = (existingScript ?? document.createElement("script")) as HTMLScriptElement;
    const onLoad = () => setupPlayer();
    const previousReady = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = setupPlayer;
    script.addEventListener("load", onLoad);
    if (!existingScript) {
      script.id = "spotify-player-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
    return () => {
      cancelled = true;
      script.removeEventListener("load", onLoad);
      window.onSpotifyWebPlaybackSDKReady = previousReady;
      spotifyPlayerRef.current?.disconnect();
      spotifyPlayerRef.current = null;
      spotifyDeviceIdRef.current = null;
      setSpotifyPositionMs(0);
      setSpotifyDurationMs(0);
      setSpotifyReady(false);
    };
  }, [spotifyConnected]);

  useEffect(() => {
    if (!spotifySearchOpen) return;
    const frame = window.requestAnimationFrame(() => spotifySearchInputRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSpotifySearchOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [spotifySearchOpen]);

  const setPage = (nextPage: NavId) => {
    setPageState(nextPage);
    if (typeof window === "undefined") return;
    const nextHash = nextPage === "home" ? "" : `#${nextPage}`;
    if (window.location.hash === nextHash) return;
    window.history.pushState({ page: nextPage }, "", `${window.location.pathname}${window.location.search}${nextHash}`);
  };

  useEffect(() => {
    const syncPage = () => {
      setPageState(pageFromLocation());
      setRouteReady(true);
    };
    syncPage();
    window.addEventListener("popstate", syncPage);
    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("hashchange", syncPage);
    };
  }, []);

  useEffect(() => {
    try {
      const savedReleaseAlerts = window.localStorage.getItem("reelroom.releaseAlerts");
      const savedBookingUpdates = window.localStorage.getItem("reelroom.bookingUpdates");
      if (savedReleaseAlerts !== null) {
        // Local storage is an external source, so hydrate these preferences after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReleaseAlerts(savedReleaseAlerts === "true");
      }
      if (savedBookingUpdates !== null) {
        setBookingUpdates(savedBookingUpdates === "true");
      }
    } catch {
      // Defaults remain available when storage is blocked.
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem("reelroom.releaseAlerts", String(releaseAlerts));
      window.localStorage.setItem("reelroom.bookingUpdates", String(bookingUpdates));
    } catch {
      // Preferences remain usable when storage is blocked.
    }
  }, [bookingUpdates, preferencesReady, releaseAlerts]);

  useEffect(() => {
    let cancelled = false;
    const extractColor = (source: string, fallback: string) =>
      new Promise<string>((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 24;
          canvas.height = 24;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            resolve(fallback);
            return;
          }
          try {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let red = 0;
            let green = 0;
            let blue = 0;
            let samples = 0;
            for (let index = 0; index < pixels.length; index += 16) {
              const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
              if (pixels[index + 3] < 120 || brightness < 18 || brightness > 245) continue;
              red += pixels[index];
              green += pixels[index + 1];
              blue += pixels[index + 2];
              samples += 1;
            }
            if (!samples) {
              resolve(fallback);
              return;
            }
            resolve(
              `rgba(${Math.round(red / samples)}, ${Math.round(green / samples)}, ${Math.round(blue / samples)}, .42)`,
            );
          } catch {
            resolve(fallback);
          }
        };
        image.onerror = () => resolve(fallback);
        image.src = source;
      });

    if (!spotifyCatalog.length) return;

    Promise.all(
      spotifyCatalog.map((song, index) =>
        extractColor(song.art, fallbackSoundtrackColors[index % fallbackSoundtrackColors.length]),
      ),
    ).then((colors) => {
      if (!cancelled) setSoundtrackColors(colors);
    });
    return () => {
      cancelled = true;
    };
  }, [spotifyCatalog]);

  useEffect(() => {
    document.title = page === "profile" ? "Reelscape — Profile" : "Reelscape — find your next screening";
  }, [page]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".reelroom-desktop-overflow, .reelroom-header-overflow")) return;
      setMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [moreOpen]);

  useEffect(() => {
    let frame = 0;
    let targetBackground = 0;
    let targetHero = 0;
    let background = 0;
    let heroOffset = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const updateTarget = () => {
      const scroll = Math.min(window.scrollY, 1400);
      targetBackground = scroll * 0.04;
      targetHero = scroll * -0.06;
      if (reducedMotion) {
        background = targetBackground;
        heroOffset = targetHero;
      }
    };
    const spring = () => {
      frame = 0;
      const blend = reducedMotion ? 1 : 0.14;
      background += (targetBackground - background) * blend;
      heroOffset += (targetHero - heroOffset) * blend;
      document.documentElement.style.setProperty(
        "--reelroom-parallax-bg",
        `${background}px`,
      );
      document.documentElement.style.setProperty(
        "--reelroom-parallax-hero",
        `${heroOffset}px`,
      );
      if (
        !reducedMotion &&
        (Math.abs(targetBackground - background) > 0.05 ||
          Math.abs(targetHero - heroOffset) > 0.05)
      )
        frame = window.requestAnimationFrame(spring);
    };
    const onScroll = () => {
      updateTarget();
      if (!frame) frame = window.requestAnimationFrame(spring);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    }, [spotifyCatalog]);

  const filteredSongs = spotifyConnected ? spotifyCatalog : [];
  const visiblePlaylistError = spotifyConnected ? spotifyPlaylistError : null;
  const toggleFavorite = (id: string) =>
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2400);
  };
  const connectSpotify = () => {
    if (spotifyConnecting) return;
    const authWindow = window.open(
      "/api/spotify/login?mode=popup",
      "reelroom-spotify-auth",
      "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes",
    );
    if (!authWindow) {
      setSpotifyError("Allow pop-ups to connect Spotify without leaving Reelscape.");
      return;
    }
    spotifyAuthWindowRef.current = authWindow;
    setSpotifyConnecting(true);
    setSpotifyError(null);
    setSpotifyStatus("Waiting for Spotify");
    const closeWatcher = window.setInterval(() => {
      if (!authWindow.closed) return;
      window.clearInterval(closeWatcher);
      if (spotifyAuthWindowRef.current !== authWindow) return;
      spotifyAuthWindowRef.current = null;
      setSpotifyConnecting(false);
      setSpotifyStatus("Connect Spotify");
      setSpotifyError("Spotify connection was cancelled.");
    }, 500);
  };
  const searchSpotify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = spotifySearchQuery.trim();
    if (!query) {
      setSpotifySearchResults([]);
      setSpotifySearchError(null);
      return;
    }

    spotifySearchAbortRef.current?.abort();
    const controller = new AbortController();
    spotifySearchAbortRef.current = controller;
    setSpotifySearchLoading(true);
    setSpotifySearchError(null);

    try {
      const response = await fetch(`/api/spotify/tracks?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as {
        songs?: Song[];
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Spotify search is unavailable.");
      setSpotifySearchResults(payload?.songs ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSpotifySearchResults([]);
      setSpotifySearchError(error instanceof Error ? error.message : "Spotify search is unavailable.");
    } finally {
      if (spotifySearchAbortRef.current === controller) {
        spotifySearchAbortRef.current = null;
        setSpotifySearchLoading(false);
      }
    }
  };
  const toggleSpotifySong = async (song: Song) => {
    if (!spotifyConnected) {
      setSpotifyError("Connect Spotify above to enable in-app playback.");
      return;
    }
    const player = spotifyPlayerRef.current;
    const deviceId = spotifyDeviceIdRef.current;
    if (!player || !deviceId || !spotifyReady) {
      setSpotifyError("The Spotify player is still preparing.");
      return;
    }
    await player.activateElement();
    if (spotifyTrackUri === song.spotifyUri) {
      if (spotifyPaused) await player.resume();
      else await player.pause();
      return;
    }
    if (!song.spotifyUri) {
      setSpotifyError("This track is not available in the Spotify catalog yet.");
      return;
    }
    const response = await fetch("/api/spotify/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri: song.spotifyUri, deviceId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setSpotifyError(payload?.error ?? "Spotify could not start this track.");
      return;
    }
    setSpotifyError(null);
    setSpotifyTrackUri(song.spotifyUri);
    setPlaying(song.title);
  };
  const toggleSpotifyPlayback = async () => {
    const player = spotifyPlayerRef.current;
    if (!player || !spotifyReady || !spotifyTrackUri) {
      setSpotifyError("Choose a track to enable playback controls.");
      return;
    }
    try {
      await player.activateElement();
      if (spotifyPaused) await player.resume();
      else await player.pause();
    } catch {
      setSpotifyError("Spotify could not update playback right now.");
    }
  };
  const seekSpotify = async (offsetMs: number) => {
    const player = spotifyPlayerRef.current;
    if (!player || !spotifyReady || !spotifyTrackUri || !player.seek) {
      setSpotifyError("Choose a track to enable seek controls.");
      return;
    }
    try {
      await player.activateElement();
      const currentState = await player.getCurrentState?.();
      const currentPosition = currentState?.position ?? spotifyPositionMs;
      const duration = currentState?.duration ?? spotifyDurationMs;
      const targetPosition = Math.min(Math.max(currentPosition + offsetMs, 0), Math.max(duration, 0));
      await player.seek(targetPosition);
      setSpotifyPositionMs(targetPosition);
    } catch {
      setSpotifyError("Spotify could not seek this track right now.");
    }
  };
  const seekSpotifyTo = async (positionMs: number) => {
    const player = spotifyPlayerRef.current;
    if (!player || !spotifyReady || !spotifyTrackUri || !player.seek) {
      setSpotifyError("Choose a track to enable seek controls.");
      return;
    }
    try {
      await player.activateElement();
      const duration = spotifyDurationMs || positionMs;
      const targetPosition = Math.min(Math.max(positionMs, 0), Math.max(duration, 0));
      await player.seek(targetPosition);
      setSpotifyPositionMs(targetPosition);
    } catch {
      setSpotifyError("Spotify could not seek this track right now.");
    }
  };
  const playAdjacentTrack = async (direction: -1 | 1) => {
    const playableSongs = filteredSongs.filter((song) => song.spotifyUri);
    if (!playableSongs.length) {
      announce("Connect Spotify to browse the recommended tracks.");
      return;
    }
    const currentIndex = playableSongs.findIndex((song) => song.spotifyUri === spotifyTrackUri);
    const targetIndex = currentIndex === -1
      ? direction === 1 ? 0 : playableSongs.length - 1
      : (currentIndex + direction + playableSongs.length) % playableSongs.length;
    const targetSong = playableSongs[targetIndex];
    if (targetSong.spotifyUri === spotifyTrackUri) {
      if (spotifyPaused) await toggleSpotifySong(targetSong);
      return;
    }
    await toggleSpotifySong(targetSong);
  };
  const isSongPlaying = (song: Song) =>
    song.spotifyUri ? spotifyTrackUri === song.spotifyUri && !spotifyPaused : playing === song.title;
  const focusPreferences = () => {
    const section = preferencesRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => section.focus({ preventScroll: true }), 350);
  };

  const soundtrackAtmosphereStyle = {
    "--soundtrack-glow-one": soundtrackColors[0],
    "--soundtrack-glow-two": soundtrackColors[1],
    "--soundtrack-glow-three": soundtrackColors[2],
  } as CSSProperties;

  const activeSong =
    filteredSongs.find((song) => song.spotifyUri === spotifyTrackUri) ??
    filteredSongs[0] ??
    null;
  const activeTrackId =
    activeSong?.spotifyUri?.split(":").pop() ??
    activeSong?.spotifyUrl?.split("/track/")[1]?.split("?")[0];
  const playbackProgress = spotifyDurationMs
    ? Math.min((spotifyPositionMs / spotifyDurationMs) * 100, 100)
    : 0;
  const startListening = () => {
    if (activeSong) {
      void toggleSpotifySong(activeSong);
      return;
    }
    connectSpotify();
  };

  const hero = (
    <section className="relative min-h-[30rem] overflow-hidden rounded-2xl border border-border bg-[linear-gradient(90deg,rgba(8,11,18,.98),rgba(8,11,18,.64),rgba(8,11,18,.1)),url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center p-7 shadow-cinematic md:min-h-[34rem] md:p-10">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-canvas/90 to-transparent" />
      <div className="relative z-10 flex h-full min-h-[26rem] max-w-2xl flex-col justify-end">
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
          Reelscape / issue 04
        </div>
        <h1 className="mt-4 max-w-2xl font-display text-5xl font-semibold leading-[.91] tracking-[-.08em] text-ink md:text-7xl">
          Find your next <span className="text-amber">screening.</span>
        </h1>
        <div className="mt-5 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[.08em] text-ink-2">
          <span>Curated daily</span>
          <span className="text-amber">•</span>
          <span>{catalog.length * 12} titles in rotation</span>
          <span className="text-amber">•</span>
          <span>NYC · 7:42 PM</span>
        </div>
        <p className="mt-5 max-w-md text-sm leading-6 text-ink-2">
          For the nights when a movie is more than a movie. Browse new releases,
          follow the songs, and book a seat before the lights go down.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setPage("movies")}>
            Explore the lineup <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => setPage("tickets")}>
            Book a ticket
          </Button>
        </div>
      </div>
    </section>
  );

  const home = (
    <div className="home-page-content space-y-8">
      {hero}
      <section>
        <SectionTitle
           eyebrow="TMDB mix / 10 films"
            title="The current reel"
          action={
            <button
              onClick={() => setPage("movies")}
              className="font-mono text-[10px] text-amber"
            >
              View all films ↗
            </button>
          }
        />
        <div className="reelroom-movie-grid">
          {catalog.slice(0, 10).map((item) => (
            <PosterCard
              key={item.id}
              item={item}
              onOpen={setSelected}
              saved={favorites.includes(item.id)}
              onSave={toggleFavorite}
            />
          ))}
        </div>
      </section>
      <section className="reelroom-note-row">
        <div className="relative h-fit self-start overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <div className="absolute right-6 top-5 font-mono text-[10px] text-muted">
            01 / 06
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
            Tonight&apos;s note
          </div>
          <h2 className="mt-2 max-w-sm font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink">
            The city is still awake.
          </h2>
          <p className="mt-3 max-w-md text-xs leading-5 text-ink-2">
            Three late screenings, one last train, and a soundtrack worth
            staying for.
          </p>
          <Button className="reelroom-arrow-glass mt-4" onClick={() => setSelected(heroMovie)}>
            Open {heroMovie.title} <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-end justify-between gap-4 border-b border-border p-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
              Works wheel / 21st.dev
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.05em] text-ink">
              Turn the reel.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-ink-2">
              The Works Wheel template becomes a tactile index for films in
              rotation. Scroll, drag, or use the right-hand index to browse.
            </p>
          </div>
          <span className="hidden font-mono text-[10px] text-muted sm:block">
            WHEEL / 06
          </span>
        </div>
        <div className="h-auto min-h-[42rem] lg:h-[36rem]">
          <WorksWheel items={wheelItems} label="Films '26" action="Open" />
        </div>
      </section>
    </div>
  );

  const blackHoleHero = (
    <BlackHoleHeroSection
      className="relative min-h-[44rem] sm:min-h-[42rem] md:min-h-[38rem] lg:min-h-[34rem]"
      distance={8}
      elevation={7}
      focus={[0.7, 0.48]}
       scrim="none"
      glow={1.2}
      starBrightness={0.55}
      spinSpeed={0.36}
    >
      <div className="relative z-10 flex min-h-[44rem] items-center p-4 sm:min-h-[42rem] sm:p-6 md:min-h-[38rem] md:p-8 lg:min-h-[34rem] lg:p-8">
        <FeaturedScreening
          item={heroMovie}
          onOpen={setSelected}
          onBook={() => setPage("tickets")}
        />
      </div>
    </BlackHoleHeroSection>
  );
  const homeWithBlackHole = (
    <div className="home-page-content space-y-8">
      {blackHoleHero}
      <section>
        <SectionTitle
            eyebrow="TMDB mix / 10 films"
            title="The current reel"
          action={
            <button
              onClick={() => setPage("movies")}
              className="font-mono text-[10px] text-amber"
            >
              View all films ↗
            </button>
          }
        />
        <div className="reelroom-movie-grid">
          {catalog.slice(0, 10).map((item) => (
            <PosterCard
              key={item.id}
              item={item}
              onOpen={setSelected}
              saved={favorites.includes(item.id)}
              onSave={toggleFavorite}
            />
          ))}
        </div>
      </section>
      <section className="reelroom-note-row">
        <div className="relative h-fit self-start overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
            Tonight&apos;s note
          </div>
          <h2 className="mt-2 max-w-sm font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink">
            The city is still awake.
          </h2>
          <p className="mt-3 max-w-md text-xs leading-5 text-ink-2">
            Three late screenings, one last train, and a soundtrack worth
            staying for.
          </p>
          <Button className="reelroom-arrow-glass mt-4" onClick={() => setSelected(heroMovie)}>
            Open {heroMovie.title} <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );

  const moviesPage = (
    <div className="reelroom-movies-page -mx-4 min-h-[calc(100vh-5rem)] sm:-mx-6 lg:-mx-10">
      <ImageStreamHero
        images={catalog.map((item) => ({
          src: item.poster,
          alt: `${item.title} poster`,
          label: item.title,
          meta: item.release,
        }))}
        cards={10}
        speed={18}
        axis={70}
        selectedSrc={selectedMovie?.poster}
        onCardSelect={(image) => {
          const movie = catalog.find((item) => item.title === image.label);
          if (movie) {
            setDroppedMovie(null);
            setDetailsShownAt(null);
            setSelectedMovie(movie);
          }
        }}
        onCardDrop={(image) => {
          const movie = catalog.find((item) => item.title === image.label);
          if (movie) {
            setSelectedMovie(null);
            setDroppedMovie(movie);
            setDetailsShownAt(Date.now());
          }
        }}
        className="reelroom-movie-stream h-[calc(100vh-5rem)] min-h-[38rem] w-full border-y border-border"
      >
        {selectedMovie ? (
          <div className="reelroom-movie-selection pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center px-4 sm:px-8">
            <div className="reelroom-movie-selection-card w-full rounded-2xl border border-amber/35 bg-[#111318]/92 p-4 text-left shadow-[0_20px_70px_rgba(0,0,0,.48)] backdrop-blur-md sm:p-5">
              <div className="font-mono text-[9px] uppercase tracking-[.18em] text-amber">
                Selected left card
              </div>
              <h1 className="mt-2 truncate font-display text-3xl font-semibold leading-none tracking-[-.07em] text-ink sm:text-4xl">
                {selectedMovie.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[.08em] text-ink-2">
                <span>{selectedMovie.release}</span>
                <span className="text-amber">•</span>
                <span>{selectedMovie.meta}</span>
                <span className="text-amber">•</span>
                <span>{selectedMovie.genres.join(" · ")}</span>
                {selectedMovie.rating !== "—" ? (
                  <>
                    <span className="text-amber">•</span>
                    <span>★ {selectedMovie.rating}</span>
                  </>
                ) : null}
              </div>
              <p className="mt-4 text-xs leading-5 text-ink-2">
                {selectedMovie.synopsis}
              </p>
              <div className="mt-4 border-t border-amber/25 pt-3 font-mono text-[10px] text-amber">
                Showtimes / {selectedMovie.showtimes.join(" · ")}
              </div>
            </div>
          </div>
        ) : null}
        <div className="reelroom-stream-top pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[34%] w-full justify-center overflow-auto px-4 pt-4 sm:px-8 sm:pt-6">
          {droppedMovie ? (
            <div className="reelroom-stream-details h-fit w-[min(50vw,42rem)] max-w-full min-w-0 rounded-2xl border border-white/15 bg-[#111318]/92 p-4 text-center shadow-[0_20px_70px_rgba(0,0,0,.48)] backdrop-blur-md sm:p-5">
              <div className="font-mono text-[9px] uppercase tracking-[.18em] text-amber">
                Dropped movie / full details
              </div>
              <h1 className="mt-2 truncate font-display text-3xl font-semibold leading-none tracking-[-.07em] text-ink sm:text-5xl">
                {droppedMovie.title}
              </h1>
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[.08em] text-ink-2">
                <span>{droppedMovie.release}</span>
                <span className="text-amber">•</span>
                <span>{droppedMovie.meta}</span>
                <span className="text-amber">•</span>
                <span>{droppedMovie.genres.join(" · ")}</span>
                {droppedMovie.rating !== "—" ? (
                  <>
                    <span className="text-amber">•</span>
                    <span>★ {droppedMovie.rating}</span>
                  </>
                ) : null}
              </div>
              <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-ink-2 sm:text-sm">
                {droppedMovie.synopsis}
              </p>
              <div className="mt-3 font-mono text-[10px] text-amber">
                Showtimes / {droppedMovie.showtimes.join(" · ")}
              </div>
            </div>
          ) : null}
        </div>
      </ImageStreamHero>
    </div>
  );

  const updatesWithWheel = (
    <div className="h-auto min-h-[42rem] w-full overflow-hidden lg:h-[calc(100vh-5rem)] lg:min-h-[32rem]">
      <WorksWheel
        items={wheelItems}
        label="Upcoming '26"
        action="Open"
        className="h-full min-h-0"
      />
    </div>
  );
  const loginPage = (
    <div className="reelroom-login-page grid min-h-[calc(100vh-7rem)] w-full items-center gap-5 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
      <section className="mx-auto w-full max-w-md lg:translate-x-6 lg:-translate-y-6">
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
            Account / public access
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-.06em] text-ink">
            Welcome back
          </h1>
          <p className="mt-2 max-w-sm text-xs leading-5 text-ink-2">
            Log in to keep your saved films, ticket history, and release alerts together.
          </p>
        </div>
        <form
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            announce("Login is open to all users in this demo.");
          }}
        >
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Email
            </span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Password
            </span>
            <input
              type="password"
              required
              placeholder="Enter your password"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
            />
          </label>
          <Button type="submit" variant="primary" className="h-10 w-full min-h-0">
            <LogIn className="size-4" />
            Log in
          </Button>
        </form>
      </section>
      <section className="relative min-h-[22rem] overflow-hidden md:min-h-[calc(100vh-7rem)]">
        <img
          src="/astronaut.png"
          alt="Astronaut floating through a violet star field"
          className="reelroom-login-astronaut absolute inset-0 size-full object-contain object-[58%_center] mix-blend-screen"
        />
        <div className="relative flex min-h-[22rem] flex-col items-center justify-end px-6 pb-6 md:min-h-[calc(100vh-7rem)] md:pb-8">
          <div className="relative z-10 text-center">
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
              — Gautam
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  const songsPage = (
    <div className="reelroom-soundtrack-page space-y-5" style={soundtrackAtmosphereStyle}>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[.16] bg-[#08090b] shadow-[0_40px_120px_rgba(0,0,0,.38)]">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center opacity-25 blur-[1px]"
          style={{ backgroundImage: "url('/listen-app-background.svg')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,.98)_0%,rgba(8,9,11,.86)_36%,rgba(8,9,11,.42)_72%,rgba(8,9,11,.7)_100%),linear-gradient(180deg,rgba(8,9,11,.4),rgba(8,9,11,.94))]"
          aria-hidden="true"
        />
        <div className="relative z-10 grid gap-10 p-5 sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-14 lg:p-12">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="space-y-5">
              <div className="space-y-4">
                <span className="reelroom-soundtrack-eyebrow font-mono text-[10px] uppercase tracking-[.26em]">
                  Listen App / recommendations
                </span>
                <h1 className="reelroom-soundtrack-title max-w-2xl text-5xl leading-[.9] text-ink sm:text-6xl lg:text-7xl">
                  Sound that feels like a private concert
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                  Recommended tracks for the scene, synced from your {spotifyPlaylistName} playlist and ready for the next frame.
                </p>
              </div>

              <div className="reelroom-recommendation-actions flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  onClick={startListening}
                  className="reelroom-listen-button h-11 rounded-full px-5 text-xs"
                >
                  <Headphones className="size-3.5" />
                  Listen app
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => document.getElementById("reelroom-recommended-tracks")?.scrollIntoView({ behavior: "smooth" })}
                  className="reelroom-playlist-button h-11 rounded-full px-5 text-xs"
                >
                  View playlist
                </Button>
              </div>

              <div className="reelroom-recommendation-card w-fit max-w-full rounded-[1.35rem] border border-white/[.16] px-4 py-3.5 backdrop-blur-2xl sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[.14] bg-white/[.08] text-ink-2 shadow-[inset_0_1px_rgba(255,255,255,.12)]">
                    <Headphones className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-[-.02em] text-ink">{spotifyPlaylistName} / recommended</h2>
                    <p className="mt-0.5 max-w-[28rem] text-xs leading-5 text-ink-2">
                      {spotifyPlaylistLoading
                        ? "Syncing the tracks attached to this scene..."
                        : spotifyConnected
                          ? `${filteredSongs.length} tracks from Recommended tracks for the scene.`
                          : "Connect Spotify to load the recommended tracks for this scene."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="reelroom-player-card relative isolate overflow-hidden rounded-[2rem] border border-white/[.12] p-5 sm:p-7">
              <div className="relative z-10">
                <div className="reelroom-player-header flex items-center gap-5">
                  <div className="reelroom-player-art size-32 shrink-0 overflow-hidden rounded-[1.65rem] sm:size-40">
                    {activeSong?.art ? (
                      <img src={activeSong.art} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-4xl font-semibold text-white/50">♪</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[.28em] text-ink-2">Now playing</p>
                      <button
                        type="button"
                        aria-label="Open track menu"
                        onClick={() => activeSong && announce("Track options are ready for this scene.")}
                        className="reelroom-player-menu shrink-0"
                      >
                        <EllipsisVertical className="size-4" />
                      </button>
                    </div>
                    <h2 className="reelroom-player-title mt-4 truncate text-3xl text-ink sm:text-4xl">
                      {activeSong?.title ?? "Choose a recommended track"}
                    </h2>
                    <p className="reelroom-player-artist mt-1 truncate text-sm text-ink-2">
                      {activeSong?.artist ?? "Spotify"}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-2/70">
                      {activeSong?.movie ?? "Hehe / recommended"}
                    </p>
                    {activeSong?.spotifyUrl ? (
                      <a
                        href={activeSong.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="reelroom-player-link mt-4 inline-flex text-[10px] uppercase tracking-[.18em]"
                      >
                        Open in Spotify
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="reelroom-player-progress-block mt-8">
                  <input
                    className="reelroom-player-progress"
                    type="range"
                    min="0"
                    max={Math.max(spotifyDurationMs, 1)}
                    value={Math.min(spotifyPositionMs, Math.max(spotifyDurationMs, 1))}
                    onChange={(event) => void seekSpotifyTo(Number(event.currentTarget.value))}
                    disabled={!spotifyTrackUri || !spotifyReady || !spotifyDurationMs}
                    aria-label="Track progress"
                    style={{ "--reelroom-progress": `${playbackProgress}%` } as CSSProperties}
                  />
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[.08em] text-ink-2">
                    <span>{activeSong ? formatPlaybackTime(spotifyPositionMs) : "00:00"}</span>
                    <span>{activeSong?.duration ?? "--:--"}</span>
                  </div>
                </div>

                <div className="reelroom-player-controls mt-7 flex items-center justify-between gap-2">
                  <div className="reelroom-player-edge flex items-center">
                    <button
                      type="button"
                      aria-label="Shuffle recommended track"
                      onClick={() => {
                        if (!filteredSongs.length) {
                          startListening();
                          return;
                        }
                        void toggleSpotifySong(filteredSongs[Math.floor(Math.random() * filteredSongs.length)]);
                      }}
                      className="reelroom-player-control"
                    >
                      <Shuffle className="size-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous track"
                      onClick={() => void playAdjacentTrack(-1)}
                      disabled={!filteredSongs.length}
                      className="reelroom-player-control reelroom-player-skip"
                    >
                      <SkipBack className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={spotifyPaused ? "Play current track" : "Pause current track"}
                      onClick={() => {
                        if (!activeSong) {
                          connectSpotify();
                          return;
                        }
                        if (spotifyTrackUri === activeSong.spotifyUri) void toggleSpotifyPlayback();
                        else void toggleSpotifySong(activeSong);
                      }}
                      className="reelroom-player-play"
                    >
                      {spotifyPaused ? <Play className="size-5 fill-current" /> : <Pause className="size-5 fill-current" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Next track"
                      onClick={() => void playAdjacentTrack(1)}
                      disabled={!filteredSongs.length}
                      className="reelroom-player-control reelroom-player-skip"
                    >
                      <SkipForward className="size-5" />
                    </button>
                  </div>

                  <div className="reelroom-player-edge flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Repeat track"
                      onClick={() => announce("Repeat is controlled by your Spotify player.")}
                      className="reelroom-player-control"
                    >
                      <Repeat className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Spotify volume"
                      onClick={() => announce("Volume is controlled by Spotify.")}
                      className="reelroom-player-control"
                    >
                      <Volume2 className="size-4" />
                    </button>
                  </div>
                </div>

              {activeTrackId ? (
                <div className="reelroom-player-embed mt-7 overflow-hidden rounded-[1.35rem]">
                  <iframe
                    className="h-[152px] w-full"
                    src={`https://open.spotify.com/embed/track/${activeTrackId}?utm_source=generator`}
                    title={`${activeSong?.title ?? "Spotify track"} - Spotify`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              ) : null}
              </div>
            </div>

            {spotifyError || visiblePlaylistError ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber/30 bg-amber/[.08] px-4 py-3">
                <p className="max-w-xl text-xs text-amber">{spotifyError ?? visiblePlaylistError}</p>
                {visiblePlaylistError ? (
                  <button type="button" onClick={connectSpotify} className="font-mono text-[10px] uppercase tracking-[.1em] text-ink underline decoration-amber/70 underline-offset-4">
                    Reconnect Spotify
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section
        id="spotify-search-panel"
        aria-label="Search Spotify"
        aria-hidden={!spotifySearchOpen}
        className={cn(
          "overflow-hidden rounded-[2rem] border border-white/[.1] bg-surface/55 shadow-cinematic backdrop-blur-xl transition-[max-height,opacity,transform,margin] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
          spotifySearchOpen
            ? "mt-4 max-h-[42rem] translate-y-0 opacity-100"
            : "pointer-events-none mt-0 max-h-0 -translate-y-3 opacity-0",
        )}
      >
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[.2em] text-amber">
                Spotify / search
              </span>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.05em] text-ink sm:text-3xl">
                Find a song for the scene.
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              Press escape to close
            </span>
          </div>
          <form onSubmit={searchSpotify} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search Spotify tracks</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                ref={spotifySearchInputRef}
                value={spotifySearchQuery}
                onChange={(event) => setSpotifySearchQuery(event.target.value)}
                placeholder="Search by song, artist, or album"
                className="h-12 w-full rounded-full border border-white/15 bg-white/[.06] pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-amber/70 focus:bg-white/[.1]"
              />
            </label>
            <button
              type="submit"
              disabled={spotifySearchLoading}
              className="h-12 rounded-full border border-amber/60 bg-amber px-5 font-mono text-[10px] uppercase tracking-[.1em] text-canvas transition hover:border-amber hover:bg-ink hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              {spotifySearchLoading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-5">
            {spotifySearchError ? (
              <p className="rounded-2xl border border-amber/30 bg-amber/[.08] p-4 text-sm text-amber">
                {spotifySearchError}
              </p>
            ) : spotifySearchLoading ? (
              <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted">
                Searching the Spotify catalog...
              </p>
            ) : spotifySearchQuery.trim() && !spotifySearchResults.length ? (
              <p className="py-8 text-center font-display text-xl font-semibold tracking-[-.04em] text-ink">
                No tracks found for “{spotifySearchQuery.trim()}”.
              </p>
            ) : spotifySearchResults.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {spotifySearchResults.map((song) => {
                  const songPlaying = isSongPlaying(song);
                  return (
                    <article
                      key={song.id ?? song.spotifyUri ?? song.title}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 transition hover:border-white/25 hover:bg-white/[.08]"
                    >
                      <img
                        src={song.art}
                        alt=""
                        className="size-14 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-ink">{song.title}</h3>
                        <p className="mt-1 truncate text-xs text-ink-2">{song.artist} · {song.movie}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted">{song.duration}</span>
                      <button
                        type="button"
                        onClick={() => void toggleSpotifySong(song)}
                        aria-label={`${songPlaying ? "Pause" : "Play"} ${song.title}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-amber/60 bg-amber text-canvas transition hover:-translate-y-0.5 hover:bg-ink hover:text-ink"
                      >
                        {songPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted">
                Search the catalog for a song, artist, or album.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="reelroom-recommended-tracks" className="reelroom-recommendations mx-auto w-full max-w-[33rem]">
        <div className="reelroom-recommendations-header mb-3 flex items-center justify-between gap-3 px-1 sm:px-2">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[.2em] text-amber">
              Spotify / {spotifyPlaylistName}
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <h2 className="truncate font-display text-lg font-semibold tracking-[-.05em] text-ink sm:text-xl">
                Recommended tracks
              </h2>
              <span className="reelroom-track-count-badge shrink-0">
              {filteredSongs.length} tracks
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label={spotifyTrackListOpen ? "Hide recommended tracks" : "Show recommended tracks"}
            aria-expanded={spotifyTrackListOpen}
            onClick={() => setSpotifyTrackListOpen((open) => !open)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[.05] text-ink-2 transition hover:border-white/35 hover:bg-white/[.1] hover:text-ink"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </div>
        <div className="reelroom-spotify-player mx-auto flex w-full flex-col gap-4 rounded-[1.4rem] p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-7">
          <div className="reelroom-reelscape-copy min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="reelroom-reelscape-eyebrow font-mono text-[10px] uppercase tracking-[.2em]">
                ReelScape player
              </span>
              <span className="reelroom-reelscape-status" data-active={Boolean(spotifyTrackUri && !spotifyPaused)}>
                <span aria-hidden="true" />
                {spotifyTrackUri ? spotifyPaused ? "Paused" : "Playing" : spotifyConnected ? "Ready" : "Offline"}
              </span>
            </div>
            <h3 className="mt-2 truncate font-display text-xl font-semibold tracking-[-.055em] text-ink sm:text-2xl">
              {spotifyTrackUri ? "Now playing from Spotify" : "A player for the long way home"}
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-2">
              {spotifyConnected
                ? "Choose a track below to hand the scene over to your Spotify device."
                : "Connect Spotify Premium to hand the scene over to your recommendations."}
            </p>
          </div>
          <div className="reelroom-reelscape-controls flex shrink-0 items-center gap-1.5 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => void seekSpotify(-10_000)}
                disabled={!spotifyTrackUri || !spotifyReady}
                aria-label="Rewind 10 seconds"
                className="reelroom-reelscape-control"
              >
                <Rewind className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => void toggleSpotifyPlayback()}
                disabled={!spotifyTrackUri || !spotifyReady}
                aria-label={spotifyPaused ? "Resume current track" : "Pause current track"}
                className="reelroom-reelscape-control reelroom-reelscape-play"
              >
                {spotifyPaused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => void seekSpotify(10_000)}
                disabled={!spotifyTrackUri || !spotifyReady}
                aria-label="Fast-forward 10 seconds"
                className="reelroom-reelscape-control"
              >
                <FastForward className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Open ReelScape player menu"
                onClick={() => announce("ReelScape handover options are ready.")}
                className="reelroom-reelscape-menu"
              >
                <EllipsisVertical className="size-4" />
              </button>
          </div>
        </div>
      </section>

      {spotifyTrackListOpen ? (
        <div className="mx-auto w-full max-w-[33rem]">
          {spotifyPlaylistLoading ? (
            <section className="rounded-[1.5rem] border border-white/[.1] bg-surface/55 p-5 text-center shadow-cinematic backdrop-blur-xl">
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">Syncing {spotifyPlaylistName} recommendations...</p>
            </section>
          ) : filteredSongs.length ? (
            <section className="reelroom-track-list max-h-[31rem] overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/[.1] bg-surface/55 shadow-cinematic backdrop-blur-xl">
              <div className="px-2 sm:px-3">
                {filteredSongs.map((song) => (
                  <article
                    key={song.id ?? song.spotifyUri ?? song.title}
                    className="reelroom-track-row group mx-auto flex min-w-0 items-center gap-4 px-2 py-4 sm:gap-5 sm:px-3"
                    data-playing={isSongPlaying(song)}
                  >
                    <img src={song.art} alt="" className="reelroom-track-art size-11 shrink-0 rounded-xl object-cover sm:size-12" />
                    <div className="min-w-0 flex-1">
                      <h3 className="reelroom-track-title truncate text-sm font-semibold text-ink">{song.title}</h3>
                      <p className="reelroom-track-artist mt-1 truncate text-xs text-ink-2">{song.artist}</p>
                    </div>
                    <span className="reelroom-track-time shrink-0 font-mono text-[10px]">{song.duration}</span>
                    <button
                      type="button"
                      onClick={() => void toggleSpotifySong(song)}
                      aria-label={`${isSongPlaying(song) ? "Pause" : "Play"} ${song.title}`}
                      className="reelroom-track-play grid size-8 shrink-0 place-items-center rounded-full"
                    >
                      {isSongPlaying(song) ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[1.5rem] border border-white/[.1] bg-surface/55 p-5 text-center shadow-cinematic backdrop-blur-xl">
              <p className="font-display text-lg font-semibold tracking-[-.05em] text-ink">
                {spotifyConnected ? `${spotifyPlaylistName} has no playable tracks yet.` : "Connect Spotify to load the Hehe playlist."}
              </p>
              <p className="mt-2 text-sm text-ink-2">
                {spotifyConnected ? "Add tracks to the playlist and return here to sync them automatically." : "Your recommended tracks will appear here after authorization."}
              </p>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );

  const ticketMovie = selected ?? heroMovie;
  const seats = [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "D7",
    "D8",
    "E1",
    "E2",
    "E3",
    "E4",
    "E5",
    "E6",
    "E7",
    "E8",
  ];
  const occupied = new Set(["A3", "A4", "C6", "D2", "D3", "E7"]);
  const ticketsPage = (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Tickets / reserve a room"
        title="Make it a night"
        copy="Choose a screening, hold your seats for a few minutes, and leave with a confirmation in your pocket."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase text-muted">
            <span className="text-amber">01 Show</span>
            <span className="h-px w-8 bg-border" />
            <span>02 Seats</span>
            <span className="h-px w-8 bg-border" />
            <span>03 Checkout</span>
          </div>
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <img
              src={ticketMovie.poster}
              alt=""
              className="size-16 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase text-amber">
                Tonight / New York
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-[-.04em] text-ink">
                {ticketMovie.title}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {ticketMovie.meta} · The Orpheum · Dolby Cinema
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Showtimes
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ticketMovie.showtimes.map((time) => (
                <button
                  key={time}
                  onClick={() => setShowtime(time)}
                  className={cn(
                    "rounded-lg border border-border bg-surface-2 p-3 text-left",
                    showtime === time && "border-cobalt bg-cobalt/15",
                  )}
                >
                  <strong className="block font-display text-sm text-ink">
                    {time}
                  </strong>
                  <span className="mt-1 block text-[10px] text-muted">
                     Dolby · approx. ₹{ticketMovie.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="reelroom-seat-map-section mt-8 rounded-2xl border border-border bg-surface-2/45 p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-2">
                  Seat map · Screen 04
                </span>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-[-.04em] text-ink">
                  Choose your view
                </h3>
                <p className="mt-1 text-xs text-ink-2">
                  Pick an open seat. You can change it before checkout.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-full border border-border bg-surface/70 px-3 py-2 font-mono text-[9px] text-ink-2">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full border border-white/30 bg-white/10" />
                  Available
                </span>
                <span className="flex items-center gap-1.5 text-amber">
                  <span className="size-2 rounded-full border border-amber/70 bg-amber/50" />
                  Selected
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full border border-white/10 bg-white/5" />
                  Taken
                </span>
              </div>
            </div>
            <div className="reelroom-screen mx-auto mb-5 mt-6 max-w-sm text-center font-mono text-[9px] tracking-[.24em] text-ink-2">
              SCREEN
            </div>
            <div className="mx-auto mb-4 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-border bg-surface/65 p-3">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[.14em] text-ink-2">
                  Map zoom
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  Adjust the map view
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSeatZoom((current) => Math.max(0.85, current - 0.15))}
                  disabled={seatZoom <= 0.85}
                  className="grid size-8 place-items-center rounded-full border border-border bg-surface-2 text-sm text-ink transition duration-300 hover:-translate-y-px hover:border-ink-2 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Zoom out seat map"
                >
                  −
                </button>
                <span className="w-12 text-center font-mono text-[10px] text-ink-2">
                  {Math.round(seatZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSeatZoom((current) => Math.min(1.6, current + 0.15))}
                  disabled={seatZoom >= 1.6}
                  className="grid size-8 place-items-center rounded-full border border-border bg-surface-2 text-sm text-ink transition duration-300 hover:-translate-y-px hover:border-ink-2 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Zoom in seat map"
                >
                  +
                </button>
              </div>
            </div>
            <div className="reelroom-seat-map-viewport mx-auto w-full max-w-xl overflow-x-auto rounded-2xl border border-border bg-canvas/45 p-3 sm:p-5">
              <div
                className="reelroom-seat-map mx-auto grid min-w-[19rem] gap-2.5"
                style={{ width: `${seatZoom * 100}%` }}
              >
                {["A", "B", "C", "D", "E"].map((row) => (
                  <div
                    key={row}
                    className="reelroom-seat-row grid grid-cols-[18px_repeat(8,minmax(0,1fr))_18px] items-center gap-1.5"
                  >
                    <span className="text-center font-mono text-[9px] text-muted">{row}</span>
                    {Array.from({ length: 8 }, (_, index) => {
                      const seat = `${row}${index + 1}`;
                      const isOccupied = occupied.has(seat);
                      const isSelected = selectedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={isOccupied}
                          aria-label={`${seat} ${isOccupied ? "taken" : isSelected ? "selected" : "available"}`}
                          onClick={() =>
                            setSelectedSeats((current) =>
                              isSelected
                                ? current.filter((item) => item !== seat)
                                : [...current, seat],
                            )
                          }
                          className={cn(
                            "reelroom-seat group/seat aspect-square rounded-xl border transition duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber",
                            isOccupied &&
                              "cursor-not-allowed border-white/10 bg-white/[.035] text-muted opacity-60",
                            isSelected &&
                              "border-amber/75 bg-amber/15 text-amber shadow-[0_8px_22px_rgba(217,200,255,.12)] hover:bg-amber/20",
                            !isOccupied &&
                              !isSelected &&
                              "border-white/15 bg-white/[.035] text-ink-2 hover:border-white/35 hover:bg-white/[.1] hover:text-ink hover:shadow-[0_10px_22px_rgba(0,0,0,.22)]",
                          )}
                        >
                          <Armchair className="mx-auto size-4 transition-transform duration-300 group-hover/seat:scale-110" aria-hidden="true" />
                          <span className="sr-only">{seat}</span>
                        </button>
                      );
                    })}
                    <span className="text-center font-mono text-[9px] text-muted">{row}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-full border border-border bg-surface/65 px-4 py-2.5 font-mono text-[10px] text-ink-2">
              <Clock3 className="size-3.5 text-amber" /> Seats are held for 08:42 after selection.
            </div>
          </div>
        </div>
        {!isLastLightDetailsVisible ? (
          <aside className="h-fit rounded-2xl border border-border bg-surface-2 p-5 lg:sticky lg:top-5">
          <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
            Order summary
          </div>
           <h3 className="mt-2 font-display text-lg font-semibold tracking-[-.04em] text-ink">
             Your screening
           </h3>
           <p className="mt-2 text-[10px] leading-4 text-muted">
             Approximate ticket price based on IMDb rating and runtime.
           </p>
           <div className="my-5 flex gap-3 border-b border-border pb-5">
            <img
              src={ticketMovie.poster}
              alt=""
              className="size-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <strong className="block font-display text-sm text-ink">
                {ticketMovie.title}
              </strong>
              <span className="mt-1 block font-mono text-[10px] text-ink-2">
                Friday · {showtime}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-muted">
                The Orpheum · Screen 04
              </span>
            </div>
          </div>
          <div className="space-y-3 text-xs text-ink-2">
            <div className="flex justify-between">
              <span>Tickets × {selectedSeats.length}</span>
              <strong className="text-ink">
                ₹{(selectedSeats.length * ticketMovie.price).toFixed(2)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Booking fee</span>
              <strong className="text-ink">
                {selectedSeats.length ? "₹4.80" : "₹0.00"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Seats</span>
              <strong className="max-w-[10rem] text-right text-ink">
                {selectedSeats.length
                  ? selectedSeats.join(", ")
                  : "Select seats"}
              </strong>
            </div>
          </div>
          <div className="mt-5 flex justify-between border-t border-border pt-4 font-display text-base font-semibold">
            <span>Total</span>
            <strong className="text-amber">
              ₹{(
                 selectedSeats.length * ticketMovie.price +
                (selectedSeats.length ? 4.8 : 0)
              ).toFixed(2)}
            </strong>
          </div>
          <Button
            variant="primary"
            disabled={!selectedSeats.length}
            onClick={() => setBooking(true)}
            className="mt-5 w-full"
          >
            {selectedSeats.length
              ? "Continue to checkout"
              : "Select your seats"}
            <ArrowRight className="size-4" />
          </Button>
          <p className="mt-3 text-[10px] leading-5 text-muted">
            Demo mode: no payment is processed. Production will hand off to a
            PCI-compliant provider.
          </p>
          </aside>
        ) : null}
      </div>
    </div>
  );

  const profilePage = (
    <div className="reelroom-profile-page relative isolate w-full max-w-full overflow-x-clip border-y border-border">
      <HolographicBeams density={15} speed={1.5} aberration={3} opacity={90} />
      <div className="relative z-10 min-w-0 max-w-full space-y-5">
        <SectionTitle
          eyebrow="Profile / your signal"
          title="Keep your place"
          copy="Your saved films, tickets, and notification rhythm in one quiet corner."
          headingLevel="h1"
        />
        <div className="flex w-full max-w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface/75 p-4 backdrop-blur-md">
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-amber font-display text-lg font-bold text-canvas">
              AG
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold tracking-[-.05em] text-ink">
                Abhishek Kumar Gautam
              </h2>
              <p className="mt-1 text-xs text-ink-2">Greater Noida · Member since 2021</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="min-h-8 shrink-0 px-3 py-1 text-[10px]"
            onClick={focusPreferences}
          >
            Manage preferences
          </Button>
        </div>
        <div className="grid min-w-0 max-w-full gap-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,28rem)] lg:justify-start">
          <section className="h-fit w-full min-w-0 max-w-full self-start rounded-2xl border border-border bg-surface/75 p-4 backdrop-blur-md">
            <SectionTitle
              compact
              eyebrow="Saved for later"
              title="Favorites"
              action={
                <span className="font-mono text-[10px] text-muted">
                  {favorites.length} total
                </span>
              }
            />
            {catalog
              .filter((item) => favorites.includes(item.id))
              .map((item) => (
                <div
                  key={item.id}
                    className="flex items-center gap-3 border-b border-border py-1.5 last:border-0"
                >
                  <img
                    src={item.poster}
                    alt={`${item.title} movie poster`}
                    className="size-10 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate font-display text-xs text-ink">
                      {item.title}
                    </strong>
                    <span className="mt-1 block truncate text-[10px] text-muted">
                      {item.meta}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-label={`Open ${item.title} movie details`}
                    className="font-mono text-[10px] text-amber"
                  >
                    Open
                  </button>
                </div>
              ))}
          </section>
          <section
            ref={preferencesRef}
            tabIndex={-1}
            aria-labelledby="profile-preferences-heading"
            className="h-fit w-full min-w-0 max-w-full self-start rounded-2xl border border-border bg-surface/75 p-4 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            <SectionTitle
              compact
              eyebrow="Preferences"
              title="Your signal"
              titleId="profile-preferences-heading"
            />
            <div className="space-y-2">
              <PreferenceSwitch
                label="Release alerts"
                description="Upcoming films you saved"
                checked={releaseAlerts}
                onChange={() => setReleaseAlerts((current) => !current)}
              />
              <PreferenceSwitch
                label="Booking updates"
                description="Changes, reminders, and tickets"
                checked={bookingUpdates}
                onChange={() => setBookingUpdates((current) => !current)}
              />
              <div className="flex min-w-0 items-center justify-between gap-8">
                <div className="min-w-0">
                  <strong className="block font-display text-xs text-ink">
                    Preferred city
                  </strong>
                  <label htmlFor="preferred-city" className="sr-only">
                    Preferred city
                  </label>
                  <select
                    id="preferred-city"
                    aria-label="Preferred city"
                    value={preferredCity}
                    onChange={(event) => setPreferredCity(event.target.value)}
                    className="mt-1 max-w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                  >
                    <option>Greater Noida</option>
                    <option>Noida</option>
                    <option>New Delhi</option>
                  </select>
                </div>
                <MapPin className="size-4 text-amber" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const adminPage = (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Admin / operations"
        title="The control room"
        copy="A small operational view for content, inventory, moderation, and the signals that matter."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Gross bookings", "₹24.8k", "↑ 18.4%"],
          ["Tickets sold", "1,482", "↑ 12.1%"],
          ["New reviews", "86", "14 awaiting"],
          ["System health", "99.98%", "All nominal"],
        ].map(([label, value, delta]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <span className="font-mono text-[9px] uppercase text-muted">
              {label}
            </span>
            <strong className="mt-3 block font-display text-2xl tracking-[-.05em] text-ink">
              {value}
            </strong>
            <small className="mt-2 block font-mono text-[10px] text-mint">
              {delta}
            </small>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionTitle
            eyebrow="Recent orders"
            title="Ticket activity"
            action={
              <button className="font-mono text-[10px] text-amber">
                Export CSV ↗
              </button>
            }
          />
          <div className="divide-y divide-border">
            {[
              ["RL-2841", "The Last Light", "B4, B5", "Paid"],
              ["RL-2840", "Neon Aftercare", "C1, C2", "Paid"],
              ["RL-2839", "Static Bloom", "A6", "Held"],
            ].map((row) => (
              <div
                key={row[0]}
                className="grid grid-cols-[.8fr_1.5fr_1fr_.6fr] gap-2 py-3 text-[10px]"
              >
                <span className="font-mono text-muted">{row[0]}</span>
                <span className="text-ink">{row[1]}</span>
                <span className="font-mono text-muted">{row[2]}</span>
                <span
                  className={cn(
                    "font-mono",
                    row[3] === "Held" ? "text-amber" : "text-mint",
                  )}
                >
                  {row[3]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionTitle eyebrow="Queue / 14" title="Needs a human" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-rose-400" />
              <div>
                <strong className="block font-display text-xs text-ink">
                  Review moderation
                </strong>
                <span className="text-[10px] text-muted">
                  8 flagged reviews
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-amber" />
              <div>
                <strong className="block font-display text-xs text-ink">
                  Release publishing
                </strong>
                <span className="text-[10px] text-muted">
                  2 films scheduled
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-mint" />
              <div>
                <strong className="block font-display text-xs text-ink">
                  Notification campaign
                </strong>
                <span className="text-[10px] text-muted">
                  Friday picks / draft
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const pageContent = {
    home: homeWithBlackHole,
    movies: moviesPage,
    updates: updatesWithWheel,
    songs: songsPage,
    tickets: ticketsPage,
    profile: profilePage,
    login: loginPage,
    admin: adminPage,
  }[page];
  const selectedSoundtrack = selected ? spotifyCatalog.slice(0, 2) : [];
  const detailModal = selected ? (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-canvas/80 p-4 backdrop-blur-md"
      onClick={() => setSelected(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${selected.title} details`}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-surface shadow-cinematic"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Movie detail / {selected.status}
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-.06em] text-ink">
              {selected.title}
            </h2>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface-2"
            aria-label="Close movie details"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[10rem_1fr]">
          <img
            src={selected.poster}
            alt={`${selected.title} poster`}
            className="aspect-[2/2.8] w-full rounded-xl object-cover"
          />
          <div>
            <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted">
              <span>{selected.meta}</span>
              <span>★ {selected.rating}</span>
              <span>{selected.genres.join(" · ")}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-2">
              {selected.synopsis}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setSelected(null);
                  setPage("tickets");
                }}
              >
                Book tickets <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => toggleFavorite(selected.id)}
              >
                <Heart
                  className={cn(
                    "size-4",
                    favorites.includes(selected.id) && "fill-amber text-amber",
                  )}
                />{" "}
                {favorites.includes(selected.id) ? "Saved" : "Save film"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => announce("Share link copied for this demo.")}
              >
                <Share2 className="size-4" /> Share
              </Button>
            </div>
          </div>
          <div className="md:col-span-2 border-t border-border pt-5">
            <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Original soundtrack
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedSoundtrack.length ? selectedSoundtrack.map((song) => (
                  <div
                    key={song.title}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-2"
                  >
                    <img
                      src={song.art}
                      alt=""
                      className="size-10 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-ink">
                        {song.title}
                      </strong>
                      <span className="block truncate text-[10px] text-muted">
                        {song.artist}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleSpotifySong(song)}
                      className="grid size-7 place-items-center rounded-full bg-amber text-canvas"
                      aria-label={`${isSongPlaying(song) ? "Pause" : "Play"} ${song.title}`}
                    >
                      {isSongPlaying(song) ? (
                        "Ⅱ"
                      ) : (
                        <Play className="size-3 fill-current" />
                      )}
                    </button>
                  </div>
                )) : (
                <p className="text-xs leading-5 text-muted">
            No tracks match this filter.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  const checkoutModal = booking ? (
    <div className="fixed inset-0 z-40 grid place-items-center bg-canvas/80 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-cinematic"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
              Checkout
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em] text-ink">
              Almost at the credits.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setBooking(false)}
            className="grid size-9 place-items-center rounded-full border border-border text-ink-2"
            aria-label="Close checkout"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-2">
          Payment details are handled by the configured provider. Your order
          will be finalized only after signed payment confirmation.
        </p>
        <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-surface-2 px-4">
          <div className="flex justify-between py-4 text-xs">
            <span className="text-muted">Contact</span>
            <strong className="text-ink">alex.kim@example.com</strong>
          </div>
          <div className="flex justify-between py-4 text-xs">
            <span className="text-muted">Payment</span>
            <strong className="text-mint">Provider checkout</strong>
          </div>
          <div className="flex justify-between py-4 text-xs">
            <span className="text-muted">Total</span>
            <strong className="text-ink">
              ₹{(selectedSeats.length * ticketMovie.price + 4.8).toFixed(2)}
            </strong>
          </div>
        </div>
        <Button
          variant="primary"
          className="mt-5 w-full"
          onClick={() => {
            setBooking(false);
            setSelectedSeats([]);
            announce("Booking confirmed. Ticket history is ready for Profile.");
            setPage("profile");
          }}
        >
          <Check className="size-4" /> Confirm purchase
        </Button>
      </div>
    </div>
  ) : null;

  if (!routeReady) {
    return <div className="min-h-screen bg-[#08070d]" aria-label="Loading Reelscape" />;
  }

  return (
    <div
      className={cn("reelroom-app min-h-screen bg-canvas text-ink", page === "home" && "home-page")}
      data-background={page === "home" ? "black-hole" : page === "login" ? "astronaut" : "plain"}
      data-page={page}
    >
      <a className="reelroom-skip-link" href="#main">
        Skip to content
      </a>
      <div className="min-h-screen">
          <main
            id="main"
            className={cn(
              "w-full max-w-full min-w-0 pb-24 lg:pb-14",
              page === "songs" ? "px-2 sm:px-3 lg:px-4" : "px-4 sm:px-6 lg:px-10",
            )}
          >
          <header className={cn("relative flex h-20 items-center justify-between gap-4", page === "movies" && "z-40")}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-7 rotate-45 place-items-center border border-border text-amber">
                <Film className="size-3.5 -rotate-45" />
              </span>
              <strong className="font-display text-lg tracking-[-.05em]">
                reel<span className="text-amber">scape</span>
              </strong>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {page === "home" ? (
                <button
                  onClick={() =>
                    announce("You have 2 release notes and 1 ticket reminder.")
                  }
                  className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                </button>
              ) : null}
              <div className="reelroom-desktop-overflow relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-expanded={moreOpen}
                  aria-controls="reelroom-desktop-overflow-menu"
                  aria-label="Open navigation menu"
                  className="reelroom-desktop-nav-button grid size-9 place-items-center rounded-lg border border-border bg-transparent text-ink-2 transition hover:text-ink"
                >
                  <EllipsisVertical className="size-4" />
                </button>
                <div id="reelroom-desktop-overflow-menu">
                  <MoreAccessMenu
                    open={moreOpen}
                    header
                    currentPage={page}
                    onNavigate={(nextPage) => {
                      setMoreOpen(false);
                      setPage(nextPage);
                    }}
                  />
                </div>
              </div>
              <div className="relative reelroom-header-overflow lg:hidden">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-expanded={moreOpen}
                  aria-controls="reelroom-header-overflow-menu"
                  aria-label="Open navigation menu"
                  className="grid size-9 place-items-center rounded-full border border-border text-ink-2 transition hover:border-amber hover:text-amber"
                >
                  <EllipsisVertical className="size-4" />
                </button>
                <div id="reelroom-header-overflow-menu">
                  <MoreAccessMenu
                    open={moreOpen}
                    mobile
                    header
                    currentPage={page}
                    onNavigate={(nextPage) => {
                      setMoreOpen(false);
                      setPage(nextPage);
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          <div className="animate-[page-in_.35s_ease_both]">{pageContent}</div>
        </main>
      </div>
      <footer className="w-full border-t border-border px-4 py-4 text-center font-mono text-[10px] text-ink-2 sm:px-6 lg:px-10">
        Reelscape · Find your next screening
      </footer>
      {detailModal}
      {checkoutModal}
      {notice ? (
        <div className="fixed bottom-20 right-5 z-50 rounded-lg border border-border-strong bg-surface-3 px-4 py-3 text-xs text-ink shadow-cinematic lg:bottom-5">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
