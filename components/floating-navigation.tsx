"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/notification-center";

const items = [
  ["home", "Home", "/"],
  ["songs", "Songs", "/#songs"],
  ["tickets", "Tickets", "/#tickets"],
  ["updates", "Update", "/#updates"],
  ["notifications", "Notification", null],
  ["profile", "Profile", "/#profile"],
] as const;

export function FloatingNavigation() {
  const pathname = usePathname();
  const [activePage, setActivePage] = useState("home");

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

  if (pathname !== "/") return null;

  return (
    <nav className="reelroom-floating-nav" aria-label="Primary navigation">
      {items.map(([id, label, href]) => {
        if (!href) {
          return <NotificationCenter key={id} />;
        }
        return (
          <a key={id} href={href} data-active={id === activePage}>
            {label}
            <span className="reelroom-floating-nav-dot" aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
