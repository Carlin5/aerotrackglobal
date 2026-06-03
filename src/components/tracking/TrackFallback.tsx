"use client";

import { useEffect, useState } from "react";
import { loadFlightByTrackingId } from "@/lib/hybrid-client";
import type { FlightRecord } from "@/types";
import {
  buildRoutePlan,
  buildRoutePolyline,
  buildStatusEvents,
  computeLivePosition,
} from "@/lib/simulation";
import { getAirport } from "@/lib/airports";
import type { TrackSnapshot } from "./useLiveTracking";
import { TrackingView } from "./TrackingView";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { TrackForm } from "./TrackForm";
import Link from "next/link";
import { IMG } from "@/lib/images";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  Mail,
  Plane,
} from "lucide-react";

interface Props {
  trackingId: string;
  serverSnapshot: TrackSnapshot | null;
  authed: boolean;
}

function flightToSnapshot(f: FlightRecord): TrackSnapshot {
  const plan = buildRoutePlan(f);
  const position = computeLivePosition(f, plan);
  const polyline = buildRoutePolyline(plan, 48);
  const events = buildStatusEvents(f, plan);

  const origin = getAirport(plan.legs[0].from.code);
  const destination = getAirport(plan.legs[plan.legs.length - 1].to.code);

  return {
    flight: {
      trackingId: f.trackingId,
      flightNumber: f.flightNumber,
      aircraft: f.aircraft,
      status: f.status,
      isLive: f.isLive,
      origin: {
        code: origin?.code ?? plan.legs[0].from.code,
        city: origin?.city ?? "",
        country: origin?.country ?? "",
        lat: origin?.lat ?? plan.legs[0].from.lat,
        lng: origin?.lng ?? plan.legs[0].from.lng,
      },
      destination: {
        code: destination?.code ?? plan.legs[plan.legs.length - 1].to.code,
        city: destination?.city ?? "",
        country: destination?.country ?? "",
        lat: destination?.lat ?? plan.legs[plan.legs.length - 1].to.lat,
        lng: destination?.lng ?? plan.legs[plan.legs.length - 1].to.lng,
      },
      waypoints: f.waypoints,
      cargo: f.cargo,
      shipper: { name: f.shipper.name, company: f.shipper.company },
      consignee: { name: f.consignee.name, company: f.consignee.company },
      departureAt: f.departureAt,
      cruiseKmh: f.cruiseKmh,
      notes: f.notes,
      emergency: f.emergency,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    },
    plan: {
      legs: plan.legs.map((l) => ({
        from: {
          code: l.from.code,
          city: l.from.city,
          country: l.from.country,
          lat: l.from.lat,
          lng: l.from.lng,
        },
        to: {
          code: l.to.code,
          city: l.to.city,
          country: l.to.country,
          lat: l.to.lat,
          lng: l.to.lng,
        },
        distanceKm: l.distanceKm,
        durationMin: l.durationMin,
        departAt: l.departAt.toISOString(),
        arriveAt: l.arriveAt.toISOString(),
      })),
      totalDistanceKm: plan.totalDistanceKm,
      totalFlightMin: plan.totalFlightMin,
      totalGroundMin: plan.totalGroundMin,
      totalTripMin: plan.totalTripMin,
      scheduledArrival: plan.scheduledArrival.toISOString(),
    },
    polyline,
    position,
    events: events.map((e) => ({
      ...e,
      at: e.at.toISOString(),
    })),
    serverTime: new Date().toISOString(),
  };
}

export function TrackFallback({ trackingId, serverSnapshot, authed }: Props) {
  const [snap, setSnap] = useState<TrackSnapshot | null>(serverSnapshot);
  const [loading, setLoading] = useState(!serverSnapshot);

  useEffect(() => {
    if (serverSnapshot) {
      setSnap(serverSnapshot);
      setLoading(false);
      return;
    }

    // Server returned null — try localStorage fallback
    loadFlightByTrackingId(trackingId)
      .then((flight) => {
        if (flight) {
          setSnap(flightToSnapshot(flight));
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoading(false));
  }, [trackingId, serverSnapshot]);

  if (loading) {
    return (
      <>
        <TopNav authed={authed} />
        <main className="relative isolate min-h-[calc(100vh-58px)] overflow-hidden">
          <AmbientBackground image={IMG.airport} opacity={0.3} />
          <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24">
            <div className="text-center">
              <Plane className="mx-auto h-8 w-8 animate-pulse text-cyan-400" />
              <p className="mt-3 text-sm text-ink-2">Loading tracking data…</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!snap) {
    // Not found anywhere — render the friendly empty state
    return (
      <>
        <TopNav authed={authed} />
        <main className="relative isolate min-h-[calc(100vh-58px)] overflow-hidden">
          <AmbientBackground image={IMG.airport} opacity={0.3} />
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-24">
            <div className="self-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-signal-amber">
                No telemetry
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                We couldn&apos;t find that shipment.
              </h1>
              <p className="mt-3 max-w-md text-ink-2">
                The tracking ID{" "}
                <code className="rounded bg-bg-2/80 px-1.5 py-0.5 font-mono text-ink-0">
                  {trackingId}
                </code>{" "}
                isn&apos;t in our system. It may have been mistyped, expired,
                or not yet released by your shipper.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Double-check the format:{" "}
                  <code className="font-mono text-ink-0">AT-XXXXXX-YY</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Make sure your shipper has activated live tracking.
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4" /> Back to home
                  </Button>
                </Link>
                <Link href="/#contact">
                  <Button variant="ghost">
                    <Mail className="h-4 w-4" /> Contact support
                  </Button>
                </Link>
              </div>
            </div>
            <Panel strong className="self-center">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
                  Try a different ID
                </span>
              </div>
              <TrackForm initial="" />
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-line bg-bg-2/40 p-3 text-xs text-ink-2">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span>
                  Need help? Our 24/7 ops desk is on{" "}
                  <a
                    href="tel:+13325550188"
                    className="text-ink-0 underline-offset-2 hover:underline"
                  >
                    +1 (332) 555-0188
                  </a>
                </span>
              </div>
            </Panel>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Found in localStorage — render the tracking view
  return (
    <>
      <TopNav authed={authed} />
      <main className="relative isolate overflow-hidden">
        <AmbientBackground image={IMG.clouds} opacity={0.1} />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-1/50 px-4 py-2.5 backdrop-blur-md">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/30">
              <Plane className="h-3.5 w-3.5 -rotate-12 text-cyan-400" />
            </span>
            <span className="text-sm text-ink-1">
              Welcome aboard. You&apos;re tracking shipment{" "}
              <code className="font-mono text-ink-0">
                {snap.flight.trackingId}
              </code>
              .
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:inline">
              Restored from local persistence
            </span>
          </div>
          <TrackingView snapshot={snap} />
        </div>
      </main>
      <Footer />
    </>
  );
}
