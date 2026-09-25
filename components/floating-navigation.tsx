"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, House, Music2, Sparkles, Ticket, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";

const items = [
  { id: "home", label: "Home", href: "/", icon: House },
  { id: "songs", label: "Songs", href: "/#songs", icon: Music2 },
  { id: "tickets", label: "Tickets", href: "/#tickets", icon: Ticket },
  { id: "updates", label: "Update", href: "/#updates", icon: Sparkles },
  { id: "notifications", label: "Notification", href: null, icon: Bell },
  { id: "profile", label: "Profile", href: "/#profile", icon: UserRound },
] satisfies { id: string; label: string; href: string | null; icon: LucideIcon }[];

type ContrastMode = "light" | "dark";

function getContrastMode(): ContrastMode {
  const backgroundElement = document.querySelector<HTMLElement>(".profile-experience") || document.body;
  const background = getComputedStyle(backgroundElement).backgroundColor;
  const channels = background.match(/[\d.]+/g)?.map(Number) || [];
  if (channels.length < 3 || channels[3] === 0) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  const [red, green, blue] = channels;
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
  return luminance > 0.38 ? "light" : "dark";
}

export function FloatingNavigation() {
  const pathname = usePathname();
  const [activePage, setActivePage] = useState("home");
  const [contrastMode, setContrastMode] = useState<ContrastMode>("dark");
  const [activePill, setActivePill] = useState({ left: 0, width: 0 });
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncPage = () => {
      setActivePage(window.location.hash.slice(1) || "home");
    };
    syncPage();
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("popstate", syncPage);
    return () => {
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener("popstate", syncPage);
    };
  }, []);

  useEffect(() => {
    const syncContrast = () => {
      window.requestAnimationFrame(() => setContrastMode(getContrastMode()));
    };
    syncContrast();
    const delayedSync = window.setTimeout(syncContrast, 80);
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", syncContrast);
    window.addEventListener("hashchange", syncContrast);
    window.addEventListener("resize", syncContrast);
    const observer = new MutationObserver(syncContrast);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      window.clearTimeout(delayedSync);
      media.removeEventListener("change", syncContrast);
      window.removeEventListener("hashchange", syncContrast);
      window.removeEventListener("resize", syncContrast);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const activeLink = linkRefs.current[activePage];
    const nav = navRef.current;
    if (!activeLink || !nav) return;
    const measure = () => setActivePill({ left: activeLink.offsetLeft, width: activeLink.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(activeLink);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activePage]);

  if (pathname !== "/") return null;

  return (
    <nav ref={navRef} className="reelroom-floating-nav" data-contrast={contrastMode} aria-label="Primary navigation">
      <span
        className="reelroom-floating-nav-active-pill"
        aria-hidden="true"
        style={{ left: activePill.left, width: activePill.width }}
      />
      {items.map(({ id, label, href, icon: Icon }) => {
        if (!href) {
          return <NotificationCenter key={id} />;
        }
        return (
          <a
            key={id}
            ref={(node) => { linkRefs.current[id] = node; }}
            href={href}
            data-active={id === activePage}
          >
            <Icon className="reelroom-floating-nav-icon" aria-hidden="true" />
            <span>{label}</span>
            <span className="reelroom-floating-nav-dot" aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}