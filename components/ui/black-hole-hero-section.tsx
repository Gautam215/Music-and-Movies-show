"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BlackHoleHeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Background artwork. Defaults to the supplied public black-hole image. */
  imageSrc?: string;
  /** Horizontal crop position used to keep embedded artwork copy outside the frame. */
  imagePosition?: string;
  /** Background zoom used to crop the source image without adding an overlay. */
  imageScale?: number;
  distance?: number;
  elevation?: number;
  azimuth?: number;
  orbitSpeed?: number;
  roll?: number;
  fov?: number;
  diskInner?: number;
  diskOuter?: number;
  diskThickness?: number;
  diskDensity?: number;
  brightness?: number;
  spinSpeed?: number;
  grain?: number;
  doppler?: number;
  hotColor?: string;
  midColor?: string;
  coolColor?: string;
  starBrightness?: number;
  glow?: number;
  exposure?: number;
  vignette?: number;
  steps?: number;
  resolution?: number;
  maxDpr?: number;
  focus?: [number, number];
  scrim?: "none" | "left" | "right" | "top" | "bottom";
  scrimStrength?: number;
  paused?: boolean;
}

/**
 * Black-hole hero background with a dark left scrim for application copy.
 *
 * The source artwork contains editorial copy on the left. The default crop
 * keeps most of that copy out of frame so the application can place its own
 * content over the quieter side of the image.
 */
export function BlackHoleHeroSection({
  imageSrc = "/black-hole.jpg",
  imagePosition = "70% 50%",
  imageScale = 1,
  scrim = "left",
  scrimStrength = 1,
  className,
  children,
  ...props
}: BlackHoleHeroSectionProps) {
  return (
    <div
      aria-label="Black hole artwork"
      className={cn("relative isolate min-h-[24rem] overflow-hidden bg-black", className)}
      {...props}
    >
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full max-w-none object-cover"
        style={{ objectPosition: imagePosition, transform: `scale(${imageScale})` }}
      />
      {scrim !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,14,1)_0%,rgba(5,8,14,.99)_48%,rgba(5,8,14,.78)_62%,rgba(5,8,14,.18)_78%,rgba(5,8,14,0)_92%),linear-gradient(0deg,rgba(5,8,14,.62),transparent_48%)]"
          style={{ opacity: scrimStrength }}
        />
      )}
      {children}
    </div>
  );
}

export default BlackHoleHeroSection;
