"use client";

import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";

const FILMS: WorksWheelItem[] = [
  { title: "The Last Light", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85", href: "#m1" },
  { title: "Neon Aftercare", image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85", href: "#m2" },
  { title: "Rooms With Weather", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85", href: "#m3" },
  { title: "Static Bloom", image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85", href: "#m4" },
  { title: "Oceans Between Us", image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=700&q=85", href: "#m5" },
  { title: "The Quiet Frequency", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85", href: "#m6" },
];

export default function WorksWheelDemo() {
  return <div className="h-screen w-full bg-canvas text-ink"><WorksWheel items={FILMS} label="Films '26" action="Open" /></div>;
}
