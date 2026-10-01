import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.crafterui.com" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://sdk.scdn.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://sdk.scdn.co https://*.spotify.com https://www.youtube-nocookie.com https://www.youtube.com; img-src 'self' data: blob: https://images.unsplash.com https://image.tmdb.org https://i.scdn.co https://m.media-amazon.com https://www.crafterui.com; connect-src 'self' https://api.spotify.com https://accounts.spotify.com wss://*.spotify.com; media-src 'self' blob: https://*.spotify.com; worker-src 'self' blob:",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
