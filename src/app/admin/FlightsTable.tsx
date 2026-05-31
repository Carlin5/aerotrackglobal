"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Radio,
  RadioReceiver,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDistanceKm, formatDuration } from "@/lib/utils";
import { EmergencyDialog } from "./EmergencyDialog";

interface Row {
  id: number;
  trackingId: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  status: string;
  isLive: boolean;
  hasEmergency: boolean;
  cargoDescription: string;
  cargoWeightKg: number;
  totalDistanceKm: number;
  totalFlightMin: number;
}

export function FlightsTable({ flights }: { flights: Row[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{
    open: boolean;
    flight: Row | null;
    mode: "declare" | "clear";
  }>({ open: false, flight: null, mode: "declare" });

  async function toggleLive(row: Row) {
    setPendingId(row.id);
    try {
      await fetch(`/api/flights/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isLive: !row.isLive,
          status: !row.isLive && row.status === "scheduled" ? "in_flight" : row.status,
        }),
      });
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  async function destroy(row: Row) {
    if (!confirm(`Delete flight ${row.flightNumber} (${row.trackingId})? This cannot be undone.`)) return;
    setPendingId(row.id);
    try {
      await fetch(`/api/flights/${row.id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  if (flights.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-bg-1/40 p-10 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          No flights yet
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Compose your first flight to generate a tracking ID.
        </p>
        <div className="mt-4 flex justify-center">
          <Link href="/admin/flights/new">
            <Button variant="accent">Compose flight</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-ink-3">
            <th className="py-2 pr-3">Tracking</th>
            <th className="py-2 pr-3">Flight</th>
            <th className="py-2 pr-3">Route</th>
            <th className="py-2 pr-3">Departure (UTC)</th>
            <th className="py-2 pr-3">Cargo</th>
            <th className="py-2 pr-3">Distance</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {flights.map((f) => (
            <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-3 font-mono text-xs text-ink-0">
                {f.trackingId}
              </td>
              <td className="py-3 pr-3">
                <div className="font-mono text-xs text-ink-0">{f.flightNumber}</div>
              </td>
              <td className="py-3 pr-3">
                <div className="font-mono text-xs text-ink-1">
                  {f.originCode} → {f.destinationCode}
                </div>
              </td>
              <td className="py-3 pr-3 font-mono text-xs text-ink-2">
                {new Date(f.departureAt).toISOString().slice(0, 16).replace("T", " ")}
              </td>
              <td className="py-3 pr-3">
                <div className="max-w-[260px] truncate text-ink-0">
                  {f.cargoDescription}
                </div>
                <div className="font-mono text-[11px] text-ink-3">
                  {f.cargoWeightKg.toLocaleString()} kg
                </div>
              </td>
              <td className="py-3 pr-3 font-mono text-xs tabular-nums text-ink-1">
                <div>{formatDistanceKm(f.totalDistanceKm)}</div>
                <div className="text-ink-3">{formatDuration(f.totalFlightMin)}</div>
              </td>
              <td className="py-3 pr-3">
                <div className="flex flex-col items-start gap-1">
                  <Badge
                    tone={
                      f.status === "emergency_stop"
                        ? "red"
                        : f.status === "delivered"
                          ? "green"
                          : f.status === "in_flight"
                            ? "cyan"
                            : f.status === "cancelled"
                              ? "red"
                              : f.status === "delayed"
                                ? "amber"
                                : "neutral"
                    }
                  >
                    {f.status === "emergency_stop" ? "emergency" : f.status}
                  </Badge>
                  {f.hasEmergency ? (
                    <Badge tone="red" dot pulse>
                      <AlertTriangle className="h-3 w-3" /> Hold
                    </Badge>
                  ) : null}
                  {f.isLive && !f.hasEmergency ? (
                    <Badge tone="cyan" dot pulse>
                      Live
                    </Badge>
                  ) : null}
                </div>
              </td>
              <td className="py-3 pr-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <Link
                    href={`/track/${encodeURIComponent(f.trackingId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" /> Public
                    </Button>
                  </Link>
                  <Button
                    variant={f.isLive ? "outline" : "primary"}
                    size="sm"
                    disabled={pendingId === f.id || f.hasEmergency}
                    onClick={() => toggleLive(f)}
                  >
                    {f.isLive ? (
                      <>
                        <RadioReceiver className="h-3.5 w-3.5" /> Stop live
                      </>
                    ) : (
                      <>
                        <Radio className="h-3.5 w-3.5" /> Go live
                      </>
                    )}
                  </Button>
                  {f.hasEmergency ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setDialog({ open: true, flight: f, mode: "clear" })
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Resume
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setDialog({ open: true, flight: f, mode: "declare" })
                      }
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Emergency
                    </Button>
                  )}
                  <Link href={`/admin/flights/${f.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === f.id}
                    onClick={() => destroy(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-signal-red" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <EmergencyDialog
        open={dialog.open}
        flight={dialog.flight}
        mode={dialog.mode}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onDone={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
