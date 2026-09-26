"use client";

import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  Armchair,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Disc3,
  Eye,
  EllipsisVertical,
  Film,
  Headphones,
  Heart,
  Home,
  LogIn,
  Maximize2,
  MapPin,
  Music2,
  Minus,
  Pause,
  Play,
  Plus,
  Radar,
  FastForward,
  Rewind,
  Repeat,
  Search,
  Share2,
  Shuffle,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import { UpdatesCarousel } from "@/components/ui/updates-carousel";
import { BlackHoleHeroSection } from "@/components/ui/black-hole-hero-section";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import HolographicBeams from "@/components/ui/beams-background";
import { cn } from "@/lib/utils";
import { fetchWithBackoff } from "@/lib/client-fetch";
import type { Movie, MovieUpdateFeeds } from "@/lib/movie-types";

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

type CheckoutField = "name" | "email" | "cardNumber" | "expiry" | "cvc";
type CheckoutStatus = "idle" | "loading" | "success";

type CheckoutForm = Record<CheckoutField, string>;

const emptyCheckoutErrors: Partial<Record<CheckoutField, string>> = {};
const checkoutFields: CheckoutField[] = ["name", "email", "cardNumber", "expiry", "cvc"];

function validateCheckoutField(field: CheckoutField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Required";
  if (field === "name" && trimmed.length < 2) return "Enter your full name";
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email";
  }
  if (field === "cardNumber" && value.replace(/\s/g, "").length < 12) {
    return "Enter a valid card number";
  }
  if (field === "expiry" && !/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(trimmed)) {
    return "Use MM / YY";
  }
  if (field === "cvc" && !/^\d{3,4}$/.test(trimmed)) return "Use 3 or 4 digits";
  return "";
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

