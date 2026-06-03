"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Radio,
  RadioReceiver,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Search,
  X,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDistanceKm, formatDuration, cn } from "@/lib/utils";
import { buildRoutePlan } from "@/lib/simulation";
import { listFlightsHybrid } from "@/lib/hybrid-client";
import type { FlightRecord } from "@/types";
import { EmergencyDialog } from "./EmergencyDialog";
import { DeleteFlightDialog } from "./DeleteFlightDialog";

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

type StatusFilter =
  | "all"
  | "live"
  | "emergency"
  | "scheduled"
  | "in_flight"
  | "delivered"
  | "cancelled";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "emergency", label: "Emergency" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_flight", label: "In-flight" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function matchesStatusFilter(row: Row, filter: StatusFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "live":
      return row.isLive && !row.hasEmergency;
    case "emergency":
      return row.hasEmergency || row.status === "emergency_stop";
    default:
      return row.status === filter;
  }
}

function flightToRow(f: FlightRecord): Row {
  let totalDistanceKm = 0;
  let totalFlightMin = 0;
  try {
    const p = buildRoutePlan(f);
    totalDistanceKm = p.totalDistanceKm;
    totalFlightMin = p.totalTripMin;
  } catch { /* ignore bad routes */ }
  return {
    id: f.id,
    trackingId: f.trackingId,
    flightNumber: f.flightNumber,
    originCode: f.originCode,
    destinationCode: f.destinationCode,
    departureAt: f.departureAt,
    status: f.status,
    isLive: f.isLive,
    hasEmergency: f.status === "emergency_stop" && !!f.emergency,
    cargoDescription: f.cargo.description,
    cargoWeightKg: f.cargo.weightKg,
    totalDistanceKm,
    totalFlightMin,
  };
}

