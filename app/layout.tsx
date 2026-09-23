import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reelscape — find your next screening",
  description: "A cinematic movie discovery, soundtrack, and ticketing workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="grain">{children}</body></html>;
}
