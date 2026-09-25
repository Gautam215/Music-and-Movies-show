"use client";

import { useEffect } from "react";

export function SpotifySessionBridge() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "reelroom-spotify-auth" || event.data.status !== "connected") return;

      window.setTimeout(() => window.location.reload(), 80);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}