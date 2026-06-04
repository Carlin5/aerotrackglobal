"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadFlightById } from "@/lib/hybrid-client";
import { FlightForm } from "../../../FlightForm";
import type { FlightRecord } from "@/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Plane } from "lucide-react";
import Link from "next/link";

export function EditFlightClient({ flightId }: { flightId: number }) {
  const router = useRouter();
  const [flight, setFlight] = useState<FlightRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFlightById(flightId)
      .then((f) => {
        if (f) {
          setFlight(f);
        } else {
          setError("Flight not found. It may have been deleted or the ID is invalid.");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load flight.");
      })
      .finally(() => setLoading(false));
  }, [flightId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Plane className="mx-auto h-8 w-8 animate-pulse text-cyan-400" />
            <p className="mt-3 text-sm text-ink-2">Loading flight data…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-signal-red/30 bg-signal-red/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-signal-red">Flight not found</h2>
          <p className="mt-2 text-sm text-ink-2">
            {error || "This flight does not exist in our records."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> Back to mission board
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Edit mission
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
          {flight.flightNumber} ·{" "}
          <span className="text-ink-2">
            {flight.originCode} → {flight.destinationCode}
          </span>
        </h1>
        <p className="mt-1 font-mono text-xs text-ink-3">
          Tracking ID: <span className="text-ink-1">{flight.trackingId}</span>
          {flight.id < 0 && (
            <span className="ml-2 text-signal-amber">(local-only)</span>
          )}
        </p>
      </div>
      <FlightForm
        mode="edit"
        flightId={flight.id}
        initial={{
          flightNumber: flight.flightNumber,
          aircraft: flight.aircraft,
          originCode: flight.originCode,
          destinationCode: flight.destinationCode,
          waypoints: flight.waypoints,
          cruiseKmh: flight.cruiseKmh,
          departureAt: flight.departureAt,
          status: flight.status,
          isLive: flight.isLive,
          cargo: flight.cargo,
          shipper: flight.shipper,
          consignee: flight.consignee,
          notes: flight.notes ?? "",
        }}
      />
    </div>
  );
}
