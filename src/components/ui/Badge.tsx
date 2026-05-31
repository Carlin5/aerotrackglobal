import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "cyan"
  | "orange"
  | "green"
  | "amber"
  | "red"
  | "violet";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-ink-1 border-line",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  orange: "bg-signal-orange/10 text-signal-orange border-signal-orange/30",
  green: "bg-signal-green/10 text-signal-green border-signal-green/30",
  amber: "bg-signal-amber/10 text-signal-amber border-signal-amber/30",
  red: "bg-signal-red/10 text-signal-red border-signal-red/30",
  violet: "bg-signal-violet/10 text-signal-violet border-signal-violet/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
  pulse = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono tracking-wider uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              tone === "cyan" && "bg-cyan-400",
              tone === "green" && "bg-signal-green",
              tone === "orange" && "bg-signal-orange",
              tone === "amber" && "bg-signal-amber",
              tone === "red" && "bg-signal-red",
              tone === "violet" && "bg-signal-violet",
              tone === "neutral" && "bg-ink-2",
            )}
          />
          {pulse ? (
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping2",
                tone === "cyan" && "bg-cyan-400/70",
                tone === "green" && "bg-signal-green/70",
                tone === "orange" && "bg-signal-orange/70",
                tone === "amber" && "bg-signal-amber/70",
                tone === "red" && "bg-signal-red/70",
                tone === "violet" && "bg-signal-violet/70",
                tone === "neutral" && "bg-ink-2/70",
              )}
            />
          ) : null}
        </span>
      ) : null}
      {children}
    </span>
  );
}