export function FlightsTable({ flights }: { flights: Row[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [emergencyDialog, setEmergencyDialog] = useState<{
    open: boolean;
    flight: Row | null;
    mode: "declare" | "clear";
  }>({ open: false, flight: null, mode: "declare" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    flight: Row | null;
    busy: boolean;
    error: string | null;
  }>({ open: false, flight: null, busy: false, error: null });
  const [banner, setBanner] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [mergedFlights, setMergedFlights] = useState<Row[]>(flights);

  // Hybrid read: merge server flights with localStorage on mount
  useEffect(() => {
    listFlightsHybrid()
      .then((local) => {
        const localRows = local.map(flightToRow);
        // Merge: server flights take precedence, locals fill gaps
        const map = new Map<number, Row>();
        localRows.forEach((r) => map.set(r.id, r));
        flights.forEach((r) => map.set(r.id, r));
        setMergedFlights(Array.from(map.values()));
      })
      .catch(() => {
        // Fallback: just use server flights
        setMergedFlights(flights);
      });
  }, [flights]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (copiedId == null) return;
    const t = setTimeout(() => setCopiedId(null), 1500);
    return () => clearTimeout(t);
  }, [copiedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedFlights.filter((f) => {
      if (!matchesStatusFilter(f, statusFilter)) return false;
      if (!q) return true;
      return (
        f.trackingId.toLowerCase().includes(q) ||
        f.flightNumber.toLowerCase().includes(q) ||
        f.originCode.toLowerCase().includes(q) ||
        f.destinationCode.toLowerCase().includes(q) ||
        f.cargoDescription.toLowerCase().includes(q) ||
        `${f.originCode} → ${f.destinationCode}`.toLowerCase().includes(q)
      );
    });
  }, [flights, query, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: flights.length,
      live: flights.filter((f) => f.isLive && !f.hasEmergency).length,
      emergency: flights.filter(
        (f) => f.hasEmergency || f.status === "emergency_stop",
      ).length,
      scheduled: flights.filter((f) => f.status === "scheduled").length,
      in_flight: flights.filter((f) => f.status === "in_flight").length,
      delivered: flights.filter((f) => f.status === "delivered").length,
      cancelled: flights.filter((f) => f.status === "cancelled").length,
    } as Record<StatusFilter, number>;
  }, [flights]);

  async function toggleLive(row: Row) {
    setPendingId(row.id);
    try {
      const res = await fetch(`/api/flights/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isLive: !row.isLive,
          status:
            !row.isLive && row.status === "scheduled"
              ? "in_flight"
              : row.status,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setBanner({
          tone: "error",
          text:
            j.error ||
            `Could not ${row.isLive ? "stop" : "start"} live broadcast (${res.status}).`,
        });
        return;
      }
      setBanner({
        tone: "success",
        text: `${row.flightNumber} ${row.isLive ? "is no longer broadcasting." : "is now broadcasting live."}`,
      });
      startTransition(() => router.refresh());
    } catch {
      setBanner({ tone: "error", text: "Network error — please retry." });
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDelete() {
    const row = deleteDialog.flight;
    if (!row) return;
    setDeleteDialog((d) => ({ ...d, busy: true, error: null }));
    try {
      const res = await fetch(`/api/flights/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteDialog((d) => ({
          ...d,
          busy: false,
          error: j.error || `Delete failed (${res.status}).`,
        }));
        return;
      }
      setBanner({
        tone: "success",
        text: `Flight ${row.flightNumber} (${row.trackingId}) deleted.`,
      });
      setDeleteDialog({ open: false, flight: null, busy: false, error: null });
      startTransition(() => router.refresh());
    } catch {
      setDeleteDialog((d) => ({
        ...d,
        busy: false,
        error: "Network error — please retry.",
      }));
    }
  }

  async function copyPublicLink(row: Row) {
    const url = `${window.location.origin}/track/${encodeURIComponent(row.trackingId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(row.id);
    } catch {
      setBanner({
        tone: "error",
        text: "Could not access clipboard. Try opening the public page instead.",
      });
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
    <div className="space-y-4">
      {/* Toolbar: search + status filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracking, flight, route, cargo…"
            className="pl-9 pr-9"
            aria-label="Search flights"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-white/[0.06] hover:text-ink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            const n = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors cursor-pointer",
                  active
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                    : "border-line bg-bg-1/40 text-ink-2 hover:text-ink-0 hover:border-line-strong",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded px-1 font-mono text-[10px]",
                    active
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-white/[0.06] text-ink-3",
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline action banner */}
      {banner ? (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-xs",
            banner.tone === "error"
              ? "border-signal-red/40 bg-signal-red/10 text-signal-red"
              : "border-signal-green/40 bg-signal-green/10 text-signal-green",
          )}
        >
          <span className="leading-relaxed">{banner.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBanner(null)}
            className="shrink-0 rounded p-0.5 hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-bg-1/40 p-8 text-center">
          <p className="text-sm text-ink-2">
            No flights match{" "}
            {query ? (
              <>
                &quot;<span className="text-ink-0">{query}</span>&quot;
              </>
            ) : (
              <>this filter</>
            )}
            .
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            ) : null}
            {statusFilter !== "all" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Show all statuses
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
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
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 pr-3 font-mono text-xs text-ink-0">
                    {f.trackingId}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs text-ink-0">
                      {f.flightNumber}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs text-ink-1">
                      {f.originCode} → {f.destinationCode}
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-ink-2">
                    {new Date(f.departureAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
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
                    <div className="text-ink-3">
                      {formatDuration(f.totalFlightMin)}
                    </div>
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
                        {f.status === "emergency_stop"
                          ? "emergency"
                          : f.status}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPublicLink(f)}
                        title="Copy public tracking link"
                        aria-label={`Copy public link for ${f.flightNumber}`}
                      >
                        {copiedId === f.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-signal-green" />{" "}
                            Copied
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </Button>
                      <Link
                        href={`/track/${encodeURIComponent(f.trackingId)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open public tracking page"
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
                        title={
                          f.hasEmergency
                            ? "Resolve the emergency before changing live state"
                            : f.isLive
                              ? "Stop broadcasting live position"
                              : "Start broadcasting live position"
                        }
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
                            setEmergencyDialog({
                              open: true,
                              flight: f,
                              mode: "clear",
                            })
                          }
                          title="Clear emergency and resume flight"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Resume
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setEmergencyDialog({
                              open: true,
                              flight: f,
                              mode: "declare",
                            })
                          }
                          title="Declare emergency hold"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Emergency
                        </Button>
                      )}
                      <Link
                        href={`/admin/flights/${f.id}/edit`}
                        title="Edit flight"
                      >
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === f.id}
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            flight: f,
                            busy: false,
                            error: null,
                          })
                        }
                        title="Delete flight"
                        aria-label={`Delete ${f.flightNumber}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-signal-red" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmergencyDialog
        open={emergencyDialog.open}
        flight={emergencyDialog.flight}
        mode={emergencyDialog.mode}
        onClose={() =>
          setEmergencyDialog((d) => ({ ...d, open: false }))
        }
        onDone={() => {
          setBanner({
            tone: "success",
            text:
              emergencyDialog.mode === "declare"
                ? "Emergency hold declared."
                : "Emergency cleared — flight resumed.",
          });
          startTransition(() => router.refresh());
        }}
      />

      <DeleteFlightDialog
        open={deleteDialog.open}
        flight={deleteDialog.flight}
        busy={deleteDialog.busy}
        error={deleteDialog.error}
        onClose={() =>
          deleteDialog.busy
            ? undefined
            : setDeleteDialog({
                open: false,
                flight: null,
                busy: false,
                error: null,
              })
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
