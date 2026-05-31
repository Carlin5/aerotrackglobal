"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRoutePlan as planBuilder,
  buildRoutePolyline,
  computeLivePosition,
} from "@/lib/simulation";
import type {
  EmergencySnapshot,
  FlightRecord,
  LivePosition,
  RoutePlan,
} from "@/types";
import type { Airport } from "@/types";

/**
 * Snapshot returned from the public /api/track endpoint.
 * Mirrors the shape we synthesize on the server and lets us recompute
 * live position client-side every animation tick.
 */
export interface TrackSnapshot {
  flight: {
    trackingId: string;
    flightNumber: string;
    aircraft: string;
    status: FlightRecord["status"];
    isLive: boolean;
    origin: Pick<Airport, "code" | "city" | "country" | "lat" | "lng">;
    destination: Pick<Airport, "code" | "city" | "country" | "lat" | "lng">;
    waypoints: FlightRecord["waypoints"];
    cargo: FlightRecord["cargo"];
    shipper: Pick<FlightRecord["shipper"], "name" | "company">;
    consignee: Pick<FlightRecord["consignee"], "name" | "company">;
    departureAt: string;
    cruiseKmh: number;
    notes?: string;
    emergency?: EmergencySnapshot;
    createdAt: string;
    updatedAt: string;
  };
  plan: {
    legs: Array<{
      from: Pick<Airport, "code" | "city" | "country" | "lat" | "lng">;
      to: Pick<Airport, "code" | "city" | "country" | "lat" | "lng">;
      distanceKm: number;
      durationMin: number;
      departAt: string;
      arriveAt: string;
    }>;
    totalDistanceKm: number;
    totalFlightMin: number;
    totalGroundMin: number;
    totalTripMin: number;
    scheduledArrival: string;
  };
  polyline: { lat: number; lng: number }[];
  position: LivePosition;
  events: Array<{
    at: string;
    code: string;
    label: string;
    detail: string;
    location?: string;
  }>;
  serverTime: string;
}

function reconstructFlight(snap: TrackSnapshot): FlightRecord {
  // We only need fields used by computeLivePosition.
  return {
    id: 0,
    trackingId: snap.flight.trackingId,
    flightNumber: snap.flight.flightNumber,
    aircraft: snap.flight.aircraft,
    originCode: snap.flight.origin.code,
    destinationCode: snap.flight.destination.code,
    waypoints: snap.flight.waypoints,
    cruiseKmh: snap.flight.cruiseKmh,
    departureAt: snap.flight.departureAt,
    status: snap.flight.status,
    isLive: snap.flight.isLive,
    cargo: snap.flight.cargo,
    shipper: { name: snap.flight.shipper.name, company: snap.flight.shipper.company },
    consignee: { name: snap.flight.consignee.name, company: snap.flight.consignee.company },
    notes: snap.flight.notes,
    emergency: snap.flight.emergency,
    createdAt: snap.flight.createdAt,
    updatedAt: snap.flight.updatedAt,
  };
}

/**
 * Hook: returns a live-updating position computed every `tickMs` ms.
 * Server snapshot is the source of truth; we just advance the simulation.
 */
export function useLiveTracking(snap: TrackSnapshot, tickMs = 1000) {
  const flight = useMemo(() => reconstructFlight(snap), [snap]);

  // Rebuild plan once per snapshot so we don't trust Date objects re-encoded as strings.
  const plan = useMemo<RoutePlan>(() => planBuilder(flight), [flight]);

  const polyline = useMemo(() => buildRoutePolyline(plan, 48), [plan]);

  const [position, setPosition] = useState<LivePosition>(() =>
    computeLivePosition(flight, plan, new Date()),
  );

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    function tick(t: number) {
      if (t - lastTickRef.current >= tickMs) {
        lastTickRef.current = t;
        setPosition(computeLivePosition(flight, plan, new Date()));
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [flight, plan, tickMs]);

  return { plan, polyline, position };
}
