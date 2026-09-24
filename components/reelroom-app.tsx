"use client";

import { useEffect, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  Clock3,
  Disc3,
  EllipsisVertical,
  Film,
  Heart,
  Home,
  LogIn,
  MapPin,
  Music2,
  Play,
  Share2,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import { BlackHoleHeroSection } from "@/components/ui/black-hole-hero-section";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { cn } from "@/lib/utils";

type Movie = {
  id: string;
  title: string;
  meta: string;
  status: "NOW PLAYING" | "UPCOMING";
  rating: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  songs: string[];
  showtimes: string[];
  genres: string[];
  release: string;
};
type Song = {
  title: string;
  artist: string;
  movie: string;
  duration: string;
  art: string;
  genre: string;
};

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
    songs: ["Asteria", "Liminal Hours"],
    showtimes: ["10:15 AM", "1:40 PM", "4:25 PM", "8:10 PM"],
    genres: ["Drama", "Mystery"],
    release: "Now playing",
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
    songs: ["Blue Static", "Soft Reset"],
    showtimes: ["11:20 AM", "3:05 PM", "7:30 PM"],
    genres: ["Sci-Fi", "Thriller"],
    release: "Now playing",
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
    songs: ["Weather Report", "Half-lit"],
    showtimes: ["12:10 PM", "5:00 PM", "9:20 PM"],
    genres: ["Romance", "Indie"],
    release: "Oct 18, 2026",
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
    songs: ["Bloom Signal", "Copper Sky"],
    showtimes: ["2:20 PM", "6:45 PM"],
    genres: ["Documentary"],
    release: "Oct 24, 2026",
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
    songs: ["Salt Lines", "Northbound"],
    showtimes: ["9:45 AM", "12:55 PM", "6:15 PM"],
    genres: ["Adventure", "Drama"],
    release: "Oct 31, 2026",
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
    songs: ["Carrier Wave", "Signal Loss"],
    showtimes: ["4:00 PM", "9:05 PM"],
    genres: ["Thriller", "Mystery"],
    release: "Nov 07, 2026",
  },
];

