import Link from "next/link";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReelscapeLogo({ className, subtitle, interactive = true }: { className?: string; subtitle?: string; interactive?: boolean }) {
  const content = (
    <>
      <span className="reelroom-logo-mark" aria-hidden="true">
        <Film className="size-3.5 -rotate-45" />
      </span>
      <span className="reelroom-logo-copy">
        <strong>reel<span>scape</span></strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </>
  );

  if (!interactive) return <span className={cn("reelroom-logo", className)}>{content}</span>;
  return <Link href="/" className={cn("reelroom-logo", className)} aria-label="Reelscape home">{content}</Link>;
}