async function fetchSpotifySession() {
  const response = await fetchWithBackoff("/api/spotify/session", {
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
type ShowtimeView = "cards" | "timeline" | "days";
type SeatLens = "radar" | "eye" | "golden";
type EyeLevel = "front" | "middle" | "rear";

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

function CurrentReelSection({
  activeMovie,
  city,
  shelfMovies,
  onActivate,
  onOpen,
  onViewAll,
}: {
  activeMovie: Movie;
  city: string;
  shelfMovies: Movie[];
  onActivate: (movie: Movie) => void;
  onOpen: (movie: Movie) => void;
  onViewAll: () => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollResetRef = useRef<number | null>(null);
  const [isGridScrolling, setIsGridScrolling] = useState(false);
  const [scrollbar, setScrollbar] = useState({ overflowing: false, width: 100, left: 0 });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateScrollbar = () => {
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (maxScroll <= 0) {
        setScrollbar({ overflowing: false, width: 100, left: 0 });
        return;
      }

      const width = Math.max((grid.clientWidth / grid.scrollWidth) * 100, 18);
      const left = (grid.scrollLeft / maxScroll) * (100 - width);
      setScrollbar({ overflowing: true, width, left });
    };

    const handleScroll = () => {
      updateScrollbar();
      setIsGridScrolling(true);
      if (scrollResetRef.current !== null) window.clearTimeout(scrollResetRef.current);
      scrollResetRef.current = window.setTimeout(() => setIsGridScrolling(false), 700);
    };

    updateScrollbar();
    grid.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollbar);

    return () => {
      grid.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollbar);
      if (scrollResetRef.current !== null) window.clearTimeout(scrollResetRef.current);
    };
  }, []);

  return (
    <section className="relative space-y-7" aria-live="polite">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[.18em] text-amber">
              Current reel / {city}
            </span>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-.07em] text-ink sm:text-4xl">
              The current reel
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 font-mono text-[10px] text-amber"
          >
            View all films ↗
          </button>
        </div>
        <div ref={gridRef} className="reelroom-movie-grid-shell">
          <div className="reelroom-movie-grid" aria-label="Current films">
            {shelfMovies.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item)}
                onMouseEnter={() => onActivate(item)}
                onFocus={() => onActivate(item)}
                style={{ "--reelroom-float-delay": `${(index % 6) * -0.35}s` } as CSSProperties}
                className={cn(
                  "reelroom-movie-card group text-left",
                  item.id === activeMovie.id && "reelroom-movie-card-active",
                )}
              >
                <div className="relative aspect-[2/2.8] overflow-hidden rounded-xl">
                  <img
                    src={item.poster}
                    alt={`${item.title} poster`}
                    className="size-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 via-transparent to-transparent opacity-80" />
                  <span className="absolute inset-x-3 bottom-3 truncate font-mono text-[9px] uppercase tracking-[.08em] text-white drop-shadow">
                    {item.status === "UPCOMING" ? "Upcoming" : "Now playing"}
                  </span>
                </div>
                <strong
                  className={cn(
                    "mt-3 block truncate font-display text-sm font-semibold",
                    item.id === activeMovie.id ? "text-amber" : "text-ink",
                  )}
                >
                  {item.title}
                </strong>
                <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[.06em] text-muted">
                  {item.release} · {item.rating === "—" ? "NR" : `★ ${item.rating}`}
                </span>
              </button>
            ))}
          </div>
          {scrollbar.overflowing && (
            <div className={cn("reelroom-scrollbar", isGridScrolling && "reelroom-scrollbar-visible")} aria-hidden="true">
              <span style={{ width: `${scrollbar.width}%`, left: `${scrollbar.left}%` }} />
            </div>
          )}
        </div>
        <div className="relative">
          <div key={activeMovie.id} className="reelroom-reel-preview">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[.12em] text-amber">
              <span>{activeMovie.status === "UPCOMING" ? "Upcoming" : "Now playing"}</span>
              <span className="text-muted">{activeMovie.release}</span>
              <span className="text-muted">{activeMovie.meta}</span>
              <span className="text-muted">
                {activeMovie.rating === "—" ? "NR" : `★ ${activeMovie.rating}`}
              </span>
              <span className="text-muted">${activeMovie.price}</span>
            </div>
            <h3 className="mt-3 font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink sm:text-3xl">
              {activeMovie.title}
            </h3>
            <p className="mt-3 max-w-3xl text-xs leading-6 text-ink-2">
              {activeMovie.synopsis}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeMovie.genres.map((genre) => (
                <span
                  key={genre}
                  className="font-mono text-[10px] uppercase tracking-[.12em] text-muted"
                >
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              <span className="text-amber">Showtimes</span>
              {activeMovie.showtimes.map((showtime) => (
                <span key={showtime}>{showtime}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpen(activeMovie)}
              className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-amber"
            >
              Open film details <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
    </section>
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

export function ReelroomApp({
  initialMovies,
  dailyUpdates,
}: {
  initialMovies?: Movie[];
  dailyUpdates?: MovieUpdateFeeds;
}) {
  const catalog = initialMovies?.length ? initialMovies : movies;
  const heroCandidates = catalog.filter((item) => item.status === "UPCOMING");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroMovie = heroCandidates[heroIndex % Math.max(heroCandidates.length, 1)] ?? movies[0];
  const [page, setPageState] = useState<NavId>("home");
  const [routeReady, setRouteReady] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [favorites, setFavorites] = useState<string[]>([heroMovie.id]);
  const [activeReelMovieId, setActiveReelMovieId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [droppedMovie, setDroppedMovie] = useState<Movie | null>(null);
  const [detailsShownAt, setDetailsShownAt] = useState<number | null>(null);
  const [seatZoom, setSeatZoom] = useState(1);
  const [showtime, setShowtime] = useState("1:40 PM");
  const [showtimeView, setShowtimeView] = useState<ShowtimeView>("cards");
  const [selectedDay, setSelectedDay] = useState("today");
  const [seatLens, setSeatLens] = useState<SeatLens>("radar");
  const [eyeLevel, setEyeLevel] = useState<EyeLevel>("middle");
  const [groupSize, setGroupSize] = useState(2);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [sharedSession, setSharedSession] = useState(false);
  const [sessionCopied, setSessionCopied] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checkoutClosing, setCheckoutClosing] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutMethod, setCheckoutMethod] = useState<"card" | "apple" | "google">("card");
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    name: "Alex Kim",
    email: "alex.kim@example.com",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [checkoutTouched, setCheckoutTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const [checkoutErrors, setCheckoutErrors] = useState<Partial<Record<CheckoutField, string>>>(emptyCheckoutErrors);
  const [notice, setNotice] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [spotifyCatalog, setSpotifyCatalog] = useState<Song[]>([]);
  const [selectedSoundtrack, setSelectedSoundtrack] = useState<Song[]>([]);
  const [soundtrackLoading, setSoundtrackLoading] = useState(false);
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
  const soundtrackAbortRef = useRef<AbortController | null>(null);
  const spotifyAuthWindowRef = useRef<Window | null>(null);
  const spotifyPlaylistRequestRef = useRef<Promise<void> | null>(null);
  const spotifyPlaylistRetryAtRef = useRef(0);
  const seatMapViewportRef = useRef<HTMLDivElement>(null);
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
    const loadPlaylist = () => {
      if (cancelled || spotifyPlaylistRequestRef.current) return spotifyPlaylistRequestRef.current;
      if (Date.now() < spotifyPlaylistRetryAtRef.current) return null;

      const request = (async () => {
        setSpotifyPlaylistLoading(true);
        try {
          const response = await fetchWithBackoff("/api/spotify/playlist?name=Hehe", {
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
            if (response.status !== 429) setSpotifyCatalog([]);
            if (response.status === 429) {
              const retryAfter = Number(response.headers.get("retry-after"));
              spotifyPlaylistRetryAtRef.current = Date.now() + Math.max(
                Number.isFinite(retryAfter) ? retryAfter * 1000 : 30_000,
                15_000,
              );
            }
            setSpotifyPlaylistError(payload?.error ?? "Hehe playlist tracks are unavailable.");
            return;
          }
          spotifyPlaylistRetryAtRef.current = 0;
          setSpotifyPlaylistName(payload?.playlistName ?? "Hehe");
          setSpotifyCatalog(payload?.songs ?? []);
          setSpotifyPlaylistError(null);
        } catch {
          if (!cancelled) setSpotifyPlaylistError("Hehe playlist tracks are unavailable.");
        } finally {
          if (!cancelled) setSpotifyPlaylistLoading(false);
        }
      })();
      spotifyPlaylistRequestRef.current = request;
      void request.finally(() => {
        if (spotifyPlaylistRequestRef.current === request) spotifyPlaylistRequestRef.current = null;
      });
      return request;
    };
    const refreshPlaylist = () => {
      if (document.visibilityState === "visible") void loadPlaylist();
    };

    void loadPlaylist();
    const refreshInterval = window.setInterval(loadPlaylist, 120_000);
    window.addEventListener("focus", refreshPlaylist);
    document.addEventListener("visibilitychange", refreshPlaylist);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshPlaylist);
      document.removeEventListener("visibilitychange", refreshPlaylist);
    };
  }, [spotifyConnected]);

  useEffect(() => {
    soundtrackAbortRef.current?.abort();
    setSelectedSoundtrack([]);
    setSoundtrackLoading(false);
    if (!selected) return;

    const controller = new AbortController();
    soundtrackAbortRef.current = controller;
    setSoundtrackLoading(true);

    fetchWithBackoff(`/api/spotify/tracks?q=${encodeURIComponent(`${selected.title} soundtrack`)}&limit=8`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          songs?: Song[];
        } | null;
        if (!response.ok) return [];
        const seen = new Set<string>();
        return (payload?.songs ?? [])
          .filter((song) => {
            const key = `${song.title.trim().toLowerCase()}:${song.artist.trim().toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 2);
      })
      .then((songs) => {
        if (!controller.signal.aborted) setSelectedSoundtrack(songs);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setSoundtrackLoading(false);
      });

    return () => controller.abort();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

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
          fetchWithBackoff("/api/spotify/token", { cache: "no-store", credentials: "same-origin" })
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
  const openCheckout = () => {
    setCheckoutClosing(false);
    setCheckoutStatus("idle");
    setCheckoutMethod("card");
    setCheckoutTouched({});
    setCheckoutErrors(emptyCheckoutErrors);
    setBooking(true);
  };
  const closeCheckout = () => {
    if (checkoutStatus === "loading") return;
    setCheckoutClosing(true);
    window.setTimeout(() => {
      setCheckoutClosing(false);
      setCheckoutStatus("idle");
      setBooking(false);
    }, 240);
  };
  const updateCheckoutField = (field: CheckoutField, rawValue: string) => {
    const value = field === "cardNumber"
      ? formatCardNumber(rawValue)
      : field === "expiry"
        ? formatExpiry(rawValue)
        : field === "cvc"
          ? rawValue.replace(/\D/g, "").slice(0, 4)
          : rawValue;
    setCheckoutForm((current) => ({ ...current, [field]: value }));
    if (checkoutTouched[field]) {
      setCheckoutErrors((current) => ({
        ...current,
        [field]: validateCheckoutField(field, value) || undefined,
      }));
    }
  };
  const touchCheckoutField = (field: CheckoutField) => {
    setCheckoutTouched((current) => ({ ...current, [field]: true }));
    setCheckoutErrors((current) => ({
      ...current,
      [field]: validateCheckoutField(field, checkoutForm[field]) || undefined,
    }));
  };
  const submitCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkoutMethod !== "card") {
      announce("Express gateway API will be connected when the provider is supplied.");
      return;
    }
    const nextErrors: Partial<Record<CheckoutField, string>> = {};
    checkoutFields.forEach((field) => {
      const error = validateCheckoutField(field, checkoutForm[field]);
      if (error) nextErrors[field] = error;
    });
    setCheckoutTouched({ name: true, email: true, cardNumber: true, expiry: true, cvc: true });
    setCheckoutErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setCheckoutStatus("loading");
    window.setTimeout(() => {
      setCheckoutStatus("success");
      window.setTimeout(() => {
        setBooking(false);
        setCheckoutStatus("idle");
        setSelectedSeats([]);
        announce("Booking confirmed. Ticket history is ready for Profile.");
        setPage("profile");
      }, 1500);
    }, 900);
  };
  const shareMovie = async (movie: Movie) => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `${movie.title} · Reelscape`,
      text: `Take a look at ${movie.title} on Reelscape.`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        announce("Movie shared.");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        announce("Movie link copied.");
        return;
      }
      const input = document.createElement("textarea");
      input.value = shareUrl;
      input.setAttribute("readonly", "true");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      announce("Movie link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      announce("Sharing is unavailable right now.");
    }
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
      const response = await fetchWithBackoff(`/api/spotify/tracks?q=${encodeURIComponent(query)}`, {
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
    const response = await fetchWithBackoff("/api/spotify/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri: song.spotifyUri, deviceId }),
    }, { retryUnsafeMethods: true });
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

  const activeReelMovie =
    catalog.find((item) => item.id === activeReelMovieId) ?? heroMovie;
  const shelfMovies = Array.from(
    new Map([...catalog, ...movies].map((movie) => [movie.id, movie])).values(),
  ).slice(0, 10);
  const updatesMoviesByCategory: MovieUpdateFeeds = {
    trending: dailyUpdates?.trending.length ? dailyUpdates.trending : shelfMovies.slice(0, 9),
    comingSoon: dailyUpdates?.comingSoon.length
      ? dailyUpdates.comingSoon
      : [...catalog.filter((item) => item.status === "UPCOMING"), ...movies.filter((item) => item.status === "UPCOMING")].slice(0, 9),
  };
  const currentReel = (
    <CurrentReelSection
      activeMovie={activeReelMovie}
      city={preferredCity}
      shelfMovies={shelfMovies}
      onActivate={(movie) => setActiveReelMovieId(movie.id)}
      onOpen={setSelected}
      onViewAll={() => setPage("movies")}
    />
  );

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
      {currentReel}
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
      {currentReel}
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
    <div className="w-full">
      <UpdatesCarousel moviesByCategory={updatesMoviesByCategory} onOpen={setSelected} />
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
  const goldenSeats = new Set(["C3", "C4", "C5", "C6"]);
  const activeShowtime = ticketMovie.showtimes.includes(showtime)
    ? showtime
    : ticketMovie.showtimes[0] ?? showtime;
  const showtimeDays = [
    { id: "today", label: "Today", date: "Thu 16 Oct", times: ticketMovie.showtimes },
    { id: "tomorrow", label: "Tomorrow", date: "Fri 17 Oct", times: ticketMovie.showtimes.slice().reverse() },
    { id: "weekend", label: "Weekend", date: "Sat 18 Oct", times: ticketMovie.showtimes.slice(1).concat(ticketMovie.showtimes[0] ?? []) },
  ];
  const selectedDayOption = showtimeDays.find((day) => day.id === selectedDay) ?? showtimeDays[0];
  const seatPrice = (seat: string) => ticketMovie.price + (seat.startsWith("A") ? 3 : seat.startsWith("B") ? 1 : 0);
  const ticketSubtotal = selectedSeats.reduce((total, seat) => total + seatPrice(seat), 0);
  const bookingFee = selectedSeats.length ? 4.8 : 0;
  const groupDiscount = selectedSeats.length >= 4 ? -4.8 : 0;
  const ticketTotal = ticketSubtotal + bookingFee + groupDiscount;
  const checkoutTax = Math.round(ticketSubtotal * 0.18 * 100) / 100;
  const checkoutShipping = 0;
  const checkoutTotal = ticketSubtotal + checkoutTax + checkoutShipping + bookingFee + groupDiscount;
  const chooseSmartGroup = () => {
    const rows = ["A", "B", "C", "D", "E"];
    const target = Math.min(Math.max(groupSize, 1), 6);
    for (const row of rows) {
      for (let start = 1; start <= 9 - target; start += 1) {
        const candidateSeats = Array.from({ length: target }, (_, index) => `${row}${start + index}`);
        if (candidateSeats.every((seat) => !occupied.has(seat))) {
          setSelectedSeats(candidateSeats);
          announce(`${target} adjacent seats found in row ${row}.`);
          return;
        }
      }
    }
    announce("No adjacent group block is available in this room.");
  };
  const panSeatMap = (direction: number) => {
    seatMapViewportRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  };
  const shareBookingSession = async () => {
    const roomUrl = new URL(window.location.href);
    roomUrl.searchParams.set("room", "ORPHEUM-04");
    roomUrl.hash = "tickets";
    setSharedSession(true);
    try {
      await navigator.clipboard?.writeText(roomUrl.toString());
      setSessionCopied(true);
      announce("Shared room link copied.");
      window.setTimeout(() => setSessionCopied(false), 2200);
    } catch {
      announce("Shared room is ready to invite.");
    }
  };
  const ticketsPage = (
    <div className="reelroom-booking-page space-y-7">
      <SectionTitle
        eyebrow="Tickets / reserve a room"
        title="Make it a night"
        copy="Choose a screening, find the sightline that feels right, and invite the people who should be there."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="reelroom-booking-workspace min-w-0 rounded-[1.65rem] border border-white/[.12] bg-surface/55 p-4 shadow-cinematic backdrop-blur-xl sm:p-6">
          <div className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-muted">
            <span className="rounded-full bg-amber px-3 py-1.5 text-canvas">01 Show</span>
            <span className="h-px w-7 bg-border" />
            <span className={cn("rounded-full px-3 py-1.5", selectedSeats.length ? "bg-cobalt/15 text-cobalt" : "")}>02 Seats</span>
            <span className="h-px w-7 bg-border" />
            <span className="rounded-full px-3 py-1.5">03 Checkout</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-mint"><Wifi className="size-3" /> Live room</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
            <img src={ticketMovie.poster} alt="" className="size-16 rounded-xl object-cover shadow-lg" />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">Tonight / Greater Noida · Dolby Cinema</div>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.055em] text-ink">{ticketMovie.title}</h2>
              <p className="mt-1 text-xs text-muted">{ticketMovie.meta} · The Orpheum · Screen 04</p>
            </div>
            <div className="rounded-2xl border border-white/[.1] bg-white/[.04] px-3 py-2 text-right">
              <span className="block font-mono text-[9px] uppercase tracking-[.12em] text-muted">Your hold</span>
              <strong className="mt-1 block font-mono text-sm text-amber">08:42</strong>
            </div>
          </div>

          <section className="mt-6" aria-labelledby="showtime-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">01 / choose the rhythm</span>
                <h3 id="showtime-heading" className="mt-1 font-display text-2xl font-semibold tracking-[-.055em] text-ink">Find your room.</h3>
                <p className="mt-1 text-xs text-ink-2">Three ways to choose the same calm, considered screening.</p>
              </div>
              <div className="flex rounded-full border border-border bg-surface-2/70 p-1" role="tablist" aria-label="Showtime view">
                {(["cards", "timeline", "days"] as ShowtimeView[]).map((view) => (
                  <button key={view} type="button" role="tab" aria-selected={showtimeView === view} onClick={() => setShowtimeView(view)} className={cn("rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.1em] transition", showtimeView === view ? "bg-ink text-canvas" : "text-muted hover:text-ink")}>
                    {view === "cards" ? "Frosted" : view === "timeline" ? "Timeline" : "Days"}
                  </button>
                ))}
              </div>
            </div>

            {showtimeView === "cards" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {ticketMovie.showtimes.map((time, index) => (
                  <button key={time} type="button" onClick={() => setShowtime(time)} className={cn("reelroom-showtime-card group rounded-2xl border p-4 text-left", activeShowtime === time ? "reelroom-showtime-card-active" : "border-border bg-surface-2/55 hover:border-white/30")}>
                    <span className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[.12em] text-muted"><span>{index === 0 ? "Good morning" : index === ticketMovie.showtimes.length - 1 ? "Last light" : "Open room"}</span><span className={activeShowtime === time ? "text-mint" : "text-amber"}>●</span></span>
                    <strong className="mt-4 block font-display text-xl tracking-[-.05em] text-ink">{time}</strong>
                    <span className="mt-1 block text-[10px] text-ink-2">Dolby Atmos · {Math.max(3, 18 - index * 3)} seats left</span>
                    <span className="mt-4 block font-mono text-[10px] text-amber">from ₹{ticketMovie.price + (index ? 0 : 2)}</span>
                  </button>
                ))}
              </div>
            ) : showtimeView === "timeline" ? (
              <div className="reelroom-showtime-timeline mt-5 overflow-x-auto rounded-2xl border border-border bg-surface-2/40 p-5">
                <div className="relative flex min-w-[34rem] items-start justify-between gap-3 pt-2">
                  <div className="absolute left-3 right-3 top-[1.05rem] h-px bg-border" />
                  {ticketMovie.showtimes.map((time, index) => (
                    <button key={time} type="button" onClick={() => setShowtime(time)} className="group relative z-10 flex min-w-[6.6rem] flex-col items-center gap-3 text-center">
                      <span className={cn("size-3 rounded-full border-2 border-surface-2 transition duration-300 group-hover:scale-125", activeShowtime === time ? "bg-amber shadow-[0_0_0_5px_rgba(217,200,255,.12),0_0_22px_rgba(217,200,255,.62)]" : "bg-surface-3") } />
                      <span className={cn("font-display text-base tracking-[-.03em]", activeShowtime === time ? "text-ink" : "text-ink-2")}>{time}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted">{index % 2 ? "Open room" : "Low light"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(11rem,.7fr)_minmax(0,1.3fr)]">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:content-start">
                  {showtimeDays.map((day) => (
                    <button key={day.id} type="button" onClick={() => { setSelectedDay(day.id); setShowtime(day.times[0] ?? activeShowtime); }} className={cn("min-w-[7.2rem] rounded-2xl border p-3 text-left transition sm:min-w-0", selectedDay === day.id ? "border-amber/60 bg-amber/10" : "border-border bg-surface-2/50 hover:border-white/25")}>
                      <span className="block font-mono text-[9px] uppercase tracking-[.1em] text-muted">{day.label}</span>
                      <strong className="mt-2 block font-display text-sm text-ink">{day.date}</strong>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selectedDayOption.times.map((time) => (
                    <button key={`${selectedDay}-${time}`} type="button" onClick={() => setShowtime(time)} className={cn("rounded-2xl border px-3 py-3 text-left", activeShowtime === time ? "border-cobalt bg-cobalt/15" : "border-border bg-surface-2/50 hover:border-white/25")}>
                      <strong className="block font-display text-sm text-ink">{time}</strong>
                      <span className="mt-1 block text-[10px] text-muted">Dolby · ₹{ticketMovie.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.1] bg-white/[.035] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cobalt/15 text-cobalt"><Users className="size-4" /></div>
              <div className="min-w-0"><strong className="block text-xs text-ink">Booking with friends?</strong><span className="mt-0.5 block truncate text-[10px] text-muted">Smart seating finds one clean block. Shared session keeps everyone in sync.</span></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-border bg-surface-2/70 p-1">
                <button type="button" className="grid size-6 place-items-center rounded-full text-ink-2 hover:bg-surface-3" onClick={() => setGroupSize((size) => Math.max(1, size - 1))} aria-label="Decrease group size"><Minus className="size-3" /></button>
                <span className="w-7 text-center font-mono text-[10px] text-ink">{groupSize}</span>
                <button type="button" className="grid size-6 place-items-center rounded-full text-ink-2 hover:bg-surface-3" onClick={() => setGroupSize((size) => Math.min(6, size + 1))} aria-label="Increase group size"><Plus className="size-3" /></button>
              </div>
              <button type="button" onClick={chooseSmartGroup} className="inline-flex items-center gap-1.5 rounded-full bg-cobalt px-3 py-2 font-mono text-[9px] uppercase tracking-[.08em] text-ink hover:bg-cobalt/90"><Sparkles className="size-3" /> Smart group</button>
              <button type="button" onClick={() => void shareBookingSession()} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[.08em] text-ink-2 hover:border-ink-2 hover:text-ink"><Share2 className="size-3" /> {sessionCopied ? "Copied" : "Share room"}</button>
            </div>
          </div>

          <section className="reelroom-seat-map-section mt-6 rounded-[1.5rem] border border-white/[.1] bg-surface-2/45 p-4 sm:p-5" aria-labelledby="seat-map-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">02 / sightline studio · screen 04</span>
                <h3 id="seat-map-heading" className="mt-1 font-display text-2xl font-semibold tracking-[-.055em] text-ink">Choose your view.</h3>
                <p className="mt-1 max-w-lg text-xs leading-5 text-ink-2">Every seat is a little different. Read the room, tune the eye-level, and settle into the angle that fits.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-ink-2">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-white/35 bg-white/10" /> Available</span>
                <span className="flex items-center gap-1.5 text-amber"><span className="size-2 rounded-full border border-amber/70 bg-amber/50" /> Selected</span>
                <span className="flex items-center gap-1.5 text-muted"><span className="size-2 rounded-full border border-white/10 bg-white/5" /> Taken</span>
                <span className="flex items-center gap-1.5 text-cobalt"><span className="size-2 rounded-full border border-cobalt/60 bg-cobalt/30" /> Golden zone</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface/55 p-2">
                  <div className="flex rounded-full border border-border bg-surface-2/65 p-1" role="tablist" aria-label="Seat view lens">
                    {(["radar", "eye", "golden"] as SeatLens[]).map((lens) => (
                      <button key={lens} type="button" role="tab" aria-selected={seatLens === lens} onClick={() => setSeatLens(lens)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[.08em] transition", seatLens === lens ? "bg-ink text-canvas" : "text-muted hover:text-ink")}>{lens === "radar" ? <Radar className="size-3" /> : lens === "eye" ? <Eye className="size-3" /> : <Sparkles className="size-3" />}{lens === "radar" ? "Radar" : lens === "eye" ? "Eye-level" : "Golden zon"}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => panSeatMap(-1)} className="grid size-7 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface-3" aria-label="Pan seats left"><ChevronLeft className="size-3.5" /></button>
                    <button type="button" onClick={() => setSeatZoom((current) => Math.max(.85, current - .15))} disabled={seatZoom <= .85} className="grid size-7 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface-3 disabled:opacity-30" aria-label="Zoom out seat map"><Minus className="size-3.5" /></button>
                    <span className="w-10 text-center font-mono text-[9px] text-muted">{Math.round(seatZoom * 100)}%</span>
                    <button type="button" onClick={() => setSeatZoom((current) => Math.min(1.6, current + .15))} disabled={seatZoom >= 1.6} className="grid size-7 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface-3 disabled:opacity-30" aria-label="Zoom in seat map"><Plus className="size-3.5" /></button>
                    <button type="button" onClick={() => panSeatMap(1)} className="grid size-7 place-items-center rounded-full border border-border text-ink-2 hover:bg-surface-3" aria-label="Pan seats right"><ChevronRight className="size-3.5" /></button>
                  </div>
                </div>

                <div className="reelroom-sightline-stage rounded-[1.35rem] border border-border bg-canvas/45 p-3 sm:p-5">
                  <div className="reelroom-screen mx-auto mb-4 max-w-sm text-center font-mono text-[9px] tracking-[.24em] text-ink-2">SCREEN / {eyeLevel} eye-line</div>
                  <div ref={seatMapViewportRef} className="reelroom-seat-map-viewport relative mx-auto w-full max-w-xl overflow-x-auto rounded-2xl border border-border bg-canvas/45 p-3 sm:p-5">
                    {seatLens === "radar" ? <div className="reelroom-sightline-radar" aria-hidden="true"><span /><span /><span /></div> : null}
                    <div className="reelroom-seat-map relative z-10 mx-auto grid min-w-[19rem] gap-2.5" style={{ width: `${seatZoom * 100}%` }}>
                      {["A", "B", "C", "D", "E"].map((row) => (
                        <div key={row} className="reelroom-seat-row grid grid-cols-[18px_repeat(8,minmax(0,1fr))_18px] items-center gap-1.5">
                          <span className="text-center font-mono text-[9px] text-muted">{row}</span>
                          {Array.from({ length: 8 }, (_, index) => {
                            const seat = `${row}${index + 1}`;
                            const isOccupied = occupied.has(seat);
                            const isSelected = selectedSeats.includes(seat);
                            const isGolden = goldenSeats.has(seat);
                            return (
                              <button key={seat} type="button" disabled={isOccupied} aria-label={`${seat} ${isOccupied ? "taken" : isSelected ? "selected" : "available"}`} onMouseEnter={() => setHoveredSeat(seat)} onFocus={() => setHoveredSeat(seat)} onMouseLeave={() => setHoveredSeat(null)} onBlur={() => setHoveredSeat(null)} onClick={() => setSelectedSeats((current) => isSelected ? current.filter((item) => item !== seat) : [...current, seat])} className={cn("reelroom-seat group/seat relative aspect-square rounded-xl border transition duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber", isOccupied && "cursor-not-allowed border-white/10 bg-white/[.035] text-muted opacity-60", isSelected && "border-amber/75 bg-amber/15 text-amber shadow-[0_8px_22px_rgba(217,200,255,.12)] hover:bg-amber/20", !isOccupied && !isSelected && "border-white/15 bg-white/[.035] text-ink-2 hover:border-white/35 hover:bg-white/[.1] hover:text-ink hover:shadow-[0_10px_22px_rgba(0,0,0,.22)]", isGolden && !isOccupied && !isSelected && "border-cobalt/45 bg-cobalt/[.06]")}>
                                <Armchair className="mx-auto size-4 transition-transform duration-300 group-hover/seat:scale-110" aria-hidden="true" />
                                {isGolden ? <span className="absolute right-1 top-1 text-[7px] text-cobalt">✦</span> : null}
                                <span className="sr-only">{seat}</span>
                              </button>
                            );
                          })}
                          <span className="text-center font-mono text-[9px] text-muted">{row}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-muted"><Maximize2 className="size-3 text-amber" /> Drag horizontally to pan the room</div>
                    {hoveredSeat ? <div className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 font-mono text-[9px] text-amber">{hoveredSeat} · {goldenSeats.has(hoveredSeat) ? "Golden zon" : hoveredSeat.startsWith("A") ? "Closer view" : "Balanced view"}</div> : null}
                  </div>
                </div>
              </div>

              <aside className="reelroom-seat-inspector rounded-[1.25rem] border border-white/[.1] bg-white/[.035] p-4">
                {seatLens === "radar" ? (
                  <>
                    <div className="flex items-center gap-2 text-cobalt"><Radar className="size-4" /><span className="font-mono text-[9px] uppercase tracking-[.14em]">Sightline obstruction radar</span></div>
                    <h4 className="mt-3 font-display text-lg font-semibold tracking-[-.04em] text-ink">The center stays clear.</h4>
                    <p className="mt-2 text-[11px] leading-5 text-ink-2">The radar estimates heads and railings between you and the screen. Mid-room seats keep the cleanest cone.</p>
                    <div className="mt-5 space-y-3">
                      {["Center axis", "Left edge", "Right edge"].map((label, index) => <div key={label}><div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-[.08em] text-muted"><span>{label}</span><span className="text-mint">{index === 0 ? "98%" : index === 1 ? "82%" : "88%"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-gradient-to-r from-cobalt to-mint" style={{ width: `${[98, 82, 88][index]}%` }} /></div></div>)}
                    </div>
                  </>
                ) : seatLens === "eye" ? (
                  <>
                    <div className="flex items-center gap-2 text-amber"><Eye className="size-4" /><span className="font-mono text-[9px] uppercase tracking-[.14em]">Custom eye-level</span></div>
                    <h4 className="mt-3 font-display text-lg font-semibold tracking-[-.04em] text-ink">Tune the horizon.</h4>
                    <p className="mt-2 text-[11px] leading-5 text-ink-2">Preview how the screen lands from your row before you commit.</p>
                    <div className="reelroom-eye-preview mt-5"><span className={cn("reelroom-eye-preview-line", eyeLevel)} /><span className="reelroom-eye-preview-screen" /></div>
                    <div className="mt-4 grid grid-cols-3 gap-1.5">{(["front", "middle", "rear"] as EyeLevel[]).map((level) => <button key={level} type="button" onClick={() => setEyeLevel(level)} className={cn("rounded-lg border px-2 py-2 font-mono text-[9px] uppercase tracking-[.08em]", eyeLevel === level ? "border-amber/60 bg-amber/10 text-amber" : "border-border text-muted hover:text-ink")}>{level}</button>)}</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber"><Sparkles className="size-4" /><span className="font-mono text-[9px] uppercase tracking-[.14em]">Golden zon</span></div>
                    <h4 className="mt-3 font-display text-lg font-semibold tracking-[-.04em] text-ink">Balanced, not boring.</h4>
                    <p className="mt-2 text-[11px] leading-5 text-ink-2">The highlighted seats sit inside the theater&apos;s sweet spot: centered sound, gentle distance, no neck strain.</p>
                    <div className="mt-5 rounded-xl border border-cobalt/25 bg-cobalt/10 p-3 text-[10px] leading-5 text-cobalt">✦ C3–C6 are the recommended Golden zon for this room.</div>
                  </>
                )}
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[10px] text-muted"><ShieldCheck className="size-3.5 text-mint" /> Seating map updates instantly when the room changes.</div>
              </aside>
            </div>
            <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-full border border-border bg-surface/65 px-4 py-2.5 font-mono text-[10px] text-ink-2"><Clock3 className="size-3.5 text-amber" /> Seats are held for 08:42 after selection.</div>
          </section>
        </div>

        {!isLastLightDetailsVisible ? (
          <aside className="reelroom-order-summary h-fit rounded-[1.5rem] border border-white/[.12] bg-surface-2/80 p-5 shadow-cinematic backdrop-blur-xl lg:sticky lg:top-5">
            <div className="flex items-center justify-between gap-3"><div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">Order summary</div><span className="inline-flex items-center gap-1 font-mono text-[9px] text-mint"><Wifi className="size-3" /> synced</span></div>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-.055em] text-ink">Your screening.</h3>
            <div className="my-5 flex gap-3 border-b border-border pb-5"><img src={ticketMovie.poster} alt="" className="size-16 rounded-xl object-cover" /><div className="min-w-0"><strong className="block truncate font-display text-sm text-ink">{ticketMovie.title}</strong><span className="mt-1 block font-mono text-[10px] text-amber">{selectedDayOption.date} · {activeShowtime}</span><span className="mt-1 block font-mono text-[10px] text-muted">The Orpheum · Dolby Cinema</span></div></div>
            <div className="space-y-3 text-xs text-ink-2">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2"><CalendarDays className="size-3.5 text-amber" /> Date & time</span><button type="button" onClick={() => document.getElementById("showtime-heading")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="font-mono text-[10px] text-amber">Modify</button></div>
              <div className="flex justify-between gap-3"><span>Seats × {selectedSeats.length}</span><strong className="max-w-[10rem] text-right text-ink">{selectedSeats.length ? selectedSeats.join(", ") : "Select seats"}</strong></div>
              <div className="flex justify-between gap-3"><span>Tickets</span><strong className="text-ink">₹{ticketSubtotal.toFixed(2)}</strong></div>
              <div className="flex justify-between gap-3"><span>Booking fee</span><strong className="text-ink">₹{bookingFee.toFixed(2)}</strong></div>
              {groupDiscount ? <div className="flex justify-between gap-3 text-mint"><span>Group saving</span><strong>−₹{Math.abs(groupDiscount).toFixed(2)}</strong></div> : null}
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-border pt-4"><span className="font-display text-base font-semibold text-ink">Total</span><strong className="font-display text-2xl tracking-[-.05em] text-amber">₹{ticketTotal.toFixed(2)}</strong></div>
            <div className="mt-4 rounded-xl border border-border bg-surface/60 p-3 text-[10px] leading-5 text-ink-2"><span className="mb-1 block font-mono uppercase tracking-[.1em] text-muted">Shared room</span>{sharedSession ? "You and 2 friends are choosing together." : "Invite friends to choose seats in the same room."}<button type="button" onClick={() => void shareBookingSession()} className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.08em] text-cobalt"><Copy className="size-3" /> {sessionCopied ? "Link copied" : "Copy invite link"}</button></div>
             <Button variant="primary" disabled={!selectedSeats.length} onClick={openCheckout} className="mt-5 w-full">{selectedSeats.length ? "Continue to checkout" : "Select your seats"}<ArrowRight className="size-4" /></Button>
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-muted"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-mint" /> Demo mode: payment is not processed. Production hands off to a PCI-compliant provider.</p>
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
  const detailModal = selected ? (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-canvas/85 p-0 backdrop-blur-md sm:p-4"
      onClick={() => setSelected(null)}
    >
      <div
        className="group relative max-h-[94vh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-none border border-border bg-surface shadow-cinematic sm:rounded-[1.75rem]"
        role="dialog"
        aria-modal="true"
        aria-label={`${selected.title} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative isolate min-h-[35rem] overflow-hidden sm:min-h-[32rem]">
          <img
            src={selected.backdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-[-2rem] size-[calc(100%+4rem)] object-cover blur-2xl opacity-75"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,11,.12),rgba(6,7,11,.7)_50%,rgba(6,7,11,.98))]" />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas/70 via-transparent to-canvas/35" />
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full border border-white/20 bg-canvas/45 text-white opacity-100 shadow-lg backdrop-blur-md transition duration-300 hover:bg-canvas/70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Close movie details"
          >
            <X className="size-4" />
          </button>
          <div className="relative z-10 flex min-h-[35rem] flex-col sm:min-h-[32rem]">
            <div className="flex items-center justify-between gap-4 p-5 sm:p-8">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.16em] text-white/65">
                <span className="rounded-full border border-amber/50 bg-canvas/35 px-3 py-1.5 text-amber backdrop-blur-md">
                  {selected.status === "UPCOMING" ? "Upcoming" : "Feature"}
                </span>
                <span className="hidden sm:inline">Reelscape / screening notes</span>
              </div>
            </div>
            <div className="mt-auto grid gap-6 p-5 sm:p-8 md:grid-cols-[13rem_minmax(0,1fr)] md:items-end">
              <img
                src={selected.poster}
                alt={`${selected.title} poster`}
                className="aspect-[2/2.8] w-36 rounded-xl object-cover shadow-2xl ring-1 ring-white/15 md:w-full"
              />
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[.08em] text-white/65">
                  <span>{selected.release}</span>
                  <span className="text-amber">•</span>
                  <span>★ {selected.rating}</span>
                  <span className="text-amber">•</span>
                  <span>{selected.meta}</span>
                </div>
                <h2 className="mt-3 font-display text-4xl font-semibold leading-[.92] tracking-[-.08em] text-white sm:text-5xl md:text-6xl">
                  {selected.title}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-white/75">
                  {selected.synopsis}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
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
                    className="border-white/20 bg-white/10 text-white hover:bg-white/15"
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
                    className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                    onClick={() => void shareMovie(selected)}
                  >
                    <Share2 className="size-4" /> Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!soundtrackLoading && selectedSoundtrack.length ? (
          <section className="border-t border-border bg-surface p-5 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
                  Soundtrack
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-.06em] text-ink">
                  Songs for the closing credits
                </h3>
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-[.12em] text-muted sm:inline">
                Spotify picks
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {selectedSoundtrack.map((song) => (
                <div
                  key={song.id ?? `${song.title}-${song.artist}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-border-strong"
                >
                  <img
                    src={song.art || selected.poster}
                    alt={`${song.title} artwork`}
                    className="size-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-ink">
                      {song.title}
                    </strong>
                    <span className="mt-1 block truncate text-[10px] text-muted">
                      {song.artist} · {song.duration}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleSpotifySong(song)}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-amber text-canvas transition hover:scale-105"
                    aria-label={`${isSongPlaying(song) ? "Pause" : "Play"} ${song.title}`}
                  >
                    {isSongPlaying(song) ? (
                      "Ⅱ"
                    ) : (
                      <Play className="size-3 fill-current" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  ) : null;
  const checkoutModal = booking ? (
    <div
      className={cn(
        "reelroom-checkout-backdrop fixed inset-0 z-40 overflow-y-auto bg-canvas/80 p-3 backdrop-blur-md sm:p-6",
        checkoutClosing && "reelroom-checkout-backdrop-closing",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCheckout();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        aria-describedby="checkout-description"
        className={cn(
          "reelroom-checkout-panel mx-auto my-2 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/[.16] bg-[#10131d]/90 shadow-[0_32px_120px_rgba(0,0,0,.58)] backdrop-blur-2xl sm:my-6",
          checkoutClosing && "reelroom-checkout-panel-closing",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {checkoutStatus === "success" ? (
          <div className="grid min-h-[34rem] place-items-center p-8 text-center sm:p-14">
            <div>
              <div className="reelroom-checkout-success-mark mx-auto grid size-20 place-items-center rounded-full border border-mint/35 bg-mint/10 text-mint">
                <Check className="size-9" />
              </div>
              <div className="mt-7 font-mono text-[10px] uppercase tracking-[.22em] text-mint">
                Payment confirmed
              </div>
              <h2 id="checkout-title" className="mt-3 font-display text-4xl font-semibold tracking-[-.08em] text-ink sm:text-5xl">
                Your seats are yours.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-2">
                A confirmation is ready for {checkoutForm.email}. We&apos;ll keep the ticket in your Reelscape profile.
              </p>
              <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-4 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-ink-2">
                <Ticket className="size-3.5 text-amber" /> {ticketMovie.title} · {selectedDayOption.date}
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between gap-6 border-b border-white/[.1] px-5 py-5 sm:px-8 sm:py-7">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-amber">
                  <span className="grid size-5 place-items-center rounded-full border border-amber/40 bg-amber/10">03</span>
                  Checkout / secure handoff
                </div>
                <h2 id="checkout-title" className="mt-3 font-display text-3xl font-semibold tracking-[-.07em] text-ink sm:text-4xl">
                  Almost at the credits.
                </h2>
                <p id="checkout-description" className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
                  Finish with a few details. Your payment provider will receive the handoff only after you confirm.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCheckout}
                className="reelroom-checkout-close grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.05] text-ink-2 transition hover:border-white/25 hover:bg-white/10 hover:text-ink"
                aria-label="Close checkout"
              >
                <X className="size-4" />
              </button>
            </header>

            <form onSubmit={submitCheckout} className="grid gap-0 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,.7fr)]">
              <div className="min-w-0 space-y-6 p-5 sm:p-8">
                <section aria-labelledby="express-title">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-amber">Fast lane</div>
                      <h3 id="express-title" className="mt-2 font-display text-xl font-semibold tracking-[-.05em] text-ink">Express payment</h3>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[.12em] text-muted">Gateway API pending</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([
                      ["apple", "Apple Pay", "Face ID / Touch ID"],
                      ["google", "Google Pay", "Saved payment"],
                    ] as const).map(([method, label, detail]) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCheckoutMethod(method)}
                        className={cn(
                          "reelroom-express-button group flex min-h-[4.2rem] items-center justify-between gap-3 rounded-2xl border px-4 text-left transition",
                          checkoutMethod === method ? "border-amber/65 bg-amber/[.12] text-ink" : "border-white/10 bg-white/[.045] text-ink-2 hover:border-white/25 hover:bg-white/[.08]",
                        )}
                      >
                        <span>
                          <strong className="block text-sm text-ink">{label}</strong>
                          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.08em] text-muted">{detail}</span>
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[.08em] text-muted transition group-hover:border-amber/40 group-hover:text-amber">API later</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutMethod("card")}
                    className={cn(
                      "reelroom-payment-method mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      checkoutMethod === "card" ? "border-cobalt/60 bg-cobalt/[.1]" : "border-white/10 bg-white/[.035] hover:border-white/25",
                    )}
                  >
                    <span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white text-[10px] font-bold text-[#182033]">CARD</span><span><strong className="block text-xs text-ink">Card details</strong><span className="mt-1 block text-[10px] text-muted">Secure provider handoff</span></span></span>
                    <span className={cn("size-2 rounded-full", checkoutMethod === "card" ? "bg-cobalt shadow-[0_0_14px_rgba(94,121,255,.9)]" : "bg-white/15")} />
                  </button>
                </section>

                <section className="border-t border-white/[.1] pt-6" aria-labelledby="details-title">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-amber">Minimal details</div>
                      <h3 id="details-title" className="mt-2 font-display text-xl font-semibold tracking-[-.05em] text-ink">Ready when you are.</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.08em] text-mint"><Check className="size-3" /> autofill ready</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="reelroom-checkout-field">
                      <span>Full name</span>
                      <input
                        id="checkout-name"
                        name="name"
                        value={checkoutForm.name}
                        onChange={(event) => updateCheckoutField("name", event.target.value)}
                        onBlur={() => touchCheckoutField("name")}
                        autoComplete="name"
                        aria-invalid={Boolean(checkoutTouched.name && checkoutErrors.name)}
                        className={cn(checkoutTouched.name && checkoutErrors.name && "reelroom-checkout-input-error")}
                      />
                      {checkoutTouched.name && checkoutErrors.name ? <span className="reelroom-checkout-error" role="alert">{checkoutErrors.name}</span> : null}
                    </label>
                    <label className="reelroom-checkout-field">
                      <span>Email for confirmation</span>
                      <input
                        id="checkout-email"
                        name="email"
                        type="email"
                        value={checkoutForm.email}
                        onChange={(event) => updateCheckoutField("email", event.target.value)}
                        onBlur={() => touchCheckoutField("email")}
                        autoComplete="email"
                        aria-invalid={Boolean(checkoutTouched.email && checkoutErrors.email)}
                        className={cn(checkoutTouched.email && checkoutErrors.email && "reelroom-checkout-input-error")}
                      />
                      {checkoutTouched.email && checkoutErrors.email ? <span className="reelroom-checkout-error" role="alert">{checkoutErrors.email}</span> : null}
                    </label>
                  </div>

                  {checkoutMethod === "card" ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.035] p-4">
                      <label className="reelroom-checkout-field">
                        <span>Card number</span>
                        <input
                          id="checkout-card-number"
                          name="cardNumber"
                          inputMode="numeric"
                          value={checkoutForm.cardNumber}
                          onChange={(event) => updateCheckoutField("cardNumber", event.target.value)}
                          onBlur={() => touchCheckoutField("cardNumber")}
                          autoComplete="cc-number"
                          placeholder="1234 5678 9012 3456"
                          aria-invalid={Boolean(checkoutTouched.cardNumber && checkoutErrors.cardNumber)}
                          className={cn(checkoutTouched.cardNumber && checkoutErrors.cardNumber && "reelroom-checkout-input-error")}
                        />
                        {checkoutTouched.cardNumber && checkoutErrors.cardNumber ? <span className="reelroom-checkout-error" role="alert">{checkoutErrors.cardNumber}</span> : null}
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="reelroom-checkout-field">
                          <span>Expiry</span>
                          <input
                            id="checkout-expiry"
                            name="expiry"
                            inputMode="numeric"
                            value={checkoutForm.expiry}
                            onChange={(event) => updateCheckoutField("expiry", event.target.value)}
                            onBlur={() => touchCheckoutField("expiry")}
                            autoComplete="cc-exp"
                            placeholder="MM / YY"
                            aria-invalid={Boolean(checkoutTouched.expiry && checkoutErrors.expiry)}
                            className={cn(checkoutTouched.expiry && checkoutErrors.expiry && "reelroom-checkout-input-error")}
                          />
                          {checkoutTouched.expiry && checkoutErrors.expiry ? <span className="reelroom-checkout-error" role="alert">{checkoutErrors.expiry}</span> : null}
                        </label>
                        <label className="reelroom-checkout-field">
                          <span>Security code</span>
                          <input
                            id="checkout-cvc"
                            name="cvc"
                            inputMode="numeric"
                            value={checkoutForm.cvc}
                            onChange={(event) => updateCheckoutField("cvc", event.target.value)}
                            onBlur={() => touchCheckoutField("cvc")}
                            autoComplete="cc-csc"
                            placeholder="CVC"
                            aria-invalid={Boolean(checkoutTouched.cvc && checkoutErrors.cvc)}
                            className={cn(checkoutTouched.cvc && checkoutErrors.cvc && "reelroom-checkout-input-error")}
                          />
                          {checkoutTouched.cvc && checkoutErrors.cvc ? <span className="reelroom-checkout-error" role="alert">{checkoutErrors.cvc}</span> : null}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber/25 bg-amber/[.07] p-4 text-xs leading-5 text-ink-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber" />
                      <span><strong className="text-ink">{checkoutMethod === "apple" ? "Apple Pay" : "Google Pay"} is ready for integration.</strong> The express gateway API will be connected in the next handoff. Switch to Card to complete this demo checkout.</span>
                    </div>
                  )}
                </section>

                <div className="grid gap-2 sm:grid-cols-3" aria-label="Security and trust signals">
                  <div className="reelroom-trust-signal"><ShieldCheck className="size-4 text-mint" /><span>PCI-ready</span></div>
                  <div className="reelroom-trust-signal"><Wifi className="size-4 text-mint" /><span>SSL secured</span></div>
                  <div className="reelroom-trust-signal"><Check className="size-4 text-mint" /><span>Instant ticket</span></div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={checkoutStatus === "loading"}
                    className="reelroom-checkout-confirm inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4f0ff] px-5 text-sm font-bold text-[#151421] shadow-[0_14px_38px_rgba(244,240,255,.18)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_rgba(244,240,255,.28)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
                  >
                    {checkoutStatus === "loading" ? <><span className="reelroom-checkout-spinner" /> Verifying securely...</> : <><Check className="size-4" /> Confirm purchase <ArrowRight className="size-4" /></>}
                  </button>
                  <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[.1em] text-muted">Demo mode · no payment is processed</p>
                </div>
              </div>

              <aside className="reelroom-checkout-summary order-first border-b border-white/[.1] bg-black/20 p-5 sm:p-8 lg:order-2 lg:border-b-0 lg:border-l lg:border-white/[.1]">
                <div className="lg:sticky lg:top-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[.18em] text-amber">Your order</div>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[.1em] text-mint"><Wifi className="size-3" /> live</span>
                  </div>
                  <div className="mt-5 flex gap-3 border-b border-white/[.1] pb-5">
                    <img src={ticketMovie.poster} alt="" className="size-16 rounded-2xl object-cover" />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-xl font-semibold tracking-[-.06em] text-ink">{ticketMovie.title}</h3>
                      <p className="mt-1 font-mono text-[10px] text-amber">{selectedDayOption.date} · {activeShowtime}</p>
                      <p className="mt-1 text-[10px] text-muted">The Orpheum · Dolby Cinema</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-xs text-ink-2">
                    <div className="flex justify-between gap-3"><span>Tickets · {selectedSeats.join(", ")}</span><strong className="text-ink">₹{ticketSubtotal.toFixed(2)}</strong></div>
                    <div className="flex justify-between gap-3"><span>Tax</span><strong className="text-ink">₹{checkoutTax.toFixed(2)}</strong></div>
                    <div className="flex justify-between gap-3"><span>Shipping</span><strong className="text-mint">Digital · ₹{checkoutShipping.toFixed(2)}</strong></div>
                    <div className="flex justify-between gap-3"><span>Booking fee</span><strong className="text-ink">₹{bookingFee.toFixed(2)}</strong></div>
                    {groupDiscount ? <div className="flex justify-between gap-3 text-mint"><span>Group saving</span><strong>−₹{Math.abs(groupDiscount).toFixed(2)}</strong></div> : null}
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/[.1] pt-5">
                    <span className="font-display text-lg font-semibold tracking-[-.04em] text-ink">Total</span>
                    <strong className="font-display text-3xl tracking-[-.07em] text-amber">₹{checkoutTotal.toFixed(2)}</strong>
                  </div>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.045] p-4 text-[11px] leading-5 text-ink-2">
                    <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-mint"><ShieldCheck className="size-3.5" /> Your details stay private</div>
                    <p className="mt-2">Only a signed confirmation is shared with the payment provider. Card details never touch Reelscape.</p>
                  </div>
                </div>
              </aside>
            </form>
          </>
        )}
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
              page === "updates"
                ? "reelroom-updates-main"
                : page === "songs"
                  ? "px-2 sm:px-3 lg:px-4"
                  : "px-4 sm:px-6 lg:px-10",
            )}
          >
          <header className={cn("relative flex h-20 items-center justify-between gap-4", page === "movies" && "z-40", page === "updates" && "reelroom-updates-header")}>
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
          <div className={cn("animate-[page-in_.35s_ease_both]", page === "updates" && "reelroom-updates-content")}>{pageContent}</div>
        </main>
      </div>
      {page !== "updates" ? (
        <footer className="w-full border-t border-border px-4 py-4 text-center font-mono text-[10px] text-ink-2 sm:px-6 lg:px-10">
          Reelscape · Find your next screening
        </footer>
      ) : null}
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
