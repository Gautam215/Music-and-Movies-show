import type { Metadata, Viewport } from "next";
import { MinimalCursor } from "@/components/crosshair-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reelscape — find your next screening",
  description: "A cinematic movie discovery, soundtrack, and ticketing workspace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="grain"><MinimalCursor />{children}</body></html>;
}
