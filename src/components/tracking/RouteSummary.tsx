"use client";

import { ArrowRight } from "lucide-react";
import { formatDistanceKm, formatDuration } from "@/lib/utils";

interface LegView {
  from: { code: string; city: string };
  to: { code: string; city: string };
  distanceKm: number;
  durationMin: number;
  departAt: string;
  arriveAt: string;
}

export function RouteSummary({
  legs,
  totalDistanceKm,
  totalFlightMin,
  totalGroundMin,
  scheduledArrival,
}: {
  legs: LegView[];
  totalDistanceKm: number;
  totalFlightMin: number;
  totalGroundMin: number;
  scheduledArrival: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-1/60 p-5 backdrop-blur-md">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
        <span>Route plan</span>
        <span className="text-cyan-400">
          ETA{" "}
          <time suppressHydrationWarning>
            {new Date(scheduledArrival).toISOString().slice(0, 16).replace("T", " ")}Z
          </time>
        </span>
      </div>
      <ol className="divide-y divide-line">
        {legs.map((leg, i) => (
          <li key={i} className="flex flex-wrap items-center gap-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
              Leg {i + 1}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-ink-0">
              <span className="font-mono">{leg.from.code}</span>
              <span className="text-ink-3">{leg.from.city}</span>
              <ArrowRight className="h-4 w-4 text-cyan-400" />
              <span className="font-mono">{leg.to.code}</span>
              <span className="text-ink-3">{leg.to.city}</span>
            </div>
            <div className="ml-auto flex items-center gap-4 font-mono text-xs tabular-nums text-ink-1">
              <span>{formatDistanceKm(leg.distanceKm)}</span>
              <span>{formatDuration(leg.durationMin)}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <SumStat label="Total distance" value={formatDistanceKm(totalDistanceKm)} />
        <SumStat label="Total flight" value={formatDuration(totalFlightMin)} />
        <SumStat label="Ground time" value={formatDuration(totalGroundMin)} />
      </div>
    </div>
  );
}

function SumStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg-2/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </div>
      <div className="font-mono text-sm text-ink-0">{value}</div>
    </div>
  );
}
