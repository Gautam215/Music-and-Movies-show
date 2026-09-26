"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Film,
  Flame,
  ListMusic,
  Music2,
  Play,
  SlidersHorizontal,
  Ticket,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationGroupData } from "@/lib/notification-recommendations";

type ProfileSession = { name: string; email: string };

type NotificationItem = {
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

type NotificationGroup = {
  id: string;
  label: string;
  meta: string;
  accent: string;
  icon: LucideIcon;
  items: NotificationItem[];
};

type SwipeState = { id: string; pointerId: number; startX: number; deltaX: number } | null;

const READ_KEY = "reelroom.notification-read.v1";
const ARCHIVED_KEY = "reelroom.notification-archived.v1";
const REMINDERS_KEY = "reelroom.notification-reminders.v1";
const PREFERENCES_KEY = "reelroom.notification-preferences.v1";
const PROFILE_SESSION_KEY = "reelroom.profile.session";
const dismissTransientsEvent = "reelroom-dismiss-transients";

const artwork = {
  neon: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=160&q=82",
  light: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=160&q=82",
  bloom: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=160&q=82",
  cinema: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=160&q=82",
};

const guestGroups: NotificationGroup[] = [
  {
    id: "guest-trending",
    label: "Trending near you",
    meta: "A first look at your next signal",
    accent: "#ff9f0a",
    icon: Flame,
    items: [
      {
        id: "guest-neon-aftercare",
        eyebrow: "Trailer preview",
        title: "Neon Aftercare is glowing tonight",
        detail: "A tender sci-fi drama with a late-night pulse. Watch the two-minute trailer before it leaves the marquee.",
        age: "12 min ago",
        artwork: artwork.neon,
        actionLabel: "Watch trailer",
        actionHref: "https://www.youtube.com/results?search_query=Neon+Aftercare+trailer",
        priority: "high",
      },
      {
        id: "guest-static-bloom",
        eyebrow: "Curious about",
        title: "Static Bloom is finding its people",
        detail: "A quiet documentary about the songs we keep after the credits. See why it is moving through the city.",
        age: "34 min ago",
        artwork: artwork.bloom,
        actionLabel: "Open the reel",
        actionHref: "#updates",
        priority: "medium",
      },
    ],
  },
  {
    id: "guest-soundtrack",
    label: "Soundtrack desk",
    meta: "A small sample from Hehe",
    accent: "#bf9aff",
    icon: Music2,
    items: [
      {
        id: "guest-soundtrack-preview",
        eyebrow: "Spotify preview",
        title: "The Last Light has a song for the walk home",
        detail: "A soft, synth-lit cue from Mara Vale is waiting for your next scene.",
        age: "1 hr ago",
        artwork: artwork.light,
        actionLabel: "Open in Spotify",
        actionHref: "https://open.spotify.com/search/The%20Last%20Light%20Mara%20Vale",
        priority: "low",
      },
    ],
  },
  {
    id: "guest-ticket-desk",
    label: "Ticket desk",
    meta: "One reason to make a plan",
    accent: "#64d2ff",
    icon: Ticket,
    items: [
      {
        id: "guest-last-light",
        eyebrow: "Tonight · limited seats",
        title: "The Last Light is still playing at 8:40",
        detail: "The late show has the room for a good reset. See showtimes before the last row goes.",
        age: "Today",
        artwork: artwork.cinema,
        actionLabel: "See showtimes",
        actionHref: "#tickets",
        priority: "high",
      },
    ],
  },
];

function memberGroups(name: string): NotificationGroup[] {
  const firstName = name.split(" ")[0] || "there";
  return [
    {
      id: "member-daily",
      label: `Good morning, ${firstName}`,
      meta: "Your daily signal",
      accent: "#ff9f0a",
      icon: Film,
      items: [
        {
          id: "member-last-light",
          eyebrow: "Saved screening · soon",
          title: "The Last Light starts in 45 minutes",
          detail: "Your saved seat plan is ready. The room is waiting when you are.",
          age: "Today · 7:55 PM",
          artwork: artwork.light,
          actionLabel: "Open tickets",
          actionHref: "#tickets",
          priority: "high",
        },
        {
          id: "member-neon-aftercare",
          eyebrow: "New release",
          title: "Neon Aftercare just entered your queue",
          detail: "Because you saved The Last Light and kept the night open for something luminous.",
          age: "12 min ago",
          artwork: artwork.neon,
          actionLabel: "Watch trailer",
          actionHref: "https://www.youtube.com/results?search_query=Neon+Aftercare+trailer",
          priority: "medium",
        },
      ],
    },
    {
      id: "member-soundtrack",
      label: "Your soundtrack",
      meta: "Hehe / matched to your shelf",
      accent: "#bf9aff",
      icon: ListMusic,
      items: [
        {
          id: "member-playlist-refresh",
          eyebrow: "Spotify update",
          title: "Your scene playlist was refreshed",
          detail: "Two new tracks from Mara Vale and Eli North now sit beside your saved films.",
          age: "34 min ago",
          artwork: artwork.bloom,
          actionLabel: "Play on Spotify",
          actionHref: "https://open.spotify.com/search/Reelscape%20scene%20playlist",
          priority: "medium",
        },
      ],
    },
    {
      id: "member-drops",
      label: "Upcoming drops",
      meta: "Save the date before it becomes a memory",
      accent: "#64d2ff",
      icon: CalendarDays,
      items: [
        {
          id: "member-rooms-weather",
          eyebrow: "Friday · 18 October",
          title: "Rooms With Weather lands this week",
          detail: "A new screening drop is queued for your calendar. Keep the evening soft and unclaimed.",
          age: "2 days away",
          artwork: artwork.cinema,
          actionLabel: "Remind me",
          actionType: "reminder",
          priority: "low",
        },
      ],
    },
  ];
}

function readProfileSession(): ProfileSession | null {
  try {
    const stored = window.sessionStorage.getItem(PROFILE_SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<ProfileSession>;
    return parsed.name && parsed.email ? { name: parsed.name, email: parsed.email } : null;
  } catch {
    return null;
  }
}

function readStringList(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

const remoteIcons: Record<NotificationGroupData["icon"], LucideIcon> = {
  film: Film,
  flame: Flame,
  music: Music2,
  ticket: Ticket,
  calendar: CalendarDays,
};

function mapRemoteGroups(groups: NotificationGroupData[]): NotificationGroup[] {
  return groups.map((group) => ({ ...group, icon: remoteIcons[group.icon] }));
}

export function NotificationCenter() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimerRef = useRef<number | null>(null);
  const swipeRef = useRef<SwipeState>(null);
  const swipeTriggeredRef = useRef(false);
  const [profileSession, setProfileSession] = useState<ProfileSession | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>(["Film drops", "Soundtracks", "Ticket reminders"]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [swipe, setSwipe] = useState<SwipeState>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const [remoteGroups, setRemoteGroups] = useState<NotificationGroup[] | null>(null);

  const groups = remoteGroups ?? (profileSession ? memberGroups(profileSession.name) : guestGroups);
  const allItems = groups.flatMap((group) => group.items);
  const visibleItems = allItems.filter((item) => !archivedIds.includes(item.id));
  const unreadCount = visibleItems.filter((item) => !readIds.includes(item.id)).length;
  const panelOpen = mounted && !closing;

  useEffect(() => {
    const syncSession = () => setProfileSession(readProfileSession());
    syncSession();
    window.addEventListener("reelroom-profile-session", syncSession);
    return () => window.removeEventListener("reelroom-profile-session", syncSession);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const result = (await response.json()) as { groups?: NotificationGroupData[] };
        const nextGroups = Array.isArray(result.groups) ? mapRemoteGroups(result.groups) : [];
        if (!cancelled && nextGroups.some((group) => group.items.length)) setRemoteGroups(nextGroups);
      } catch {
        // Keep the curated client feed available when the server feed is offline.
      }
    };
    void loadNotifications();
    window.addEventListener("reelroom-notifications-updated", loadNotifications);
    return () => {
      cancelled = true;
      window.removeEventListener("reelroom-notifications-updated", loadNotifications);
    };
  }, [profileSession]);

  useEffect(() => {
    setReadIds(readStringList(READ_KEY));
    setArchivedIds(readStringList(ARCHIVED_KEY));
    setReminderIds(readStringList(REMINDERS_KEY));
    const savedPreferences = readStringList(PREFERENCES_KEY);
    if (savedPreferences.length) setPreferences(savedPreferences);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify(readIds));
      window.localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archivedIds));
      window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminderIds));
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // The panel remains usable when browser storage is blocked.
    }
  }, [archivedIds, preferences, readIds, reminderIds, storageReady]);

  useEffect(() => {
    if (!panelOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const firstUnreadIndex = visibleItems.findIndex((item) => !readIds.includes(item.id));
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

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
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

  useEffect(() => {
    const dismissPanel = () => closePanel(false);
    window.addEventListener(dismissTransientsEvent, dismissPanel);
    return () => window.removeEventListener(dismissTransientsEvent, dismissPanel);
  }, [mounted, closing]);

  const openPanel = () => {
    setProfileSession(readProfileSession());
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (trigger && !window.matchMedia("(max-width: 640px)").matches) {
      setPanelPosition({
        top: trigger.bottom + 12,
        left: Math.max(12, Math.min(window.innerWidth - 392, trigger.right - 380)),
      });
    }
    setMounted(true);
    setClosing(false);
    setAnnouncement(unreadCount ? `Notifications opened. ${unreadCount} unread update${unreadCount === 1 ? "" : "s"}.` : "Notifications opened. You are all caught up.");
  };

  const markRead = (ids: string[]) => {
    setReadIds((current) => Array.from(new Set([...current, ...ids])));
  };

  const archive = (id: string) => {
    setArchivedIds((current) => Array.from(new Set([...current, id])));
    setExpandedIds((current) => current.filter((itemId) => itemId !== id));
    setAnnouncement("Notification archived.");
  };

  const toggleReminder = (id: string) => {
    setReminderIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
    setAnnouncement(reminderIds.includes(id) ? "Reminder removed." : "Reminder set for this drop.");
  };

  const handleItemAction = (item: NotificationItem) => {
    markRead([item.id]);
    if (item.actionType === "reminder") {
      toggleReminder(item.id);
      return;
    }
    if (item.actionHref?.startsWith("#")) {
      closePanel(false);
      window.location.hash = item.actionHref.slice(1);
      return;
    }
    if (item.actionHref) window.open(item.actionHref, "_blank", "noopener,noreferrer");
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
      focusItem(activeIndex <= 0 ? visibleItems.length - 1 : activeIndex - 1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusItem(event.key === "Home" ? 0 : visibleItems.length - 1);
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled), a") ?? []);
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

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if ((event.target as HTMLElement).closest(".notification-center-item-actions")) return;
    const nextSwipe = { id, pointerId: event.pointerId, startX: event.clientX, deltaX: 0 };
    swipeRef.current = nextSwipe;
    setSwipe(nextSwipe);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentSwipe = swipeRef.current;
    if (!currentSwipe || currentSwipe.pointerId !== event.pointerId) return;
    const nextSwipe = { ...currentSwipe, deltaX: event.clientX - currentSwipe.startX };
    swipeRef.current = nextSwipe;
    setSwipe(nextSwipe);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const currentSwipe = swipeRef.current;
    if (!currentSwipe || currentSwipe.pointerId !== event.pointerId) return;
    if (currentSwipe.deltaX <= -90) {
      swipeTriggeredRef.current = true;
      archive(currentSwipe.id);
    } else if (currentSwipe.deltaX >= 90) {
      swipeTriggeredRef.current = true;
      markRead([currentSwipe.id]);
    }
    swipeRef.current = null;
    setSwipe(null);
  };

  const goToProfile = () => {
    closePanel(false);
    window.location.hash = "profile";
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
        onClick={() => {
          const wasOpen = panelOpen;
          window.dispatchEvent(new Event(dismissTransientsEvent));
          if (wasOpen) closePanel();
          else openPanel();
        }}
      >
        <Bell className="notification-center-trigger-icon" aria-hidden="true" />
        <span>Notification</span>
        {unreadCount > 0 ? <span className="notification-center-unread-dot" aria-hidden="true" /> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>

      {mounted && typeof document !== "undefined" ? createPortal((
        <div className="notification-center-layer" style={{ "--notification-top": `${panelPosition.top}px`, "--notification-left": `${panelPosition.left}px` } as CSSProperties}>
          <button type="button" className="notification-center-backdrop" aria-label="Close notifications" tabIndex={-1} onClick={() => closePanel(false)} />
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
                <p className="notification-center-kicker">{profileSession ? "Personal signal" : "Guest preview"}</p>
                <h2 id="reelroom-notification-title">{profileSession ? "Your notification desk" : "A little something"}</h2>
                <p className="notification-center-subtitle">
                  {profileSession ? `${unreadCount || "No"} new signal${unreadCount === 1 ? "" : "s"} for ${profileSession.name.split(" ")[0]}.` : "A calm preview of what Reelscape keeps an eye on."}
                </p>
              </div>
              <div className="notification-center-heading-actions">
                <button type="button" className="notification-center-mark-all" onClick={() => markRead(visibleItems.map((item) => item.id))} disabled={unreadCount === 0}>
                  <Check aria-hidden="true" /> Mark all read
                </button>
                <button type="button" className="notification-center-close" aria-label="Close notifications" onClick={() => closePanel()}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>

            {!profileSession ? (
              <div className="notification-center-guest-cta">
                <div><strong>Make it yours.</strong><span>Save films, get the right reminders, and let the soundtrack follow you.</span></div>
                <button type="button" onClick={goToProfile}>Join Reelscape <ChevronRight aria-hidden="true" /></button>
              </div>
            ) : null}

            <div className="notification-center-scroll" role="list" aria-label="Notification groups">
              {visibleItems.length ? groups.map((group) => {
                const items = group.items.filter((item) => !archivedIds.includes(item.id));
                if (!items.length) return null;
                const Icon = group.icon;
                const groupUnread = items.filter((item) => !readIds.includes(item.id)).length;
                return (
                  <section key={group.id} className="notification-center-group" style={{ "--notification-accent": group.accent } as CSSProperties} aria-labelledby={`${group.id}-title`}>
                    <div className="notification-center-group-heading">
                      <div className="notification-center-source-icon"><Icon aria-hidden="true" /></div>
                      <div><h3 id={`${group.id}-title`}>{group.label}</h3><p>{group.meta}</p></div>
                      <span className="notification-center-group-count" aria-label={`${groupUnread} unread in ${group.label}`}>{groupUnread || items.length}</span>
                    </div>
                    <div className="notification-center-items">
                      {items.map((item) => {
                        const isRead = readIds.includes(item.id);
                        const isExpanded = expandedIds.includes(item.id);
                        const isReminderSet = reminderIds.includes(item.id);
                        const itemIndex = visibleItems.findIndex((candidate) => candidate.id === item.id);
                        const currentSwipe = swipe?.id === item.id ? swipe.deltaX : 0;
                        return (
                          <article
                            key={item.id}
                            className={`notification-center-item ${swipe?.id === item.id ? "notification-center-item-swiping" : ""}`}
                            data-unread={!isRead}
                            data-priority={item.priority || "low"}
                            role="listitem"
                            style={{ transform: currentSwipe ? `translateX(${currentSwipe}px)` : undefined }}
                            onPointerDown={(event) => handlePointerDown(event, item.id)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={() => { swipeRef.current = null; setSwipe(null); }}
                          >
                            <button
                              ref={(node) => { itemRefs.current[itemIndex] = node; }}
                              type="button"
                              className="notification-center-item-main"
                              onClick={() => {
                                if (swipeTriggeredRef.current) {
                                  swipeTriggeredRef.current = false;
                                  return;
                                }
                                markRead([item.id]);
                                setExpandedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
                              }}
                              aria-expanded={isExpanded}
                              aria-label={`${item.title}${isRead ? ", read" : ", unread"}`}
                            >
                              <img className="notification-center-item-artwork" src={item.artwork} alt="" />
                              <span className="notification-center-item-status" aria-hidden="true" />
                              <span className="notification-center-item-copy">
                                <span className="notification-center-item-eyebrow">{item.eyebrow}</span>
                                <strong>{item.title}</strong>
                                <time><Clock3 aria-hidden="true" /> {item.age}</time>
                              </span>
                              <ChevronDown className={`notification-center-item-chevron ${isExpanded ? "notification-center-item-chevron-open" : ""}`} aria-hidden="true" />
                            </button>
                            <div className={`notification-center-item-reveal ${isExpanded ? "notification-center-item-reveal-open" : ""}`} aria-hidden={!isExpanded}>
                              <div className="notification-center-item-reveal-inner">
                                <p>{item.detail}</p>
                                <div className="notification-center-item-actions">
                                  <button type="button" className="notification-center-item-primary" onClick={() => handleItemAction(item)}>
                                    {item.actionType === "reminder" ? <CalendarDays aria-hidden="true" /> : item.actionHref?.includes("spotify") ? <Music2 aria-hidden="true" /> : <Play aria-hidden="true" />}
                                    {item.actionType === "reminder" && isReminderSet ? "Reminder set" : item.actionLabel}
                                  </button>
                                  <button type="button" className="notification-center-item-action" onClick={() => markRead([item.id])} disabled={isRead}>{isRead ? "Read" : "Mark as read"}</button>
                                  <button type="button" className="notification-center-item-action notification-center-item-archive" onClick={() => archive(item.id)}><Archive aria-hidden="true" /> Archive</button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              }) : (
                <div className="notification-center-empty"><Check aria-hidden="true" /><strong>Nothing waiting here.</strong><span>Archived updates will stay out of your way.</span></div>
              )}
            </div>

            <div className="notification-center-preferences">
              <button type="button" className="notification-center-preferences-trigger" onClick={() => setPreferencesOpen((open) => !open)} aria-expanded={preferencesOpen}>
                <SlidersHorizontal aria-hidden="true" /> Tune preferences <ChevronDown className={preferencesOpen ? "notification-center-preferences-chevron-open" : ""} aria-hidden="true" />
              </button>
              <div className={`notification-center-preferences-panel ${preferencesOpen ? "notification-center-preferences-panel-open" : ""}`} aria-hidden={!preferencesOpen}>
                <p>Choose the signals you want to keep close.</p>
                <div>
                  {["Film drops", "Soundtracks", "Ticket reminders"].map((preference) => {
                    const enabled = preferences.includes(preference);
                    return <button key={preference} type="button" className={enabled ? "notification-preference-active" : ""} onClick={() => setPreferences((current) => enabled ? current.filter((value) => value !== preference) : [...current, preference])}><span aria-hidden="true">{enabled ? "✓" : ""}</span>{preference}</button>;
                  })}
                </div>
              </div>
            </div>
            <p className="notification-center-footer">{profileSession ? "Personalized to your saved films, songs, and screenings." : "Swipe right to read · swipe left to archive"}</p>
          </section>
        </div>
      ), document.body) : null}
    </div>
  );
}
