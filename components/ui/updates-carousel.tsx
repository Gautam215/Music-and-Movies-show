"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ArrowUpRight, Clock3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Movie, MovieUpdateFeeds } from "@/lib/movie-types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function UpdatesCarousel({
  moviesByCategory,
  onOpen,
}: {
  moviesByCategory: MovieUpdateFeeds;
  onOpen: (movie: Movie) => void;
}) {
  const [category, setCategory] = useState<keyof MovieUpdateFeeds>("trending");
  const visibleMovies = moviesByCategory[category].slice(0, 9);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rotation = useRef(0);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(visibleMovies[0]?.id ?? null);
  const selectedMovie = visibleMovies.find((movie) => movie.id === selectedId) ?? visibleMovies[0];

  useEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) return;
    const readSize = () => setStage({ width: stageElement.clientWidth, height: stageElement.clientHeight });
    readSize();
    const observer = new ResizeObserver(readSize);
    observer.observe(stageElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReducedMotion(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    if (!visibleMovies.some((movie) => movie.id === selectedId)) {
      setSelectedId(visibleMovies[0]?.id ?? null);
    }
  }, [selectedId, visibleMovies]);

  useEffect(() => {
    if (!stage.width || !stage.height || !visibleMovies.length) return;
    let frame = 0;
    let previous = performance.now();
    const count = visibleMovies.length;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const elapsed = Math.min(now - previous, 80);
      previous = now;
      if (!reducedMotion) rotation.current = (rotation.current + elapsed * 0.006) % 360;

      const cardWidth = clamp(Math.min(stage.width * 0.22, stage.height * 0.28), 108, 236);
      const radiusX = Math.max(86, Math.min(stage.width * 0.37, 430));
      const radiusY = Math.max(82, Math.min(stage.height * 0.34, 310));
      const step = 360 / count;

      visibleMovies.forEach((movie, index) => {
        const card = cardRefs.current[index];
        if (!card) return;
        const angle = -90 + rotation.current + index * step;
        const depth = (Math.cos(radians(angle + 90)) + 1) / 2;
        const isSelected = movie.id === selectedId;
        const x = Math.cos(radians(angle)) * radiusX;
        const y = Math.sin(radians(angle)) * radiusY;
        const scale = isSelected ? 1.12 : 0.72 + depth * 0.27;
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardWidth * 1.42}px`;
        card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${depth * 42}px) rotateZ(${Math.sin(radians(angle + 90)) * 12}deg) scale(${scale})`;
        card.style.opacity = isSelected ? "1" : String(0.42 + depth * 0.58);
        card.style.zIndex = isSelected ? "30" : String(Math.round(5 + depth * 20));
      });
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, selectedId, stage, visibleMovies]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    element.style.setProperty("--updates-pointer-x", `${clamp(x, -1, 1)}`);
    element.style.setProperty("--updates-pointer-y", `${clamp(y, -1, 1)}`);
  };

  const resetPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--updates-pointer-x", "0");
    event.currentTarget.style.setProperty("--updates-pointer-y", "0");
  };

  if (!selectedMovie) return null;

  return (
    <section className="updates-carousel" aria-label="Trending 2026 movie updates">
      <div className="updates-carousel-waves" aria-hidden="true">
        <span className="updates-wave updates-wave-one" />
        <span className="updates-wave updates-wave-two" />
        <span className="updates-wave updates-wave-three" />
      </div>
      <div className="updates-carousel-header">
        <div>
          <span>Updates / TMDB daily feed</span>
          <div className="updates-carousel-categories" role="tablist" aria-label="Movie update categories">
            <button
              type="button"
              role="tab"
              aria-selected={category === "trending"}
              className={cn(category === "trending" && "updates-carousel-category-active")}
              onClick={() => setCategory("trending")}
            >
              Trending Now
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={category === "comingSoon"}
              className={cn(category === "comingSoon" && "updates-carousel-category-active")}
              onClick={() => setCategory("comingSoon")}
            >
              Coming Soon
            </button>
          </div>
        </div>
        <span className="updates-carousel-counter">0{visibleMovies.length} titles / refreshed daily</span>
      </div>
      <div className="updates-carousel-layout">
        <div
          ref={stageRef}
          className="updates-carousel-stage"
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          {visibleMovies.map((movie, index) => (
            <button
              key={movie.id}
              ref={(node) => { cardRefs.current[index] = node; }}
              type="button"
              aria-label={`Select ${movie.title}`}
              aria-pressed={movie.id === selectedMovie.id}
              onClick={() => setSelectedId(movie.id)}
              className={cn("updates-carousel-card", movie.id === selectedMovie.id && "updates-carousel-card-selected")}
            >
              <img src={movie.poster} alt={`${movie.title} poster`} draggable={false} />
              <span className="updates-carousel-card-shade" />
              <span className="updates-carousel-card-label">
                <strong>{movie.title}</strong>
                <small>{movie.rating === "—" ? "NR" : `★ ${movie.rating}`} / {movie.release}</small>
              </span>
            </button>
          ))}
            <div className="updates-carousel-center" aria-hidden="true">
              <span>Trending</span>
            <strong>&apos;26</strong>
            <small>Tap a title to expand</small>
          </div>
          <div className="updates-carousel-orbit" aria-hidden="true" />
        </div>
        <aside className="updates-carousel-panel" key={selectedMovie.id} aria-live="polite">
          <div className="updates-carousel-panel-kicker">Selected screening / 0{visibleMovies.indexOf(selectedMovie) + 1}</div>
          <div className="updates-carousel-panel-poster">
            <img src={selectedMovie.backdrop} alt="" aria-hidden="true" />
            <div />
            <span>{selectedMovie.status === "UPCOMING" ? "Upcoming release" : "Now playing"}</span>
          </div>
          <h2>{selectedMovie.title}</h2>
          <p className="updates-carousel-panel-copy">{selectedMovie.synopsis}</p>
          <div className="updates-carousel-facts">
            <div>
              <span>Production</span>
              <strong>{selectedMovie.production ?? selectedMovie.meta}</strong>
            </div>
            <div>
              <span>Release / rating</span>
              <strong>{selectedMovie.release} · {selectedMovie.rating === "—" ? "NR" : `★ ${selectedMovie.rating}`}</strong>
            </div>
            <div>
              <span><Clock3 /> Runtime</span>
              <strong>{selectedMovie.runtime ? `${selectedMovie.runtime} min` : selectedMovie.meta}</strong>
            </div>
          </div>
          <div className="updates-carousel-actors">
            <span><Users /> Top actors</span>
            <div>{selectedMovie.actors?.length ? selectedMovie.actors.map((actor) => <strong key={actor}>{actor}</strong>) : <strong>Cast details unavailable</strong>}</div>
          </div>
          <button type="button" onClick={() => onOpen(selectedMovie)} className="updates-carousel-open">
            Open film details <ArrowUpRight />
          </button>
        </aside>
      </div>
    </section>
  );
}

export default UpdatesCarousel;
