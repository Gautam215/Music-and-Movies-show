import Link from "next/link";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReelscapeLogo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <Link href="/" className={cn("reelroom-logo", className)} aria-label="Reelscape home">
      <span className="reelroom-logo-mark" aria-hidden="true">
        <Film className="size-3.5 -rotate-45" />
      </span>
      <span className="reelroom-logo-copy">
        <strong>reel<span>scape</span></strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </Link>
  );
}
