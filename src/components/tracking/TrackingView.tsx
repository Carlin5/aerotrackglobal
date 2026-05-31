"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2,
  Map as MapIcon,
  Plane,
  Share2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TelemetryHUD } from "./TelemetryHUD";
import { StatusTimeline } from "./StatusTimeline";
import { CargoCard } from "./CargoCard";
import { RouteSummary } from "./RouteSummary";
import { useLiveTracking, type TrackSnapshot } from "./useLiveTracking";

const FlightMap = dynamic(() => import("@/components/map/FlightMap"), {
  ssr: false,
  loading: () => <MapSkeleton label="Tactical view · 2D" />,
});
const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), {
  ssr: false,
  loading: () => <MapSkeleton label="Orbital view · 3D" />,
});

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="relative flex h-[480px] items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
        Acquiring {label}…
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-cyan-500/15 to-transparent" />
    </div>
  );
}

export function TrackingView({ snapshot }: { snapshot: TrackSnapshot }) {
  const { plan, polyline, position } = useLiveTracking(snapshot);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [copied, setCopied] = useState(false);

  const isEmergency = snapshot.flight.status === "emergency_stop";
  const tone = isEmergency
    ? "red"
    : snapshot.flight.status === "delivered"
      ? "green"
      : snapshot.flight.isLive
        ? "cyan"
        : snapshot.flight.status === "cancelled"
          ? "red"
          : snapshot.flight.status === "delayed"
            ? "amber"
            : "neutral";

  async function copyId() {
    try {
      await navigator.clipboard.writeText(snapshot.flight.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        {isEmergency && snapshot.flight.emergency ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-xl border border-signal-red/50 bg-signal-red/[0.08] p-4 backdrop-blur-md"
            role="alert"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 animate-pulse bg-signal-red/[0.04]"
            />
            <div className="relative flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-red/15 ring-1 ring-signal-red/40">
                <AlertTriangle className="h-4 w-4 text-signal-red" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-signal-red">
                    Emergency hold declared
                  </div>
                  <time
                    suppressHydrationWarning
                    className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
                  >
                    {new Date(snapshot.flight.emergency.declaredAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
                    Z
                  </time>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-0">
                  {snapshot.flight.emergency.reason}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-ink-2 sm:grid-cols-4">
                  <div>
                    <span className="text-ink-3">Lat </span>
                    <span className="text-ink-0">
                      {snapshot.flight.emergency.lat.toFixed(3)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3">Lng </span>
                    <span className="text-ink-0">
                      {snapshot.flight.emergency.lng.toFixed(3)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3">Bearing </span>
                    <span className="text-ink-0">
                      {Math.round(snapshot.flight.emergency.bearing)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3">Alt </span>
                    <span className="text-ink-0">
                      {Math.round(
                        (snapshot.flight.emergency.altitudeM / 0.3048) / 100,
                      ) * 100}{" "}
                      ft
                    </span>
                  </div>
                </div>
                {snapshot.flight.emergency.resumeEta ? (
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    Estimated resume:{" "}
                    <span className="text-ink-0">
                      {new Date(snapshot.flight.emergency.resumeEta)
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                      Z
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                tone={tone as never}
                dot
                pulse={snapshot.flight.isLive || isEmergency}
              >
                {isEmergency
                  ? "Emergency"
                  : snapshot.flight.isLive
                    ? "Live"
                    : snapshot.flight.status}
              </Badge>
              <span className="font-mono text-xs text-ink-3">
                Flight {snapshot.flight.flightNumber} · {snapshot.flight.aircraft}
              </span>
            </div>
            <h1 className="mt-2 flex flex-wrap items-baseline gap-2 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
              <span>{snapshot.flight.origin.code}</span>
              <Plane className="h-5 w-5 -rotate-12 text-cyan-400" />
              <span>{snapshot.flight.destination.code}</span>
              <span className="text-base font-normal text-ink-2">
                {snapshot.flight.origin.city} → {snapshot.flight.destination.city}
              </span>
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="font-mono uppercase tracking-wider text-ink-3">
                Tracking ID
              </span>
              <code className="rounded bg-bg-2 px-2 py-0.5 font-mono text-ink-0">
                {snapshot.flight.trackingId}
              </code>
              <Button variant="ghost" size="sm" onClick={copyId}>
                {copied ? <span className="text-signal-green">Copied</span> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Map view"
              className="inline-flex rounded-lg border border-line bg-bg-1/70 p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "3d"}
                onClick={() => setView("3d")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  view === "3d"
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "text-ink-2 hover:text-ink-0"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" /> 3D
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "2d"}
                onClick={() => setView("2d")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  view === "2d"
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "text-ink-2 hover:text-ink-0"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" /> 2D
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: `Shipment ${snapshot.flight.trackingId}`,
                      text: `Track ${snapshot.flight.origin.code} → ${snapshot.flight.destination.code}`,
                      url: window.location.href,
                    });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                } catch {
                  /* ignore */
                }
              }}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.3 }}
          >
            {view === "3d" ? (
              <GlobeView
                origin={snapshot.flight.origin}
                destination={snapshot.flight.destination}
                waypoints={snapshot.plan.legs
                  .slice(1)
                  .map((l) => l.from)}
                position={position}
              />
            ) : (
              <FlightMap
                origin={snapshot.flight.origin}
                destination={snapshot.flight.destination}
                waypoints={snapshot.plan.legs.slice(1).map((l) => l.from)}
                polyline={polyline}
                position={position}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <TelemetryHUD position={position} />

        <RouteSummary
          legs={snapshot.plan.legs}
          totalDistanceKm={snapshot.plan.totalDistanceKm}
          totalFlightMin={snapshot.plan.totalFlightMin}
          totalGroundMin={snapshot.plan.totalGroundMin}
          scheduledArrival={snapshot.plan.scheduledArrival}
        />
      </div>

      <div className="space-y-6">
        <CargoCard
          cargo={snapshot.flight.cargo}
          shipper={snapshot.flight.shipper}
          consignee={snapshot.flight.consignee}
        />
        <div className="rounded-xl border border-line bg-bg-1/60 p-5 backdrop-blur-md">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
            Status history
          </div>
          <StatusTimeline events={snapshot.events} now={new Date()} />
        </div>
        {snapshot.flight.notes ? (
          <div className="rounded-xl border border-line bg-bg-1/60 p-5 backdrop-blur-md">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
              Operator notes
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-1">{snapshot.flight.notes}</p>
          </div>
        ) : null}
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Position recomputed each second · times shown in UTC
        </p>
      </div>
    </div>
  );
}
