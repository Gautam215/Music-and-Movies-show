"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
        if (!href) {
          return (
            <button
              key={id}
              type="button"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              {label}
            </button>
          );
        }
        return <a key={id} href={href}>{label}</a>;
      })}
      {notificationsOpen ? (
        <div className="reelroom-floating-notifications" role="status">
          <strong>Notification desk</strong>
          <span>2 release notes · 1 ticket reminder</span>
        </div>
      ) : null}
    </nav>
  );
}