const songs: Song[] = [
  {
    title: "Asteria",
    artist: "Mina Sol",
    movie: "The Last Light",
    duration: "3:42",
    art: art[0],
    genre: "Ambient",
  },
  {
    title: "Blue Static",
    artist: "Kite Theory",
    movie: "Neon Aftercare",
    duration: "4:08",
    art: art[1],
    genre: "Electronic",
  },
  {
    title: "Weather Report",
    artist: "June Atlas",
    movie: "Rooms With Weather",
    duration: "3:16",
    art: art[2],
    genre: "Indie",
  },
  {
    title: "Bloom Signal",
    artist: "Onda/Null",
    movie: "Static Bloom",
    duration: "5:02",
    art: art[3],
    genre: "Experimental",
  },
  {
    title: "Salt Lines",
    artist: "Mara Voss",
    movie: "Oceans Between Us",
    duration: "2:58",
    art: art[4],
    genre: "Cinematic",
  },
  {
    title: "Carrier Wave",
    artist: "Nico Vale",
    movie: "The Quiet Frequency",
    duration: "3:33",
    art: art[5],
    genre: "Synth",
  },
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition duration-300 hover:-translate-y-px focus-visible:outline-none",
        variant === "primary" &&
          "border-amber bg-amber text-canvas hover:bg-amber/90",
        variant === "surface" &&
          "border-border bg-surface-2 text-ink hover:border-cobalt/70",
        variant === "ghost" &&
          "border-border bg-transparent text-ink-2 hover:bg-surface",
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
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
          {eyebrow}
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-none tracking-[-.05em] text-ink md:text-3xl">
          {title}
        </h2>
        {copy ? (
          <p className="mt-3 max-w-xl text-xs leading-6 text-ink-2">{copy}</p>
        ) : null}
      </div>
      {action}
    </div>
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

function FeaturedScreening({ onOpen }: { onOpen: (item: Movie) => void }) {
  const item = movies[2];

  return (
    <article className="group reelroom-featured-screening w-full overflow-hidden rounded-2xl border border-border">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={item.backdrop}
          alt=""
          className="size-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/90 via-canvas/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-amber/50 bg-canvas/45 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-amber backdrop-blur">
          Featured event
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[.12em] text-ink-2">
          <span className="flex items-center gap-1.5 text-amber">
            <Clock3 className="size-3" /> Oct 18 · 7:30 PM
          </span>
          <span>The Meridian</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink">
          {item.title}
        </h2>
        <p className="mt-2 text-xs leading-5 text-ink-2">
          A one-night premiere with a live score and a post-screening Q&amp;A.
        </p>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber/60 bg-ink/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[.08em] text-ink transition hover:border-amber hover:bg-ink/20"
        >
          See event details <ArrowRight className="size-3.5" />
        </button>
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

function HeaderNavMenu({
  open,
  currentPage,
  moreOpen,
  onToggleMore,
  onNavigate,
}: {
  open: boolean;
  currentPage: NavId;
  moreOpen: boolean;
  onToggleMore: () => void;
  onNavigate: (page: NavId) => void;
}) {
  if (!open) return null;
  const items = nav.filter(([id]) => id !== "profile" && id !== "login");
  return (
    <div
      className="reelroom-header-menu z-50 w-48 rounded-xl border border-border bg-surface p-1 shadow-cinematic"
      role="menu"
      aria-label="Page navigation"
    >
      {items.map(([id, label, Icon]) => {
        const disabled = id === "updates" && currentPage === "updates";
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => onNavigate(id)}
            disabled={disabled}
            aria-current={disabled ? "page" : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Icon className="size-4 text-amber" />
            {label}
          </button>
        );
      })}
      <button
        type="button"
        role="menuitem"
        onClick={onToggleMore}
        aria-expanded={moreOpen}
        className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-border px-3 py-2.5 pt-3 text-left text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <EllipsisVertical className="size-4 text-amber" />
        More
      </button>
      {moreOpen ? (
        <div className="reelroom-header-submenu">
          <button
            type="button"
            role="menuitem"
            onClick={() => onNavigate("login")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <LogIn className="size-4 text-amber" />
            Login
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => onNavigate("profile")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <UserRound className="size-4 text-amber" />
            Profile
          </button>
        </div>
      ) : null}
    </div>
  );
}

function pageFromLocation(): NavId {
  if (typeof window === "undefined") return "home";
  const candidate = window.location.hash.slice(1);
  return nav.some(([id]) => id === candidate) ? (candidate as NavId) : "home";
}

export function ReelroomApp() {
  const [page, setPageState] = useState<NavId>("home");
  const [routeReady, setRouteReady] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [favorites, setFavorites] = useState<string[]>(["m1"]);
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
  const isLastLightDetailsVisible = droppedMovie?.title === "The Last Light";

  useEffect(() => {
    if (!droppedMovie || detailsShownAt === null) return;
    const timeout = window.setTimeout(() => {
      setDroppedMovie(null);
      setDetailsShownAt(null);
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [droppedMovie, detailsShownAt]);

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
  }, []);

  const filteredSongs = songs;
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
          <span>{movies.length * 12} titles in rotation</span>
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
          eyebrow="Selected for you"
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
          {movies.map((item) => (
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
            Tonight's note
          </div>
          <h2 className="mt-2 max-w-sm font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink">
            The city is still awake.
          </h2>
          <p className="mt-3 max-w-md text-xs leading-5 text-ink-2">
            Three late screenings, one last train, and a soundtrack worth
            staying for.
          </p>
          <Button className="reelroom-arrow-glass mt-4" onClick={() => setSelected(movies[0])}>
            Open The Last Light <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <SectionTitle
            eyebrow="Now spinning"
            title="Songs from the reel"
            action={
              <button
                onClick={() => setPage("songs")}
                className="font-mono text-[10px] text-amber"
              >
                All songs
              </button>
            }
          />
          <div className="space-y-2">
            {songs.slice(0, 3).map((song) => (
              <div
                key={song.title}
                className="flex items-center gap-2 border-b border-border pb-2 last:border-0"
              >
                <img
                  src={song.art}
                  alt=""
                  className="size-9 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate font-display text-xs text-ink">
                    {song.title}
                  </strong>
                  <span className="mt-1 block truncate text-[10px] text-muted">
                    {song.artist} · {song.movie}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber">
                  {song.duration}
                </span>
              </div>
            ))}
          </div>
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
        <div className="h-[30rem] md:h-[36rem]">
          <WorksWheel items={wheelItems} label="Films '26" action="Open" />
        </div>
      </section>
    </div>
  );

  const blackHoleHero = (
    <BlackHoleHeroSection
      className="relative min-h-[44rem] rounded-2xl border border-border shadow-cinematic sm:min-h-[42rem] md:min-h-[38rem] lg:min-h-[34rem]"
      distance={8}
      elevation={7}
      focus={[0.7, 0.48]}
      scrim="left"
      scrimStrength={0.9}
      glow={1.2}
      starBrightness={0.55}
      spinSpeed={0.36}
    >
      <div className="relative z-10 grid min-h-[44rem] grid-cols-1 items-end gap-8 p-6 sm:min-h-[42rem] sm:p-8 md:min-h-[38rem] md:grid-cols-2 md:gap-10 md:p-10 lg:min-h-[34rem]">
        <FeaturedScreening onOpen={setSelected} />
        <div className="max-w-2xl lg:pb-1">
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">
            Reelscape / event horizon
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-5xl font-semibold leading-[.91] tracking-[-.08em] text-ink sm:text-6xl md:text-7xl">
            Find your next <span className="text-amber">screening.</span>
          </h1>
          <div className="mt-5 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[.08em] text-ink-2">
            <span>Curated daily</span>
            <span className="text-amber">•</span>
            <span>{movies.length * 12} titles in rotation</span>
            <span className="text-amber">•</span>
            <span>NYC · 7:42 PM</span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-ink-2">
            For the nights when a movie is more than a movie. Browse new releases,
            follow the songs, and book a seat before the lights go down.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="primary"
              className="reelroom-arrow-glass"
              onClick={() => setPage("movies")}
            >
              Explore the lineup <ArrowRight className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => setPage("tickets")}>
              Book a ticket
            </Button>
          </div>
        </div>
      </div>
    </BlackHoleHeroSection>
  );
  const homeWithBlackHole = (
    <div className="home-page-content space-y-8">
      {blackHoleHero}
      <section>
        <SectionTitle
          eyebrow="Selected for you"
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
          {movies.map((item) => (
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
            Tonight's note
          </div>
          <h2 className="mt-2 max-w-sm font-display text-2xl font-semibold leading-none tracking-[-.06em] text-ink">
            The city is still awake.
          </h2>
          <p className="mt-3 max-w-md text-xs leading-5 text-ink-2">
            Three late screenings, one last train, and a soundtrack worth
            staying for.
          </p>
          <Button className="reelroom-arrow-glass mt-4" onClick={() => setSelected(movies[0])}>
            Open The Last Light <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <SectionTitle
            eyebrow="Now spinning"
            title="Songs from the reel"
            action={
              <button
                onClick={() => setPage("songs")}
                className="font-mono text-[10px] text-amber"
              >
                All songs
              </button>
            }
          />
          <div className="space-y-2">
            {songs.slice(0, 3).map((song) => (
              <div
                key={song.title}
                className="flex items-center gap-2 border-b border-border pb-2 last:border-0"
              >
                <img
                  src={song.art}
                  alt=""
                  className="size-9 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate font-display text-xs text-ink">
                    {song.title}
                  </strong>
                  <span className="mt-1 block truncate text-[10px] text-muted">
                    {song.artist} · {song.movie}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber">
                  {song.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const moviesPage = (
    <div className="reelroom-movies-page -mx-4 min-h-[calc(100vh-5rem)] sm:-mx-6 lg:-mx-10">
      <ImageStreamHero
        images={movies.map((item) => ({
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
          const movie = movies.find((item) => item.title === image.label);
          if (movie) {
            setDroppedMovie(null);
            setDetailsShownAt(null);
            setSelectedMovie(movie);
          }
        }}
        onCardDrop={(image) => {
          const movie = movies.find((item) => item.title === image.label);
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
    <div className="h-[calc(100vh-5rem)] min-h-[32rem] w-full overflow-hidden">
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
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Songs / original motion"
        title="The soundtrack"
        copy="Browse the music attached to the films, with preview-ready interactions and no unlicensed audio hosting."
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="ml-auto font-mono text-[10px] text-muted">
          {filteredSongs.length} tracks
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {filteredSongs.map((song) => (
          <div
            key={song.title}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <img
              src={song.art}
              alt=""
              className="size-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <strong className="block truncate font-display text-sm text-ink">
                {song.title}
              </strong>
              <span className="mt-1 block truncate text-xs text-muted">
                {song.artist} · {song.movie}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted">
              {song.duration}
            </span>
            <button
              type="button"
              onClick={() =>
                setPlaying(playing === song.title ? null : song.title)
              }
              className="grid size-9 place-items-center rounded-full bg-amber text-canvas"
              aria-label={`${playing === song.title ? "Pause" : "Play"} ${song.title}`}
            >
              {playing === song.title ? (
                <span className="text-xs">Ⅱ</span>
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const ticketMovie = selected ?? movies[0];
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
            <div>
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
                    Dolby · from ₹16
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.14em] text-amber">
                  Seat map
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold tracking-[-.04em] text-ink">
                  Choose your view
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm border border-emerald-300 bg-emerald-400/30" />
                  Available
                </span>
                <span className="flex items-center gap-1.5 text-amber">
                  <span className="size-2.5 rounded-sm border border-amber-200 bg-amber-300" />
                  Selected
                </span>
                <span className="flex items-center gap-1.5 text-rose-200">
                  <span className="size-2.5 rounded-sm border border-rose-400 bg-rose-500/50" />
                  Taken
                </span>
              </div>
            </div>
            <div className="mx-auto mb-6 mt-7 max-w-sm border-t-2 border-border-strong pt-2 text-center font-mono text-[9px] tracking-[.2em] text-muted">
              SCREEN
            </div>
            <div className="mx-auto mb-3 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-cobalt/50 bg-cobalt/10 p-3 shadow-[0_0_24px_rgba(76,111,255,.16)]">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[.14em] text-cobalt">
                  Map zoom
                </span>
                <span className="mt-1 block text-[11px] text-ink-2">
                  Adjust your view on smaller screens
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSeatZoom((current) => Math.max(0.85, current - 0.15))}
                  disabled={seatZoom <= 0.85}
                  className="grid size-9 place-items-center rounded-lg border border-cobalt/60 bg-surface-2 text-lg font-semibold text-ink transition hover:border-cobalt hover:bg-cobalt/20 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Zoom out seat map"
                >
                  −
                </button>
                <span className="w-12 text-center font-mono text-xs font-semibold text-amber">
                  {Math.round(seatZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSeatZoom((current) => Math.min(1.6, current + 0.15))}
                  disabled={seatZoom >= 1.6}
                  className="grid size-9 place-items-center rounded-lg border border-cobalt/60 bg-surface-2 text-lg font-semibold text-ink transition hover:border-cobalt hover:bg-cobalt/20 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Zoom in seat map"
                >
                  +
                </button>
              </div>
            </div>
            <div className="reelroom-seat-map-viewport mx-auto w-full max-w-xl overflow-x-auto rounded-xl border border-border bg-canvas/25 p-3 sm:p-4">
              <div
                className="reelroom-seat-map mx-auto grid gap-2"
                style={{ width: `${seatZoom * 100}%` }}
              >
                {["A", "B", "C", "D", "E"].map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[16px_repeat(8,minmax(0,1fr))_16px] items-center gap-1.5"
                  >
                    <span className="text-center font-mono text-[9px] text-muted">
                      {row}
                    </span>
                    {Array.from({ length: 8 }, (_, index) => {
                      const seat = `${row}${index + 1}`;
                      const isOccupied = occupied.has(seat);
                      const isSelected = selectedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          disabled={isOccupied}
                          onClick={() =>
                            setSelectedSeats((current) =>
                              isSelected
                                ? current.filter((item) => item !== seat)
                                : [...current, seat],
                            )
                          }
                          className={cn(
                            "aspect-square rounded-md border text-[9px] font-semibold transition hover:-translate-y-px",
                            isOccupied &&
                              "cursor-not-allowed border-rose-400/70 bg-rose-500/50 text-rose-100 opacity-80",
                            isSelected &&
                              "border-amber-200 bg-amber-300 text-canvas shadow-[0_0_14px_rgba(251,191,36,.45)] hover:shadow-[0_0_24px_rgba(251,191,36,.9)]",
                            !isOccupied &&
                              !isSelected &&
                              "border-emerald-300/80 bg-emerald-400/25 text-emerald-100 hover:border-emerald-200 hover:bg-emerald-400/45 hover:shadow-[0_0_22px_rgba(52,211,153,.75)]",
                          )}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                    <span className="text-center font-mono text-[9px] text-muted">
                      {row}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-lg border border-amber/20 bg-amber/10 p-3 font-mono text-[10px] text-amber">
              <Clock3 className="size-3.5" /> Seats are held for 08:42 after
              selection.
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
                ₹{(selectedSeats.length * 16).toFixed(2)}
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
                selectedSeats.length * 16 +
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
      <div className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-surface/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl sm:inset-x-6 sm:p-4">
        <div className="min-w-0" aria-live="polite">
          <span className="block font-mono text-[9px] uppercase tracking-[.14em] text-amber">
            Confirmation
          </span>
          <strong className="mt-1 block truncate font-display text-sm text-ink sm:text-base">
            {selectedSeats.length
              ? `${selectedSeats.length} seat${selectedSeats.length === 1 ? "" : "s"} selected`
              : "Choose your seats"}
          </strong>
          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
            {selectedSeats.length
              ? `${selectedSeats.join(", ")} · ₹${(selectedSeats.length * 16 + 4.8).toFixed(2)}`
              : "Your selection will appear here"}
          </span>
        </div>
        <Button
          variant="primary"
          disabled={!selectedSeats.length}
          onClick={() => setBooking(true)}
          className="shrink-0 px-3 sm:px-5"
        >
          {selectedSeats.length ? "Continue" : "Select seats"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  const profilePage = (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Profile / your signal"
        title="Keep your place"
        copy="Your saved films, tickets, and notification rhythm in one quiet corner."
      />
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-amber font-display text-xl font-bold text-canvas">
            AK
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-.05em] text-ink">
              Alex Kim
            </h2>
            <p className="mt-1 text-xs text-muted">
              New York · Member since 2024
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => announce("Preferences are ready to manage.")}
        >
          Manage preferences
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <SectionTitle
            eyebrow="Saved for later"
            title="Favorites"
            action={
              <span className="font-mono text-[10px] text-muted">
                {favorites.length} total
              </span>
            }
          />
          {movies
            .filter((item) => favorites.includes(item.id))
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-0"
              >
                <img
                  src={item.poster}
                  alt=""
                  className="size-11 rounded-md object-cover"
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
                  onClick={() => setSelected(item)}
                  className="font-mono text-[10px] text-amber"
                >
                  Open
                </button>
              </div>
            ))}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-5">
          <SectionTitle eyebrow="Preferences" title="Your signal" />
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <strong className="block font-display text-xs text-ink">
                  Release alerts
                </strong>
                <span className="mt-1 block text-[10px] text-muted">
                  Upcoming films you saved
                </span>
              </div>
              <span className="rounded-full bg-cobalt px-2 py-1 font-mono text-[9px] text-ink">
                ON
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <strong className="block font-display text-xs text-ink">
                  Booking updates
                </strong>
                <span className="mt-1 block text-[10px] text-muted">
                  Changes, reminders, and tickets
                </span>
              </div>
              <span className="rounded-full bg-cobalt px-2 py-1 font-mono text-[9px] text-ink">
                ON
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <strong className="block font-display text-xs text-ink">
                  Preferred city
                </strong>
                <span className="mt-1 block text-[10px] text-muted">
                  New York
                </span>
              </div>
              <MapPin className="size-4 text-amber" />
            </div>
          </div>
        </section>
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
              {songs
                .filter((song) => selected.songs.includes(song.title))
                .map((song) => (
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
                      onClick={() =>
                        setPlaying(playing === song.title ? null : song.title)
                      }
                      className="grid size-7 place-items-center rounded-full bg-amber text-canvas"
                    >
                      {playing === song.title ? (
                        "Ⅱ"
                      ) : (
                        <Play className="size-3 fill-current" />
                      )}
                    </button>
                  </div>
                ))}
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
            onClick={() => setBooking(false)}
            className="grid size-9 place-items-center rounded-full border border-border text-ink-2"
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
              ₹{(selectedSeats.length * 16 + 4.8).toFixed(2)}
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
      <div className="min-h-screen">
        <main
          className={cn(
            "min-w-0 px-4 pb-24 sm:px-6 lg:px-10 lg:pb-14",
            page === "updates" && "!px-0 !pb-0 lg:!pb-0",
          )}
        >
          <header className={cn("relative flex h-20 items-center justify-between gap-4", page === "movies" && "z-40", page === "updates" && "px-4 sm:px-6 lg:px-10")}>
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
              <div className="relative hidden lg:block">
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
