import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/40">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-cyan-400"
          fill="currentColor"
          aria-hidden
        >
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1L15 21v-1.5L13 18v-4.5L21 16z" />
        </svg>
        <span className="absolute inset-0 rounded-md animate-glow" aria-hidden />
      </span>
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold tracking-[0.18em] text-ink-0">
          AEROTRACK
        </div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-cyan-400">
          PRO · GLOBAL CARGO
        </div>
      </div>
    </div>
  );
}
