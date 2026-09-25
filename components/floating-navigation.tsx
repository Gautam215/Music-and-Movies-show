"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  ["home", "Home", "/"],
  ["songs", "Songs", "/#songs"],
  ["tickets", "Tickets", "/#tickets"],
  ["profile", "Profile", "/#profile"],
] as const;

export function FloatingNavigation() {
  const pathname = usePathname();
  const [activePage, setActivePage] = useState("home");

  useEffect(() => {
    const syncPage = () => setActivePage(window.location.hash.slice(1) || "home");
    syncPage();
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("popstate", syncPage);
    return () => {
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener("popstate", syncPage);
    };
  }, []);

  if (pathname !== "/") return null;

  const visibleItems = items.filter(([id]) => id !== activePage);

  return (
    <nav className="reelroom-floating-nav" aria-label="Primary navigation">
      {visibleItems.map(([id, label, href]) => {
        return (
          <a key={id} href={href}>
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}