"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Bell, Check, ChevronRight, Clock3, Film, Music2, Ticket, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  age: string;
};

type NotificationGroup = {
  id: string;
  label: string;
  meta: string;
  accent: string;
  icon: LucideIcon;
  items: NotificationItem[];
};

const STORAGE_KEY = "reelroom.notification-read.v1";

const notificationGroups: NotificationGroup[] = [
  {
    id: "film-releases",
    label: "Film releases",
    meta: "Reelscape daily feed",
    accent: "#ff9f0a",
    icon: Film,
    items: [
      {
        id: "film-neon-aftercare",
        title: "Neon Aftercare enters the queue",
        detail: "A new sci-fi screening is ready for your next night out.",
        age: "12 min ago",
      },
      {
        id: "film-rooms-weather",
        title: "Rooms With Weather is coming soon",
        detail: "Release details and showtimes have been refreshed.",
        age: "1 hr ago",
      },
    ],
  },
  {
    id: "song-updates",
    label: "Song updates",
    meta: "Hehe / recommended",
    accent: "#bf9aff",
    icon: Music2,
    items: [
      {
        id: "song-playlist-refresh",
        title: "Your scene playlist was refreshed",
        detail: "Two new tracks are waiting in the soundtrack desk.",
        age: "34 min ago",
      },
      {
        id: "song-static-bloom",
        title: "Static Bloom has a new soundtrack pick",
        detail: "A fresh recommendation matches your documentary shelf.",
        age: "Yesterday",
      },
    ],
  },
  {
    id: "ticket-desk",
    label: "Ticket desk",
    meta: "Your saved screenings",
    accent: "#64d2ff",
    icon: Ticket,
    items: [
      {
        id: "ticket-last-light",
        title: "The Last Light starts in 45 minutes",
        detail: "Your saved seat plan is ready when you are.",
        age: "Today",
      },
    ],
  },
];

const allItems = notificationGroups.flatMap((group) => group.items);

export function NotificationCenter() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const readIdsRef = useRef<string[]>([]);
  const closeTimerRef = useRef<number | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const unreadCount = allItems.filter((item) => !readIds.includes(item.id)).length;
  const panelOpen = mounted && !closing;

  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const savedIds = saved ? (JSON.parse(saved) as unknown) : [];
      if (Array.isArray(savedIds)) {
        setReadIds(savedIds.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      // The notification center remains usable when storage is blocked or corrupted.
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
    } catch {
      // Read state remains available for the current session.
    }
  }, [readIds, storageReady]);

  useEffect(() => {
    if (!panelOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const firstUnreadIndex = allItems.findIndex((item) => !readIdsRef.current.includes(item.id));
      itemRefs.current[firstUnreadIndex >= 0 ? firstUnreadIndex : 0]?.focus();
    });
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      if (mobile) document.body.style.overflow = previousOverflow;
    };
  }, [panelOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closePanel = (restoreFocus = true) => {
    if (!mounted || closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setMounted(false);
      setClosing(false);
      if (restoreFocus) triggerRef.current?.focus();
    }, 320);
  };

  const openPanel = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setMounted(true);
    setClosing(false);
    setAnnouncement(
      unreadCount > 0
        ? `Notifications opened. ${unreadCount} unread update${unreadCount === 1 ? "" : "s"}.`
        : "Notifications opened. You are all caught up.",
    );
  };

  const togglePanel = () => {
    if (panelOpen) closePanel();
    else openPanel();
  };

  const markRead = (ids: string[]) => {
    setReadIds((current) => Array.from(new Set([...current, ...ids])));
  };

  const focusItem = (index: number) => {
    const focusable = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!focusable.length) return;
    focusable[(index + focusable.length) % focusable.length]?.focus();
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const activeIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusItem(activeIndex + 1);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusItem(activeIndex <= 0 ? allItems.length - 1 : activeIndex - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusItem(allItems.length - 1);
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="notification-center">
      <button
        ref={triggerRef}
        type="button"
        className="notification-center-trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={panelOpen}
        aria-controls="reelroom-notification-panel"
        onClick={togglePanel}
      >
        <Bell className="notification-center-trigger-icon" aria-hidden="true" />
        <span>Notification</span>
        {unreadCount > 0 ? <span className="notification-center-unread-dot" aria-hidden="true" /> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>

      {mounted ? (
        <div className="notification-center-layer">
          <button
            type="button"
            className="notification-center-backdrop"
            aria-label="Close notifications"
            tabIndex={-1}
            onClick={() => closePanel(false)}
          />
          <section
            ref={panelRef}
            id="reelroom-notification-panel"
            className={`notification-center-panel ${closing ? "notification-center-panel-closing" : "notification-center-panel-opening"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reelroom-notification-title"
            onKeyDown={handlePanelKeyDown}
          >
            <div className="notification-center-heading">
              <div>
                <p className="notification-center-kicker">Quiet updates</p>
                <h2 id="reelroom-notification-title">Notification desk</h2>
                <p className="notification-center-subtitle">
                  {unreadCount ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"} across your shelves.` : "Everything is caught up."}
                </p>
              </div>
              <div className="notification-center-heading-actions">
                <button
                  type="button"
                  className="notification-center-mark-all"
                  onClick={() => markRead(allItems.map((item) => item.id))}
                  disabled={unreadCount === 0}
                >
                  <Check aria-hidden="true" /> Mark all read
                </button>
                <button type="button" className="notification-center-close" aria-label="Close notifications" onClick={() => closePanel()}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="notification-center-scroll" role="list" aria-label="Notification groups">
              {notificationGroups.map((group) => {
                const Icon = group.icon;
                const groupUnread = group.items.filter((item) => !readIds.includes(item.id)).length;
                return (
                  <section
                    key={group.id}
                    className="notification-center-group"
                    style={{ "--notification-accent": group.accent } as CSSProperties}
                    aria-labelledby={`${group.id}-title`}
                  >
                    <div className="notification-center-group-heading">
                      <div className="notification-center-source-icon"><Icon aria-hidden="true" /></div>
                      <div>
                        <h3 id={`${group.id}-title`}>{group.label}</h3>
                        <p>{group.meta}</p>
                      </div>
                      <span className="notification-center-group-count" aria-label={`${groupUnread} unread in ${group.label}`}>
                        {groupUnread || group.items.length}
                      </span>
                    </div>
                    <div className="notification-center-items">
                      {group.items.map((item) => {
                        const isRead = readIds.includes(item.id);
                        const itemIndex = allItems.findIndex((candidate) => candidate.id === item.id);
                        return (
                          <article key={item.id} className="notification-center-item" data-unread={!isRead} role="listitem">
                            <button
                              ref={(node) => { itemRefs.current[itemIndex] = node; }}
                              type="button"
                              className="notification-center-item-main"
                              onClick={() => markRead([item.id])}
                              aria-label={`${item.title}${isRead ? ", read" : ", unread"}`}
                            >
                              <span className="notification-center-item-status" aria-hidden="true" />
                              <span className="notification-center-item-copy">
                                <strong>{item.title}</strong>
                                <span>{item.detail}</span>
                                <time><Clock3 aria-hidden="true" /> {item.age}</time>
                              </span>
                              <ChevronRight className="notification-center-item-chevron" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="notification-center-item-read"
                              onClick={() => markRead([item.id])}
                              disabled={isRead}
                            >
                              {isRead ? "Read" : "Mark as read"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="notification-center-footer">Your read state stays on this device.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
