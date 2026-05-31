import { cn } from "@/lib/utils";

interface Props {
  /** Public photo URL (CDN). */
  image: string;
  /** Image opacity 0..1 (default 0.22). */
  opacity?: number;
  /** Where the gradient should be heaviest. */
  variant?: "page" | "panel";
  /** Show the grid overlay over the photo. Defaults to true. */
  grid?: boolean;
  className?: string;
}

/**
 * Decorative full-bleed photo background with a dark gradient overlay so it
 * never competes with foreground content. Drop it as a sibling of any section
 * (or set the parent to `relative isolate`).
 */
export function AmbientBackground({
  image,
  opacity = 0.22,
  variant = "page",
  grid = true,
  className,
}: Props) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-30 bg-cover bg-center",
          className,
        )}
        style={{ backgroundImage: `url("${image}")`, opacity }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-20",
          variant === "page"
            ? "bg-gradient-to-b from-bg-0/85 via-bg-0/80 to-bg-0"
            : "bg-gradient-to-br from-bg-0/85 via-bg-0/75 to-bg-0/95",
        )}
      />
      {grid ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30"
        />
      ) : null}
      {/* Subtle accent glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.06] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-[360px] w-[360px] rounded-full bg-signal-orange/[0.05] blur-3xl"
      />
    </>
  );
}
