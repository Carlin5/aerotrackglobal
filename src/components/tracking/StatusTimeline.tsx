"use client";

import { useMemo } from "react";
import {
  Plane,
  Package,
  MapPin,
  Check,
  Anchor,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Code =
  | "created"
  | "boarding"
  | "departed"
  | "in_air"
  | "waypoint_landed"
  | "waypoint_departed"
  | "arrived"
  | "delivered"
  | "emergency";

const ICONS: Record<Code, React.ComponentType<{ className?: string }>> = {
  created: Package,
  boarding: Package,
  departed: Plane,
  in_air: Plane,
  waypoint_landed: Anchor,
  waypoint_departed: Plane,
  arrived: MapPin,
  delivered: Check,
  emergency: AlertTriangle,
};

export function StatusTimeline({
  events,
  now,
}: {
  events: { at: string; code: string; label: string; detail: string; location?: string }[];
  now: Date;
}) {
  const items = useMemo(
    () =>
      events.map((e) => {
        const at = new Date(e.at);
        const isPast = at.getTime() <= now.getTime();
        return { ...e, at, isPast };
      }),
    [events, now],
  );

  return (
    <ol className="relative ml-3 space-y-5 border-l border-line pl-6">
      {items.map((e, idx) => {
        const Icon = ICONS[(e.code as Code) ?? "created"] ?? Clock;
        const last = idx === items.length - 1;
        const isEmergency = e.code === "emergency";
        return (
          <li key={idx} className="relative">
            <span
              className={cn(
                "absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full border",
                isEmergency
                  ? "border-signal-red/60 bg-signal-red/15 text-signal-red shadow-[0_0_18px_rgba(255,82,82,0.4)]"
                  : e.isPast
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-400 shadow-glow"
                    : "border-line bg-bg-1 text-ink-3",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isEmergency
                  ? "border-signal-red/40 bg-signal-red/[0.06]"
                  : e.isPast
                    ? "border-cyan-500/20 bg-cyan-500/[0.04]"
                    : "border-line bg-bg-1/40",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-ink-0">{e.label}</div>
                <time
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-3"
                  dateTime={e.at.toISOString()}
                  suppressHydrationWarning
                >
                  {e.at.toISOString().slice(0, 16).replace("T", " ")}Z
                </time>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{e.detail}</p>
              {e.location ? (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-ink-3">
                  <MapPin className="h-3 w-3" /> {e.location}
                </div>
              ) : null}
            </div>
            {!last ? null : null}
          </li>
        );
      })}
    </ol>
  );
}
