"use client";

import { useEffect } from "react";

export function SpotifySessionBridge() {
  useEffect(() => {
    const refreshAfterConnection = (data: MessageEvent["data"]) => {
      if (data?.type !== "reelroom-spotify-auth" || data.status !== "connected") return;

      window.setTimeout(() => window.location.reload(), 80);
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      refreshAfterConnection(event.data);
    };
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("reelroom-spotify-auth") : null;
    const handleChannelMessage = (event: MessageEvent) => refreshAfterConnection(event.data);

    window.addEventListener("message", handleMessage);
    channel?.addEventListener("message", handleChannelMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      channel?.removeEventListener("message", handleChannelMessage);
      channel?.close();
    };
  }, []);

  return null;
}
