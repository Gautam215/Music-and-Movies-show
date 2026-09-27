import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ReelscapeLogoProps = {
  className?: string;
  interactive?: boolean;
};

export function ReelscapeLogo({ className, interactive = true }: ReelscapeLogoProps) {
  const content = (
    <Image
      className="reelroom-logo-art"
      src="/reelscape-logo.png"
      width={676}
      height={420}
      priority
      alt="REALSCAPE Movies & Music"
    />
  );

  if (!interactive) return <span className={cn("reelroom-logo", className)}>{content}</span>;
  return <Link href="/" className={cn("reelroom-logo", className)} aria-label="Reelscape home">{content}</Link>;
}
